-- 0064_app_register_phone.sql — Batch 10E Phase 3A: sign-up with name + mobile only (no email).
--
-- What this adds (ADDITIVE — no table, column, policy or existing function is changed)
--   * public.app_register_phone(...)  (new)  creates a phone-only profile: email NULL, auth_uid NULL,
--                                       auth_provider = 'phone'. Same 8 parameters and same visibility
--                                       choice (profiles.consents -> 'details_visibility') as
--                                       app_register (0060), but it needs no Supabase Auth session.
--     Checks: name not empty (name_required), mobile = exactly 10 digits after removing spaces
--     (invalid_phone), acknowledgment accepted (disclaimer_not_accepted), mobile not already on a
--     profile (phone_exists, also on a unique_violation race). Coordinates out of range are dropped.
--     It never sets is_admin, so no admin account can be created or reached through it; admins still
--     sign in only by email + password (0059 app_login refuses admins on the mobile path).
--   The app then signs the new user in exactly like a mobile login (the returned profile is the
--   local session, as app_login's is). Trust-based until OTP ships (same as mobile login today).
--
-- Relies on: profiles.email nullable and profiles.phone UNIQUE (profiles_phone_key), both already true.
--
-- STAGING: already applied by the founder (Cowork) before Batch 10E. This file reproduces the live
-- staging definition exactly (pg_get_functiondef, read-only, 2026-10-18) plus its grants.
-- PRODUCTION: not applied yet; the step is in docs/review/batch10e/SHIP.md.
-- Rollback: supabase/migrations/rollback/0064_app_register_phone_rollback.sql (drops the function).

CREATE OR REPLACE FUNCTION public.app_register_phone(p_full_name text, p_phone text, p_village_town text, p_latitude numeric, p_longitude numeric, p_language text, p_disclaimer_accepted boolean, p_show_details boolean)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_phone      text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_lang       text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_lat        numeric := p_latitude;
  v_lng        numeric := p_longitude;
  v_profile    public.profiles%rowtype;
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

  return v_profile;
end;
$function$
;

revoke all on function public.app_register_phone(text, text, text, numeric, numeric, text, boolean, boolean) from public;
grant execute on function public.app_register_phone(text, text, text, numeric, numeric, text, boolean, boolean) to anon, authenticated, service_role;
