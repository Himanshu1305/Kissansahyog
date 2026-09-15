-- Kisan Sahyog — 0008 (v1.1) Agri-Inputs category
--
-- Reuses the `listings` table. Two sub-types share one category ('agri_inputs'),
-- distinguished by details->>'subtype' ('farmer_surplus' | 'vendor'). Widen the
-- category CHECK and validate the sub-type's required fields in create_listing.
-- Vendor listings are free (no payment gate); the "charges may apply later" note
-- is UI-only. Asset-location (coords from material/shop pincode) is from 0006.

alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings
  add constraint listings_category_check
  check (category in ('land', 'equipment', 'labor', 'bhusa', 'agri_inputs'));

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
  v_actor    public.profiles%rowtype;
  v_listing  public.listings%rowtype;
  v_lat      numeric;
  v_long     numeric;
  v_pin      text;
  v_pinrow   public.pincodes%rowtype;
  v_subtype  text;
  v_inputs   int;
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
  if p_category not in ('land', 'equipment', 'labor', 'bhusa', 'agri_inputs') then
    raise exception 'invalid_category';
  end if;

  -- ASSET LOCATION: coordinates derived from the listing's OWN pincode (0006).
  v_pin := nullif(trim(coalesce(p_pincode, '')), '');
  if v_pin is not null then
    select * into v_pinrow from public.pincodes where pincode = v_pin;
    if not found then
      raise exception 'pincode_not_found';
    end if;
    v_lat  := v_pinrow.latitude;
    v_long := v_pinrow.longitude;
  else
    v_lat  := coalesce(p_latitude, v_actor.latitude);
    v_long := coalesce(p_longitude, v_actor.longitude);
    v_pin  := v_actor.pincode;
  end if;

  -- Category-specific validation.
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

  if p_category = 'bhusa' then
    if coalesce(p_details->>'residue_type', '') = '' then raise exception 'residue_type_required'; end if;
    if coalesce(trim(p_details->>'quantity'), '') = '' then raise exception 'quantity_required'; end if;
    if coalesce(p_details->>'pickup_arrangement', '') = '' then raise exception 'pickup_required'; end if;
    if coalesce(p_details->>'buyer_type_preference', '') = '' then raise exception 'buyer_type_required'; end if;
    if coalesce(trim(p_details->>'asking_price'), '') = '' then raise exception 'asking_price_required'; end if;
  end if;

  if p_category = 'agri_inputs' then
    v_subtype := coalesce(p_details->>'subtype', '');
    if v_subtype not in ('farmer_surplus', 'vendor') then
      raise exception 'subtype_required';
    end if;
    if v_subtype = 'vendor' then
      if coalesce(trim(p_details->>'business_name'), '') = '' then raise exception 'business_name_required'; end if;
      if jsonb_typeof(p_details->'input_types') = 'array' then
        v_inputs := jsonb_array_length(p_details->'input_types');
      else
        v_inputs := 0;
      end if;
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
