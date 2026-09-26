-- 0032_legal_agroforestry_availability_profile.sql
-- One migration for the Combined Legal / Agro-Forestry / Availability / Profile prompt.
-- Fully idempotent (create or replace, add column if not exists, on conflict do nothing).
-- Sections: P1 rules-compliance, P2 horticulture schemes, P3 availability + nudge,
-- P4 admin availability dashboard, P5 farmer profile fields, P6 admin farmer table.

-- =====================================================================
-- PHASE 1 — Mandatory rules-compliance checkbox (server-enforced)
-- =====================================================================
-- create_listing now REQUIRES p_rules_agreed = true, rejecting any listing creation
-- without it (not just a disabled submit button). Drop the prior 11-arg version so there
-- is no un-checked bypass path; the 12-arg version is the only entry point.
drop function if exists public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text);

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
  p_village_name  text default null,
  p_rules_agreed  boolean default false
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
  v_district text := 'Sagar';
  v_geo      text := 'resolved';
  -- Land-only private contact override; other categories keep contact_phone public in details.
  v_contact  text := case when p_category = 'land' then nullif(trim(coalesce(p_details->>'contact_phone', '')), '') else null end;
  v_details  jsonb := case when p_category = 'land' then coalesce(p_details, '{}'::jsonb) - 'contact_phone' else coalesce(p_details, '{}'::jsonb) end;
begin
  -- Phase 1a: rules-compliance agreement is mandatory, enforced here in-body.
  if p_rules_agreed is not true then raise exception 'rules_not_agreed'; end if;

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
    v_details,
    (p_category = 'land' and p_listing_type = 'offer' and p_self_declared is true),
    v_source, v_wide
  )
  returning * into v_listing;

  if v_contact is not null then
    insert into public.listing_private_contact (listing_id, contact_phone)
      values (v_listing.id, v_contact)
      on conflict (listing_id) do update set contact_phone = excluded.contact_phone;
  end if;

  return v_listing;
end;
$$;
grant execute on function public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text, boolean) to anon, authenticated;

-- =====================================================================
-- PHASE 2a — Horticulture scheme category
-- =====================================================================
-- Add 'horticulture' to the sarkari_yojana category CHECK (for the two MP schemes seeded
-- by scripts/seed_agroforestry.mjs). Re-declares the full allowed set idempotently.
alter table public.sarkari_yojana drop constraint if exists sarkari_yojana_category_check;
alter table public.sarkari_yojana add constraint sarkari_yojana_category_check
  check (category in ('income_support','crop_insurance','credit','equipment','solar','storage','women','general','market','machinery','irrigation','horticulture'));

-- =====================================================================
-- PHASE 3 — Owner-controlled availability + engagement nudge
-- =====================================================================
-- 3a: per-listing availability (owner-toggled, never auto). contact_click_count is a
-- lightweight engagement counter (no per-clicker data). availability_changed_at resets the
-- nudge window on create/toggle; last_contact_at gives the "recent" test for the nudge.
alter table public.listings add column if not exists is_available boolean not null default true;
alter table public.listings add column if not exists contact_click_count integer not null default 0;
alter table public.listings add column if not exists availability_changed_at timestamptz not null default now();
alter table public.listings add column if not exists last_contact_at timestamptz;

-- 3b: one-tap owner toggle (owner-gated). Resets the click counter + nudge window so a nudge
-- reflects interest since the owner last confirmed availability.
create or replace function public.set_listing_availability(p_actor_id uuid, p_listing_id uuid, p_is_available boolean)
returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row public.listings%rowtype;
begin
  select * into v_row from public.listings where id = p_listing_id;
  if not found then raise exception 'not_found'; end if;
  if v_row.user_id <> p_actor_id then raise exception 'not_owner'; end if;
  update public.listings
    set is_available = coalesce(p_is_available, true),
        availability_changed_at = now(),
        contact_click_count = 0
    where id = p_listing_id
    returning * into v_row;
  return v_row;
end;
$$;
grant execute on function public.set_listing_availability(uuid, uuid, boolean) to anon, authenticated;

-- 3c: engagement counter increment (anon; active listings only; stores no clicker identity).
create or replace function public.increment_contact_click(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.listings
    set contact_click_count = contact_click_count + 1, last_contact_at = now()
    where id = p_listing_id and status = 'active';
end;
$$;
grant execute on function public.increment_contact_click(uuid) to anon, authenticated;

-- 3d: nudge trigger (owner-scoped, reusable). Returns the owner's available listings that
-- crossed the threshold (>=3 contact clicks within the last 5 days). The SAME trigger query
-- can later feed a WhatsApp send with no restructuring — it is data, not UI.
create or replace function public.get_availability_nudges(p_actor_id uuid)
returns table (id uuid, category text, listing_type text, contact_click_count integer, last_contact_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.id, l.category, l.listing_type, l.contact_click_count, l.last_contact_at
  from public.listings l
  where l.user_id = p_actor_id
    and l.status = 'active'
    and l.is_available = true
    and l.contact_click_count >= 3
    and l.last_contact_at is not null
    and l.last_contact_at >= now() - interval '5 days'
  order by l.contact_click_count desc;
$$;
grant execute on function public.get_availability_nudges(uuid) to anon, authenticated;

-- 3e: My Listings must show availability + the click count (owner sees ALL rows, unfiltered).
drop function if exists public.get_my_listings(uuid);
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
  is_expired    boolean,
  is_available  boolean,
  contact_click_count integer
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select l.id, l.listing_type, l.category, l.status, l.latitude, l.longitude,
         l.pincode, l.details, l.self_declared, l.created_at, l.expires_at,
         (l.expires_at <= now()) as is_expired,
         l.is_available, l.contact_click_count
  from public.listings l
  where l.user_id = p_actor_id
  order by l.created_at desc;
$$;
grant execute on function public.get_my_listings(uuid) to anon, authenticated;

-- 3e: nearby_counts must exclude unavailable listings (public local-density indicator).
create or replace function public.nearby_counts(p_pincode text, p_km int default 30)
returns table (category text, count bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_lat double precision;
  v_lon double precision;
begin
  select latitude, longitude into v_lat, v_lon
  from public.pincodes where pincode = coalesce(p_pincode, '') limit 1;

  return query
  with cats(category) as (
    values ('equipment'), ('labor'), ('bhusa'), ('drone_didi'), ('warehouse'), ('land')
  )
  select c.category,
         coalesce((
           select count(*) from public.listings l
           where l.category = c.category
             and l.status = 'active'
             and l.is_available = true
             and (l.expires_at is null or l.expires_at > now())
             and v_lat is not null and l.latitude is not null and l.longitude is not null
             and 111.045 * degrees(acos(least(1.0,
                   cos(radians(v_lat)) * cos(radians(l.latitude)) *
                   cos(radians(l.longitude) - radians(v_lon)) +
                   sin(radians(v_lat)) * sin(radians(l.latitude))
                 ))) <= greatest(1, coalesce(p_km, 30))
         ), 0) as count
  from cats c;
end;
$$;

-- =====================================================================
-- PHASE 4 — Admin resource/booking dashboard (availability)
-- =====================================================================
-- Per-category availability counts across active listings (require_admin).
create or replace function public.get_admin_availability(p_actor_id uuid)
returns table (category text, total bigint, available bigint, unavailable bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.category,
         count(*) as total,
         count(*) filter (where l.is_available) as available,
         count(*) filter (where not l.is_available) as unavailable
  from public.listings l
  where l.status = 'active'
  group by l.category
  order by l.category;
end;
$$;
grant execute on function public.get_admin_availability(uuid) to anon, authenticated;

-- Every active listing's availability status, filterable by category (require_admin).
create or replace function public.get_admin_availability_listings(p_actor_id uuid, p_category text default null)
returns table (id uuid, category text, listing_type text, is_available boolean, contact_click_count integer, village_name text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.id, l.category, l.listing_type, l.is_available, l.contact_click_count, l.village_name, l.created_at
  from public.listings l
  where l.status = 'active'
    and (p_category is null or l.category = p_category)
  order by l.is_available asc, l.contact_click_count desc, l.created_at desc
  limit 300;
end;
$$;
grant execute on function public.get_admin_availability_listings(uuid, text) to anon, authenticated;

-- =====================================================================
-- PHASE 5 — किसान प्रोफाइल (farmer profile at registration)
-- =====================================================================
-- 5a fields (village_town already exists). All optional; never blocking signup.
-- 5d: these live on `profiles`, which anon CANNOT read (RLS) — they are visible only to the
-- owner (their own session) and to admin (Phase 6 RPC). Never exposed on listings.
alter table public.profiles add column if not exists land_acres numeric;
alter table public.profiles add column if not exists main_crops text;
alter table public.profiles add column if not exists interest_lease boolean not null default false;
alter table public.profiles add column if not exists interest_equipment boolean not null default false;

-- 5c: owner edits their own किसान-profile fields any time (no pincode dependency, unlike
-- update_profile). Optional — nulls/blank are allowed.
create or replace function public.update_kisan_profile(
  p_actor_id           uuid,
  p_land_acres         numeric default null,
  p_main_crops         text    default null,
  p_interest_lease     boolean default false,
  p_interest_equipment boolean default false
) returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_profile public.profiles%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'not_authorized'; end if;
  update public.profiles set
    land_acres         = p_land_acres,
    main_crops         = nullif(trim(coalesce(p_main_crops, '')), ''),
    interest_lease     = coalesce(p_interest_lease, false),
    interest_equipment = coalesce(p_interest_equipment, false)
  where id = p_actor_id
  returning * into v_profile;
  return v_profile;
end;
$$;
grant execute on function public.update_kisan_profile(uuid, numeric, text, boolean, boolean) to anon, authenticated;

-- =====================================================================
-- PHASE 6 — Admin tabular view of farmer profiles
-- =====================================================================
create or replace function public.get_admin_farmer_profiles(p_actor_id uuid)
returns table (
  id uuid, full_name text, village_town text, pincode text,
  land_acres numeric, main_crops text, interest_lease boolean, interest_equipment boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
  select p.id, p.full_name, p.village_town, p.pincode,
         p.land_acres, p.main_crops, p.interest_lease, p.interest_equipment, p.created_at
  from public.profiles p
  order by p.created_at desc;
end;
$$;
grant execute on function public.get_admin_farmer_profiles(uuid) to anon, authenticated;
