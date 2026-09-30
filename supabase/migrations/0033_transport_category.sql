-- 0033_transport_category.sql
-- Transport / logistics as a full marketplace category — anchored exactly like every
-- other category (a transporter lists themselves at their own location; the standard
-- 30km/50km-fallback radius applies; no route modeling, no wide-visibility opt-in).
--
-- Widen the listings category CHECK to admit 'transport' and add its create_listing
-- validation. Signature is unchanged from 0032 (12-arg incl p_rules_agreed), so
-- create-or-replace suffices. Fully idempotent.

alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings
  add constraint listings_category_check
  check (category in ('land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse', 'transport'));

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
  v_contact  text := case when p_category = 'land' then nullif(trim(coalesce(p_details->>'contact_phone', '')), '') else null end;
  v_details  jsonb := case when p_category = 'land' then coalesce(p_details, '{}'::jsonb) - 'contact_phone' else coalesce(p_details, '{}'::jsonb) end;
begin
  if p_rules_agreed is not true then raise exception 'rules_not_agreed'; end if;

  select * into v_actor from public.profiles where id = p_actor_id;
  if not found then raise exception 'not_authorized'; end if;
  if v_actor.disclaimer_accepted_at is null then raise exception 'disclaimer_not_accepted'; end if;
  if p_listing_type not in ('offer', 'requirement') then raise exception 'invalid_listing_type'; end if;
  if p_category not in ('land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse', 'transport') then
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
  -- Transport: vehicle type + rate basis are required for both offers and requirements
  -- (capacity + rate amount are optional). Same offer/requirement structure as elsewhere.
  if p_category = 'transport' then
    if coalesce(trim(p_details->>'vehicle_type'), '') = '' then raise exception 'vehicle_type_required'; end if;
    if coalesce(trim(p_details->>'rate_basis'), '') = '' then raise exception 'transport_rate_basis_required'; end if;
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
