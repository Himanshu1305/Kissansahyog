-- ROLLBACK of 0062_listing_contact_consent.sql (Batch 9B Fix A). Apply BEFORE 0061's rollback.
-- Restores create_listing_with_location as 0061 defined it (13 parameters), get_listing_contact as 0060
-- defined it, and removes contact_consent_at. Listings that had consent go back to following the owner's
-- setting (a hidden owner's number is hidden again). Private contact rows written by 0062 for Seeds &
-- fertiliser stay in the private table (not public; harmless).

drop function if exists public.create_listing_with_location(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text, boolean, uuid, boolean);

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

create or replace function public.get_listing_contact(p_listing_id uuid)
returns table(full_name text, phone text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.listings l
    join public.profiles p on p.id = l.user_id
    where l.id = p_listing_id
      and l.status = 'active'
      and l.expires_at > now()
      and p.consents #>> '{details_visibility,choice}' = 'hidden'
  ) then
    raise exception 'contact_hidden';
  end if;

  return query
  select p.full_name,
         coalesce((select c.contact_phone from public.listing_private_contact c where c.listing_id = l.id), p.phone) as phone
  from public.listings l
  join public.profiles p on p.id = l.user_id
  where l.id = p_listing_id
    and l.status = 'active'
    and l.expires_at > now();
  if not found then
    raise exception 'not_available';
  end if;
end;
$$;

alter table public.listings drop column if exists contact_consent_at;
