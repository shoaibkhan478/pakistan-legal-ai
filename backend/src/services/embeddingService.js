// backend/services/embeddingService.js
//
// Isolated embedding provider. Keeping this separate means the ingestion
// script and retrieval service never need to know WHICH embedding model
// is in use — swap OpenAI <-> Gemini here only.
//
// IMPORTANT: the OpenAI client is created LAZILY (on first actual use),
// not at module-load time. The OpenAI SDK throws immediately in its
// constructor if OPENAI_API_KEY is missing/empty — if we built the client
// at the top of this file, simply `require`-ing this module (which
// ai.service.js does, transitively, for every chat/analysis/draft call)
// would crash the entire backend on startup whenever the RAG/embeddings
// feature hasn't been configured yet. RAG is meant to be optional and
// fail-soft (see ai.service.js's retrieveLawContext), so this must not be
// able to bring down the whole server.

const OpenAI = require('openai');

let openai = null;
function getClient() {
  if (openai) return openai;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured — set it in backend/.env to enable the local law-library (RAG) search.');
  }
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

/**
 * Generates a vector embedding for a piece of text.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 8000); // guard token limits
  if (!cleaned) {
    throw new Error('generateEmbedding: received empty text');
  }

  const response = await getClient().embeddings.create({
    model: 'text-embedding-3-small', // 1536 dims — matches the schema's VECTOR(1536)
    input: cleaned,
  });

  return response.data[0].embedding;
}

module.exports = { generateEmbedding };
