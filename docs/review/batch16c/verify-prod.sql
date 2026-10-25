-- Batch 16C - read-only check of the mandi feed. Run in the PRODUCTION SQL editor
-- (the address bar must contain eltmcznjcqiahqhjvpjg). Nothing here changes data.

-- 1. Rows per price_date, last 10 days.
select price_date, count(*) as rows_total, count(*) filter (where in_sagar_division) as sagar_division_rows
from public.mandi_prices
where price_date >= current_date - 10
group by price_date
order by price_date desc;

-- 2. Newest price_date overall and its Sagar-division row count.
select max(price_date) as newest_price_date,
       (select count(*) from public.mandi_prices m2
         where m2.price_date = (select max(price_date) from public.mandi_prices) and m2.in_sagar_division) as sagar_division_rows_on_newest_date
from public.mandi_prices;
