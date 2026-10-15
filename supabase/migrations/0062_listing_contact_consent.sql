-- 0062_listing_contact_consent.sql — Batch 9B Fix A: vendor-contact consent (+ finding F1).
-- Requires 0061 (it replaces the same function).
--
-- Founder's rule: a shop/vendor listing exists so people can contact the seller, so on vendor-source
-- listings and provider offers (equipment, warehouse, greenhouse, jugaad) the number MAY be shown,
-- but only if the owner knowingly agreed on that listing. Farmer listings are unchanged. A "keep hidden"
-- account never has its number shown unless it ticked the box on that specific listing.
--
-- 1. listings.contact_consent_at (nullable): when the owner ticked "I agree" on this listing.
--    Existing rows stay NULL, so they keep following the owner's setting.
-- 2. create_listing_with_location gains p_contact_consent (default false). It stamps the time only for a
--    vendor listing or an OFFER in a provider category (a farmer asking for a tractor is not a provider). Consent is NOT required by the server: the older app posts
--    without it and must keep working; without a stamp a hidden owner simply stays hidden.
-- 3. F1: Seeds & fertiliser "Shop / Vendor" copies the mobile into the PUBLIC listing data
--    (details.contact_phone, public since 0031). For a hidden owner without consent the number is now
--    moved into the private table listing_private_contact (as for Land) and the public key is left as ''.
--    Show owners and consented listings are unchanged. Applies to the older app too (server side).
-- 4. get_listing_contact: a hidden owner is still refused, unless this listing has contact_consent_at.
-- Rollback: supabase/migrations/rollback/0062_listing_contact_consent_rollback.sql

alter table public.listings add column if not exists contact_consent_at timestamptz;

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
  p_rules_agreed boolean default false,
  p_client_request_id uuid default null,
  p_contact_consent boolean default false
)
returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

grant execute on function public.create_listing_with_location(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text, boolean, uuid, boolean) to anon, authenticated, service_role;

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
      and l.contact_consent_at is null
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
