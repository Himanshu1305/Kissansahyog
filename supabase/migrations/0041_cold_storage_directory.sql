-- V2 Phase 6 — Cold storage: public directory + marketplace.
--   1. cold_storage_directory (separate from user listings): public read of
--      non-private columns via a view; admin write. notes are PRIVATE (contact
--      person names + "verify" flags live there).
--   2. cold_storage_claims (claim a listing) + removal via listing_reports.
--   3. create_listing: warehouse/cold-storage listings get the 100 km
--      wide-visibility exception (like bhusa/agri_inputs).
-- Additive + idempotent.

-- ============================================================
-- 1. Directory table (admin write; NO anon grant on the base table).
-- ============================================================
create table if not exists public.cold_storage_directory (
  id               bigserial primary key,
  name             text not null,
  city             text,
  district         text,
  address          text,
  pincode          text,
  phone            text,
  products         text,
  capacity         text,                 -- capacity_mt may be "1650;3608" → text
  type             text,
  rating           text,
  source_type      text,
  source_name      text,
  source_url       text,
  notes            text,                 -- PRIVATE (admin only): contact person, verify flags
  is_old_list      boolean not null default false,  -- NHB 2000–2009 sanctions
  slug             text unique,
  status           text not null default 'active' check (status in ('active','removed','pending')),
  claimed_by       uuid references public.profiles(id) on delete set null,
  claim_phone      text,
  claim_status     text not null default 'unclaimed' check (claim_status in ('unclaimed','pending','approved','rejected')),
  space_available  text,                 -- owner/admin maintained
  space_updated    date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists cold_storage_district_idx on public.cold_storage_directory (district) where status = 'active';
create index if not exists cold_storage_slug_idx on public.cold_storage_directory (slug);
alter table public.cold_storage_directory enable row level security;
-- No anon/authenticated policies → base table is reachable only via the view
-- (public, column-safe) and the SECURITY DEFINER RPCs below.

-- Public, column-safe view: active rows, no `notes`, no contact person. Phones
-- ARE shown (owner-approved, §6.4). Runs with the view owner's rights so anon
-- can read it without a base-table grant.
create or replace view public.cold_storage_public as
  select id, name, city, district, address, pincode, phone, products, capacity,
         type, rating, source_name, source_url, is_old_list, slug,
         space_available, space_updated, claim_status
  from public.cold_storage_directory
  where status = 'active';
grant select on public.cold_storage_public to anon, authenticated;

-- ============================================================
-- 2. Claims + removal
-- ============================================================
create table if not exists public.cold_storage_claims (
  id          bigserial primary key,
  dir_id      bigint not null references public.cold_storage_directory(id) on delete cascade,
  name        text not null,
  phone       text not null,
  proof_note  text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  reporter_ip text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
create index if not exists cs_claims_status_idx on public.cold_storage_claims (status, created_at);
alter table public.cold_storage_claims enable row level security;  -- RPC-only access

-- Submit a claim (anonymous allowed). Per-IP/device rate limit (10/hour).
create or replace function public.submit_cs_claim(p_dir_id bigint, p_name text, p_phone text, p_proof text, p_ip text)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_ip text := coalesce(nullif(trim(p_ip), ''), 'unknown'); v_count int;
begin
  if not exists (select 1 from public.cold_storage_directory where id = p_dir_id) then raise exception 'not_found'; end if;
  if coalesce(nullif(trim(p_name), ''), '') = '' or coalesce(nullif(trim(p_phone), ''), '') = '' then raise exception 'claim_fields_required'; end if;
  select count(*) into v_count from public.cold_storage_claims where reporter_ip = v_ip and created_at > now() - interval '1 hour';
  if v_count >= 10 then raise exception 'rate_limited'; end if;
  insert into public.cold_storage_claims (dir_id, name, phone, proof_note, reporter_ip) values (p_dir_id, trim(p_name), trim(p_phone), nullif(trim(p_proof), ''), v_ip);
  update public.cold_storage_directory set claim_status = 'pending', updated_at = now() where id = p_dir_id and claim_status = 'unclaimed';
end;
$$;
grant execute on function public.submit_cs_claim(bigint, text, text, text, text) to anon, authenticated;

-- Admin: claims queue.
create or replace function public.get_cs_claims(p_actor_id uuid, p_status text default 'pending')
returns table (id bigint, dir_id bigint, dir_name text, name text, phone text, proof_note text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select c.id, c.dir_id, d.name, c.name, c.phone, c.proof_note, c.status, c.created_at
    from public.cold_storage_claims c join public.cold_storage_directory d on d.id = c.dir_id
    where (p_status is null or c.status = p_status) order by c.created_at desc;
end;
$$;
grant execute on function public.get_cs_claims(uuid, text) to anon, authenticated;

-- Admin: approve/reject a claim. Approving marks the directory row owner-managed.
create or replace function public.resolve_cs_claim(p_actor_id uuid, p_claim_id bigint, p_approve boolean)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare c public.cold_storage_claims%rowtype;
begin
  perform public.require_admin(p_actor_id);
  select * into c from public.cold_storage_claims where id = p_claim_id;
  if not found then raise exception 'not_found'; end if;
  update public.cold_storage_claims set status = case when p_approve then 'approved' else 'rejected' end, resolved_at = now(), resolved_by = p_actor_id where id = p_claim_id;
  update public.cold_storage_directory
    set claim_status = case when p_approve then 'approved' else 'unclaimed' end,
        claim_phone = case when p_approve then c.phone else claim_phone end,
        updated_at = now()
    where id = c.dir_id;
end;
$$;
grant execute on function public.resolve_cs_claim(uuid, bigint, boolean) to anon, authenticated;

-- Admin: edit a directory row (incl. space available now) / set status.
create or replace function public.admin_update_cs_directory(
  p_actor_id uuid, p_id bigint, p_patch jsonb
) returns public.cold_storage_directory
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.cold_storage_directory%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.cold_storage_directory set
    name            = coalesce(p_patch->>'name', name),
    city            = coalesce(p_patch->>'city', city),
    district        = coalesce(p_patch->>'district', district),
    address         = coalesce(p_patch->>'address', address),
    phone           = coalesce(p_patch->>'phone', phone),
    products        = coalesce(p_patch->>'products', products),
    capacity        = coalesce(p_patch->>'capacity', capacity),
    type            = coalesce(p_patch->>'type', type),
    space_available = coalesce(p_patch->>'space_available', space_available),
    space_updated   = coalesce((p_patch->>'space_updated')::date, space_updated),
    status          = coalesce(p_patch->>'status', status),
    updated_at      = now()
  where id = p_id returning * into r;
  if not found then raise exception 'not_found'; end if;
  return r;
end;
$$;
grant execute on function public.admin_update_cs_directory(uuid, bigint, jsonb) to anon, authenticated;

-- Admin: full directory read (incl. private notes) for moderation.
create or replace function public.get_cs_directory_admin(p_actor_id uuid, p_limit int default 500, p_offset int default 0)
returns setof public.cold_storage_directory
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.cold_storage_directory order by district, name limit greatest(p_limit,1) offset greatest(p_offset,0);
end;
$$;
grant execute on function public.get_cs_directory_admin(uuid, int, int) to anon, authenticated;

-- ============================================================
-- 3. create_listing — add 'warehouse' to the 100km wide-visibility set.
-- ============================================================
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
  if p_category not in ('land', 'equipment', 'labor', 'drone_didi', 'bhusa', 'agri_inputs', 'warehouse', 'transport') then
    raise exception 'invalid_category';
  end if;
  if v_wide and p_category not in ('bhusa', 'agri_inputs', 'warehouse') then
    raise exception 'wide_visibility_not_allowed';
  end if;

  if p_listing_type = 'offer' and p_category in ('equipment', 'warehouse')
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
    if v_is_tanker and coalesce((p_details->>'capacity_litres')::numeric, 0) <= 0 then
      raise exception 'tanker_capacity_required';
    end if;
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
