-- Kissan Sahyog · Batch 10E · mandi_prices verification (read-only). Run BEFORE and AFTER the backfill parts.
-- Counts per crop: distinct days, first/last date, rows — Sagar Division rows, and all rows.
select 'sagar_division' as scope, commodity_en, count(distinct price_date) as days, min(price_date) as first_date,
       max(price_date) as last_date, count(*) as rows,
       count(distinct price_date) filter (where price_date > current_date - 90) as days_last_90,
       count(distinct price_date) filter (where price_date > current_date - 30) as days_last_30
  from public.mandi_prices where in_sagar_division group by commodity_en
union all
select 'all_rows', commodity_en, count(distinct price_date), min(price_date), max(price_date), count(*),
       count(distinct price_date) filter (where price_date > current_date - 90),
       count(distinct price_date) filter (where price_date > current_date - 30)
  from public.mandi_prices group by commodity_en
order by 1 desc, 2;
-- Rows inside the backfill window (2026-06-20 … 2026-10-17) for the backfilled scope:
select count(*) as rows_in_window from public.mandi_prices
 where in_sagar_division and price_date between '2026-06-20' and '2026-10-17';
