-- Kisan Sahyog — 0022 Homepage v4 support
--   * nearby_counts(pincode, km): live per-category listing counts near a pincode
--     (asset-location distance, Haversine in SQL). Public/anon.
--   * kisan_sawaal.photo_url: optional photo attached to a farmer's question.

-- ---------------------------------------------------------------------------
-- Per-category counts of ACTIVE listings within p_km of a pincode's coordinates.
-- Uses the listing's OWN latitude/longitude (asset location). Returns one row per
-- of the six homepage categories (0 when none), so the caller never hides a chip.
-- ---------------------------------------------------------------------------
create or replace function public.nearby_counts(p_pincode text, p_km int default 30)
returns table (category text, count bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_lat double precision;
  v_lon double precision;
begin
  select latitude, longitude into v_lat, v_lon
  from public.pincodes where pincode = coalesce(p_pincode, '') limit 1;

  return query
  with cats(category) as (
    values ('equipment'), ('labor'), ('bhusa'), ('drone_didi'), ('warehouse'), ('land')
  )
  select c.category,
         coalesce((
           select count(*) from public.listings l
           where l.category = c.category
             and l.status = 'active'
             and (l.expires_at is null or l.expires_at > now())
             and v_lat is not null and l.latitude is not null and l.longitude is not null
             and 111.045 * degrees(acos(least(1.0,
                   cos(radians(v_lat)) * cos(radians(l.latitude)) *
                   cos(radians(l.longitude) - radians(v_lon)) +
                   sin(radians(v_lat)) * sin(radians(l.latitude))
                 ))) <= greatest(1, coalesce(p_km, 30))
         ), 0) as count
  from cats c;
end;
$$;

grant execute on function public.nearby_counts(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Optional photo on a farmer's question (uploaded to Supabase Storage by the UI).
-- ---------------------------------------------------------------------------
alter table public.kisan_sawaal add column if not exists photo_url text;
