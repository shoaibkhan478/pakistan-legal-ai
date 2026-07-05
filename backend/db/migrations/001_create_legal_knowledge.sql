-- =============================================================
-- Migration: 001_create_legal_knowledge.sql
-- Purpose  : Core knowledge base for the Pakistan Legal AI Agent
--            Stores Constitution Articles, Statutory Sections
--            (PPC / CrPC / CPC etc.), and Court Judgments.
-- Run once : psql -U <user> -d <db> -f 001_create_legal_knowledge.sql
-- =============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
    CREATE TYPE legal_source_type AS ENUM (
        'constitution',
        'statute',       -- PPC, CrPC, CPC, etc.
        'judgment'        -- SC / High Court decrees
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS legal_knowledge (
    id                  BIGSERIAL PRIMARY KEY,
    source_type         legal_source_type NOT NULL,

    -- Common identifiers
    title               TEXT NOT NULL,              -- e.g. "Right to Fair Trial" / "Qatl-e-amd" / "Benazir Bhutto vs Federation of Pakistan"
    citation            TEXT,                        -- e.g. "PLD 2012 SC 553" (null for constitution/statute)
    court               TEXT,                        -- "Supreme Court of Pakistan", "Lahore High Court", etc.
    judge_name          TEXT,                        -- e.g. "Justice Qazi Faez Isa"
    year                INT,

    -- Structural identifiers (constitution / statute)
    chapter             TEXT,                        -- e.g. "Part II: Fundamental Rights"
    article_or_section  TEXT,                        -- e.g. "Article 199" / "Section 302"
    statute_name        TEXT,                        -- e.g. "Pakistan Penal Code, 1860"

    -- Content
    full_text           TEXT NOT NULL,               -- raw chunk text
    ratio_decidendi     TEXT,                        -- core holding / "faisla" summary (judgments only)

    -- Search
    embedding           VECTOR(1536),                -- OpenAI text-embedding-3-small dims (adjust if using a different model)
    search_vector       TSVECTOR GENERATED ALWAYS AS (
                            to_tsvector('english',
                                coalesce(title,'') || ' ' ||
                                coalesce(full_text,'') || ' ' ||
                                coalesce(citation,'') || ' ' ||
                                coalesce(article_or_section,'')
                            )
                        ) STORED,

    metadata            JSONB DEFAULT '{}'::jsonb,   -- source file, page number, chunk index, etc.
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legal_knowledge_search_vector
    ON legal_knowledge USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_legal_knowledge_embedding
    ON legal_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_legal_knowledge_source_type
    ON legal_knowledge (source_type);

CREATE INDEX IF NOT EXISTS idx_legal_knowledge_article_section
    ON legal_knowledge (article_or_section);

CREATE INDEX IF NOT EXISTS idx_legal_knowledge_citation_trgm
    ON legal_knowledge USING GIN (citation gin_trgm_ops);

-- NOTE: The ivfflat index is an approximate-nearest-neighbor index. It performs
-- best when built AFTER data exists. If seeding into an empty table, run the
-- ingestion script first, then execute:
--   REINDEX INDEX idx_legal_knowledge_embedding;
