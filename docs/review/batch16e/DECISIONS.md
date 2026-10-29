# Batch 16E decisions

- Weather runs before mandi in `scripts/refresh-data.mjs` (via `runJob` in `scripts/lib/mandi-daily.mjs`); the exit code is still non-zero when mandi fails.
- Fast-fail: 3 primary requests failing at connect level with no success marks data.gov.in unreachable; primary and 9ef84268 requests are then skipped (same host), one log line, straight to the wrapper.
- Connect-level errors are not retried (a refused connection will not heal in 4 seconds); other failures (5xx, 429, bad body) get at most 2 retries (2 s, 4 s). Wrapper timeout lowered 15 s -> 10 s.
- The 4-minute cap is checked before every request and before every crop; the wrapper fallback for the remaining crops is skipped after the cap.
- Freshness check reads `max(price_date) where in_sagar_division` with the job's service-role key; red when older than 3 days or empty. Dry runs skip it.
- Risk noted for the architect: while GitHub cannot reach data.gov.in the job stays red by design (mandi step fails). Once the Edge Function is the writer, consider making "unreachable but fresh" green.
- Phase 2 needs the data.gov.in key typed silently; the builder has no terminal for that, so `scripts/probe-16e-staging.sh` does it for the founder (staging only, key never stored). Phase 3 is not built until the verdict is YES.
- Probe deployed to staging with `--use-api` (no Docker on this laptop). Without secrets it answers `{"ok":false,"error":"forbidden"}` in region ap-south-1.
