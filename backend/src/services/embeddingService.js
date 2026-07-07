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
async function generateEmbedding(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 8000); // guard token limits
  if (!cleaned) {
    throw new Error('generateEmbedding: received empty text');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured — set it in backend/.env to enable the local law-library (RAG) search.');
  }

  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: cleaned }] },
      output_dimensionality: OUTPUT_DIMENSIONALITY,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Gemini embedding request failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error('Gemini embedding response did not contain an embedding vector.');
  }

  return values;
}

module.exports = { generateEmbedding };
