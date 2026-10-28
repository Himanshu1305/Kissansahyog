# Batch 16D decisions

1. The data.gov.in key `DATA_GOV_IN_API_KEY` is not in `.env` (checked `.env`, `.env.production`, `.env.example`, the shell). Per the rules the live recon (Phase 0 items 1-3) and the live dry run (Phase 3) were NOT run. Everything else was done.
2. Request plan: 60 requests (crop x district), the exact shape Batch 10E proved, with paging until the oldest row is before the window. The 10-request option (State + Commodity only) could not be measured without the key, and for a 14 or 30 day window it would page several times anyway. 60 requests at 1.5 s spacing is about 90 seconds, which is fine for a daily job. The plan function takes crops and districts, so changing it later is a small edit.
3. Fallbacks run per commodity, in order 35985678, then 9ef84268, then the wrapper. A source that throws is logged (status or cause code, key masked) and the next one is tried.
4. Write behaviour: rows dated within the last 2 days are upserted (the government may correct them); older rows are insert-if-absent (`ignoreDuplicates`), so a stored price is never overwritten. This also makes the 14-day catch-up safe to run twice.
5. The shared demo key was removed from `refresh-data.mjs`. Without a real key only the wrapper is tried and the run will normally be red (it is stale). A missing key now shows in the log: "data.gov.in key: NOT SET".
6. Window: default 7 days; `--days N` or env `MANDI_DAYS`, clamped to 30; junk values give 7. The command line wins over the env.
7. Fallback sources (9ef84268, wrapper) keep their 16C behaviour (newest record per market, freshness filter), with the age limit raised to the window when `--days` is larger than 7.
8. Cron stays 3-hourly (idempotent). The job summary now has a "reading" line: it says "Normal" when the feed is a day or two behind, and "RED" when nothing came or the newest price is more than 3 days old.
9. Partial failure: if some of the 60 requests fail after retries, the summary says how many, and the run still writes what it got. It fails only by the existing 16C rules (zero rows, or newest older than 3 days).
10. No `src/` or `public/` change. `price_date` is always the record's own `Arrival_Date`.
