-- Adds documents.processing_started_at: records when the current
-- "processing" attempt actually began, so a stuck-forever document (its
-- process request died mid-flight - a server restart, a killed worker -
-- with no code path left to ever move it out of "processing") can be
-- told apart from one that's genuinely still working, and safely reclaimed
-- once it's been "processing" for longer than any real attempt should take.
--
-- How to apply: paste this whole file into the Supabase project's SQL
-- Editor (the same project synaptiq's backend already points at via
-- SUPABASE_URL) and run it. It's additive and backward-compatible - safe
-- to run once, and safe to run again if it somehow gets run twice
-- ("if not exists" makes it a no-op the second time).

alter table documents
  add column if not exists processing_started_at timestamptz;
