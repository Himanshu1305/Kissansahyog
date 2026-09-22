-- Kisan Sahyog — 0019 mandi price ticker cache
--
-- Cached wholesale (mandi) prices for key crops, refreshed daily by a GitHub
-- Actions cron running scripts/refresh-mandi-prices.mjs (Agmarknet wrapper →
-- data.gov.in fallback). Public read; writes only via the service role (cron).

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

-- Newest-first lookups by date.
create index if not exists mandi_prices_date_idx on public.mandi_prices (price_date desc);

alter table public.mandi_prices enable row level security;
grant select on public.mandi_prices to anon;

drop policy if exists mandi_prices_read on public.mandi_prices;
create policy mandi_prices_read on public.mandi_prices
  for select to anon
  using (true);
-- No anon write policies => writes only via the service role (refresh cron).
