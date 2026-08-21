// backend/services/embeddingService.js
//
// Isolated embedding provider. Keeping this separate means the ingestion
// script and retrieval service never need to know WHICH embedding model
// is in use — swap providers here only.
//
// NOTE (switched from OpenAI to Gemini): the OpenAI text-embedding-3-small
// model requires a separate, billed OpenAI account — this app otherwise
// runs entirely on the free/already-configured Gemini API key. To avoid
// needing a second paid provider just for the local law-library search,
// this now calls Gemini's `gemini-embedding-001` model directly via its
// REST endpoint (with output_dimensionality set to 768, so no separate
// database migration is needed beyond the one already applied), using the
// same GEMINI_API_KEY already configured for every other AI feature in
// this app. Uses native fetch, matching the rest of ai.service.js (see
// the comment there for why the SDK is avoided).
//
// If you ever want to switch back to OpenAI (or another provider), this
// is the only file that needs to change — just make sure the new
// dimension count matches the `embedding VECTOR(n)` column in
// backend/db/migrations/001_create_legal_knowledge.sql (and the matching
// dimension-change migration, if any).

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const EMBEDDING_MODEL = 'gemini-embedding-001';
const OUTPUT_DIMENSIONALITY = 768; // matches the `embedding VECTOR(768)` column
const API_VERSION = 'v1beta';

/**
 * Generates a vector embedding for a piece of text using Gemini.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
// Gemini's free tier allows only ~1000 embedding requests/day and a small
// per-minute burst. When the API returns 429 it includes a `retryDelay`
// (e.g. "53s") telling us exactly how long to wait — honor it instead of
// hammering through and losing chunks (which is what previously left
// documents half-indexed).
const MAX_RETRIES = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(errBody, attempt) {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(errBody || '');
  const hinted = match ? parseFloat(match[1]) * 1000 : 0;
  return Math.max(hinted, Math.min(60_000, 2_000 * 2 ** attempt));
}

function cleanForEmbedding(text) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, 8000); // guard token limits
}

/**
 * Calls a Gemini embedding endpoint once and returns the raw response,
 * throwing a typed error on HTTP failure so callers can decide to retry.
 */
async function callEmbeddingEndpoint(endpoint, body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured — set it in backend/.env to enable the local law-library (RAG) search.');
  }

  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${EMBEDDING_MODEL}:${endpoint}?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const err = new Error(`Gemini embedding request failed (${res.status}): ${errBody}`);
    err.status = res.status;
    err.body = errBody;
    throw err;
  }

  return res.json();
}

async function withRateLimitRetries(fn, label) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = err.status === 429 || err.status === 503 || err.status === 500;
      if (!retryable || attempt === MAX_RETRIES) throw err;
      // A *daily* quota (PerDay quotaId in the 429 body) won't reset by
      // retrying today — surface it as non-retryable so the ingestion
      // pipeline can stop cleanly and resume tomorrow instead of sleeping
      // for hours inside a pointless retry loop.
      if (err.status === 429 && /PerDay/i.test(err.body || '')) {
        err.dailyQuotaExhausted = true;
        throw err;
      }
      const waitMs = retryDelayMs(err.body, attempt);
      console.warn(`${label}: rate-limited/unavailable (attempt ${attempt + 1}/${MAX_RETRIES}), waiting ${Math.round(waitMs / 1000)}s before retrying...`);
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

/**
 * Generates a vector embedding for a piece of text using Gemini.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  const cleaned = cleanForEmbedding(text);
  if (!cleaned) {
    throw new Error('generateEmbedding: received empty text');
  }

  const data = await withRateLimitRetries(
    () => callEmbeddingEndpoint('embedContent', {
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: cleaned }] },
      output_dimensionality: OUTPUT_DIMENSIONALITY,
    }),
    'generateEmbedding'
  );

  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error('Gemini embedding response did not contain an embedding vector.');
  }

  return values;
}

/**
 * Embeds many texts in ONE request via batchEmbedContents. Each call counts
 * as a single request against the quota regardless of how many texts it
 * carries (up to 100), so bulk ingestion uses ~100x fewer quota units than
 * one-by-one embedding.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function generateEmbeddingBatch(texts) {
  const cleaned = texts.map(cleanForEmbedding);
  if (cleaned.some((t) => !t)) {
    throw new Error('generateEmbeddingBatch: received empty text in batch');
  }

  const data = await withRateLimitRetries(
    () => callEmbeddingEndpoint('batchEmbedContents', {
      requests: cleaned.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        output_dimensionality: OUTPUT_DIMENSIONALITY,
      })),
    }),
    'generateEmbeddingBatch'
  );

  const embeddings = data?.embeddings;
  if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
    throw new Error('Gemini batch embedding response did not contain a vector for every input text.');
  }
  return embeddings.map((e) => e.values);
}

module.exports = { generateEmbedding, generateEmbeddingBatch, EMBEDDING_BATCH_LIMIT: 100 };
