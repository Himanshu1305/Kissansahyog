-- Batch 15A - read-only check of the monthly history load. Compare with DATA_CHECK.md / expected-counts.json.
select commodity_en, scope, count(*) as months, min(month) as first_month, max(month) as last_month
from public.mandi_monthly_history
group by commodity_en, scope
order by commodity_en, scope;

select count(*) as total_rows from public.mandi_monthly_history;
