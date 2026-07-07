-- =============================================================
-- Migration: 002_switch_embedding_dimension_to_768.sql
-- Purpose  : The embedding provider was switched from OpenAI's
--            text-embedding-3-small (1536 dimensions) to Gemini's
--            text-embedding-004 (768 dimensions), so the app runs
--            entirely on the already-configured Gemini API key without
--            requiring a separate billed OpenAI account.
--
--            This changes the `embedding` column's vector size to match.
--            Safe to run even if the table already has rows — any old
--            1536-dim embeddings are cleared (set to NULL) since they are
--            no longer the correct size; just re-run the ingestion script
--            afterwards to regenerate them at 768 dimensions.
--
-- Run once : psql -U <user> -d <db> -f 002_switch_embedding_dimension_to_768.sql
-- =============================================================

-- The ivfflat index is built for a specific vector size; it must be
-- dropped before the column type can change, then recreated below.
DROP INDEX IF EXISTS idx_legal_knowledge_embedding;

-- Clear out any existing 1536-dim embeddings (wrong size for the new
-- column) before changing the type, then change the column to 768 dims.
UPDATE legal_knowledge SET embedding = NULL;
ALTER TABLE legal_knowledge ALTER COLUMN embedding TYPE VECTOR(768);

-- Recreate the approximate-nearest-neighbor index for the new dimension.
-- (If seeding into a still-empty table, it's fine to run this now —
-- ivfflat just performs best when built after data exists; re-run
-- `REINDEX INDEX idx_legal_knowledge_embedding;` after ingestion if you
-- want to optimize it once real data is loaded.)
CREATE INDEX IF NOT EXISTS idx_legal_knowledge_embedding
    ON legal_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
