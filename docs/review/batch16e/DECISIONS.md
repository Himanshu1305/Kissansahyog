# Batch 16E decisions

- Weather runs before mandi in `scripts/refresh-data.mjs` (via `runJob` in `scripts/lib/mandi-daily.mjs`); the exit code is still non-zero when mandi fails.
- Fast-fail: 3 primary requests failing at connect level with no success marks data.gov.in unreachable; primary and 9ef84268 requests are then skipped (same host), one log line, straight to the wrapper.
- Connect-level errors are not retried (a refused connection will not heal in 4 seconds); other failures (5xx, 429, bad body) get at most 2 retries (2 s, 4 s). Wrapper timeout lowered 15 s -> 10 s.
- The 4-minute cap is checked before every request and before every crop; the wrapper fallback for the remaining crops is skipped after the cap.
- Freshness check reads `max(price_date) where in_sagar_division` with the job's service-role key; red when older than 3 days or empty. Dry runs skip it.
- Risk noted for the architect: while GitHub cannot reach data.gov.in the job stays red by design (mandi step fails). Once the Edge Function is the writer, consider making "unreachable but fresh" green.
- Phase 2 needs the data.gov.in key typed silently; the builder has no terminal for that, so `scripts/probe-16e-staging.sh` does it for the founder (staging only, key never stored). Phase 3 is not built until the verdict is YES.
- Probe deployed to staging with `--use-api` (no Docker on this laptop). Without secrets it answers `{"ok":false,"error":"forbidden"}` in region ap-south-1.
- Probe verdict YES (3 of 3 calls, Mumbai, status 200). Phase 3 and 4 built. Probe function undeployed from staging; its folder and `scripts/probe-16e-staging.sh` removed from the repo (results kept in PROBE.md / PROBE_RESULTS.txt).
- Shared logic is a plain-JS copy `supabase/functions/_shared/mandi-core.js` (no build step, imported by the Deno function); `tests/unit/mandi-edge-parity-16e.test.mjs` asserts identical output with the Node originals on a fixture.
- The function counts as failed (HTTP 502, ok:false) when it wrote nothing, a write errored, or the 95 s deadline cut the plan; the cron job still just logs it, the GitHub watchdog turns it red after 3 days.
- Staging was left with no cron jobs and no Vault secrets (tested, then rolled back) so it does not call the function every 3 hours. The function itself stays deployed on staging with secrets CRON_SECRET, DATA_GOV_IN_API_KEY, EXPECT_PROJECT_REF.
- Staging counts per crop can be slightly below the function's `rows_total` because older wrapper rows with the same key but `in_sagar_division=false` are kept (insert-if-absent), as designed in 16D.
- `ship-dry-run-output.txt` is the captured `--dry-run` output (on release-16e the branch and clean-tree checks show as [pending], as designed).
- Patch: the GitHub job has no mandi fetch/write code any more (`scripts/refresh-data.mjs`), `--target production|staging` (default from the expected ref). Pure logic `runWatchdogJob` in `scripts/lib/mandi-daily.mjs` replaces `runJob`. A crashed weather step is red on both targets (a crash is not "weather ran"). The old data.gov.in client/helpers stay in `scripts/lib/mandi-daily.mjs` because the backfill and parity tests still use them.
