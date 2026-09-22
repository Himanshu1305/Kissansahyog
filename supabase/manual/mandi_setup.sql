-- Kisan Sahyog — Mandi ticker one-time setup (RUN IN THE SUPABASE SQL EDITOR)
--
-- WHY THIS FILE EXISTS: migration 0019 could not be applied automatically because
-- the Supabase Management API personal access token (SUPABASE_ACCESS_TOKEN in .env)
-- had expired (HTTP 401). Once that token is refreshed, `npm run db migrate` will
-- apply 0019 normally and this file is redundant. Until then, paste the whole file
-- into the Supabase dashboard → SQL Editor and run it once. It is idempotent.
--
-- After this: set the GitHub Actions secrets (VITE_SUPABASE_URL,
-- SUPABASE_SERVICE_ROLE_KEY) so the daily cron keeps prices fresh, or run
-- `npm run refresh-prices` locally to pull today's real prices.

-- 1) Table + RLS (identical to migration 0019).
create table if not exists public.mandi_prices (
  id                uuid primary key default gen_random_uuid(),
  commodity_en      text not null,
  commodity_hi      text not null,
  market            text not null,
  district          text not null,
  state             text not null default 'Madhya Pradesh',
  min_price         numeric,
  max_price         numeric,
  modal_price       numeric not null,
  price_date        date not null,
  is_sagar_district boolean not null default false,
  fetched_at        timestamptz default now(),
  unique (commodity_en, market, price_date)
);
create index if not exists mandi_prices_date_idx on public.mandi_prices (price_date desc);
alter table public.mandi_prices enable row level security;
grant select on public.mandi_prices to anon;
drop policy if exists mandi_prices_read on public.mandi_prices;
create policy mandi_prices_read on public.mandi_prices for select to anon using (true);

-- 2) Fallback seed — approximate recent Sagar-district prices, dated YESTERDAY so
--    the ticker correctly shows the "कल के / Yesterday's" badge (not today's).
--    The daily cron / `npm run refresh-prices` will overwrite with real today data.
insert into public.mandi_prices (commodity_en, commodity_hi, market, district, state, min_price, max_price, modal_price, price_date, is_sagar_district)
values
  ('Wheat', 'गेहूं', 'Khurai', 'Sagar', 'Madhya Pradesh', 2200, 2450, 2318, CURRENT_DATE - 1, true),
  ('Soyabean', 'सोयाबीन', 'Sagar', 'Sagar', 'Madhya Pradesh', 4200, 4700, 4450, CURRENT_DATE - 1, true),
  ('Gram', 'चना', 'Sagar', 'Sagar', 'Madhya Pradesh', 4800, 5400, 5100, CURRENT_DATE - 1, true),
  ('Lentil', 'मसूर', 'Khurai', 'Sagar', 'Madhya Pradesh', 5500, 6200, 5800, CURRENT_DATE - 1, true),
  ('Moong', 'मूंग', 'Sagar', 'Sagar', 'Madhya Pradesh', 6800, 7500, 7100, CURRENT_DATE - 1, true),
  ('Paddy(Dhan)(Common)', 'धान', 'Sagar', 'Sagar', 'Madhya Pradesh', 1500, 1750, 1617, CURRENT_DATE - 1, true),
  ('Garlic', 'लहसुन', 'Khurai', 'Sagar', 'Madhya Pradesh', 3000, 4500, 3800, CURRENT_DATE - 1, true)
on conflict (commodity_en, market, price_date) do nothing;
