-- Kisan Sahyog — 0027 Village-level forward geocoding (Part A)
--
-- Makes the VILLAGE NAME the primary distance anchor instead of the pincode centroid.
-- Coordinates come from forward-geocoding the village name (Nominatim, done by the
-- /geocode Pages Function which can set the required User-Agent) and are cached here.
-- A DB-backed 1-request/second slot (geocode_state) enforces Nominatim's rate limit
-- across all concurrent callers. Listings store their OWN resolved lat/lng (denormalized);
-- distance queries never join this table at read time.

-- ---------------------------------------------------------------------------
-- village_coordinates — geocoding cache + queue (pending rows = the work queue)
-- ---------------------------------------------------------------------------
create table if not exists public.village_coordinates (
  id           uuid primary key default gen_random_uuid(),
  village_name text not null,
  district     text not null default 'Sagar',
  latitude     numeric,
  longitude    numeric,
  status       text not null default 'pending' check (status in ('pending','processing','resolved','failed')),
  source       text default 'nominatim',
  display_name text,
  attempts     int not null default 0,
  last_error   text,
  claimed_at   timestamptz,
  resolved_at  timestamptz,
  created_at   timestamptz default now()
);
create unique index if not exists village_coordinates_name_district_uniq
  on public.village_coordinates (lower(village_name), lower(district));

alter table public.village_coordinates enable row level security;
grant select on public.village_coordinates to anon, authenticated;
drop policy if exists vc_read on public.village_coordinates;
-- Public read of RESOLVED rows only (drives the village-name autocomplete). Writes go
-- exclusively through the SECURITY DEFINER RPCs below.
create policy vc_read on public.village_coordinates for select to anon, authenticated using (status = 'resolved');

-- Seed from the existing pincodes table so the 8 pilot villages (and all 20 seeded Sagar
-- towns) are pre-resolved and coordinate-consistent with the weather/mausam system (4b).
insert into public.village_coordinates (village_name, district, latitude, longitude, status, source, resolved_at)
select village_town, 'Sagar', latitude, longitude, 'resolved', 'pincode-seed', now()
from public.pincodes where village_town is not null and latitude is not null
on conflict (lower(village_name), lower(district)) do nothing;

-- ---------------------------------------------------------------------------
-- geocode_state — single-row 1-req/sec gate for outbound Nominatim calls
-- ---------------------------------------------------------------------------
create table if not exists public.geocode_state (
  id                     int primary key default 1,
  last_nominatim_call_at timestamptz not null default '2000-01-01T00:00:00Z',
  check (id = 1)
);
insert into public.geocode_state (id) values (1) on conflict (id) do nothing;
alter table public.geocode_state enable row level security; -- no anon policy: only the RPCs (definer) touch it

-- Atomically claim the 1-second Nominatim slot. Returns true only if ≥1s has elapsed since
-- the last outbound call (and bumps the timestamp); false means a caller must back off and
-- retry. This is the platform-wide rate-limit enforcement (2a-i).
create or replace function public.claim_geocode_slot()
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare ok boolean := false;
begin
  update public.geocode_state set last_nominatim_call_at = now()
    where id = 1 and last_nominatim_call_at <= now() - interval '1 second'
    returning true into ok;
  return coalesce(ok, false);
end; $$;

-- Atomically pick + mark the oldest pending village (or a stale 'processing' one older than
-- 2 min, so a dead worker doesn't strand it). SKIP LOCKED lets concurrent workers grab
-- different rows without collision.
create or replace function public.next_pending_village()
returns table(village_name text, district text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  return query
  update public.village_coordinates vc set status = 'processing', claimed_at = now()
  where vc.id = (
    select id from public.village_coordinates
    where status = 'pending' or (status = 'processing' and claimed_at < now() - interval '2 minutes')
    order by created_at limit 1 for update skip locked
  )
  returning vc.village_name, vc.district;
end; $$;

-- Store a successful geocode + DENORMALIZE the coords onto every pending listing anchored to
-- that village (3a-i — distance queries read the listing row, not this table).
create or replace function public.resolve_village(p_village text, p_district text, p_lat numeric, p_lng numeric, p_display text)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare n integer;
begin
  update public.village_coordinates
    set latitude = p_lat, longitude = p_lng, status = 'resolved', display_name = p_display,
        source = 'nominatim', resolved_at = now(), claimed_at = null, last_error = null
    where lower(village_name) = lower(p_village) and lower(district) = lower(p_district);
  update public.listings
    set latitude = p_lat, longitude = p_lng, geocoding_status = 'resolved'
    where lower(village_name) = lower(p_village) and geocoding_status = 'pending';
  get diagnostics n = row_count;
  return n;
end; $$;

-- Record a geocode failure; retry up to 3 times, then mark 'failed' (visible in the admin
-- unresolved log). Listings stay 'pending' (excluded from distance views) — never 0,0 (2d).
create or replace function public.fail_village(p_village text, p_district text, p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.village_coordinates
    set attempts = attempts + 1,
        status = case when attempts + 1 >= 3 then 'failed' else 'pending' end,
        last_error = left(coalesce(p_reason, ''), 300), claimed_at = null
    where lower(village_name) = lower(p_village) and lower(district) = lower(p_district);
end; $$;

grant execute on function public.claim_geocode_slot() to anon, authenticated;
grant execute on function public.next_pending_village() to anon, authenticated;
grant execute on function public.resolve_village(text, text, numeric, numeric, text) to anon, authenticated;
grant execute on function public.fail_village(text, text, text) to anon, authenticated;

-- Admin: the unresolved / failing village log (2d).
create or replace function public.get_admin_unresolved_villages(p_actor_id uuid)
returns setof public.village_coordinates
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.village_coordinates where status in ('failed','pending','processing') order by created_at desc;
end; $$;

-- ---------------------------------------------------------------------------
-- listings — village anchor + async geocoding status
-- ---------------------------------------------------------------------------
alter table public.listings add column if not exists village_name text;
alter table public.listings add column if not exists geocoding_status text not null default 'resolved';
-- Backfill existing (seed) listings' village_name from their pincode's town so they still
-- display a place name; they KEEP their pincode-derived coords (Phase 3c option (b) — a
-- documented approximation for pre-existing data; all NEW listings use village geocoding).
update public.listings l set village_name = p.village_town
  from public.pincodes p where l.pincode = p.pincode and l.village_name is null;

-- ---------------------------------------------------------------------------
-- create_listing — village-first coordinate resolution (pincode = fallback only)
-- ---------------------------------------------------------------------------
drop function if exists public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean);

create or replace function public.create_listing(
  p_actor_id      uuid,
  p_listing_type  text,
  p_category      text,
  p_details       jsonb,
  p_latitude      numeric,
  p_longitude     numeric,
  p_pincode       text,
  p_self_declared boolean,
  p_listing_source text default 'farmer',
  p_wide_visibility boolean default false,
  p_village_name  text default null
) returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor    public.profiles%rowtype;
  v_listing  public.listings%rowtype;
  v_lat      numeric;
  v_long     numeric;
  v_pin      text;
  v_pinrow   public.pincodes%rowtype;
  v_subtype  text;
  v_inputs   int;
  v_services int;
  v_source   text := case when p_listing_source in ('farmer', 'vendor') then p_listing_source else 'farmer' end;
  v_wide     boolean := coalesce(p_wide_visibility, false);
  v_village  text := nullif(trim(coalesce(p_village_name, '')), '');
  v_district text := 'Sagar'; -- pilot district; village_coordinates is keyed (village, district)
  v_geo      text := 'resolved';
begin
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found then raise exception 'not_authorized'; end if;
  if v_actor.disclaimer_accepted_at is null then raise exception 'disclaimer_not_accepted'; end if;
  if p_listing_type not in ('offer', 'requirement') then raise exception 'invalid_listing_type'; end if;
  if p_category not in ('land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse') then
    raise exception 'invalid_category';
  end if;
  if v_wide and p_category not in ('bhusa', 'agri_inputs') then
    raise exception 'wide_visibility_not_allowed';
  end if;

  v_pin := nullif(trim(coalesce(p_pincode, '')), '');
  if v_village is not null then
    -- PRIMARY ANCHOR: village name. Cache hit → use immediately; new name → enqueue a
    -- pending geocode and leave coords null (the listing is created now, excluded from
    -- distance views until the queued /geocode job resolves it — Phase 2e).
    select latitude, longitude into v_lat, v_long from public.village_coordinates
      where lower(village_name) = lower(v_village) and lower(district) = lower(v_district) and status = 'resolved'
      limit 1;
    if v_lat is not null then
      v_geo := 'resolved';
    else
      insert into public.village_coordinates (village_name, district, status)
        values (v_village, v_district, 'pending')
        on conflict (lower(village_name), lower(district)) do nothing;
      v_lat := null; v_long := null; v_geo := 'pending';
    end if;
  elsif v_pin is not null then
    -- FALLBACK (3d): manual pincode → area centroid (less precise). Must be a seeded pincode.
    select * into v_pinrow from public.pincodes where pincode = v_pin;
    if not found then raise exception 'pincode_not_found'; end if;
    v_lat := v_pinrow.latitude; v_long := v_pinrow.longitude;
    v_village := v_pinrow.village_town; v_geo := 'resolved';
  else
    v_lat := coalesce(p_latitude, v_actor.latitude);
    v_long := coalesce(p_longitude, v_actor.longitude);
    v_pin := v_actor.pincode; v_geo := 'resolved';
  end if;

  if p_category = 'land' and p_listing_type = 'offer' and p_self_declared is not true then
    raise exception 'self_declaration_required';
  end if;
  if p_category = 'equipment' then
    if coalesce(p_details->>'equipment_type_id', '') = '' then raise exception 'equipment_type_required'; end if;
  end if;
  if p_category = 'labor' then
    if coalesce((p_details->>'worker_count')::int, 0) <= 0 then raise exception 'invalid_worker_count'; end if;
    if (p_details->>'available_from') is not null and (p_details->>'available_to') is not null
       and (p_details->>'available_from')::date > (p_details->>'available_to')::date then
      raise exception 'invalid_date_range';
    end if;
  end if;
  if p_category = 'drone_didi' then
    if p_listing_type = 'offer' then
      if coalesce(trim(p_details->>'operator_name'), '') = '' then raise exception 'operator_name_required'; end if;
      if coalesce(trim(p_details->>'drone_type'), '') = '' then raise exception 'drone_type_required'; end if;
      if jsonb_typeof(p_details->'service_type') = 'array' then v_services := jsonb_array_length(p_details->'service_type'); else v_services := 0; end if;
      if v_services < 1 then raise exception 'service_type_required'; end if;
      if coalesce(trim(p_details->>'rate_per_acre'), '') = '' then raise exception 'rate_per_acre_required'; end if;
      if coalesce(trim(p_details->>'asset_village'), '') = '' then raise exception 'asset_village_required'; end if;
    else
      if coalesce(trim(p_details->>'crop_type'), '') = '' then raise exception 'crop_type_required'; end if;
      if coalesce(trim(p_details->>'acreage'), '') = '' then raise exception 'acreage_required'; end if;
      if coalesce(trim(p_details->>'service_needed'), '') = '' then raise exception 'service_needed_required'; end if;
      if coalesce(trim(p_details->>'asset_village'), '') = '' then raise exception 'asset_village_required'; end if;
    end if;
  end if;
  if p_category = 'bhusa' then
    if coalesce(p_details->>'residue_type', '') = '' then raise exception 'residue_type_required'; end if;
    if coalesce(trim(p_details->>'quantity'), '') = '' then raise exception 'quantity_required'; end if;
    if coalesce(p_details->>'pickup_arrangement', '') = '' then raise exception 'pickup_required'; end if;
    if coalesce(p_details->>'buyer_type_preference', '') = '' then raise exception 'buyer_type_required'; end if;
    if coalesce(trim(p_details->>'asking_price'), '') = '' then raise exception 'asking_price_required'; end if;
  end if;
  if p_category = 'agri_inputs' then
    v_subtype := coalesce(p_details->>'subtype', '');
    if v_subtype not in ('farmer_surplus', 'vendor') then raise exception 'subtype_required'; end if;
    if v_subtype = 'vendor' then
      if coalesce(trim(p_details->>'business_name'), '') = '' then raise exception 'business_name_required'; end if;
      if jsonb_typeof(p_details->'input_types') = 'array' then v_inputs := jsonb_array_length(p_details->'input_types'); else v_inputs := 0; end if;
      if v_inputs < 1 then raise exception 'input_types_required'; end if;
      if coalesce(trim(p_details->>'items_description'), '') = '' then raise exception 'items_description_required'; end if;
      if coalesce(trim(p_details->>'shop_address'), '') = '' then raise exception 'shop_address_required'; end if;
    else
      if coalesce(p_details->>'input_type', '') = '' then raise exception 'input_type_required'; end if;
      if coalesce(trim(p_details->>'item_name'), '') = '' then raise exception 'item_name_required'; end if;
      if coalesce(trim(p_details->>'quantity'), '') = '' then raise exception 'quantity_required'; end if;
      if coalesce(trim(p_details->>'asking_price'), '') = '' then raise exception 'asking_price_required'; end if;
      if coalesce(trim(p_details->>'material_address'), '') = '' then raise exception 'material_address_required'; end if;
    end if;
  end if;
  if p_category = 'warehouse' then
    if p_listing_type = 'offer' then
      if coalesce(trim(p_details->>'warehouse_type'), '') = '' then raise exception 'warehouse_type_required'; end if;
      if coalesce((p_details->>'capacity_quintals')::numeric, 0) <= 0 then raise exception 'capacity_required'; end if;
      if coalesce(trim(p_details->>'rate'), '') = '' then raise exception 'warehouse_rate_required'; end if;
      if coalesce(trim(p_details->>'address'), '') = '' then raise exception 'warehouse_address_required'; end if;
    else
      if coalesce(trim(p_details->>'crop_type'), '') = '' then raise exception 'crop_type_required'; end if;
      if coalesce((p_details->>'quantity_quintals')::numeric, 0) <= 0 then raise exception 'quantity_quintals_required'; end if;
      if coalesce(trim(p_details->>'duration'), '') = '' then raise exception 'duration_required'; end if;
    end if;
  end if;

  insert into public.listings (
    user_id, listing_type, category, latitude, longitude, pincode, village_name, geocoding_status,
    details, self_declared, listing_source, wide_visibility
  ) values (
    p_actor_id, p_listing_type, p_category, v_lat, v_long, v_pin, v_village, v_geo,
    coalesce(p_details, '{}'::jsonb),
    (p_category = 'land' and p_listing_type = 'offer' and p_self_declared is true),
    v_source, v_wide
  )
  returning * into v_listing;

  return v_listing;
end;
$$;

grant execute on function public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text) to anon, authenticated;
