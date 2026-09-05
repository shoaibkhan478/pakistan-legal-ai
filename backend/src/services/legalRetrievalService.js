// backend/services/legalRetrievalService.js
//
// HYBRID RETRIEVAL: combines vector similarity (semantic meaning) with
// full-text keyword search (exact section/article/citation matches).
//
// Why hybrid and not vector-only: a lawyer typing "302 PPC" or "Article 199"
// needs an EXACT match, not a "semantically similar" one. Pure vector search
// can miss exact statutory references. Pure keyword search misses paraphrased
// queries like "can police arrest without a warrant". We run both and merge.
//
// UPGRADE (fusion + relevance floor): the previous merge step deduped by id
// and kept whichever list saw a row first — it never actually combined the
// two relevance signals, so a strong keyword hit and a barely-related vector
// hit were indistinguishable once merged, and nothing stopped a weak match
// from being fed to the LLM as "grounding" (which quietly hurts citation
// precision and can nudge the model toward citing something irrelevant).
//
// This version:
//   1. Pulls a slightly wider candidate set from each source (5 instead of 3)
//      so fusion has more to work with.
//   2. Fuses vector + keyword rankings with Reciprocal Rank Fusion (RRF) —
//      the standard technique for combining two differently-scaled ranked
//      lists without needing to normalize cosine similarity against ts_rank
//      (they aren't on the same scale, so summing/averaging them directly
//      would be meaningless).
//   3. Applies a relevance floor: a row that ONLY showed up via vector
//      search and whose similarity is below MIN_VECTOR_ONLY_SIMILARITY is
//      dropped rather than passed through — an unconfirmed, low-similarity
//      vector hit is exactly the kind of noise that ends up as a shaky
//      citation. Keyword hits aren't floored the same way: a keyword match
//      only exists because the term is literally present, which is already
//      a strong relevance signal for legal text (section numbers, acronyms).
//   4. Tags each result with matchType ('vector' | 'keyword' | 'both') and a
//      fused relevanceScore, so downstream consumers (citationVerifier, or a
//      future "why this source" UI badge) have a real signal to use instead
//      of just "the API returned this."

const { generateEmbedding } = require('./embeddingService');
// Reuse the app's single shared pool (config/database.js) instead of opening
// a second one here. That shared pool supports both DATABASE_URL AND the
// discrete DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD vars this project's
// .env actually uses — a pool built from `connectionString: DATABASE_URL`
// alone (the old code) would silently fail to connect on any .env that only
// sets the discrete vars, which is exactly this project's setup.
const { pool } = require('../config/database');

const CANDIDATES_PER_SOURCE_TYPE = 5; // widened candidate pool fed into fusion
const RESULTS_PER_SOURCE_TYPE = 3;    // how many fused results to return per category
const RRF_K = 60;                     // standard RRF constant (Cormack et al.) —
                                       // large enough that rank 1 vs rank 2 isn't
                                       // wildly overweighted, small enough that
                                       // rank order still dominates the score
const MIN_VECTOR_ONLY_SIMILARITY = 0.55; // floor for vector-only (unconfirmed) hits

/**
 * Vector similarity search (semantic).
 */
async function vectorSearch(queryEmbedding, sourceType, limit) {
  const embeddingLiteral = `[${queryEmbedding.join(',')}]`;
  const result = await pool.query(
    `SELECT id, source_type, title, citation, court, judge_name, year,
            chapter, article_or_section, statute_name, full_text,
            ratio_decidendi,
            1 - (embedding <=> $1) AS similarity
     FROM legal_knowledge
     WHERE source_type = $2
     ORDER BY embedding <=> $1
     LIMIT $3`,
    [embeddingLiteral, sourceType, limit]
  );
  return result.rows;
}

/**
 * Full-text keyword search (exact terms, section numbers, citations).
 */
async function keywordSearch(query, sourceType, limit) {
  const result = await pool.query(
    `SELECT id, source_type, title, citation, court, judge_name, year,
            chapter, article_or_section, statute_name, full_text,
            ratio_decidendi,
            ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank
     FROM legal_knowledge
     WHERE source_type = $2
       AND search_vector @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $3`,
    [query, sourceType, limit]
  );
  return result.rows;
}

/**
 * Reciprocal Rank Fusion + relevance floor.
 *
 * Takes the two independently-ranked candidate lists (vector rows already
 * ordered by similarity desc, keyword rows already ordered by ts_rank desc)
 * and produces a single list ordered by fused relevance, capped at `limit`.
 *
 * RRF score for a row = sum over every list it appears in of 1 / (RRF_K + rank),
 * where `rank` is its 0-based position in that list. A row appearing near the
 * top of both lists scores higher than one that's merely top-1 in one list
 * and absent from the other — which is exactly the "confirmed by two
 * independent signals" property we want for legal grounding.
 */
function fuseResults(vectorRows, keywordRows, limit) {
  const scored = new Map(); // id -> { row, score, matchType, similarity, rank }

  vectorRows.forEach((row, idx) => {
    scored.set(row.id, {
      row,
      score: 1 / (RRF_K + idx),
      matchType: 'vector',
      similarity: row.similarity != null ? Number(row.similarity) : null,
    });
  });

  keywordRows.forEach((row, idx) => {
    const existing = scored.get(row.id);
    const kwScore = 1 / (RRF_K + idx);
    if (existing) {
      existing.score += kwScore;
      existing.matchType = 'both';
    } else {
      scored.set(row.id, {
        row,
        score: kwScore,
        matchType: 'keyword',
        similarity: null,
      });
    }
  });

  const fused = Array.from(scored.values())
    // Relevance floor: drop unconfirmed, low-similarity vector-only hits —
    // these are the ones most likely to be tangentially related noise that
    // shouldn't be presented to the model (or the user) as grounding.
    .filter((entry) => {
      if (entry.matchType !== 'vector') return true;
      return entry.similarity == null || entry.similarity >= MIN_VECTOR_ONLY_SIMILARITY;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      ...entry.row,
      matchType: entry.matchType,
      relevanceScore: Number(entry.score.toFixed(6)),
    }));

  return fused;
}

/**
 * Main entry point: retrieves relevant Constitution articles, statutory
 * sections, and judgments for a given user query.
 *
 * @param {string} query - user's plain-English / Urdu-transcribed question
 * @returns {Promise<{constitution: [], statute: [], judgment: []}>}
 */
async function retrieveRelevantLaw(query) {
  let queryEmbedding = null;
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch (err) {
    // Vector embedding fail-soft: fallback to PostgreSQL full-text search
  }

  const [constV, constK, statV, statK, judgV, judgK] = await Promise.all([
    queryEmbedding ? vectorSearch(queryEmbedding, 'constitution', CANDIDATES_PER_SOURCE_TYPE) : Promise.resolve([]),
    keywordSearch(query, 'constitution', CANDIDATES_PER_SOURCE_TYPE),
    queryEmbedding ? vectorSearch(queryEmbedding, 'statute', CANDIDATES_PER_SOURCE_TYPE) : Promise.resolve([]),
    keywordSearch(query, 'statute', CANDIDATES_PER_SOURCE_TYPE),
    queryEmbedding ? vectorSearch(queryEmbedding, 'judgment', CANDIDATES_PER_SOURCE_TYPE) : Promise.resolve([]),
    keywordSearch(query, 'judgment', CANDIDATES_PER_SOURCE_TYPE),
  ]);

  return {
    constitution: fuseResults(constV, constK, RESULTS_PER_SOURCE_TYPE),
    statute: fuseResults(statV, statK, RESULTS_PER_SOURCE_TYPE),
    judgment: fuseResults(judgV, judgK, RESULTS_PER_SOURCE_TYPE),
  };
}

/**
 * TRUE citation-graph lookup — given one or more legal_knowledge row ids
 * (statute/constitution provisions), returns every judgment that has a
 * recorded case_citations link to that provision (built by
 * scripts/extractCaseCitations.js), instead of a fresh semantic/keyword
 * search. This is the difference between "text similar to this Section"
 * (retrieveRelevantLaw above) and "cases that actually cite this Section".
 *
 * Verified links are returned first, then by confidence, so an
 * unreviewed/low-confidence regex match doesn't outrank a confirmed one.
 *
 * @param {number[]} provisionIds - legal_knowledge.id values (statute/constitution rows)
 * @param {number} [limit]
 * @returns {Promise<object[]>} judgment rows, each with citation_context/confidence/verified attached
 */
async function getRelatedCases(provisionIds, limit = 5) {
  if (!Array.isArray(provisionIds) || provisionIds.length === 0) return [];

  const result = await pool.query(
    `SELECT lk.id, lk.title, lk.citation, lk.court, lk.judge_name, lk.year, lk.full_text,
            cc.citation_context, cc.confidence, cc.verified, cc.cited_provision_id
     FROM case_citations cc
     JOIN legal_knowledge lk ON lk.id = cc.case_id
     WHERE cc.cited_provision_id = ANY($1::bigint[])
     ORDER BY cc.verified DESC,
              CASE cc.confidence WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              lk.year DESC NULLS LAST
     LIMIT $2`,
    [provisionIds, limit]
  );
  // Mark these distinctly from fuseResults()'s output so downstream code
  // (and any UI badge) can tell "confirmed citation-graph link" apart from
  // "turned up via vector/keyword similarity" — a citation-graph match is a
  // strictly stronger signal than either.
  return result.rows.map((row) => ({ ...row, matchType: 'citation_graph' }));
}

/**
 * Convenience wrapper for the common case: run the normal hybrid search,
 * then ALSO pull true citation-graph matches for whichever statute/
 * constitution rows came back, and merge them into the judgment list
 * (citation-graph matches first — they're a confirmed link, not just a
 * text-similarity guess). This is the function chat/answer-generation
 * should call instead of retrieveRelevantLaw() directly, once
 * case_citations has been populated.
 */
async function retrieveRelevantLawWithCitations(query) {
  const base = await retrieveRelevantLaw(query);

  const provisionIds = [...base.constitution, ...base.statute].map((r) => r.id);
  const relatedCases = await getRelatedCases(provisionIds, RESULTS_PER_SOURCE_TYPE * 2);

  // Citation-graph matches are a confirmed link, so they always lead;
  // dedup by id keeping the first (citation-graph) occurrence.
  const seen = new Map();
  [...relatedCases, ...base.judgment].forEach((row) => {
    if (!seen.has(row.id)) seen.set(row.id, row);
  });

  return { ...base, judgment: Array.from(seen.values()) };
}

module.exports = { retrieveRelevantLaw, getRelatedCases, retrieveRelevantLawWithCitations };
