-- Kisan Sahyog — 0006 (v1.1) asset-location distance fix
--
-- BUG: listings inherited the poster's PROFILE coordinates, so land/equipment/
-- labor located away from the poster's home (e.g. a Hyderabad landowner listing
-- land in Sagar) matched near the poster instead of near the asset.
--
-- FIX: when a listing carries its own pincode, derive its coordinates from the
-- `pincodes` table (single source of truth) SERVER-SIDE — authoritative, even if
-- a client passes stale/forged lat/long. Only when NO listing pincode is given
-- do we fall back to explicit coords, then the poster's home (backward compat for
-- any legacy caller). The client now always sends the asset pincode.
--
-- Unchanged: ownership, disclaimer gate, category/listing-type checks, the
-- land-offer self-declaration rule, and the details JSONB passthrough.

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
  v_pinrow  public.pincodes%rowtype;
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

  -- ASSET LOCATION: coordinates come from the listing's OWN pincode, looked up
  -- here so they are authoritative regardless of what the client sent.
  v_pin := nullif(trim(coalesce(p_pincode, '')), '');
  if v_pin is not null then
    select * into v_pinrow from public.pincodes where pincode = v_pin;
    if not found then
      raise exception 'pincode_not_found';
    end if;
    v_lat  := v_pinrow.latitude;
    v_long := v_pinrow.longitude;
  else
    -- No asset pincode supplied: legacy fallback to explicit coords, then home.
    v_lat  := coalesce(p_latitude, v_actor.latitude);
    v_long := coalesce(p_longitude, v_actor.longitude);
    v_pin  := v_actor.pincode;
  end if;

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

grant execute on function public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean) to anon;
