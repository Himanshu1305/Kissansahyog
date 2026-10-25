-- Batch 7L-2 — one registration form (email + password + mobile, no pincode) and the
-- "show my details / keep hidden" choice.
--
-- What this changes
--   * profiles.pincode                   NOT NULL is dropped (the new form has no pincode).
--                                        No row is changed; existing pincodes stay as they are.
--   * public.app_register(...)  (new)    creates the profile for the signed-in Supabase Auth
--                                        user: email from the session, mobile number required,
--                                        village/town + the coordinates of the chosen TOWN from
--                                        the places list, and the visibility choice stored in
--                                        profiles.consents -> 'details_visibility'.
--   * public.accept_listing_consents     same signature. It used to REPLACE the whole consents
--                                        value; it now keeps 'details_visibility' when it writes
--                                        the listing consents. Nothing else in it changes.
--   * public.get_listing_contact(uuid)   same signature. A profile that chose "keep hidden"
--                                        no longer has its name and number given out; the
--                                        caller gets 'contact_hidden'. Profiles that never made
--                                        the choice (every existing user) behave as before.
--
-- The older functions app_signup and app_signup_email are NOT touched or dropped, so an older
-- app build can still register the old way.
--
-- Safe on a database with data; idempotent.
--
-- ROLLBACK
--   drop function if exists public.app_register(text, text, text, numeric, numeric, text, boolean, boolean);
--   Re-run accept_listing_consents from 0054_consents.sql and get_listing_contact from
--   0030_private_listing_contact.sql.
--   Leave profiles.pincode nullable unless every row has a pincode again:
--     alter table public.profiles alter column pincode set not null;

alter table public.profiles alter column pincode drop not null;

-- ---------------------------------------------------------------------------
-- app_register — called with the Supabase Auth session of the person who just signed up.
-- ---------------------------------------------------------------------------
create or replace function public.app_register(
  p_full_name           text,
  p_phone               text,
  p_village_town        text,
  p_latitude            numeric,
  p_longitude           numeric,
  p_language            text,
  p_disclaimer_accepted boolean,
  p_show_details        boolean
) returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_email      text := lower(trim(coalesce(auth.email(), (current_setting('request.jwt.claims', true)::json ->> 'email'), '')));
  v_phone      text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_lang       text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_lat        numeric := p_latitude;
  v_lng        numeric := p_longitude;
  v_profile    public.profiles%rowtype;
  v_constraint text;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;

  -- Idempotent: a second call for the same signed-in user returns the profile already made.
  select * into v_profile from public.profiles where auth_uid = v_uid;
  if found then
    return v_profile;
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name_required';
  end if;
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'invalid_phone';
  end if;
  if p_disclaimer_accepted is not true then
    raise exception 'disclaimer_not_accepted';
  end if;
  if v_email = '' then
    raise exception 'invalid_email';
  end if;
  -- Coordinates are optional; a pair outside the globe is dropped rather than stored.
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
      trim(p_full_name), v_phone, v_email, v_uid, 'email',
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
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint ilike '%phone%' then
      raise exception 'phone_exists';
    end if;
    raise exception 'email_exists';
  end;

  return v_profile;
end;
$$;

revoke all on function public.app_register(text, text, text, numeric, numeric, text, boolean, boolean) from public;
grant execute on function public.app_register(text, text, text, numeric, numeric, text, boolean, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- accept_listing_consents — as in 0054, but the visibility choice survives.
-- ---------------------------------------------------------------------------
create or replace function public.accept_listing_consents(
  p_actor_id uuid,
  p_items jsonb
) returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_items jsonb := coalesce(p_items, '{}'::jsonb);
begin
  if coalesce((v_items->>'connect_only')::boolean, false) is not true
     or coalesce((v_items->>'no_verification')::boolean, false) is not true
     or coalesce((v_items->>'no_payments')::boolean, false) is not true
     or coalesce((v_items->>'posting_rules')::boolean, false) is not true then
    raise exception 'consents_not_accepted';
  end if;

  update public.profiles
  set consents = jsonb_build_object(
        'version', '2026-10',
        'accepted_at', now()::text,
        'items', jsonb_build_object(
          'connect_only', true,
          'no_verification', true,
          'no_payments', true,
          'posting_rules', true
        )
      ) || case when consents ? 'details_visibility'
                then jsonb_build_object('details_visibility', consents -> 'details_visibility')
                else '{}'::jsonb end,
      disclaimer_accepted_at = coalesce(disclaimer_accepted_at, now())
  where id = p_actor_id
  returning * into v_profile;
  if not found then raise exception 'not_authorized'; end if;
  return v_profile;
end;
$$;
grant execute on function public.accept_listing_consents(uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_listing_contact — as in 0030, plus the "keep hidden" choice of the listing's owner.
-- ---------------------------------------------------------------------------
create or replace function public.get_listing_contact(p_listing_id uuid)
returns table (full_name text, phone text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.listings l
    join public.profiles p on p.id = l.user_id
    where l.id = p_listing_id
      and l.status = 'active'
      and l.expires_at > now()
      and p.consents #>> '{details_visibility,choice}' = 'hidden'
  ) then
    raise exception 'contact_hidden';
  end if;

  return query
  select p.full_name,
         coalesce((select c.contact_phone from public.listing_private_contact c where c.listing_id = l.id), p.phone) as phone
  from public.listings l
  join public.profiles p on p.id = l.user_id
  where l.id = p_listing_id
    and l.status = 'active'
    and l.expires_at > now();
  if not found then
    raise exception 'not_available';
  end if;
end;
$$;
