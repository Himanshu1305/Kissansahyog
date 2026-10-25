-- Batch 6B — additive listing consents, upload safety and location wrapper.
-- Rollback note: do not remove this migration from a shared database. To roll back
-- application use, deploy the prior client; the added column/functions are harmless
-- to older builds. To undo the storage limit, set listing-photos.file_size_limit
-- back to NULL after confirming no policy relies on it.

-- New consent data is separate from the legacy timestamp. The timestamp continues
-- to be written by accept_listing_consents for compatibility with older builds.
alter table public.profiles
  add column if not exists consents jsonb not null default '{}'::jsonb;

-- There is intentionally no direct profile UPDATE policy here. Existing clients
-- use owner-scoped SECURITY DEFINER RPCs, so this introduces no broader RLS path.
create or replace function public.accept_listing_consents(
  p_actor_id uuid,
  p_items jsonb
) returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_items jsonb := coalesce(p_items, '{}'::jsonb);
begin
  if coalesce((v_items->>'connect_only')::boolean, false) is not true
     or coalesce((v_items->>'no_verification')::boolean, false) is not true
     or coalesce((v_items->>'no_payments')::boolean, false) is not true
     or coalesce((v_items->>'posting_rules')::boolean, false) is not true then
    raise exception 'consents_not_accepted';
  end if;

  update public.profiles
  set consents = jsonb_build_object(
        'version', '2026-10',
        'accepted_at', now()::text,
        'items', jsonb_build_object(
          'connect_only', true,
          'no_verification', true,
          'no_payments', true,
          'posting_rules', true
        )
      ),
      disclaimer_accepted_at = coalesce(disclaimer_accepted_at, now())
  where id = p_actor_id
  returning * into v_profile;
  if not found then raise exception 'not_authorized'; end if;
  return v_profile;
end;
$$;
grant execute on function public.accept_listing_consents(uuid, jsonb) to anon, authenticated;

-- Keep create_listing's existing 12-argument signature callable. This new wrapper
-- adds server validation for transport route details and honours a user-selected
-- browser location after the established function has performed its legacy work.
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
) returns public.listings
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
grant execute on function public.create_listing_with_location(uuid, text, text, jsonb, numeric, numeric, text, boolean, text, boolean, text, boolean) to anon, authenticated;

-- The only non-table change in this migration. Revert by setting this value NULL
-- as described in the rollback note above; do not restrict MIME types because an
-- older build may use other image types.
update storage.buckets set file_size_limit = 5242880 where id = 'listing-photos';
