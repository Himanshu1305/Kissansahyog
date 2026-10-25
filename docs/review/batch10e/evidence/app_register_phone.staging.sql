-- public.app_register_phone as defined on STAGING (wzxtqbqlahyahsnoqqva), read-only via pg_get_functiondef
-- Read: 2026-10-18 (Batch 10E Phase 0). Not present in supabase/migrations/ at this point.
-- Owner/grants on staging (pg_proc.proacl): {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--   i.e. EXECUTE revoked from PUBLIC, granted to anon, authenticated, service_role. SECURITY DEFINER. No COMMENT.

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

-- Grants as observed on staging:
-- revoke all on function public.app_register_phone(text, text, text, numeric, numeric, text, boolean, boolean) from public;
-- grant execute on function public.app_register_phone(text, text, text, numeric, numeric, text, boolean, boolean) to anon, authenticated, service_role;
