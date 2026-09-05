-- ============================================================
-- MIGRATION: Add 'courtroom_script' to the draft_type enum.
--
-- Backs the new "Courtroom Script" feature (opening statement,
-- examination-in-chief, cross-examination, closing arguments,
-- generated together as one senior-advocate-style package and
-- saved through the existing drafts table/routes).
--
-- Run this against an existing database that was created from an
-- older copy of schema.sql. New databases created from the updated
-- schema.sql already have this value.
-- ============================================================

ALTER TYPE draft_type ADD VALUE IF NOT EXISTS 'courtroom_script';
