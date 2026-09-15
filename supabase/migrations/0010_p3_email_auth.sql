-- Kisan Sahyog — 0010 (Phase 3) email + password auth (alongside phone)
--
-- Adds email as an ADDITIONAL auth method. Phone flow is unchanged. Email users
-- authenticate via Supabase Auth (auth.users); their profile row is linked by
-- `auth_uid` = auth.uid(). Phone users keep phone as identifier, email null.
--
-- These email RPCs are SECURITY DEFINER and identify the caller via auth.uid()
-- (from the Supabase session JWT), so they are called through a dedicated
-- session-bearing client. They only touch `profiles`/`pincodes` as owner, so no
-- existing anon RLS policy is affected (data reads still run as anon, unchanged).

-- Profile columns.
alter table public.profiles alter column phone drop not null;
alter table public.profiles add column if not exists email text unique;
alter table public.profiles add column if not exists auth_uid uuid unique;
alter table public.profiles add column if not exists auth_provider text not null default 'phone';
alter table public.profiles drop constraint if exists profiles_auth_provider_check;
alter table public.profiles add constraint profiles_auth_provider_check
  check (auth_provider in ('phone', 'email'));
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- app_signup_email — create an email-registered profile for the current auth user.
-- Identified by auth.uid(); email taken from the verified JWT claim.
-- ---------------------------------------------------------------------------
create or replace function public.app_signup_email(
  p_full_name    text,
  p_village_town text,
  p_pincode      text,
  p_language     text
) returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_email   text := coalesce(auth.email(), (current_setting('request.jwt.claims', true)::json ->> 'email'));
  v_lang    text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_pin     public.pincodes%rowtype;
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name_required';
  end if;

  -- Idempotent: if a profile already exists for this auth user, return it.
  select * into v_profile from public.profiles where auth_uid = v_uid;
  if found then
    return v_profile;
  end if;

  select * into v_pin from public.pincodes where pincode = p_pincode;
  if not found then
    raise exception 'pincode_not_found';
  end if;

  begin
    insert into public.profiles (
      full_name, phone, email, auth_uid, auth_provider,
      village_town, pincode, latitude, longitude, preferred_language, disclaimer_accepted_at
    ) values (
      trim(p_full_name), null, v_email, v_uid, 'email',
      nullif(trim(coalesce(p_village_town, '')), ''), p_pincode,
      v_pin.latitude, v_pin.longitude, v_lang, now()
    )
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'email_exists';
  end;

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- app_login_email — return the current auth user's profile.
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
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  select * into v_profile from public.profiles where auth_uid = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  return v_profile;
end;
$$;

grant execute on function public.app_signup_email(text, text, text, text) to anon, authenticated;
grant execute on function public.app_login_email() to anon, authenticated;
