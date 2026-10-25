# Batch 16C recon - why there are no new mandi prices since 17 Oct 2026

Read-only. No database was opened, no secret was read or printed. Date of recon: 25 Oct 2026.

## Hypotheses

| # | Verdict | Evidence |
|---|---------|----------|
| H1 scheduled job runs old code | **Confirmed** (code evidence; the run itself cannot be seen from here) | `git rev-list --count origin/main..release-16b` = 137, the other way = 1 (the morning-post workflow). `git diff --stat origin/main release-16b -- scripts/refresh-data.mjs scripts/lib .github/workflows`: `refresh-data.mjs` 123 lines changed; `scripts/lib/mandi-commodity.mjs` (+21), `mandi-backfill.mjs`, `mgmt-sql.mjs`, `page-text.mjs`, `prerender-*.mjs` do not exist on `main`. `git ls-tree origin/main scripts/lib/` lists only `prerender-routes.mjs`. So on `main` there is no division logic (Batch 7L-1), no `in_sagar_division`, no `matchCommodity` fix (10E). The workflow file itself is identical on `main` and `release-16b`. GitHub runs `schedule` only from the default branch. |
| H2 scheduled job writes to staging | **Cannot tell for certain; likely** | Workflow uses `secrets.VITE_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, last updated in September, before production existed (12 Oct). Production 15-17 Oct rows (116/122/60 division rows) look like manual runs. Secret values cannot be read, so this stays "likely, about 80% sure". The new workflow removes the doubt with the project-ref guard. |
| H3 rows labelled with run date | **Confirmed** | Old `refreshMandi()` used `new Date().toISOString().split('T')[0]` (UTC run date) for every row. Feed date field is `Arrival_Date` (`dd/MM/yyyy`, documented in `scripts/lib/mandi-backfill.mjs` lines 7-8 and parsed by `parseArrivalDate`). Old data fetched on a later day was stamped as that day. Runs between 18:30 and 24:00 UTC were also a day behind IST. |
| H4 silent failure | **Confirmed** | `main()` caught errors and `main().catch(... process.exit(0))`; with 0 rows written the job still ended green. |
| H5 wrapper dead/slow | **Partly confirmed** | Wrapper `https://mandi-api.onrender.com/v1/prices` answered **HTTP 429** "Maximum 100 requests per 15 minutes allowed per IP" in 1 s (live test, 25 Oct). It is up but rate-limited, and a CI run makes one call per commodity from a shared GitHub IP, so it often fails. Whether its records carry a date could not be checked (no records returned). The old code tried the wrapper FIRST, so undated or empty wrapper answers decided what was written. |

## Blast radius (files using the secrets)

- `.github/workflows/refresh-mandi-prices.yml` (lines 22-24): the subject of this batch.
- `.github/workflows/backfill-mandi-history.yml` lines 19-21: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATA_GOV_IN_API_KEY`. Its script (`scripts/backfill-mandi-history.mjs` lines 89-93) already refuses anything but staging, so it stays staging only. No change needed.
- `.github/workflows/discover-melas.yml` lines 35-36: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (staging secrets). Not changed. If melas should be discovered in production it needs its own change later.
- `.github/workflows/morning-post.yml` exists only on `main`/`release-16b`; not in the grep as a user of these three secrets.
- Local one-off scripts (`scripts/batch10g/*`, `scripts/batch11a/*` and similar) read `VITE_SUPABASE_URL` from a local `.env`; not part of CI.

## Live feed test (`node scripts/refresh-data.mjs --dry-run`, run with the shared demo key, no real key on this machine)

- Official data.gov.in API: every request returned **HTTP 403 or 429** (demo key refused / rate limited). So no record, no arrival date and no Sagar-division count could be obtained from the official feed today. This is not proof about the real key used in GitHub.
- Wrapper: HTTP 429 (above).
- A second direct probe of the official endpoint with the demo key was blocked by the tool's permission check; per rule 5 it was not retried or worked around.
- Result: **0 records for all 10 commodities; 0 rows would be written.** The "newest arrival date", "3 sample raw records" and "Sagar-division mandi names" asked for in the brief could not be produced here. The honest answer is: **not measurable without the production data.gov.in key.** The founder or architect can get it by running the workflow once from GitHub (the new run summary prints rows, division rows and the newest date), or locally with `node --env-file=.env scripts/refresh-data.mjs --dry-run`.
- Does the `limit=1000` MP-wide pool get dominated by other districts? Cannot be measured today. The code asks per division district first (`filters[state]=Madhya Pradesh&filters[district]=Sagar`, etc.) and only falls back to MP-wide, so division rows should appear if the feed has them. Batch 7L-1's comment already says division rows are "often absent from the daily feed".
- If the real key shows nothing newer than 17 Oct for the division, the root cause is the government feed itself. Best alternative already verified in Batch 15A: the CEDA / Agmarknet portal (`https://agmarknet.ceda.ashoka.edu.in/api/prices`, POST, `state_id` 23, district ids Tikamgarh 424, Chhatarpur 425, Panna 426, Sagar 427, Damoh 428). Batch 15A used it for monthly history; a daily call would be a small addition, but it was not built (no way to verify the response from here, and the CEDA data has a lag).

## H3: date the script would write today

- Old code: `2026-10-25` (UTC run date) on every row regardless of the record's `Arrival_Date`.
- New code: each row's own arrival date; undated records skipped; older than 7 days skipped; "today" is IST.

## What the site shows as "last updated"

`src/screens/Msp.jsx` line 249: `latestDate` = the newest `price_date` in the snapshot of rows; shown through `LastPriceBadge date={latestDate}` (line 296). Per-crop prices show `PriceCell ... date={price_date}` and "last price on ..." (line 377). So the site shows the newest `price_date` that exists in `mandi_prices`; it does not use `fetched_at`. With the old run-date label, a stale feed could therefore have looked fresh; after this fix the label is honest.

## Further root cause found

Besides H1-H4: the old order (wrapper first, official second) meant a rate-limited or undated wrapper answer could suppress the official feed. The new order is official first, wrapper only as a labelled fallback.
