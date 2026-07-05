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

module.exports = { retrieveRelevantLaw };
