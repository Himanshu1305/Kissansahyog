-- ROLLBACK of 0063_equipment_specs.sql (Batch 9C). Restores create_listing_with_location exactly as
-- 0062 defined it (read from staging with pg_get_functiondef before 0063 was applied): equipment offers
-- are then no longer checked for specs on the server. Same 14 parameters, so grants are unchanged.
-- Listings saved meanwhile keep their spec keys in details (harmless; the app shows them).
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

;
