-- 0063_equipment_specs.sql — Batch 9C: equipment spec fields are mandatory on new equipment OFFERS,
-- enforced on the server too (not only in the form). Requires 0061 + 0062 (it replaces the same function
-- and keeps every Batch 9B line: same-request-id retry, contact consent, F1).
--
-- The new app adds details.spec_version = 1 to every equipment offer. When category = equipment,
-- listing type = offer, spec_version = 1 and the type (equipment_types.name_en) has rules below, every
-- mandatory field must be present, non-empty and in range, otherwise the call is refused with
--   equipment_spec_invalid:<field>:<required|range>
-- (the app shows the same Hindi-first message as its form). Rules:
--   text   non-empty            brand   non-empty; 'other' needs brand_other
--   year   whole number 1990 .. current year (India time) + 1
--   int:LO:HI  whole number LO..HI     gt:LO:HI  number > LO and <= HI     ge:LO:HI  number >= LO and <= HI
-- Output per hour is never required. Trolley, Water tanker and any type without rules: no check.
-- Calls WITHOUT spec_version (older APK, cached websites) are not checked and work exactly as before.
-- The rules JSON is generated from src/lib/listings/catalog.js equipmentServerRules();
-- scripts/check-equipment-specs.mjs fails if the two ever differ.
-- Same 14 parameters as 0062, so CREATE OR REPLACE keeps the grants and every existing caller.
-- Rollback: supabase/migrations/rollback/0063_equipment_specs_rollback.sql (restores 0062's definition).

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
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_listing public.listings%rowtype;
  v_consent boolean := coalesce(p_contact_consent, false)
    and (p_listing_source = 'vendor' or (p_listing_type = 'offer' and p_category in ('equipment', 'warehouse', 'greenhouse', 'jugaad')));
  v_hidden  boolean;
  v_phone   text;
  v_details jsonb := p_details;
  -- Batch 9C: mandatory spec fields per equipment type (generated from catalog.js equipmentServerRules()).
  v_rules   constant jsonb := '{"Tractor":{"brand":"brand","model":"text","year":"year","power_hp":"gt:0:500"},"Pit Digging Tractor":{"brand":"brand","model":"text","year":"year","power_hp":"gt:0:500","spec_auger_size":"text"},"Crane Tractor":{"brand":"brand","model":"text","year":"year","power_hp":"gt:0:500","spec_lifting_capacity":"text"},"Thresher":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_crop":"text"},"Harvester":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_cutting_width":"text","spec_crop":"text"},"Rotavator":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_working_width":"text"},"Seed Drill":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_rows":"int:1:100"},"Reaper":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_working_width":"text"},"Paddy Planting Machine":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_rows":"int:1:100"},"Blower":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500"},"LCB (Straw Machine)":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500"},"JCB / Excavator":{"brand":"text","model":"text","year":"year","power_hp":"gt:0:500","spec_bucket_size":"text"},"Drone":{"brand":"text","model":"text","year":"year","spec_tank_litres":"gt:0:1000","spec_flight_minutes":"gt:0:600"},"Other":{"brand":"text","model":"text","year":"year","power_hp":"ge:0:500","spec_machine_name":"text"}}'::jsonb;
  v_type    text;
  v_rule    jsonb;
  v_key     text;
  v_kind    text;
  v_val     text;
  v_bad     boolean;
begin
  -- A retry of a Post that already went through: hand back the same listing, create nothing.
  if p_client_request_id is not null then
    select * into v_listing from public.listings
      where user_id = p_actor_id and client_request_id = p_client_request_id;
    if found then return v_listing; end if;
  end if;

  -- Batch 9C: an equipment OFFER from the new form must carry its type's specs.
  if p_category = 'equipment' and p_listing_type = 'offer' and coalesce(p_details->>'spec_version', '') = '1' then
    if coalesce(p_details->>'equipment_type_id', '') ~ '^[0-9]{1,9}$' then
      select et.name_en into v_type from public.equipment_types et
        where et.id = (p_details->>'equipment_type_id')::int;
    end if;
    v_rule := case when v_type is null then null else v_rules -> v_type end;
    if v_rule is not null then
      for v_key, v_kind in select r.key, r.value #>> '{}' from jsonb_each(v_rule) r loop
        v_val := trim(coalesce(p_details->>v_key, ''));
        if v_val = '' then raise exception 'equipment_spec_invalid:%:required', v_key; end if;
        v_bad := false;
        if v_kind = 'brand' then
          if v_val = 'other' and trim(coalesce(p_details->>'brand_other', '')) = '' then
            raise exception 'equipment_spec_invalid:brand_other:required';
          end if;
        elsif v_kind = 'year' then
          if v_val !~ '^[0-9]{4}$' then
            v_bad := true;
          elsif v_val::int < 1990 or v_val::int > extract(year from (now() at time zone 'Asia/Kolkata'))::int + 1 then
            v_bad := true;
          end if;
        elsif v_kind like 'int:%' then
          if v_val !~ '^[0-9]{1,9}$' then
            v_bad := true;
          elsif v_val::numeric < split_part(v_kind, ':', 2)::numeric or v_val::numeric > split_part(v_kind, ':', 3)::numeric then
            v_bad := true;
          end if;
        elsif v_kind like 'gt:%' or v_kind like 'ge:%' then
          if v_val !~ '^[0-9]{1,12}(\.[0-9]{1,12})?$' then
            v_bad := true;
          elsif v_val::numeric > split_part(v_kind, ':', 3)::numeric then
            v_bad := true;
          elsif v_kind like 'gt:%' and v_val::numeric <= split_part(v_kind, ':', 2)::numeric then
            v_bad := true;
          elsif v_kind like 'ge:%' and v_val::numeric < split_part(v_kind, ':', 2)::numeric then
            v_bad := true;
          end if;
        end if;
        if v_bad then raise exception 'equipment_spec_invalid:%:range', v_key; end if;
      end loop;
    end if;
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
$function$;
