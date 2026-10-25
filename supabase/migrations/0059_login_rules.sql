-- Batch 7L-2 — server login rules: admins never via mobile, and login throttling.
--
-- What this changes
--   * public.login_attempts (new)       one row per login attempt: identifier (normalised mobile
--                                       number or lower-cased email), time, success. Never a
--                                       password. RLS on, NO policies, NO grants to anon /
--                                       authenticated: only the SECURITY DEFINER login functions
--                                       (which run as the owner) can touch it.
--   * public.app_login(text)            same name, arguments, return type and grants. Now:
--                                       - refuses a profile with is_admin = true exactly like an
--                                         unknown number (admins sign in with email + password);
--                                       - after 5 failed attempts for a number within 15 minutes,
--                                         refuses for 15 minutes ('too_many_attempts').
--   * public.app_login_email()          same name, arguments, return type and grants. Now records
--                                       the successful sign-in and honours the same lock.
--   * public.app_login_email_guard(text, boolean)  (new) the email screen calls it before a
--                                       password check ("is this email locked?") and after a
--                                       wrong password ("count one failure").
--
-- TWO THINGS TO KNOW
--   1. A failed mobile login now RETURNS NO PROFILE (null) instead of raising 'not_found'.
--      In PostgreSQL a raised error undoes everything the function wrote, so a failure that
--      must be counted cannot also be raised. The app treats "no profile" as "not found".
--   2. Email passwords are checked by Supabase Auth, not by these functions, so a wrong
--      password never reaches the database on its own. The email throttle therefore depends
--      on the app calling app_login_email_guard. Someone who talks to Supabase Auth directly
--      skips it; the real limit on password guessing is Supabase Auth's own rate limit
--      (Dashboard → Authentication → Rate Limits).
--
-- Safe on a database with data; idempotent (run it twice, same result). It reads profiles and
-- writes only the new table. It does not touch profiles rows or any admin_* function.
--
-- ROLLBACK
--   Re-run the original definitions of app_login (0003_functions.sql) and app_login_email
--   (0010_p3_email_auth.sql), then:
--     drop function if exists public.app_login_email_guard(text, boolean);
--     drop function if exists public.login_is_locked(text);
--     drop function if exists public.login_record_attempt(text, boolean);
--     drop table if exists public.login_attempts;
--   The older app build keeps working against either version.

-- ---------------------------------------------------------------------------
-- login_attempts
-- ---------------------------------------------------------------------------
create table if not exists public.login_attempts (
  id           bigint generated always as identity primary key,
  identifier   text        not null,
  attempted_at timestamptz not null default now(),
  success      boolean     not null
);
create index if not exists login_attempts_identifier_time_idx
  on public.login_attempts (identifier, attempted_at desc);

alter table public.login_attempts enable row level security;
-- No policy is created on purpose. Supabase's default privileges would otherwise hand new
-- tables to anon/authenticated, so take everything away explicitly.
revoke all on table public.login_attempts from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers (not callable by anon / authenticated; the login functions run as owner).
-- ---------------------------------------------------------------------------

-- Locked = the 5 most recent failures since the last success all fall inside one 15-minute
-- span, and the newest of them is less than 15 minutes old.
create or replace function public.login_is_locked(p_identifier text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  with last_ok as (
    select coalesce(max(attempted_at), '-infinity'::timestamptz) as t
    from public.login_attempts
    where identifier = p_identifier and success
  ), recent as (
    select a.attempted_at
    from public.login_attempts a, last_ok
    where a.identifier = p_identifier
      and not a.success
      and a.attempted_at > last_ok.t
      and a.attempted_at > now() - interval '30 minutes'
    order by a.attempted_at desc
    limit 5
  )
  select count(*) = 5
     and max(attempted_at) > now() - interval '15 minutes'
     and max(attempted_at) - min(attempted_at) <= interval '15 minutes'
  from recent;
$$;

create or replace function public.login_record_attempt(p_identifier text, p_success boolean)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Housekeeping: nothing older than 30 days is kept.
  delete from public.login_attempts where attempted_at < now() - interval '30 days';
  insert into public.login_attempts (identifier, success) values (p_identifier, p_success);
end;
$$;

revoke all on function public.login_is_locked(text) from public, anon, authenticated;
revoke all on function public.login_record_attempt(text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- app_login — mobile number (no OTP yet). Same signature and grants as 0003.
-- ---------------------------------------------------------------------------
create or replace function public.app_login(p_phone text)
returns public.profiles
language plpgsql
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

  -- Same answer whether or not the number has an account.
  if public.login_is_locked(v_phone) then
    raise exception 'too_many_attempts';
  end if;

  select * into v_profile from public.profiles where phone = v_phone;

  -- Unknown number, or an admin: admins never sign in by mobile. Both get the SAME answer
  -- (no profile), and the failure is counted. Returning instead of raising keeps the count.
  if not found or v_profile.is_admin is true then
    perform public.login_record_attempt(v_phone, false);
    return null;
  end if;

  perform public.login_record_attempt(v_phone, true);
  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- app_login_email — profile of the signed-in Supabase Auth user. Same signature and grants
-- as 0010. The password itself was already checked by Supabase Auth.
-- ---------------------------------------------------------------------------
create or replace function public.app_login_email()
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_ident   text;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  select * into v_profile from public.profiles where auth_uid = v_uid;
  if not found then
    raise exception 'not_found';
  end if;

  v_ident := lower(trim(coalesce(v_profile.email, auth.email(), '')));
  if v_ident <> '' then
    if public.login_is_locked(v_ident) then
      raise exception 'too_many_attempts';
    end if;
    perform public.login_record_attempt(v_ident, true);
  end if;
  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- app_login_email_guard — called by the sign-in screen around the password check.
--   p_failed = false : "may this email try now?"  → raises 'too_many_attempts' if locked.
--   p_failed = true  : "the password was wrong"   → counts one failure (never raises for it).
-- It says nothing about whether the email has an account.
-- ---------------------------------------------------------------------------
create or replace function public.app_login_email_guard(p_email text, p_failed boolean default false)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ident text := lower(trim(coalesce(p_email, '')));
begin
  if v_ident !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(v_ident) > 254 then
    raise exception 'invalid_email';
  end if;
  if public.login_is_locked(v_ident) then
    raise exception 'too_many_attempts';
  end if;
  if p_failed is true then
    perform public.login_record_attempt(v_ident, false);
  end if;
end;
$$;

-- Grants: unchanged for the two existing functions (re-stated so the file stands alone).
grant execute on function public.app_login(text) to anon;
grant execute on function public.app_login_email() to anon, authenticated;
revoke all on function public.app_login_email_guard(text, boolean) from public;
grant execute on function public.app_login_email_guard(text, boolean) to anon, authenticated;
