-- backend/db/migrations/004_create_case_treatment.sql
--
-- PRECEDENT TREATMENT GRAPH (case-to-case, not statute-to-case)
--
-- 003_create_case_citations.sql links judgments -> statutes/articles they
-- cite. It does NOT capture judgment -> judgment relationships — so today
-- the system can tell you "this judgment exists and mentions Section 302"
-- but NOT "this judgment was overruled two years later." Citing an
-- overruled or later-distinguished case in a court filing is a serious,
-- credibility-damaging mistake for an advocate, so this is worth its own
-- table rather than overloading case_citations (whose cited_provision_id
-- specifically points at statute-type legal_knowledge rows).
--
-- Run once : psql -U <user> -d <db> -f 004_create_case_treatment.sql

DO $$ BEGIN
    CREATE TYPE treatment_type AS ENUM ('followed', 'affirmed', 'distinguished', 'doubted', 'overruled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS case_treatment (
    id                  BIGSERIAL PRIMARY KEY,

    -- The LATER judgment doing the treating.
    treating_case_id    BIGINT NOT NULL REFERENCES legal_knowledge(id) ON DELETE CASCADE,

    -- The EARLIER judgment being treated (followed/overruled/etc).
    treated_case_id     BIGINT NOT NULL REFERENCES legal_knowledge(id) ON DELETE CASCADE,

    treatment           treatment_type NOT NULL,

    -- The sentence/snippet the treatment was identified from, for
    -- auditability — same principle as case_citations.citation_context.
    treatment_context   TEXT,

    extraction_method    TEXT NOT NULL DEFAULT 'llm' CHECK (extraction_method IN ('regex', 'llm', 'manual')),

    -- 'overruled'/'doubted' findings are exactly the kind of claim that
    -- MUST be human-verified before the system relies on them to warn an
    -- advocate off a citation — a false "overruled" flag is as harmful as
    -- missing a real one. Unverified negative treatments should be shown
    -- as "possible" until checked.
    verified             BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by          TEXT,
    verified_at          TIMESTAMPTZ,

    created_at            TIMESTAMPTZ DEFAULT now(),

    CHECK (treating_case_id != treated_case_id),
    UNIQUE (treating_case_id, treated_case_id, treatment)
);

CREATE INDEX IF NOT EXISTS idx_case_treatment_treated
    ON case_treatment (treated_case_id, treatment);

CREATE INDEX IF NOT EXISTS idx_case_treatment_treating
    ON case_treatment (treating_case_id);

-- Fast path for "is this specific citation currently under a negative
-- treatment flag?" — the query precedentFreshnessService.js runs most often.
CREATE INDEX IF NOT EXISTS idx_case_treatment_negative
    ON case_treatment (treated_case_id)
    WHERE treatment IN ('overruled', 'doubted');
