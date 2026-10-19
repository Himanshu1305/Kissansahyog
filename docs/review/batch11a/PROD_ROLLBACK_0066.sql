-- ROLLBACK of 0066_otp_and_sessions.sql (Batch 11A).
-- Order: turn both flags OFF first (instant, no deploy), roll the website back if needed, THEN run this.
-- Effects: every function 0066 changed gets back its exact pre-0066 definition (saved by 0066 in
-- ks_fn_backup_0066 on THIS database); the OTP / session tables, the new functions and the two flag rows are
-- removed. All session tokens and OTP tickets stop existing (users of an old app build are unaffected).

-- 1. flags off (so nothing is enforced while this runs) ---------------------------------------------------
update public.site_settings set value = 'false'::jsonb, updated_at = now()
 where key in ('otp_required', 'session_enforced');

-- 2. restore the original definitions ----------------------------------------------------------------------
do $rb$
declare
  r record;
  n int := 0;
begin
  if to_regclass('public.ks_fn_backup_0066') is null then
    raise notice '0066 rollback: no backup table — nothing to restore';
    return;
  end if;
  for r in select fn, definition from public.ks_fn_backup_0066 order by fn loop
    execute r.definition;
    n := n + 1;
  end loop;
  raise notice '0066 rollback: restored % function definition(s)', n;
end;
$rb$;

-- 3. new functions -----------------------------------------------------------------------------------------
drop function if exists public.app_login_otp(text, text);
drop function if exists public.app_register_phone_otp(text, text, text, numeric, numeric, text, boolean, boolean, text);
drop function if exists public.app_issue_session();
drop function if exists public.app_logout_session();
drop function if exists public.app_session_valid(uuid);
drop function if exists public.otp_rate_check(text, text, text);
drop function if exists public.otp_record_send(uuid, text);
drop function if exists public.otp_record_verify(uuid, text);
drop function if exists public.otp_issue_ticket(uuid, text);
drop function if exists public.ks_take_ticket(text, text, text);
drop function if exists public.require_actor(uuid);
drop function if exists public.ks_create_session(uuid);
drop function if exists public.ks_presented_session_hash();
drop function if exists public.ks_request_header(text);
drop function if exists public.ks_new_token(text);
drop function if exists public.ks_token_hash(text);
drop function if exists public.ks_peppered_hash(text);
drop function if exists public.get_auth_flags();
drop function if exists public.auth_flag(text);

-- 4. tables and flag rows ------------------------------------------------------------------------------------
drop table if exists public.app_sessions;
drop table if exists public.otp_tickets;
drop table if exists public.otp_requests;
drop table if exists public.auth_private;
drop table if exists public.ks_require_actor_allow;
drop table if exists public.ks_fn_backup_0066;
delete from public.site_settings where key in ('otp_required', 'session_enforced');

do $rb2$
begin
  if to_regclass('public.schema_migrations') is not null then
    delete from public.schema_migrations where version = '0066_otp_and_sessions.sql';
  end if;
end;
$rb2$;
notify pgrst, 'reload schema';
