-- 0066_otp_and_sessions.sql — Batch 11A: real mobile OTP (2Factor, through Pages Functions) and a
-- secret per-login session token for every actor-based RPC. ADDITIVE. Ships DORMANT.
--
-- Two flags in public.site_settings, both inserted as FALSE (never overwritten on a re-run):
--   otp_required      TRUE → the phone-only paths app_login / app_register_phone / app_signup raise
--                     'otp_required'; sign-in and sign-up go through an OTP ticket instead.
--   session_enforced  TRUE (and otp_required TRUE) → every SECURITY DEFINER function whose first
--                     parameter is p_actor_id uuid requires the request header x-ks-session to carry a
--                     live session token of THAT user, else raises 'not_authenticated'.
--                     Enforcement needs BOTH flags on, so turning OTP off again can never leave phone
--                     users without a way to get a token.
-- With both flags FALSE every existing function behaves exactly as before (one extra flag read).
--
-- What this adds
--   * auth_private (the server-side pepper), otp_requests, otp_tickets, app_sessions — RLS on, NO policies,
--     no table privileges for anon / authenticated. Only the SECURITY DEFINER functions below (and the
--     service role) touch them.
--   * get_auth_flags()                                   anon, authenticated   {otp_required, session_enforced}
--   * otp_rate_check / otp_record_send / otp_record_verify / otp_issue_ticket   service_role only (Pages Functions)
--   * app_login_otp(p_phone, p_ticket)                   anon, authenticated   -> {profile, session_token} | null
--   * app_register_phone_otp(<app_register_phone args>, p_ticket)            -> {profile, session_token}
--   * app_issue_session()                                authenticated (e-mail users, auth.uid())
--   * app_logout_session(), app_session_valid(p_actor_id)  anon, authenticated
--   * require_actor(p_actor_id)                          internal (no grants)
-- What this changes (section 7, catalog-driven, original definitions saved in ks_fn_backup_0066):
--   * app_login, app_register_phone, app_signup: one line added as the first statement (the otp_required gate).
--   * every SECURITY DEFINER function with first parameter p_actor_id uuid (not on the allow-list): one line
--     added as the first statement: plpgsql `perform public.require_actor(p_actor_id);`,
--     SQL `select public.require_actor(p_actor_id);`. Bodies otherwise byte-for-byte unchanged; signatures,
--     return types, owners, grants, volatility and settings unchanged (CREATE OR REPLACE of pg_get_functiondef).
--   The guard is generated INSIDE the database this file runs on, so production's own function bodies are
--   kept (not staging's). scripts/gen-require-actor-migration.mjs produces the same statements from a live
--   catalog for review and checks the result (--check).
--
-- Rate limits (otp_rate_check): resend cooldown 30 s; per phone 3 sends / 10 min and 10 / 24 h; per IP 20 / h;
-- 5 verify attempts per OTP; OTP request valid 10 min; ticket valid 10 min, single use; session 30 days.
--
-- Rollback: supabase/migrations/rollback/0066_otp_and_sessions_rollback.sql (restores every saved definition,
-- then drops the new objects and the two flag rows).

-- 0. flags ----------------------------------------------------------------------------------------------
insert into public.site_settings (key, value, updated_at) values
  ('otp_required', 'false'::jsonb, now()),
  ('session_enforced', 'false'::jsonb, now())
on conflict (key) do nothing;

create or replace function public.auth_flag(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select s.value = 'true'::jsonb from public.site_settings s where s.key = p_key), false)
$$;
revoke all on function public.auth_flag(text) from public, anon, authenticated;

create or replace function public.get_auth_flags()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('otp_required', public.auth_flag('otp_required'),
                            'session_enforced', public.auth_flag('session_enforced'))
$$;
revoke all on function public.get_auth_flags() from public;
grant execute on function public.get_auth_flags() to anon, authenticated, service_role;

-- 1. private tables -------------------------------------------------------------------------------------
create table if not exists public.auth_private (
  id     int primary key default 1 check (id = 1),
  pepper text not null
);
alter table public.auth_private enable row level security;
revoke all on table public.auth_private from public, anon, authenticated;
insert into public.auth_private (id, pepper)
values (1, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (id) do nothing;

create table if not exists public.otp_requests (
  id                uuid primary key default gen_random_uuid(),
  phone_hash        text not null,
  ip_hash           text not null,
  purpose           text not null check (purpose in ('login', 'register')),
  twofactor_session text null,
  send_state        text not null default 'pending' check (send_state in ('pending', 'sent', 'failed', 'decoy')),
  attempts          int not null default 0,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default now() + interval '10 minutes',
  verified_at       timestamptz null
);
create index if not exists otp_requests_phone_idx on public.otp_requests (phone_hash, created_at desc);
create index if not exists otp_requests_ip_idx on public.otp_requests (ip_hash, created_at desc);
alter table public.otp_requests enable row level security;
revoke all on table public.otp_requests from public, anon, authenticated;

create table if not exists public.otp_tickets (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,
  purpose    text not null check (purpose in ('login', 'register')),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at    timestamptz null
);
alter table public.otp_tickets enable row level security;
revoke all on table public.otp_tickets from public, anon, authenticated;

create table if not exists public.app_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '30 days',
  last_seen_at timestamptz not null default now(),
  revoked_at   timestamptz null,
  device       text null
);
create index if not exists app_sessions_token_hash_idx on public.app_sessions (token_hash);
create index if not exists app_sessions_user_id_idx on public.app_sessions (user_id);
alter table public.app_sessions enable row level security;
revoke all on table public.app_sessions from public, anon, authenticated;

-- 2. small internal helpers (no grants) -----------------------------------------------------------------
-- Peppered hash for phone numbers and IP addresses (rate limiting without keeping them).
create or replace function public.ks_peppered_hash(p_value text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select encode(sha256(convert_to((select pepper from public.auth_private where id = 1) || ':' || coalesce(p_value, ''), 'UTF8')), 'hex')
$$;
revoke all on function public.ks_peppered_hash(text) from public, anon, authenticated;

-- Plain sha256 for high-entropy random tokens (tickets, session tokens).
create or replace function public.ks_token_hash(p_token text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$$;
revoke all on function public.ks_token_hash(text) from public, anon, authenticated;

-- A new random token: prefix + 64 hex characters from two gen_random_uuid() (pg_strong_random, 244 bits).
create or replace function public.ks_new_token(p_prefix text)
returns text
language sql
volatile
set search_path = public, pg_temp
as $$
  select p_prefix || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;
revoke all on function public.ks_new_token(text) from public, anon, authenticated;

-- The x-ks-session request header (PostgREST puts request headers, lower-cased, in request.headers).
create or replace function public.ks_request_header(p_name text)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_raw text := current_setting('request.headers', true);
begin
  if v_raw is null or v_raw = '' then return null; end if;
  return v_raw::json ->> p_name;
exception when others then
  return null;
end;
$$;
revoke all on function public.ks_request_header(text) from public, anon, authenticated;

create or replace function public.ks_presented_session_hash()
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select case when t is null or char_length(t) < 32 or char_length(t) > 200 then null else public.ks_token_hash(t) end
  from (select public.ks_request_header('x-ks-session') as t) s
$$;
revoke all on function public.ks_presented_session_hash() from public, anon, authenticated;

-- Creates a session for a profile and returns the raw token ONCE (only its hash is stored).
create or replace function public.ks_create_session(p_user_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_token text := public.ks_new_token('kss1_');
begin
  -- housekeeping for this user: old dead rows go, at most 20 live sessions are kept
  delete from public.app_sessions
   where user_id = p_user_id
     and (expires_at < now() - interval '7 days' or revoked_at < now() - interval '7 days');
  update public.app_sessions set revoked_at = now()
   where id in (select id from public.app_sessions
                 where user_id = p_user_id and revoked_at is null
                 order by created_at desc offset 19);
  insert into public.app_sessions (user_id, token_hash, device)
  values (p_user_id, public.ks_token_hash(v_token), nullif(left(coalesce(public.ks_request_header('user-agent'), ''), 120), ''));
  return v_token;
end;
$$;
revoke all on function public.ks_create_session(uuid) from public, anon, authenticated;

-- 3. the guard ------------------------------------------------------------------------------------------
create or replace function public.require_actor(p_actor_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
  v_id   uuid;
  v_seen timestamptz;
begin
  if not (public.auth_flag('session_enforced') and public.auth_flag('otp_required')) then
    return;
  end if;
  v_hash := public.ks_presented_session_hash();
  if v_hash is null or p_actor_id is null then
    raise exception 'not_authenticated';
  end if;
  select s.id, s.last_seen_at into v_id, v_seen
    from public.app_sessions s
   where s.token_hash = v_hash and s.user_id = p_actor_id
     and s.revoked_at is null and s.expires_at > now();
  if not found then
    raise exception 'not_authenticated';
  end if;
  if v_seen < now() - interval '1 minute' then
    begin
      update public.app_sessions set last_seen_at = now() where id = v_id;
    exception when read_only_sql_transaction then
      null; -- a read-only request (GET) must still work; last_seen_at is best effort
    end;
  end if;
end;
$$;
revoke all on function public.require_actor(uuid) from public, anon, authenticated;

-- 4. sessions for the client ----------------------------------------------------------------------------
create or replace function public.app_session_valid(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_sessions s
     where s.token_hash = public.ks_presented_session_hash()
       and s.user_id = p_actor_id and s.revoked_at is null and s.expires_at > now())
$$;
revoke all on function public.app_session_valid(uuid) from public;
grant execute on function public.app_session_valid(uuid) to anon, authenticated;

create or replace function public.app_logout_session()
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text := public.ks_presented_session_hash();
begin
  if v_hash is null then return false; end if;
  update public.app_sessions set revoked_at = now() where token_hash = v_hash and revoked_at is null;
  return found;
end;
$$;
revoke all on function public.app_logout_session() from public;
grant execute on function public.app_logout_session() to anon, authenticated;

-- E-mail users: call right after a successful Supabase Auth sign-in (supabaseAuth client).
create or replace function public.app_issue_session()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  select id into v_id from public.profiles where auth_uid = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  return jsonb_build_object('session_token', public.ks_create_session(v_id));
end;
$$;
revoke all on function public.app_issue_session() from public, anon;
grant execute on function public.app_issue_session() to authenticated;

-- 5. OTP helpers for the Pages Functions (service role only) ---------------------------------------------
-- Checks the limits and, when allowed, reserves the OTP request row. For 'login', a number that may not
-- sign in this way (unknown, or an admin) gets a 'decoy' row: same answer, no SMS, can never verify.
create or replace function public.otp_rate_check(p_phone text, p_ip text, p_purpose text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_ph    text;
  v_ip    text;
  v_last  timestamptz;
  v_n     int;
  v_first timestamptz;
  v_ok    boolean;
  v_id    uuid;
begin
  if v_phone !~ '^[0-9]{10}$' then raise exception 'invalid_phone'; end if;
  if p_purpose not in ('login', 'register') then raise exception 'invalid_purpose'; end if;
  v_ph := public.ks_peppered_hash('phone:' || v_phone);
  v_ip := public.ks_peppered_hash('ip:' || coalesce(nullif(trim(p_ip), ''), 'unknown'));
  perform pg_advisory_xact_lock(hashtextextended('ks_otp:' || v_ph, 0));

  -- housekeeping (cheap, indexed by created_at inside the phone index is not needed for this rare delete)
  delete from public.otp_requests where created_at < now() - interval '2 days';
  delete from public.otp_tickets where created_at < now() - interval '1 day';

  if p_purpose = 'register' and exists (select 1 from public.profiles where phone = v_phone) then
    return jsonb_build_object('ok', false, 'reason', 'phone_exists');
  end if;
  if public.login_is_locked(v_phone) then
    return jsonb_build_object('ok', false, 'reason', 'too_many', 'retry_after', 900);
  end if;

  select max(created_at) into v_last from public.otp_requests
   where phone_hash = v_ph and send_state <> 'failed';
  if v_last is not null and v_last > now() - interval '30 seconds' then
    return jsonb_build_object('ok', false, 'reason', 'cooldown',
      'retry_after', greatest(1, ceil(extract(epoch from (v_last + interval '30 seconds' - now())))::int));
  end if;

  select count(*), min(created_at) into v_n, v_first from public.otp_requests
   where phone_hash = v_ph and send_state <> 'failed' and created_at > now() - interval '10 minutes';
  if v_n >= 3 then
    return jsonb_build_object('ok', false, 'reason', 'too_many',
      'retry_after', greatest(1, ceil(extract(epoch from (v_first + interval '10 minutes' - now())))::int));
  end if;

  select count(*), min(created_at) into v_n, v_first from public.otp_requests
   where phone_hash = v_ph and created_at > now() - interval '24 hours';
  if v_n >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'too_many',
      'retry_after', greatest(1, ceil(extract(epoch from (v_first + interval '24 hours' - now())))::int));
  end if;

  select count(*), min(created_at) into v_n, v_first from public.otp_requests
   where ip_hash = v_ip and created_at > now() - interval '1 hour';
  if v_n >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'too_many',
      'retry_after', greatest(1, ceil(extract(epoch from (v_first + interval '1 hour' - now())))::int));
  end if;

  v_ok := p_purpose = 'register'
       or exists (select 1 from public.profiles where phone = v_phone and is_admin is not true);
  insert into public.otp_requests (phone_hash, ip_hash, purpose, send_state)
  values (v_ph, v_ip, p_purpose, case when v_ok then 'pending' else 'decoy' end)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'request_id', v_id, 'send', v_ok);
end;
$$;

-- After the provider call: its session id (sent) or null (provider failed; the row stops counting
-- against the cooldown and the 10-minute limit, but still counts per day and per IP).
create or replace function public.otp_record_send(p_request_id uuid, p_twofactor_session text)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  update public.otp_requests
     set twofactor_session = nullif(left(coalesce(p_twofactor_session, ''), 200), ''),
         send_state = case when nullif(p_twofactor_session, '') is null then 'failed' else 'sent' end
   where id = p_request_id and send_state = 'pending';
end;
$$;

-- Counts one verify attempt and hands back the provider session id (null for a decoy).
create or replace function public.otp_record_verify(p_request_id uuid, p_phone text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v public.otp_requests%rowtype;
begin
  select * into v from public.otp_requests where id = p_request_id for update;
  if not found or v.phone_hash <> public.ks_peppered_hash('phone:' || regexp_replace(coalesce(p_phone, ''), '\s', '', 'g')) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if v.verified_at is not null or v.expires_at <= now() or v.send_state in ('pending', 'failed') then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if v.attempts >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  update public.otp_requests set attempts = attempts + 1 where id = v.id;
  return jsonb_build_object('ok', true, 'session', v.twofactor_session, 'attempts_left', 5 - (v.attempts + 1));
end;
$$;

-- The code matched at the provider: mark the request verified and issue a single-use ticket.
create or replace function public.otp_issue_ticket(p_request_id uuid, p_phone text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v       public.otp_requests%rowtype;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_token text;
begin
  select * into v from public.otp_requests where id = p_request_id for update;
  if not found or v.phone_hash <> public.ks_peppered_hash('phone:' || v_phone)
     or v.send_state <> 'sent' or v.verified_at is not null or v.expires_at <= now() or v.attempts > 5 then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  update public.otp_requests set verified_at = now() where id = v.id;
  v_token := public.ks_new_token('kst1_');
  insert into public.otp_tickets (phone, purpose, token_hash) values (v_phone, v.purpose, public.ks_token_hash(v_token));
  return jsonb_build_object('ok', true, 'ticket', v_token);
end;
$$;

revoke all on function public.otp_rate_check(text, text, text) from public, anon, authenticated;
revoke all on function public.otp_record_send(uuid, text) from public, anon, authenticated;
revoke all on function public.otp_record_verify(uuid, text) from public, anon, authenticated;
revoke all on function public.otp_issue_ticket(uuid, text) from public, anon, authenticated;
grant execute on function public.otp_rate_check(text, text, text) to service_role;
grant execute on function public.otp_record_send(uuid, text) to service_role;
grant execute on function public.otp_record_verify(uuid, text) to service_role;
grant execute on function public.otp_issue_ticket(uuid, text) to service_role;

-- Takes a ticket (single use, unexpired, same phone, same purpose) — internal.
create or replace function public.ks_take_ticket(p_phone text, p_ticket text, p_purpose text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v public.otp_tickets%rowtype;
begin
  if p_ticket is null or char_length(p_ticket) < 32 or char_length(p_ticket) > 200 then
    return false;
  end if;
  select * into v from public.otp_tickets where token_hash = public.ks_token_hash(p_ticket) for update;
  if not found or v.phone <> p_phone or v.purpose <> p_purpose or v.used_at is not null or v.expires_at <= now() then
    return false;
  end if;
  update public.otp_tickets set used_at = now() where id = v.id;
  return true;
end;
$$;
revoke all on function public.ks_take_ticket(text, text, text) from public, anon, authenticated;

-- 6. sign-in and sign-up with a ticket ------------------------------------------------------------------
-- Same rules as app_login: invalid number → invalid_phone; lockout; unknown number or admin → null.
create or replace function public.app_login_otp(p_phone text, p_ticket text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_profile public.profiles%rowtype;
begin
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'invalid_phone';
  end if;
  if public.login_is_locked(v_phone) then
    raise exception 'too_many_attempts';
  end if;
  if not public.ks_take_ticket(v_phone, p_ticket, 'login') then
    raise exception 'otp_invalid';
  end if;

  select * into v_profile from public.profiles where phone = v_phone;
  if not found or v_profile.is_admin is true then
    perform public.login_record_attempt(v_phone, false);
    return null;
  end if;

  perform public.login_record_attempt(v_phone, true);
  return jsonb_build_object('profile', to_jsonb(v_profile), 'session_token', public.ks_create_session(v_profile.id));
end;
$$;
revoke all on function public.app_login_otp(text, text) from public;
grant execute on function public.app_login_otp(text, text) to anon, authenticated;

-- Same profile as app_register_phone (0064), after a 'register' ticket for that number.
create or replace function public.app_register_phone_otp(
  p_full_name text, p_phone text, p_village_town text, p_latitude numeric, p_longitude numeric,
  p_language text, p_disclaimer_accepted boolean, p_show_details boolean, p_ticket text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_lang    text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_lat     numeric := p_latitude;
  v_lng     numeric := p_longitude;
  v_profile public.profiles%rowtype;
begin
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name_required';
  end if;
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'invalid_phone';
  end if;
  if p_disclaimer_accepted is not true then
    raise exception 'disclaimer_not_accepted';
  end if;
  if v_lat is null or v_lng is null or abs(v_lat) > 90 or abs(v_lng) > 180 then
    v_lat := null;
    v_lng := null;
  end if;
  if exists (select 1 from public.profiles where phone = v_phone) then
    raise exception 'phone_exists';
  end if;
  if not public.ks_take_ticket(v_phone, p_ticket, 'register') then
    raise exception 'otp_invalid';
  end if;

  begin
    insert into public.profiles (
      full_name, phone, email, auth_uid, auth_provider,
      village_town, pincode, latitude, longitude, preferred_language,
      disclaimer_accepted_at, consents
    ) values (
      trim(p_full_name), v_phone, null, null, 'phone',
      nullif(trim(coalesce(p_village_town, '')), ''), null, v_lat, v_lng, v_lang,
      now(),
      jsonb_build_object('details_visibility', jsonb_build_object(
        'choice', case when p_show_details is false then 'hidden' else 'show' end,
        'chosen_at', now()::text,
        'version', '2026-10'
      ))
    )
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'phone_exists';
  end;

  return jsonb_build_object('profile', to_jsonb(v_profile), 'session_token', public.ks_create_session(v_profile.id));
end;
$$;
revoke all on function public.app_register_phone_otp(text, text, text, numeric, numeric, text, boolean, boolean, text) from public;
grant execute on function public.app_register_phone_otp(text, text, text, numeric, numeric, text, boolean, boolean, text) to anon, authenticated;

-- 7. catalog-driven changes to existing functions --------------------------------------------------------
-- Original definitions (first time each is changed) — the rollback re-runs them.
create table if not exists public.ks_fn_backup_0066 (
  fn         text primary key,     -- regprocedure text, e.g. public.close_listing(uuid,uuid)
  kind       text not null check (kind in ('gate', 'guard')),
  definition text not null,        -- pg_get_functiondef() before 0066
  changed_at timestamptz not null default now()
);
alter table public.ks_fn_backup_0066 enable row level security;
revoke all on table public.ks_fn_backup_0066 from public, anon, authenticated;

-- Actor functions that must NOT be guarded. Kept in step with scripts/require-actor-allowlist.json by
-- scripts/batch11a/catalog-test.mjs. require_actor itself is excluded by name below.
create table if not exists public.ks_require_actor_allow (
  fn     text primary key,         -- function name
  reason text not null
);
alter table public.ks_require_actor_allow enable row level security;
revoke all on table public.ks_require_actor_allow from public, anon, authenticated;
insert into public.ks_require_actor_allow (fn, reason) values
  ('app_session_valid', 'start-up check of the presented token: must answer true/false, never raise; acts on nothing')
on conflict (fn) do nothing;

-- Position just after the top-level BEGIN keyword of a plpgsql body (skips comments, strings,
-- quoted identifiers and dollar-quoted text). 0 = not found.
create or replace function pg_temp.ks_body_begin(p_src text)
returns int
language plpgsql
immutable
as $$
declare
  n   int := char_length(p_src);
  i   int := 1;
  c   text;
  j   int;
  tag text;
  w   text;
begin
  while i <= n loop
    c := substr(p_src, i, 1);
    if c = '-' and substr(p_src, i, 2) = '--' then
      j := strpos(substr(p_src, i), E'\n');
      if j = 0 then return 0; end if;
      i := i + j;
    elsif c = '/' and substr(p_src, i, 2) = '/*' then
      j := strpos(substr(p_src, i + 2), '*/');
      if j = 0 then return 0; end if;
      i := i + 2 + j + 1;
    elsif c = '''' then
      i := i + 1;
      loop
        if i > n then return 0; end if;
        if substr(p_src, i, 1) = '''' then
          if substr(p_src, i + 1, 1) = '''' then i := i + 2; else i := i + 1; exit; end if;
        else
          i := i + 1;
        end if;
      end loop;
    elsif c = '"' then
      j := strpos(substr(p_src, i + 1), '"');
      if j = 0 then return 0; end if;
      i := i + 1 + j;
    elsif c = '$' and substr(p_src, i) ~ '^\$[A-Za-z_]*\$' then
      tag := substring(substr(p_src, i) from '^(\$[A-Za-z_]*\$)');
      j := strpos(substr(p_src, i + char_length(tag)), tag);
      if j = 0 then return 0; end if;
      i := i + char_length(tag) + j - 1 + char_length(tag);
    elsif c ~ '[A-Za-z_]' then
      w := substring(substr(p_src, i) from '^([A-Za-z_][A-Za-z0-9_$]*)');
      if lower(w) = 'begin' then
        return i + char_length(w);
      end if;
      i := i + char_length(w);
    else
      i := i + 1;
    end if;
  end loop;
  return 0;
end;
$$;

-- Adds p_line as the first statement of the function and saves the original definition.
create or replace function pg_temp.ks_prepend(p_oid oid, p_kind text, p_plpgsql_line text, p_sql_line text)
returns void
language plpgsql
as $$
declare
  v_sig  text := p_oid::regprocedure::text;
  v_lang text;
  v_src  text;
  v_def  text := pg_get_functiondef(p_oid);
  v_new  text;
  v_pos  int;
  v_at   int;
begin
  select l.lanname, p.prosrc into v_lang, v_src
    from pg_proc p join pg_language l on l.oid = p.prolang where p.oid = p_oid;
  if v_lang = 'plpgsql' then
    v_at := pg_temp.ks_body_begin(v_src);
    if v_at = 0 then raise exception '0066: no top-level BEGIN found in %', v_sig; end if;
    v_new := substr(v_src, 1, v_at - 1) || E'\n  ' || p_plpgsql_line || substr(v_src, v_at);
  elsif v_lang = 'sql' and coalesce(v_src, '') <> '' then
    v_new := p_sql_line || E'\n' || v_src;
  else
    raise exception '0066: cannot change % (language %)', v_sig, v_lang;
  end if;
  v_pos := strpos(v_def, '$function$' || v_src || '$function$');
  if v_pos = 0 then raise exception '0066: body of % is not $function$-quoted as expected', v_sig; end if;
  insert into public.ks_fn_backup_0066 (fn, kind, definition) values (v_sig, p_kind, v_def)
  on conflict (fn) do nothing;
  execute overlay(v_def placing v_new from v_pos + char_length('$function$') for char_length(v_src));
end;
$$;

do $gen$
declare
  r       record;
  v_gate  int := 0;
  v_guard int := 0;
  v_left  int;
begin
  -- 7a. otp_required gate on the three phone-only paths (signatures and return types unchanged)
  for r in
    select p.oid from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in ('app_login', 'app_register_phone', 'app_signup')
       and p.prosrc not like '%auth_flag(''otp_required'')%'
  loop
    perform pg_temp.ks_prepend(r.oid, 'gate',
      'if public.auth_flag(''otp_required'') then raise exception ''otp_required''; end if;', null);
    v_gate := v_gate + 1;
  end loop;

  -- 7b. session guard on every SECURITY DEFINER function whose first parameter is p_actor_id uuid
  for r in
    select p.oid from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prosecdef
       and p.proargnames[1] = 'p_actor_id'
       and p.proargtypes[0] = 'uuid'::regtype
       and p.proname <> 'require_actor'
       and p.proname not in (select fn from public.ks_require_actor_allow)
       and p.prosrc !~ 'public\.require_actor\(p_actor_id\)'
  loop
    perform pg_temp.ks_prepend(r.oid, 'guard',
      'perform public.require_actor(p_actor_id);', 'select public.require_actor(p_actor_id);');
    v_guard := v_guard + 1;
  end loop;

  -- every actor function is now guarded or allow-listed
  select count(*) into v_left from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proargnames[1] = 'p_actor_id' and p.proargtypes[0] = 'uuid'::regtype
     and p.proname <> 'require_actor'
     and p.proname not in (select fn from public.ks_require_actor_allow)
     and (not p.prosecdef or p.prosrc !~ 'public\.require_actor\(p_actor_id\)');
  if v_left > 0 then
    raise exception '0066: % actor function(s) neither guarded nor allow-listed', v_left;
  end if;
  raise notice '0066: gated %, guarded % function(s)', v_gate, v_guard;
end;
$gen$;

notify pgrst, 'reload schema';
