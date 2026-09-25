-- Kisan Sahyog — 0027 client weather cache write-back
--
-- Weather must work for ANY lat/lng on Earth (Open-Meteo is global). When a visitor
-- lands on a grid cell that the cron has never populated (e.g. a first-ever visit from
-- Hyderabad), the browser fetches live from Open-Meteo and calls this RPC to persist the
-- result, so subsequent visitors read it from cache and the next cron run keeps it fresh.
--
-- weather_cache_v2 is otherwise service-role-write only; this SECURITY DEFINER RPC is the
-- ONE narrow, validated anon write path (weather data is public + self-correcting on the
-- next cron pass, so the abuse surface is negligible). season_rain is preserved if a row
-- already has it (the client fetch only supplies the forecast, not the 10-year archive).
create or replace function public.cache_weather_cell(
  p_grid_key text,
  p_lat      double precision,
  p_lon      double precision,
  p_current  jsonb,
  p_hourly   jsonb,
  p_daily    jsonb
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Basic sanity: a well-formed grid key + on-Earth coordinates.
  if p_grid_key is null or p_grid_key !~ '^-?[0-9]+\.[0-9]_-?[0-9]+\.[0-9]$' then
    raise exception 'invalid_grid_key';
  end if;
  if p_lat is null or p_lat < -90 or p_lat > 90 or p_lon is null or p_lon < -180 or p_lon > 180 then
    raise exception 'invalid_coords';
  end if;

  insert into public.weather_cache_v2 (grid_key, latitude, longitude, current, hourly, daily, season_rain, fetched_at)
  values (p_grid_key, p_lat, p_lon, coalesce(p_current, '{}'::jsonb), coalesce(p_hourly, '[]'::jsonb), coalesce(p_daily, '[]'::jsonb), null, now())
  on conflict (grid_key) do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    current = excluded.current,
    hourly = excluded.hourly,
    daily = excluded.daily,
    -- keep any season_rain the cron already computed; don't clobber it with null
    season_rain = coalesce(public.weather_cache_v2.season_rain, excluded.season_rain),
    fetched_at = now();
end;
$$;

grant execute on function public.cache_weather_cell(text, double precision, double precision, jsonb, jsonb, jsonb) to anon, authenticated;
