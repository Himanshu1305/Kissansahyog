-- Kisan Sahyog — 0025 Visibility opt-in + input price tracker
--
-- Phase 1: per-listing wide-visibility opt-in (Parali/Inputs only), enforced
--          SERVER-SIDE in create_listing (a forged client cannot set it on any
--          other category).
-- Phase 6: input_prices tracker (Khurai-area shop prices for Urea/DAP/diesel).
--
-- (Location/geofencing/mandi-search/PWA phases are all client-side — no schema.)

-- ===========================================================================
-- Phase 1 — listings.wide_visibility
-- ===========================================================================
alter table public.listings
  add column if not exists wide_visibility boolean not null default false;

-- Re-create create_listing with a 10th arg (p_wide_visibility). Drop the previous
-- 9-arg signature first so PostgREST has one unambiguous overload to resolve.
drop function if exists public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean, text);

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
  p_wide_visibility boolean default false
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
begin
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found then raise exception 'not_authorized'; end if;
  if v_actor.disclaimer_accepted_at is null then raise exception 'disclaimer_not_accepted'; end if;
  if p_listing_type not in ('offer', 'requirement') then raise exception 'invalid_listing_type'; end if;
  if p_category not in ('land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse') then
    raise exception 'invalid_category';
  end if;

  -- Phase 1 guard: wide visibility is a fraud-prevention exception, permitted ONLY for
  -- Bhoosa/Parali (bhusa) and Seeds & Inputs (agri_inputs). Reject any other category
  -- server-side — this cannot be bypassed by a crafted RPC call.
  if v_wide and p_category not in ('bhusa', 'agri_inputs') then
    raise exception 'wide_visibility_not_allowed';
  end if;

  v_pin := nullif(trim(coalesce(p_pincode, '')), '');
  if v_pin is not null then
    select * into v_pinrow from public.pincodes where pincode = v_pin;
    if not found then raise exception 'pincode_not_found'; end if;
    v_lat  := v_pinrow.latitude;
    v_long := v_pinrow.longitude;
  else
    v_lat  := coalesce(p_latitude, v_actor.latitude);
    v_long := coalesce(p_longitude, v_actor.longitude);
    v_pin  := v_actor.pincode;
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
    user_id, listing_type, category, latitude, longitude, pincode, details, self_declared, listing_source, wide_visibility
  ) values (
    p_actor_id, p_listing_type, p_category, v_lat, v_long, v_pin,
    coalesce(p_details, '{}'::jsonb),
    (p_category = 'land' and p_listing_type = 'offer' and p_self_declared is true),
    v_source,
    v_wide
  )
  returning * into v_listing;

  return v_listing;
end;
$$;

grant execute on function public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean) to anon, authenticated;

-- ===========================================================================
-- Phase 6 — input_prices (agricultural input price tracker)
-- ===========================================================================
create table if not exists public.input_prices (
  id           uuid primary key default gen_random_uuid(),
  item_hi      text not null,
  item_en      text,
  shop_name    text not null,
  location     text default 'Khurai',
  price        numeric not null,
  unit         text not null default 'बोरी',
  updated_date date not null default current_date,
  is_active    boolean not null default true,
  created_at   timestamptz default now()
);

alter table public.input_prices enable row level security;
grant select on public.input_prices to anon;
drop policy if exists input_prices_read on public.input_prices;
create policy input_prices_read on public.input_prices for select to anon using (is_active = true);

-- Seed: 3 named Khurai-area shops × Urea, DAP, diesel. STARTING POINT ONLY — these
-- are plausible current MP retail figures that require ongoing admin maintenance
-- (same caveat as KVK events). Idempotent via a stable unique-ish key.
insert into public.input_prices (item_hi, item_en, shop_name, location, price, unit, updated_date, is_active) values
  ('यूरिया', 'Urea', 'जय किसान कृषि केंद्र', 'Khurai', 267, 'बोरी (45 किग्रा)', current_date, true),
  ('डीएपी', 'DAP', 'जय किसान कृषि केंद्र', 'Khurai', 1350, 'बोरी (50 किग्रा)', current_date, true),
  ('डीज़ल', 'Diesel', 'भारत पेट्रोल पंप, खुरई', 'Khurai', 92, 'लीटर', current_date, true),
  ('यूरिया', 'Urea', 'बालाजी बीज भंडार', 'Khurai', 270, 'बोरी (45 किग्रा)', current_date, true),
  ('डीएपी', 'DAP', 'बालाजी बीज भंडार', 'Khurai', 1365, 'बोरी (50 किग्रा)', current_date, true),
  ('यूरिया', 'Urea', 'सागर कृषि सेवा केंद्र', 'Khurai', 266, 'बोरी (45 किग्रा)', current_date, true),
  ('डीज़ल', 'Diesel', 'HP पेट्रोल पंप, खुरई रोड', 'Khurai', 92, 'लीटर', current_date, true)
on conflict do nothing;

-- Admin CRUD RPCs (is_admin-checked; same pattern as msp_prices).
create or replace function public.get_admin_input_prices(p_actor_id uuid)
returns setof public.input_prices
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.input_prices order by item_hi, shop_name;
end;
$$;

create or replace function public.admin_set_input_price_active(p_actor_id uuid, p_id uuid, p_active boolean)
returns public.input_prices
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.input_prices%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.input_prices set is_active = p_active where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_upsert_input_price(
  p_actor_id uuid, p_id uuid, p_item_hi text, p_item_en text, p_shop_name text,
  p_location text, p_price numeric, p_unit text, p_updated_date date, p_is_active boolean
) returns public.input_prices
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.input_prices%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_item_hi), '') = '' then raise exception 'name_required'; end if;
  if coalesce(trim(p_shop_name), '') = '' then raise exception 'shop_required'; end if;
  if p_price is null or p_price <= 0 then raise exception 'invalid_price'; end if;
  if p_id is null then
    insert into public.input_prices (item_hi, item_en, shop_name, location, price, unit, updated_date, is_active)
    values (trim(p_item_hi), nullif(trim(coalesce(p_item_en, '')), ''), trim(p_shop_name),
            nullif(trim(coalesce(p_location, '')), ''), p_price, coalesce(nullif(trim(p_unit), ''), 'बोरी'),
            coalesce(p_updated_date, current_date), coalesce(p_is_active, true))
    returning * into v;
  else
    update public.input_prices set
      item_hi = trim(p_item_hi), item_en = nullif(trim(coalesce(p_item_en, '')), ''),
      shop_name = trim(p_shop_name), location = nullif(trim(coalesce(p_location, '')), ''),
      price = p_price, unit = coalesce(nullif(trim(p_unit), ''), 'बोरी'),
      updated_date = coalesce(p_updated_date, current_date), is_active = coalesce(p_is_active, true)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$$;
