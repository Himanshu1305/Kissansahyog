-- Batch 2 item B — Cold storage: geocoding columns for distance search.
-- Adds latitude/longitude (filled once by scripts/geocode-cold-storage.mjs via
-- Nominatim) + geo_precision ('address' | 'city') so the finder can sort the
-- directory by distance from the user's location.
--
-- SAFE FOR THE LIVE APP (Hard rule 8): cold_storage_directory is a V2-only table
-- (added in 0041); the pre-V2 live app has NO cold_storage references (verified
-- against ba455ae:src). This migration is purely additive — new nullable columns
-- on the base table and three new columns appended to the end of the public view
-- (old readers ignore trailing columns). Nothing renamed or made required.
-- Additive + idempotent.

alter table public.cold_storage_directory
  add column if not exists latitude     numeric,
  add column if not exists longitude    numeric,
  add column if not exists geo_precision text;  -- 'address' | 'city' | null (not geocoded)

-- Partial index for the "has coordinates" scans the finder/geocoder do.
create index if not exists cold_storage_geo_idx
  on public.cold_storage_directory (latitude, longitude)
  where status = 'active' and latitude is not null;

-- Re-expose the public view with the three new columns appended at the end.
-- (create or replace view keeps the existing leading column list unchanged, so
-- existing readers are unaffected.)
create or replace view public.cold_storage_public as
  select id, name, city, district, address, pincode, phone, products, capacity,
         type, rating, source_name, source_url, is_old_list, slug,
         space_available, space_updated, claim_status,
         latitude, longitude, geo_precision
  from public.cold_storage_directory
  where status = 'active';
grant select on public.cold_storage_public to anon, authenticated;
