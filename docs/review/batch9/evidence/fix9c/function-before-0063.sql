-- ===== create_listing_with_location(uuid,text,text,jsonb,numeric,numeric,text,boolean,text,boolean,text,boolean,uuid,boolean)
CREATE OR REPLACE FUNCTION public.create_listing_with_location(p_actor_id uuid, p_listing_type text, p_category text, p_details jsonb, p_latitude numeric, p_longitude numeric, p_pincode text, p_self_declared boolean, p_listing_source text DEFAULT 'farmer'::text, p_wide_visibility boolean DEFAULT false, p_village_name text DEFAULT NULL::text, p_rules_agreed boolean DEFAULT false, p_client_request_id uuid DEFAULT NULL::uuid, p_contact_consent boolean DEFAULT false)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_listing public.listings%rowtype;
  v_consent boolean := coalesce(p_contact_consent, false)
    and (p_listing_source = 'vendor' or (p_listing_type = 'offer' and p_category in ('equipment', 'warehouse', 'greenhouse', 'jugaad')));
  v_hidden  boolean;
  v_phone   text;
  v_details jsonb := p_details;
begin
  -- A retry of a Post that already went through: hand back the same listing, create nothing.
  if p_client_request_id is not null then
    select * into v_listing from public.listings
      where user_id = p_actor_id and client_request_id = p_client_request_id;
    if found then return v_listing; end if;
  end if;

  if p_category = 'transport' then
    if nullif(trim(coalesce(p_details->>'from_location', '')), '') is null then raise exception 'transport_from_required'; end if;
    if nullif(trim(coalesce(p_details->>'to_location', '')), '') is null then raise exception 'transport_to_required'; end if;
  end if;

  -- F1: keep a hidden owner's shop number out of the public listing data unless they agreed.
  if p_category = 'agri_inputs' and not v_consent then
    select coalesce(p.consents #>> '{details_visibility,choice}', '') = 'hidden' into v_hidden
      from public.profiles p where p.id = p_actor_id;
    v_phone := nullif(trim(coalesce(p_details->>'contact_phone', '')), '');
    if coalesce(v_hidden, false) and v_phone is not null then
      v_details := jsonb_set(p_details, '{contact_phone}', '""'::jsonb, true);
    else
      v_phone := null;
    end if;
  end if;

  begin
    select * into v_listing from public.create_listing(
      p_actor_id, p_listing_type, p_category, v_details, p_latitude, p_longitude,
      p_pincode, p_self_declared, p_listing_source, p_wide_visibility,
      p_village_name, p_rules_agreed
    );

    if v_phone is not null then
      insert into public.listing_private_contact (listing_id, contact_phone)
        values (v_listing.id, v_phone)
        on conflict (listing_id) do update set contact_phone = excluded.contact_phone;
    end if;

    if (p_latitude is not null and p_longitude is not null) or p_client_request_id is not null or v_consent then
      update public.listings
      set latitude = case when p_latitude is not null and p_longitude is not null then p_latitude else latitude end,
          longitude = case when p_latitude is not null and p_longitude is not null then p_longitude else longitude end,
          geocoding_status = case when p_latitude is not null and p_longitude is not null then 'resolved' else geocoding_status end,
          client_request_id = coalesce(p_client_request_id, client_request_id),
          contact_consent_at = case when v_consent then now() else contact_consent_at end
      where id = v_listing.id and user_id = p_actor_id
      returning * into v_listing;
    end if;
  exception when unique_violation then
    -- Two submits with the same id raced; the other one won. Everything this call created in the
    -- block above (listing + private contact row) is rolled back; return the winner as success.
    if p_client_request_id is null then raise; end if;
    select * into v_listing from public.listings
      where user_id = p_actor_id and client_request_id = p_client_request_id;
    if not found then raise; end if;
  end;
  return v_listing;
end;
$function$


-- ===== create_listing(uuid,text,text,jsonb,numeric,numeric,text,boolean,text,boolean,text,boolean)
CREATE OR REPLACE FUNCTION public.create_listing(p_actor_id uuid, p_listing_type text, p_category text, p_details jsonb, p_latitude numeric, p_longitude numeric, p_pincode text, p_self_declared boolean, p_listing_source text DEFAULT 'farmer'::text, p_wide_visibility boolean DEFAULT false, p_village_name text DEFAULT NULL::text, p_rules_agreed boolean DEFAULT false)
 RETURNS listings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  v_is_tanker boolean := false;
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
  if p_category not in ('land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse', 'transport', 'greenhouse', 'jugaad', 'building_materials') then
    raise exception 'invalid_category';
  end if;
  if v_wide and p_category not in ('bhusa', 'agri_inputs', 'building_materials', 'warehouse', 'greenhouse') then
    raise exception 'wide_visibility_not_allowed';
  end if;

  if p_listing_type = 'offer' and p_category in ('equipment', 'warehouse', 'greenhouse', 'jugaad')
     and (p_details ? 'provider_declared')
     and coalesce(p_details->>'provider_declared', '') <> 'true' then
    raise exception 'provider_declaration_required';
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
    select exists (
      select 1 from public.equipment_types et
      where et.id = nullif(p_details->>'equipment_type_id', '')::int and et.name_en = 'Water tanker'
    ) into v_is_tanker;
    if v_is_tanker and coalesce((p_details->>'capacity_litres')::numeric, 0) <= 0 then raise exception 'tanker_capacity_required'; end if;
  end if;
  if p_category = 'greenhouse' then
    if p_listing_type = 'offer' then
      if coalesce(trim(p_details->>'vendor_subtype'), '') = '' then raise exception 'vendor_subtype_required'; end if;
    else
      if coalesce(trim(p_details->>'structure_type'), '') = '' then raise exception 'gh_structure_required'; end if;
      if coalesce(trim(p_details->>'area_sqm'), '') = '' then raise exception 'gh_area_required'; end if;
    end if;
  end if;
  if p_category = 'jugaad' and p_listing_type = 'offer' then
    if coalesce(trim(p_details->>'offer_type'), '') = '' then raise exception 'jugaad_offer_type_required'; end if;
    if coalesce(trim(p_details->>'innovation_name'), '') = '' then raise exception 'jugaad_name_required'; end if;
    if coalesce(p_details->>'not_road_vehicle', '') <> 'true' then raise exception 'road_vehicle_not_allowed'; end if;
  end if;
  if p_category = 'labor' then
    if coalesce((p_details->>'worker_count')::int, 0) <= 0 then raise exception 'invalid_worker_count'; end if;
    if (p_details->>'available_from') is not null and (p_details->>'available_to') is not null
       and (p_details->>'available_from')::date > (p_details->>'available_to')::date then raise exception 'invalid_date_range'; end if;
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
  if p_category = 'transport' then
    if coalesce(trim(p_details->>'vehicle_type'), '') = '' then raise exception 'vehicle_type_required'; end if;
    if coalesce(trim(p_details->>'rate_basis'), '') = '' then raise exception 'transport_rate_basis_required'; end if;
  end if;
  if p_category = 'building_materials' then
    if coalesce(p_details->>'material_type', '') not in ('cement', 'sand', 'iron_rod', 'bricks', 'gravel', 'other') then raise exception 'building_material_type_required'; end if;
    if coalesce(trim(p_details->>'quantity'), '') = '' then raise exception 'building_quantity_required'; end if;
    if coalesce(p_details->>'unit', '') not in ('bag', 'ton', 'trolley', 'piece', 'kg') then raise exception 'building_unit_required'; end if;
    if p_listing_type = 'offer' and coalesce(trim(p_details->>'rate_amount'), '') = '' then raise exception 'building_rate_required'; end if;
    if coalesce(p_details->>'delivery_available', '') not in ('yes', 'no') then raise exception 'building_delivery_required'; end if;
    if coalesce(trim(p_details->>'pickup_location'), '') = '' then raise exception 'building_pickup_required'; end if;
  end if;

  insert into public.listings (
    user_id, listing_type, category, latitude, longitude, pincode, village_name, geocoding_status,
    details, self_declared, listing_source, wide_visibility
  ) values (
    p_actor_id, p_listing_type, p_category, v_lat, v_long, v_pin, v_village, v_geo,
    v_details,
    (p_category = 'land' and p_listing_type = 'offer' and p_self_declared is true),
    v_source, v_wide
  ) returning * into v_listing;

  if v_contact is not null then
    insert into public.listing_private_contact (listing_id, contact_phone)
      values (v_listing.id, v_contact)
      on conflict (listing_id) do update set contact_phone = excluded.contact_phone;
  end if;
  return v_listing;
end;
$function$


