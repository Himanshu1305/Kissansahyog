-- Kisan Sahyog — 0020 MSP prices + weather cache
--
-- Two tables: msp_prices (govt Minimum Support Prices, admin-managed, compared to
-- live mandi prices) and weather_cache (5-day Khurai/Sagar forecast from Open-Meteo,
-- refreshed by the same cron as mandi prices). Both: public read, service-role writes.

-- ---------------------------------------------------------------------------
-- MSP prices
-- ---------------------------------------------------------------------------
create table if not exists public.msp_prices (
  id                      uuid primary key default gen_random_uuid(),
  crop_en                 text not null,
  crop_hi                 text not null,
  variety                 text,
  season                  text not null check (season in ('kharif', 'rabi', 'commercial')),
  marketing_year          text not null,
  msp_per_quintal         numeric not null,
  increase_from_previous  numeric,
  is_active               boolean not null default true,
  updated_at              timestamptz default now(),
  unique (crop_en, variety, marketing_year)
);

alter table public.msp_prices enable row level security;
grant select on public.msp_prices to anon;
drop policy if exists msp_prices_read on public.msp_prices;
create policy msp_prices_read on public.msp_prices for select to anon using (is_active = true);

insert into public.msp_prices (crop_en, crop_hi, variety, season, marketing_year, msp_per_quintal, increase_from_previous, is_active) values
-- Kharif 2026-27 (announced May 2026)
('Paddy', 'धान', 'Common', 'kharif', '2026-27', 2441, 72, true),
('Paddy', 'धान', 'Grade A', 'kharif', '2026-27', 2461, 72, true),
('Jowar', 'ज्वार', 'Hybrid', 'kharif', '2026-27', 4023, 324, true),
('Bajra', 'बाजरा', NULL, 'kharif', '2026-27', 2900, 125, true),
('Maize', 'मक्का', NULL, 'kharif', '2026-27', 2410, 10, true),
('Tur (Arhar)', 'अरहर (तुअर)', NULL, 'kharif', '2026-27', 8450, 450, true),
('Moong', 'मूंग', NULL, 'kharif', '2026-27', 8780, 12, true),
('Urad', 'उड़द', NULL, 'kharif', '2026-27', 8200, 400, true),
('Soyabean', 'सोयाबीन', 'Yellow', 'kharif', '2026-27', 5708, 380, true),
('Groundnut', 'मूंगफली', NULL, 'kharif', '2026-27', 7517, 254, true),
('Sunflower Seed', 'सूरजमुखी', NULL, 'kharif', '2026-27', 8343, 622, true),
('Sesamum', 'तिल', NULL, 'kharif', '2026-27', 10346, 500, true),
('Nigerseed', 'रामतिल', NULL, 'kharif', '2026-27', 10052, 0, true),
('Cotton', 'कपास', 'Medium Staple', 'kharif', '2026-27', 8267, 557, true),
('Cotton', 'कपास', 'Long Staple', 'kharif', '2026-27', 8667, 557, true),
-- Rabi 2026-27 (announced October 2025)
('Wheat', 'गेहूं', NULL, 'rabi', '2026-27', 2585, 160, true),
('Barley', 'जौ', NULL, 'rabi', '2026-27', 2150, 170, true),
('Gram', 'चना', NULL, 'rabi', '2026-27', 5875, 225, true),
('Masur (Lentil)', 'मसूर', NULL, 'rabi', '2026-27', 7000, 300, true),
('Rapeseed & Mustard', 'सरसों', NULL, 'rabi', '2026-27', 5950, 300, true),
('Safflower', 'कुसुम', NULL, 'rabi', '2026-27', 5940, 140, true)
on conflict (crop_en, variety, marketing_year) do nothing;

-- ---------------------------------------------------------------------------
-- Weather cache
-- ---------------------------------------------------------------------------
create table if not exists public.weather_cache (
  id                  uuid primary key default gen_random_uuid(),
  location_name       text not null default 'Khurai/Sagar',
  latitude            numeric not null default 23.84,
  longitude           numeric not null default 78.73,
  current_temp        numeric,
  current_humidity    numeric,
  current_weathercode integer,
  forecast            jsonb not null default '[]',
  rain_alert_48h      boolean not null default false,
  fetched_at          timestamptz default now(),
  unique (location_name)
);

alter table public.weather_cache enable row level security;
grant select on public.weather_cache to anon;
drop policy if exists weather_cache_read on public.weather_cache;
create policy weather_cache_read on public.weather_cache for select to anon using (true);

-- ---------------------------------------------------------------------------
-- Admin MSP management RPCs (is_admin-checked; existing RPCs untouched).
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_msp(p_actor_id uuid)
returns setof public.msp_prices
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.msp_prices order by season, crop_en, variety;
end;
$$;

create or replace function public.admin_set_msp_active(p_actor_id uuid, p_id uuid, p_active boolean)
returns public.msp_prices
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.msp_prices%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.msp_prices set is_active = p_active, updated_at = now() where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_upsert_msp(
  p_actor_id uuid, p_id uuid, p_crop_en text, p_crop_hi text, p_variety text,
  p_season text, p_marketing_year text, p_msp_per_quintal numeric, p_increase_from_previous numeric, p_is_active boolean
) returns public.msp_prices
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.msp_prices%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_season not in ('kharif', 'rabi', 'commercial') then raise exception 'invalid_season'; end if;
  if coalesce(trim(p_crop_en), '') = '' or coalesce(trim(p_crop_hi), '') = '' then raise exception 'name_required'; end if;
  if p_id is null then
    insert into public.msp_prices (crop_en, crop_hi, variety, season, marketing_year, msp_per_quintal, increase_from_previous, is_active)
    values (trim(p_crop_en), trim(p_crop_hi), nullif(trim(coalesce(p_variety, '')), ''), p_season, p_marketing_year, p_msp_per_quintal, p_increase_from_previous, coalesce(p_is_active, true))
    returning * into v;
  else
    update public.msp_prices set
      crop_en = trim(p_crop_en), crop_hi = trim(p_crop_hi), variety = nullif(trim(coalesce(p_variety, '')), ''),
      season = p_season, marketing_year = p_marketing_year, msp_per_quintal = p_msp_per_quintal,
      increase_from_previous = p_increase_from_previous, is_active = coalesce(p_is_active, true), updated_at = now()
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$$;

grant execute on function public.get_admin_msp(uuid) to anon, authenticated;
grant execute on function public.admin_set_msp_active(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_upsert_msp(uuid, uuid, text, text, text, text, text, numeric, numeric, boolean) to anon, authenticated;
