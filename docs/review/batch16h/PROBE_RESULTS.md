# Batch 16H staging proof (29 Oct 2026, staging project wzxtqbqlahyahsnoqqva; no secret in this file)

## 1. Does Open-Meteo answer from Mumbai? YES
`weather-refresh` was deployed to staging (`--no-verify-jwt --use-api`) and called in `forecast` mode with `limit: 2`.
- HTTP 200, response header `x-sb-edge-region: ap-south-1`.
- Pilot cells are always included, so this made 8 Open-Meteo calls: `{"ok":true,"mode":"forecast","cells_total":19,"cells_written":8,"failed_cells":0,"pilot_failed":[],"rate_limited":0,...,"requests":8,"ms":3044,"errors":[]}`. Open-Meteo did not refuse Supabase's addresses.

## 2. Full forecast run (all staging cells)
`{"mode":"forecast","limit":60}`: HTTP 200, `cells_total 19`, `cells_written 19`, `failed_cells 0`, `pilot_failed []`, `rate_limited 0`, `cells_left_over_4h 0`, `requests 19`, `ms 3568`.
Read-only check of `weather_cache_v2` (through the public read policy, same as the app): every cell in the list moved to `fetched_at` 12:37:20-22 UTC (the run time). Five rows:

| grid_key | fetched_at before | fetched_at after | season_rain hash before -> after |
|---|---|---|---|
| 23.8_78.7 (Sagar town) | 2026-10-29 12:36:30 (probe) | 2026-10-29 12:37:20.58 | ff05ed5c -> ff05ed5c (unchanged) |
| 17.4_78.5 | 2026-10-29 06:51:23 | 2026-10-29 12:37:21.84 | eab6c541 -> eab6c541 (unchanged) |
| 24.0_78.3 | 2026-10-29 12:36:30 (probe) | 2026-10-29 12:37:20.28 | 7440d456 -> 7440d456 (unchanged) |
| 41.8_-87.7 | 2026-10-29 06:51:21 | 2026-10-29 12:37:21.39 | 8752868e -> 8752868e (unchanged) |
| 51.5_-0.1 | 2026-10-29 06:51:22 | 2026-10-29 12:37:21.54 | 0b481635 -> 0b481635 (unchanged) |

All 21 rows had an unchanged `season_rain` hash after the forecast run, so the forecast write does not overwrite it. (Two rows, 24.1_78.3 and 40.7_-74.1, are outside the 30-day request list and were correctly not touched.)

## 3. Season mode
Six cells per call: calls 1-3 wrote 6 cells each, call 4 wrote the last 1 (19 cells in total), **call 5 did 0 cells** (`requests 0`, all computed today). Afterwards every row had `computed_on = 2026-10-29` and the same `to_date_mm` values as before, and `fetched_at` was untouched by season mode (checked in the table).

## 4. Guards
- no secret header: 403 `{"ok":false,"error":"forbidden"}` (header `x-sb-edge-region: ap-south-1`); wrong secret: same body.
- invalid JSON body: 400 `body is not valid JSON`; `{"mode":"x"}`: 400; `{"limit":0}`: 400.
- Deadline path: covered by the unit test (`(h) deadline ...`), not forced on staging.

## 5. Rate limits (429)
0 HTTP 429 in the probe, the full run and the five season calls (46 Open-Meteo requests in total). Retry on 429 (2 retries, 1 s and 2 s) is unit-tested and counted in `rate_limited`.
Volume at the 60-cell limit: at most 12 runs x 60 = 720 forecast requests a day, plus at most 4 season runs x 6 = 24 archive requests a day. I did not measure Open-Meteo's own call weighting; a forecast request with 16 days and several variables, and an archive request over ten years, may each count as more than one call against the free-tier limits (published as roughly 600 per minute, 5,000 per hour, 10,000 per day; please check their page). Staging never came near them. Note that the GitHub job also keeps refreshing (second writer, one forecast and one archive request per cell per run), so both writers add to the same count. If production has many more cells than staging, check `cells_total` and `rate_limited` in the first real reply.

## 6. Scheduler path on staging: NOT DONE (blocked)
Vault secrets, applying 0072 (twice), a real pg_cron fire and the rollback all need SQL on the staging database. The Supabase connector answered `You do not have permission to perform this action` for `execute_sql`; per the brief's rule this was not worked around (no other route to SQL was used). Nothing was created on staging (no cron job, no Vault secret), so there is nothing to remove. Migration 0072 is the proven 0071 pattern plus a guard and is untested on a real database; the production ship therefore starts with it in SQL block 1 and checks it with the manual fire in block 2.
Staging state left behind: function `weather-refresh` deployed; secret `CRON_SECRET` replaced with a fresh random value and `EXPECT_PROJECT_REF` set to the staging ref; weather cache rows refreshed.
