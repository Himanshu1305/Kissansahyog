-- Kisan Sahyog — 0017 vendor/business tagging (listing_source)
--
-- Adds a single column distinguishing farmer-to-farmer listings from vendor/
-- business listings across ALL categories (no separate account type). Existing
-- rows default to 'farmer' — no data breakage. create_listing gains a
-- p_listing_source arg (default 'farmer') to persist the toggle; the old 8-arg
-- signature is dropped and replaced (the default keeps existing callers working).
-- Two NEW admin RPCs power the vendor report (existing RPCs are untouched).

alter table public.listings
  add column if not exists listing_source text not null default 'farmer'
  check (listing_source in ('farmer', 'vendor'));

drop function if exists public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean);

create or replace function public.create_listing(
  p_actor_id      uuid,
  p_listing_type  text,
  p_category      text,
  p_details       jsonb,
  p_latitude      numeric,
  p_longitude     numeric,
  p_pincode       text,
  p_self_declared boolean,
  p_listing_source text default 'farmer'
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
begin
  select * into v_actor from public.profiles where id = p_actor_id;
  if not found then raise exception 'not_authorized'; end if;
  if v_actor.disclaimer_accepted_at is null then raise exception 'disclaimer_not_accepted'; end if;
  if p_listing_type not in ('offer', 'requirement') then raise exception 'invalid_listing_type'; end if;
  if p_category not in ('land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs') then
    raise exception 'invalid_category';
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

  insert into public.listings (
    user_id, listing_type, category, latitude, longitude, pincode, details, self_declared, listing_source
  ) values (
    p_actor_id, p_listing_type, p_category, v_lat, v_long, v_pin,
    coalesce(p_details, '{}'::jsonb),
    (p_category = 'land' and p_listing_type = 'offer' and p_self_declared is true),
    v_source
  )
  returning * into v_listing;

  return v_listing;
end;
$$;

grant execute on function public.create_listing(uuid, text, text, jsonb, numeric, numeric, text, boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- NEW admin RPCs for the vendor report (is_admin-checked). Existing admin RPCs
-- are unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_source_stats(p_actor_id uuid)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform public.require_admin(p_actor_id);
  select jsonb_build_object(
    'farmer_total', (select count(*) from public.listings where listing_source = 'farmer' and status <> 'removed'),
    'vendor_total', (select count(*) from public.listings where listing_source = 'vendor' and status <> 'removed'),
    'vendor_by_category', coalesce((select jsonb_object_agg(category, c) from
      (select category, count(*) c from public.listings where listing_source = 'vendor' and status <> 'removed' group by category) s), '{}'::jsonb),
    'farmer_by_category', coalesce((select jsonb_object_agg(category, c) from
      (select category, count(*) c from public.listings where listing_source = 'farmer' and status <> 'removed' group by category) s), '{}'::jsonb)
  ) into v;
  return v;
end;
$$;

create or replace function public.get_admin_vendor_listings(p_actor_id uuid)
returns table (
  id uuid, category text, listing_type text, status text, pincode text, village_town text,
  poster_name text, poster_phone text, poster_email text, details jsonb, created_at timestamptz
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.id, l.category, l.listing_type, l.status, l.pincode, pc.village_town,
         p.full_name, p.phone, p.email, l.details, l.created_at
  from public.listings l
  join public.profiles p on p.id = l.user_id
  left join public.pincodes pc on pc.pincode = l.pincode
  where l.listing_source = 'vendor'
  order by l.created_at desc;
end;
$$;

grant execute on function public.get_admin_source_stats(uuid) to anon, authenticated;
grant execute on function public.get_admin_vendor_listings(uuid) to anon, authenticated;
