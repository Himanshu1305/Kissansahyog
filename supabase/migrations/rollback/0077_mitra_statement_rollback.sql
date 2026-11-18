-- Rollback for 0077 (optional, never run by a script): removes the Kissan Mitra statement function. Nothing else was added by 0077,
-- so nothing else changes and no data is lost. Safe to run twice. Pure ASCII.
drop function if exists public.admin_mitra_statement(uuid, uuid, integer, integer);
