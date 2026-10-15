-- 0061_listing_client_request_id.sql — Batch 9B Fix B: duplicate-post protection.
-- If the reply is lost after a farmer taps Post and they tap Post again, exactly ONE listing must exist.
-- The app now sends a random id per Post form (`client_request_id`) and re-uses it for every retry of
-- that form. The database keeps at most one listing per (owner, client_request_id).
--
-- Backward compatible:
--   * the new column is nullable; existing rows are not changed (they stay NULL);
--   * the unique index only covers rows WITH an id, so the older app (which sends no id) is unaffected;
--   * create_listing_with_location keeps its name and its 12 old parameters (old callers send exactly
--     those) and gains ONE extra parameter with a default. The old 12-parameter version is dropped first:
--     two versions side by side would make the API refuse old calls as ambiguous.
-- Rollback: supabase/migrations/rollback/0061_listing_client_request_id_rollback.sql
-- (apply 0062's rollback first if 0062 is applied).

alter table public.listings add column if not exists client_request_id uuid;

create unique index if not exists listings_owner_client_request_uidx
  on public.listings (user_id, client_request_id)
  where client_request_id is not null;

drop function if exists public.create_listing_with_location(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text, boolean);

create or replace function public.create_listing_with_location(
  p_actor_id uuid,
  p_listing_type text,
  p_category text,
  p_details jsonb,
  p_latitude numeric,
  p_longitude numeric,
  p_pincode text,
  p_self_declared boolean,
  p_listing_source text default 'farmer',
  p_wide_visibility boolean default false,
  p_village_name text default null,
  p_rules_agreed boolean default false,
  p_client_request_id uuid default null
)
returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_listing public.listings%rowtype;
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

  begin
    select * into v_listing from public.create_listing(
      p_actor_id, p_listing_type, p_category, p_details, p_latitude, p_longitude,
      p_pincode, p_self_declared, p_listing_source, p_wide_visibility,
      p_village_name, p_rules_agreed
    );

    if p_latitude is not null and p_longitude is not null then
      update public.listings
      set latitude = p_latitude, longitude = p_longitude, geocoding_status = 'resolved'
      where id = v_listing.id and user_id = p_actor_id
      returning * into v_listing;
    end if;

    if p_client_request_id is not null then
      update public.listings
      set client_request_id = p_client_request_id
      where id = v_listing.id
      returning * into v_listing;
    end if;
  exception when unique_violation then
    -- Two submits with the same id raced; the other one won. Everything this call created in the
    -- block above (listing + private contact row) is rolled back; return the winner as success.
    select * into v_listing from public.listings
      where user_id = p_actor_id and client_request_id = p_client_request_id;
    if not found then raise; end if;
  end;
  return v_listing;
end;
$$;

grant execute on function public.create_listing_with_location(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text, boolean, uuid) to anon, authenticated, service_role;
