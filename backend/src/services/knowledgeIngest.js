// backend/src/services/knowledgeIngest.js
//
// SHARED INGESTION PIPELINE
//
// Both backend/scripts/ingestLegalDocs.js (manual .txt/.pdf/.docx files in
// court_decrees/) and backend/scripts/scrapePaklii.js (automated PakLII
// judgment scraper) need the exact same steps once they have raw text +
// metadata in hand: chunk it, embed each chunk, skip it if already
// ingested, insert into legal_knowledge. Previously that logic only lived
// inside ingestLegalDocs.js — pulling it out here means the scraper can't
// drift out of sync with the manual pipeline (same chunk size, same
// embedding model, same dedupe rule, same table columns).

const { generateEmbedding, generateEmbeddingBatch, EMBEDDING_BATCH_LIMIT } = require('./embeddingService');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

const CHUNK_SIZE = 1200;   // characters per chunk — matches ingestLegalDocs.js
const CHUNK_OVERLAP = 200; // overlap to preserve context across chunk boundaries

/**
 * Splits cleaned text into overlapping chunks. Same algorithm as
 * ingestLegalDocs.js so retrieval quality/behavior stays consistent
 * regardless of which pipeline a document came in through.
 */
function chunkText(text) {
  const clean = (text || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end).trim());
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.length > 30);
}

/**
 * Dedupe guard, keyed by an arbitrary "source identifier" string — for
 * ingestLegalDocs.js that's the filename, for the scraper it's the
 * judgment's canonical PakLII URL. Whatever the caller passes, it must be
 * stable across re-runs so the same judgment isn't re-embedded (and
 * re-billed) every time the scraper runs again.
 */
async function alreadyIngested(sourceId) {
  const result = await pool.query(
    `SELECT 1 FROM legal_knowledge WHERE metadata->>'source_file' = $1 LIMIT 1`,
    [sourceId]
  );
  return result.rowCount > 0;
}

/**
 * Embeds one chunk and inserts it as a legal_knowledge row.
 * @param {object} meta - { source_type, title, citation, chapter, article_or_section, statute_name }
 * @param {string} chunk
 * @param {number} chunkIndex
 * @param {string} sourceId - dedupe key (filename or source URL)
 * @param {object} [extra] - { court, judge_name, year, ratio_decidendi }
 * @param {object} [extraMetadata] - anything else worth keeping in the metadata JSONB
 *   (e.g. { source_url, scraped_at } for scraped judgments)
 */
async function insertChunk(meta, chunk, chunkIndex, sourceId, extra = {}, extraMetadata = {}, precomputedEmbedding = null) {
  const embedding = precomputedEmbedding || await generateEmbedding(chunk);
  const embeddingLiteral = `[${embedding.join(',')}]`;

  await pool.query(
    `INSERT INTO legal_knowledge
      (source_type, title, citation, court, judge_name, year, chapter,
       article_or_section, statute_name, full_text, ratio_decidendi,
       embedding, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      meta.source_type,
      meta.title,
      meta.citation || null,
      extra.court || null,
      extra.judge_name || null,
      extra.year || null,
      meta.chapter || null,
      meta.article_or_section || null,
      meta.statute_name || null,
      chunk,
      extra.ratio_decidendi || null,
      embeddingLiteral,
      JSON.stringify({ source_file: sourceId, chunk_index: chunkIndex, ...extraMetadata }),
    ]
  );
}

/**
 * Full pipeline for one document: dedupe check -> chunk -> embed+insert
 * each chunk. Used by both the file ingester and the scraper so a partial
 * failure part-way through a long judgment doesn't silently leave a
 * document half-indexed without at least a warning in the logs.
 *
 * @returns {Promise<{skipped: boolean, chunksInserted: number}>}
 */
async function ingestDocument({ sourceId, rawText, meta, extra = {}, extraMetadata = {} }) {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) {
    logger.warn(`knowledgeIngest: no usable text extracted for ${sourceId}, skipping.`);
    return { skipped: true, chunksInserted: 0 };
  }

  // RESUME SUPPORT: if this document is already fully indexed (every chunk
  // index present), skip it. If it's only PARTIALLY indexed (a previous run
  // died mid-document — e.g. the daily embedding quota ran out), only the
  // missing chunks are embedded and inserted, so a re-run costs only what
  // is actually missing instead of re-embedding the whole document.
  const existing = await pool.query(
    `SELECT (metadata->>'chunk_index')::int AS idx
     FROM legal_knowledge
     WHERE metadata->>'source_file' = $1`,
    [sourceId]
  );
  const have = new Set(existing.rows.map((r) => r.idx));
  if (have.size >= chunks.length) {
    return { skipped: true, chunksInserted: 0 };
  }
  const missing = chunks.map((_, i) => i).filter((i) => !have.has(i));

  let inserted = 0;

  // Embed the missing chunks in large batches (one API request per batch)
  // instead of one request per chunk — one-by-one embedding is what
  // previously blew through the free-tier quota mid-document.
  const embeddings = new Map();
  for (let start = 0; start < missing.length; start += EMBEDDING_BATCH_LIMIT) {
    const idxs = missing.slice(start, start + EMBEDDING_BATCH_LIMIT);
    const batchTexts = idxs.map((i) => chunks[i]);
    try {
      const vectors = await generateEmbeddingBatch(batchTexts);
      idxs.forEach((idx, j) => embeddings.set(idx, vectors[j]));
    } catch (err) {
      if (err.dailyQuotaExhausted) {
        // Free-tier daily embedding quota is gone for today — stop cleanly.
        // The resume logic above means tomorrow's run picks up exactly here.
        logger.warn(`knowledgeIngest: daily embedding quota exhausted at chunk ${idxs[0]} of ${sourceId} (${inserted} inserted this run) — re-run tomorrow to resume.`);
        return { skipped: false, chunksInserted: inserted, quotaExhausted: true };
      }
      logger.warn(`knowledgeIngest: batch embedding failed for ${sourceId} chunks ${idxs[0]}-${idxs[idxs.length - 1]} (${err.message || err}), falling back to one-by-one...`);
      for (const idx of idxs) {
        try {
          embeddings.set(idx, await generateEmbedding(chunks[idx]));
        } catch (chunkErr) {
          if (chunkErr.dailyQuotaExhausted) {
            logger.warn(`knowledgeIngest: daily embedding quota exhausted at chunk ${idx} of ${sourceId} — re-run tomorrow to resume.`);
            return { skipped: false, chunksInserted: inserted, quotaExhausted: true };
          }
          logger.error(`knowledgeIngest: failed to embed chunk ${idx} of ${sourceId}: ${chunkErr.message || chunkErr}`);
        }
      }
    }
  }

  for (const i of missing) {
    const embedding = embeddings.get(i);
    if (!embedding) continue; // embedding failed even after retries — skip
    try {
      await insertChunk(meta, chunks[i], i, sourceId, extra, extraMetadata, embedding);
      inserted++;
    } catch (err) {
      // Don't let one bad chunk (e.g. a transient DB error) kill the whole
      // document — log it and keep going with the rest, then let the caller
      // decide whether a partial ingest is acceptable.
      logger.error(`knowledgeIngest: failed to insert chunk ${i} of ${sourceId}: ${err.message || err}`);
    }
  }

  return { skipped: false, chunksInserted: inserted };
}

module.exports = { chunkText, alreadyIngested, insertChunk, ingestDocument, CHUNK_SIZE, CHUNK_OVERLAP };
