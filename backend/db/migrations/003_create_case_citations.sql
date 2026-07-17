-- =============================================================
-- Migration: 003_create_case_citations.sql
-- Purpose  : STATUTE-TO-CASE LINKING (citator graph).
--
--            legal_knowledge already stores constitution/statute/judgment
--            rows side by side, and legalRetrievalService does a parallel
--            hybrid search across all three. That's good for "find text
--            relevant to this query" but it is NOT the same as "find every
--            reported judgment that actually cites/applies THIS Section" —
--            a judgment can be semantically about something else entirely
--            and still turn on Section 302, or vice versa.
--
--            This table makes that relationship explicit and queryable:
--            given a statute/article row, instantly list every judgment
--            row that cites it (and the exact sentence it was cited in,
--            for auditability) — the way a real citator (Westlaw KeyCite /
--            Manupatra Citation Tool) works.
--
-- Run once : psql -U <user> -d <db> -f 003_create_case_citations.sql
-- =============================================================

DO $$ BEGIN
    CREATE TYPE citation_confidence AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS case_citations (
    id                  BIGSERIAL PRIMARY KEY,

    -- The judgment doing the citing.
    case_id             BIGINT NOT NULL REFERENCES legal_knowledge(id) ON DELETE CASCADE,

    -- The statute/constitution provision being cited. Nullable because the
    -- extractor sometimes only resolves a raw citation STRING (e.g. it finds
    -- the text "Section 302 PPC" but the matching legal_knowledge row for
    -- that exact section hasn't been ingested yet) — we still want to keep
    -- the raw reference on record rather than silently dropping it.
    cited_provision_id  BIGINT REFERENCES legal_knowledge(id) ON DELETE SET NULL,

    -- Raw text of what was actually matched in the judgment, e.g.
    -- "Section 302 PPC" or "Article 199 of the Constitution" — kept even
    -- when cited_provision_id resolves, for auditability (see the file
    -- header above: every extracted link should be traceable back to the
    -- exact sentence that produced it).
    raw_citation_text   TEXT NOT NULL,

    -- The sentence/snippet from the judgment the reference was pulled from.
    citation_context     TEXT,

    -- How the citation was extracted, and how sure we are it's correct.
    -- 'regex' = deterministic pattern match (e.g. "Section \d+ PPC") — high
    -- confidence by construction. 'llm' = model-extracted — needs review.
    -- 'manual' = human-added — always high confidence.
    extraction_method    TEXT NOT NULL DEFAULT 'regex' CHECK (extraction_method IN ('regex', 'llm', 'manual')),
    confidence           citation_confidence NOT NULL DEFAULT 'medium',

    -- Human review gate — mirrors the review-queue approach discussed
    -- earlier: low-confidence/LLM-extracted links stay unverified until an
    -- advocate confirms them, so bad links can't silently poison retrieval.
    verified             BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by          TEXT,
    verified_at          TIMESTAMPTZ,

    created_at           TIMESTAMPTZ DEFAULT now(),

    -- Same judgment shouldn't record the identical raw citation twice.
    UNIQUE (case_id, raw_citation_text)
);

CREATE INDEX IF NOT EXISTS idx_case_citations_case_id
    ON case_citations (case_id);

CREATE INDEX IF NOT EXISTS idx_case_citations_cited_provision
    ON case_citations (cited_provision_id);

CREATE INDEX IF NOT EXISTS idx_case_citations_unresolved
    ON case_citations (raw_citation_text)
    WHERE cited_provision_id IS NULL;

-- Fast lookup: "given this Section, give me every case that cites it"
-- (verified links first, then by confidence).
CREATE INDEX IF NOT EXISTS idx_case_citations_provision_verified
    ON case_citations (cited_provision_id, verified DESC);
