// backend/services/legalRetrievalService.js
//
// HYBRID RETRIEVAL: combines vector similarity (semantic meaning) with
// full-text keyword search (exact section/article/citation matches).
//
// Why hybrid and not vector-only: a lawyer typing "302 PPC" or "Article 199"
// needs an EXACT match, not a "semantically similar" one. Pure vector search
// can miss exact statutory references. Pure keyword search misses paraphrased
// queries like "can police arrest without a warrant". We run both and merge.

const { generateEmbedding } = require('./embeddingService');
// Reuse the app's single shared pool (config/database.js) instead of opening
// a second one here. That shared pool supports both DATABASE_URL AND the
// discrete DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD vars this project's
// .env actually uses — a pool built from `connectionString: DATABASE_URL`
// alone (the old code) would silently fail to connect on any .env that only
// sets the discrete vars, which is exactly this project's setup.
const { pool } = require('../config/database');

const RESULTS_PER_SOURCE_TYPE = 3; // how many chunks to pull per category

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
 * Deduplicates results by id, keeping the highest-ranked occurrence.
 */
function mergeResults(vectorRows, keywordRows) {
  const map = new Map();
  [...vectorRows, ...keywordRows].forEach((row) => {
    if (!map.has(row.id)) map.set(row.id, row);
  });
  return Array.from(map.values());
}

/**
 * Main entry point: retrieves relevant Constitution articles, statutory
 * sections, and judgments for a given user query.
 *
 * @param {string} query - user's plain-English / Urdu-transcribed question
 * @returns {Promise<{constitution: [], statute: [], judgment: []}>}
 */
async function retrieveRelevantLaw(query) {
  const queryEmbedding = await generateEmbedding(query);

  const [constV, constK, statV, statK, judgV, judgK] = await Promise.all([
    vectorSearch(queryEmbedding, 'constitution', RESULTS_PER_SOURCE_TYPE),
    keywordSearch(query, 'constitution', RESULTS_PER_SOURCE_TYPE),
    vectorSearch(queryEmbedding, 'statute', RESULTS_PER_SOURCE_TYPE),
    keywordSearch(query, 'statute', RESULTS_PER_SOURCE_TYPE),
    vectorSearch(queryEmbedding, 'judgment', RESULTS_PER_SOURCE_TYPE),
    keywordSearch(query, 'judgment', RESULTS_PER_SOURCE_TYPE),
  ]);

  return {
    constitution: mergeResults(constV, constK),
    statute: mergeResults(statV, statK),
    judgment: mergeResults(judgV, judgK),
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
  return result.rows;
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

  const mergedJudgments = mergeResults(relatedCases, base.judgment);

  return { ...base, judgment: mergedJudgments };
}

module.exports = { retrieveRelevantLaw, getRelatedCases, retrieveRelevantLawWithCitations };
