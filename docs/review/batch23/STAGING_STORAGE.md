# Staging storage cleanup (Batch 23, section 4) - founder runs the SQL, one step at a time

**The problem:** the STAGING Supabase project (`wzxtqbqlahyahsnoqqva`) says `exceed_storage_size_quota` and is restricted. Until it is fixed, staging reads and writes may fail, and the staging job of the "Refresh Mandi Prices" workflow stays red. (Batch 23 made that job unable to turn the whole run red, but it must still be repaired.)

**What I (Claude) did NOT do:** I cannot see staging, I did not try to reach it, and I have written NO delete statements yet, because I have not seen the sizes. Deleting blind is how test data gets lost.

---

## Step 1 - look (read-only, safe to run)

Open the Supabase dashboard for **staging** (`wzxtqbqlahyahsnoqqva`) -> SQL Editor -> paste this whole block -> Run. It only reads (`select`), it changes nothing. If the editor shows only the last result, run the three parts one at a time.

```sql
-- Part A: the whole database size, and the 15 biggest tables with their row counts
select pg_size_pretty(pg_database_size(current_database())) as database_total;

select n.nspname || '.' || c.relname                        as table_name,
       pg_size_pretty(pg_total_relation_size(c.oid))        as total_size,
       pg_total_relation_size(c.oid)                        as bytes,
       c.reltuples::bigint                                  as approx_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and n.nspname not in ('pg_catalog', 'information_schema')
order by pg_total_relation_size(c.oid) desc
limit 15;

-- Part B: exact row counts for the tables most likely to be big
select 'mandi_prices' as t, count(*) from public.mandi_prices
union all select 'weather_cache_v2', count(*) from public.weather_cache_v2
union all select 'weather_cache', count(*) from public.weather_cache
union all select 'weather_grid_requests', count(*) from public.weather_grid_requests
union all select 'otp_requests', count(*) from public.otp_requests
union all select 'otp_tickets', count(*) from public.otp_tickets
union all select 'listing_view_log', count(*) from public.listing_view_log;

-- Part C: file storage (photos etc.) by bucket
select bucket_id,
       count(*)                                                        as files,
       pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0))   as total_size,
       coalesce(sum((metadata->>'size')::bigint), 0)                   as bytes
from storage.objects
group by bucket_id
order by 4 desc;
```

If a table in Part B does not exist on staging, the whole Part B fails: delete that line and run it again.

## Step 2 - send me the result

Copy the three result tables (or take a screenshot) and paste them to Claude (the architect). Claude will then write the exact, reviewed `delete` statements, you run them, and we re-check the size. **Do not delete anything before that.**

**What I expect to find (guesses from the code, to be confirmed by your numbers):**
- `mandi_prices` - the price refresh writes about 100 rows per day and, on staging, a 120-day backfill was loaded; old months can go.
- `weather_cache_v2` / `weather_grid_requests` - weather is refreshed every 2 hours for every location ever requested; old rows pile up.
- Storage bucket(s) with **test listing photos** (usually the biggest by far).
- `otp_requests`, `otp_tickets`, `otp_usage_daily` - sign-in code logs.
- `listing_view_log`, `seed_log` and similar log tables.
- Admin / audit / action log tables, if present.

**Never prune on staging (tests depend on them):** `profiles`, `listings`, `kissan_mitras`, `kissan_mitra_payments`, `site_settings` (and the content tables the tests read: `msp_prices`, places/district seeds, FAQ and article content). If a number looks huge in one of these, tell me instead of deleting.

## Step 3 - how you know it is fixed

1. In the Supabase dashboard for staging, the red **"restricted"** banner is gone (Settings -> Usage shows the database/storage under the plan limit).
2. On GitHub -> Actions -> **Refresh Mandi Prices**, the next run shows `refresh (staging)` **green** (before that it may be red but the run itself stays green, by design).
3. Then ask Claude to remove `continue-on-error` from `.github/workflows/refresh-mandi-prices.yml` so a broken staging shows up again.

## Step 4 - proposal only (NOT implemented): a retention rule so it cannot fill up again

- Keep `weather_cache_v2` and `weather_grid_requests` rows for 30 days, delete older ones nightly.
- Keep `mandi_prices` on **staging** for 120 days (the backfill window); production keeps everything (it feeds the 10-year history).
- Keep OTP and view logs 90 days.
- Do it with one small scheduled SQL function on staging only (pg_cron is already on), written and reviewed in a later batch. Production is left alone.
