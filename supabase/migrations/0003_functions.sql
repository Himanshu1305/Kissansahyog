-- Kisan Sahyog — 0003 RPC layer (SECURITY DEFINER)
--
-- These functions are the ONLY write path (and the only profile-read path) for
-- the anon client. They run as owner, bypassing RLS, and enforce ownership /
-- validation in-body. Error strings are stable codes the client maps to
-- bilingual messages (see src/lib/errors.js). search_path is pinned for safety.

-- ---------------------------------------------------------------------------
-- app_signup — create a profile (trust-based, no OTP).
-- ---------------------------------------------------------------------------
create or replace function public.app_signup(
  p_full_name           text,
  p_phone               text,
  p_village_town        text,
  p_pincode             text,
  p_language            text,
  p_disclaimer_accepted boolean
) returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone   text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  v_lang    text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_pin     public.pincodes%rowtype;
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

  select * into v_pin from public.pincodes where pincode = p_pincode;
  if not found then
    raise exception 'pincode_not_found';
  end if;

  begin
    insert into public.profiles (
      full_name, phone, village_town, pincode,
      latitude, longitude, preferred_language, disclaimer_accepted_at
    ) values (
      trim(p_full_name), v_phone, nullif(trim(coalesce(p_village_town, '')), ''), p_pincode,
      v_pin.latitude, v_pin.longitude, v_lang, now()
    )
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'phone_exists';
  end;

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- app_login — return a profile by phone (trust-based; no verification step).
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
  select * into v_profile from public.profiles where phone = v_phone;
  if not found then
    raise exception 'not_found';
  end if;
  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_listing — owned by p_actor_id; validates per category.
-- ---------------------------------------------------------------------------
create or replace function public.create_listing(
  p_actor_id      uuid,
  p_listing_type  text,
  p_category      text,
  p_details       jsonb,
  p_latitude      numeric,
  p_longitude     numeric,
  p_pincode       text,
  p_self_declared boolean
) returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor   public.profiles%rowtype;
  v_listing public.listings%rowtype;
  v_lat     numeric;
  v_long    numeric;
  v_pin     text;
begin
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found then
    raise exception 'not_authorized';
  end if;
  if v_actor.disclaimer_accepted_at is null then
    raise exception 'disclaimer_not_accepted';
  end if;
  if p_listing_type not in ('offer', 'requirement') then
    raise exception 'invalid_listing_type';
  end if;
  if p_category not in ('land', 'equipment', 'labor') then
    raise exception 'invalid_category';
  end if;

  -- Location falls back to the poster's home coordinates when not overridden.
  v_lat  := coalesce(p_latitude, v_actor.latitude);
  v_long := coalesce(p_longitude, v_actor.longitude);
  v_pin  := coalesce(nullif(trim(coalesce(p_pincode, '')), ''), v_actor.pincode);

  -- Category-specific validation (light; full shape documented + client-checked).
  if p_category = 'land' and p_listing_type = 'offer' and p_self_declared is not true then
    raise exception 'self_declaration_required';
  end if;

  if p_category = 'equipment' then
    if coalesce(p_details->>'equipment_type_id', '') = '' then
      raise exception 'equipment_type_required';
    end if;
  end if;

  if p_category = 'labor' then
    if coalesce((p_details->>'worker_count')::int, 0) <= 0 then
      raise exception 'invalid_worker_count';
    end if;
    if (p_details->>'available_from') is not null
       and (p_details->>'available_to') is not null
       and (p_details->>'available_from')::date > (p_details->>'available_to')::date then
      raise exception 'invalid_date_range';
    end if;
  end if;

  insert into public.listings (
    user_id, listing_type, category, latitude, longitude, pincode,
    details, self_declared
  ) values (
    p_actor_id, p_listing_type, p_category, v_lat, v_long, v_pin,
    coalesce(p_details, '{}'::jsonb),
    (p_category = 'land' and p_listing_type = 'offer' and p_self_declared is true)
  )
  returning * into v_listing;

  return v_listing;
end;
$$;

-- ---------------------------------------------------------------------------
-- close_listing — owner-only status flip to 'closed'.
-- ---------------------------------------------------------------------------
create or replace function public.close_listing(
  p_actor_id   uuid,
  p_listing_id uuid
) returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_listing public.listings%rowtype;
begin
  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'not_found';
  end if;
  if v_listing.user_id <> p_actor_id then
    raise exception 'not_owner';
  end if;

  update public.listings set status = 'closed'
  where id = p_listing_id
  returning * into v_listing;

  return v_listing;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_my_listings — all of the actor's listings incl. closed/expired.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_listings(p_actor_id uuid)
returns table (
  id            uuid,
  listing_type  text,
  category      text,
  status        text,
  latitude      numeric,
  longitude     numeric,
  pincode       text,
  details       jsonb,
  self_declared boolean,
  created_at    timestamptz,
  expires_at    timestamptz,
  is_expired    boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select l.id, l.listing_type, l.category, l.status, l.latitude, l.longitude,
         l.pincode, l.details, l.self_declared, l.created_at, l.expires_at,
         (l.expires_at <= now()) as is_expired
  from public.listings l
  where l.user_id = p_actor_id
  order by l.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- get_listing_contact — reveal lister name + phone for an active listing only.
-- ---------------------------------------------------------------------------
create or replace function public.get_listing_contact(p_listing_id uuid)
returns table (full_name text, phone text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select p.full_name, p.phone
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

-- ---------------------------------------------------------------------------
-- Grants: anon may execute the RPC surface. (No table write grants exist.)
-- ---------------------------------------------------------------------------
grant execute on function public.app_signup(text, text, text, text, text, boolean) to anon;
grant execute on function public.app_login(text) to anon;
grant execute on function public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean) to anon;
grant execute on function public.close_listing(uuid, uuid) to anon;
grant execute on function public.get_my_listings(uuid) to anon;
grant execute on function public.get_listing_contact(uuid) to anon;
