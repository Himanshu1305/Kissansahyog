-- Batch 7L-1 — mandi_prices.in_sagar_division: "local mandi" now means Sagar Division.
-- NOT APPLIED by the batch that wrote it: apply to staging first, then production.
--
-- What it does: adds one boolean column to public.mandi_prices, marks every existing row
-- whose district is one of the six districts of Sagar Division (Sagar, Damoh, Panna,
-- Tikamgarh, Chhatarpur, Niwari) and indexes it. The site's "local mandis" queries and the
-- price ingestion (scripts/refresh-data.mjs, scripts/backfill-mandi-history.mjs) use this
-- flag from now on.
--
-- is_sagar_district is left exactly as it is (column, values and meaning unchanged).
-- No policy or grant changes: the table's existing public-read RLS already covers the new
-- column, and only the service role writes it.
--
-- Order: apply this BEFORE the ingestion change in this batch reaches the branch the
-- "Refresh Mandi Prices" workflow runs from. (If it is not applied yet, the ingestion
-- writes rows without the flag and the site reads is_sagar_district instead, so nothing
-- breaks — the division mandis simply are not treated as local until it is applied.)
--
-- Rollback note:
--   drop index if exists public.mandi_prices_division_date_idx;
--   alter table public.mandi_prices drop column if exists in_sagar_division;

alter table public.mandi_prices
  add column if not exists in_sagar_division boolean not null default false;

update public.mandi_prices
set in_sagar_division = true
where in_sagar_division is distinct from true
  and lower(btrim(district)) in ('sagar', 'saugor', 'damoh', 'panna', 'tikamgarh', 'chhatarpur', 'chatarpur', 'chattarpur', 'niwari');

create index if not exists mandi_prices_division_date_idx
  on public.mandi_prices (in_sagar_division, price_date desc);

comment on column public.mandi_prices.in_sagar_division is 'True when the mandi is in one of the six districts of Sagar Division. Set by the price ingestion.';
