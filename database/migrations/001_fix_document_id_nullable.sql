-- ============================================================
-- MIGRATION: Allow FIR / Notice / Judgment analysis without an
-- uploaded document (i.e. when the user pastes text directly).
--
-- BUG: fir_analyses.document_id, notice_analyses.document_id and
-- judgment_analyses.document_id were declared NOT NULL, but the
-- API and frontend both support analyzing raw pasted text with no
-- document_id, which caused a 500 error ("null value in column
-- document_id violates not-null constraint") every time a user
-- pasted text instead of uploading a file first.
--
-- Run this against an existing database that was created from an
-- older copy of schema.sql. New databases created from the
-- updated schema.sql already have this fixed.
-- ============================================================

ALTER TABLE fir_analyses ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE notice_analyses ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE judgment_analyses ALTER COLUMN document_id DROP NOT NULL;
