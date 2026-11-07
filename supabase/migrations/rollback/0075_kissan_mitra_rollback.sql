-- Rollback for 0075 (optional, never run by a script): removes everything Batch 20 added.
-- WARNING: this DELETES the recorded Kissan Mitra data - every Mitra, every payment record, and the "who registered
-- this person" column on profiles. The profiles themselves stay. Take a copy first if you want to keep the ledger.
-- Safe to run twice. Pure ASCII. No existing function is touched (0075 did not change any).
drop function if exists public.admin_list_mitra_payments(uuid, uuid);
drop function if exists public.admin_mark_mitra_paid(uuid, uuid, integer, date, text);
drop function if exists public.admin_reassign_registration(uuid, uuid, uuid);
drop function if exists public.admin_list_mitra_registrations(uuid, uuid, integer, integer);
drop function if exists public.admin_upsert_mitra(uuid, uuid, jsonb);
drop function if exists public.admin_list_mitras(uuid);
drop function if exists public.set_my_mitra(uuid, uuid);
drop function if exists public.list_active_mitras();
drop function if exists public.ks_mitra_kind(public.profiles);
drop index if exists public.profiles_mitra_idx;
alter table public.profiles drop column if exists mitra_paid_id;
alter table public.profiles drop column if exists mitra_set_at;
alter table public.profiles drop column if exists mitra_id;
drop table if exists public.kissan_mitra_payments;
drop table if exists public.kissan_mitras;
