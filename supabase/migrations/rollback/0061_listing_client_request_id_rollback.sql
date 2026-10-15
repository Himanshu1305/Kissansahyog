-- ROLLBACK of 0061_listing_client_request_id.sql (Batch 9B Fix B). Apply 0062's rollback FIRST if 0062
-- is applied. Restores the 12-parameter create_listing_with_location exactly as 0054 defined it, then
-- removes the index and the column (the request ids are only retry keys; no user data is lost).

drop function if exists public.create_listing_with_location(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text, boolean, uuid);

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
  p_rules_agreed boolean default false
)
returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_listing public.listings%rowtype;
begin
  if p_category = 'transport' then
    if nullif(trim(coalesce(p_details->>'from_location', '')), '') is null then raise exception 'transport_from_required'; end if;
    if nullif(trim(coalesce(p_details->>'to_location', '')), '') is null then raise exception 'transport_to_required'; end if;
  end if;

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
  return v_listing;
end;
$$;

grant execute on function public.create_listing_with_location(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text, boolean) to anon, authenticated, service_role;

drop index if exists public.listings_owner_client_request_uidx;
alter table public.listings drop column if exists client_request_id;
