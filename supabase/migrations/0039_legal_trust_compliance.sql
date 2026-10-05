-- V2 Phase 4 — Legal, trust & compliance.
--   1. Provider declarations enforced in create_listing (offer-side categories).
--   2. is_sponsored flag on listings + admin toggle (CP E-Commerce Rules 2026).
--   3. listing_reports table (anon-constrained insert, no anon read, per-IP rate
--      limit mirroring voice_transcribe_calls) + submit + admin queue RPCs.
-- Additive + idempotent.

-- ============================================================
-- 2. Sponsored flag (built, never auto-set; admin-only toggle). No ads go live now.
-- ============================================================
alter table public.listings add column if not exists is_sponsored boolean not null default false;

create or replace function public.admin_set_listing_sponsored(p_actor_id uuid, p_listing_id uuid, p_sponsored boolean)
returns public.listings
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.listings%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.listings set is_sponsored = coalesce(p_sponsored, false) where id = p_listing_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;
grant execute on function public.admin_set_listing_sponsored(uuid, uuid, boolean) to anon, authenticated;

-- ============================================================
-- 3. listing_reports — "शिकायत करें" complaints. Generic target so it also
--    serves cold-storage directory / vendor / jugaad entries later.
-- ============================================================
create table if not exists public.listing_reports (
  id              bigserial primary key,
  target_type     text not null default 'listing' check (target_type in ('listing','vendor','cold_storage','jugaad')),
  target_id       text not null,
  listing_id      uuid references public.listings(id) on delete set null,
  reason          text not null check (reason in ('fraud','wrong_info','unsafe_equipment','wrong_rate','illegal_item','duplicate','harassment','other')),
  note            text,
  reporter_phone  text,
  reporter_ip     text,
  status          text not null default 'open' check (status in ('open','removed','dismissed')),
  resolution_note text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid
);
create index if not exists listing_reports_status_time_idx on public.listing_reports (status, created_at);
create index if not exists listing_reports_ip_time_idx on public.listing_reports (reporter_ip, created_at);
alter table public.listing_reports enable row level security;
-- No RLS policies → no anonymous/authenticated direct read or write. All access is
-- through SECURITY DEFINER RPCs below (constrained insert, admin-only read).

-- Submit a complaint (anon or logged-in). Per-IP rate limit like voice_transcribe_calls.
create or replace function public.submit_listing_report(
  p_target_type text,
  p_target_id   text,
  p_listing_id  uuid,
  p_reason      text,
  p_note        text,
  p_phone       text,
  p_ip          text
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_ip    text := coalesce(nullif(trim(p_ip), ''), 'unknown');
  v_type  text := coalesce(nullif(trim(p_target_type), ''), 'listing');
  v_count int;
begin
  if v_type not in ('listing','vendor','cold_storage','jugaad') then raise exception 'invalid_target_type'; end if;
  if coalesce(nullif(trim(p_target_id), ''), '') = '' then raise exception 'target_id_required'; end if;
  if coalesce(p_reason, '') not in ('fraud','wrong_info','unsafe_equipment','wrong_rate','illegal_item','duplicate','harassment','other') then
    raise exception 'invalid_report_reason';
  end if;

  -- Housekeeping + rate limit: max 10 reports per IP per hour.
  delete from public.listing_reports where created_at < now() - interval '90 days' and status <> 'open';
  select count(*) into v_count from public.listing_reports
    where reporter_ip = v_ip and created_at > now() - interval '1 hour';
  if v_count >= 10 then raise exception 'rate_limited'; end if;

  insert into public.listing_reports (target_type, target_id, listing_id, reason, note, reporter_phone, reporter_ip)
  values (v_type, trim(p_target_id),
          case when v_type = 'listing' then p_listing_id else null end,
          p_reason, nullif(trim(p_note), ''), nullif(trim(p_phone), ''), v_ip);
end;
$$;
grant execute on function public.submit_listing_report(text, text, uuid, text, text, text, text) to anon, authenticated;

-- Admin: the moderation queue (open first, newest first), with target context.
create or replace function public.get_listing_reports(p_actor_id uuid, p_status text default 'open', p_limit int default 100)
returns table (
  id bigint, target_type text, target_id text, listing_id uuid, reason text, note text,
  reporter_phone text, status text, resolution_note text, created_at timestamptz,
  resolved_at timestamptz, listing_category text, listing_status text
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
    select r.id, r.target_type, r.target_id, r.listing_id, r.reason, r.note,
           r.reporter_phone, r.status, r.resolution_note, r.created_at,
           r.resolved_at, l.category, l.status
    from public.listing_reports r
    left join public.listings l on l.id = r.listing_id
    where (p_status is null or r.status = p_status)
    order by r.created_at desc
    limit greatest(p_limit, 1);
end;
$$;
grant execute on function public.get_listing_reports(uuid, text, int) to anon, authenticated;

-- Admin: resolve a complaint. action 'removed' also removes the target listing;
-- 'dismissed' just closes the complaint. The complaint log is retained either way.
create or replace function public.resolve_listing_report(p_actor_id uuid, p_report_id bigint, p_action text, p_resolution_note text)
returns public.listing_reports
language plpgsql security definer set search_path = public, pg_temp
as $$
declare r public.listing_reports%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_action not in ('removed','dismissed') then raise exception 'invalid_action'; end if;
  select * into r from public.listing_reports where id = p_report_id;
  if not found then raise exception 'not_found'; end if;

  if p_action = 'removed' and r.listing_id is not null then
    update public.listings set status = 'removed' where id = r.listing_id;
  end if;

  update public.listing_reports set
    status = p_action,
    resolution_note = nullif(trim(p_resolution_note), ''),
    resolved_at = now(),
    resolved_by = p_actor_id
  where id = p_report_id returning * into r;
  return r;
end;
$$;
grant execute on function public.resolve_listing_report(uuid, bigint, text, text) to anon, authenticated;

-- ============================================================
-- 1. Provider declarations — enforced in create_listing for offer-side provider
--    categories. Water tanker (Phase 5) rides inside equipment; greenhouse &
--    jugaad categories are added to the set when those categories land.
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

  -- Provider declaration (§Phase 4): the person OFFERING equipment or warehouse/
  -- cold storage must self-declare safety/accuracy. Requirements (farmers asking)
  -- are exempt.
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
