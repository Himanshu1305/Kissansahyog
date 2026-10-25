-- 0067_admin_console_rollback.sql - removes everything migration 0067 added. Pure ASCII. Safe to run twice.
-- WARNING: dropping the profiles columns forgets who was blocked and every admin role; announcements and the
-- admin action log are deleted. No pre-existing function or table is touched.
drop trigger if exists ks_block_guard_listings on public.listings;
drop trigger if exists ks_block_guard_mela_interest on public.kisan_mela_interest;
drop trigger if exists ks_otp_usage_ins on public.otp_requests;
drop trigger if exists ks_otp_usage_upd on public.otp_requests;

drop function if exists public.admin_log_console_action(uuid, text, text, text, jsonb);
drop function if exists public.admin_list_actions(uuid, int, int, text, uuid);
drop function if exists public.ks_session_admin(text);
drop function if exists public.ks_phone_is_blocked(text);
drop function if exists public.admin_set_admin_role(uuid, uuid, text);
drop function if exists public.admin_list_user_status(uuid, text, text, int, int);
drop function if exists public.admin_set_user_blocked(uuid, uuid, boolean, text);
drop function if exists public.ks_block_guard();
drop function if exists public.ks_assert_not_blocked(uuid);
drop function if exists public.admin_get_otp_usage(uuid);
drop function if exists public.ks_otp_usage_trg();
drop function if exists public.admin_set_security_flag(uuid, text, boolean, text, text);
drop function if exists public.admin_get_security_status(uuid);
drop function if exists public.get_active_announcements();
drop function if exists public.admin_duplicate_announcement(uuid, uuid);
drop function if exists public.admin_delete_announcement(uuid, uuid);
drop function if exists public.admin_upsert_announcement(uuid, uuid, jsonb);
drop function if exists public.admin_list_announcements(uuid);
drop function if exists public.ks_announcement_clean(jsonb);
drop function if exists public.admin_whoami(uuid);
drop function if exists public.require_super_admin(uuid);
drop function if exists public.require_admin_session(uuid, boolean);
drop function if exists public.log_admin_action(uuid, text, text, text, jsonb);
drop function if exists public.ks_scrub_details(jsonb);

drop table if exists public.otp_usage_daily;
drop table if exists public.announcements;
drop table if exists public.admin_actions;

alter table public.profiles drop column if exists admin_role;
alter table public.profiles drop column if exists blocked_by;
alter table public.profiles drop column if exists blocked_at;
alter table public.profiles drop column if exists blocked_reason;
alter table public.profiles drop column if exists is_blocked;
