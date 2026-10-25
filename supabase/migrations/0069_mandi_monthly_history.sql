-- Kisan Sahyog - 0069 mandi monthly history (Batch 15A)
--
-- Ten years of MONTHLY Modal prices (2016-01 .. 2025-10) for the crops shown on /msp, for the Sagar division
-- (mean of the districts that reported) and for Madhya Pradesh. Source: Agmarknet / DMI data republished by the
-- CEDA Agri-Market Data portal (Ashoka University), loaded once by the owner (see docs/review/batch15a/SHIP.md).
-- ADDITIVE ONLY: one new table, its RLS policy and grants. Nothing existing is altered. mandi_prices (the daily
-- table) is not touched. Idempotent: safe to run twice. Pure ASCII.

create table if not exists public.mandi_monthly_history (
  commodity_en        text not null,
  scope               text not null check (scope in ('sagar_division', 'mp')),
  month               date not null,                        -- first day of the month
  modal_price         numeric(10,2) not null check (modal_price > 0),
  districts_reporting smallint,                             -- null for scope mp
  source              text not null default 'agmarknet-dmi-via-ceda',
  primary key (commodity_en, scope, month)
);

alter table public.mandi_monthly_history enable row level security;

-- Public read of public government price data. No write grant for anon / authenticated:
-- rows are loaded only by the owner pasting SQL in the Supabase dashboard (service role).
revoke all on table public.mandi_monthly_history from public, anon, authenticated;
grant select on table public.mandi_monthly_history to anon, authenticated;

drop policy if exists mandi_monthly_history_read on public.mandi_monthly_history;
create policy mandi_monthly_history_read on public.mandi_monthly_history
  for select to anon, authenticated
  using (true);
