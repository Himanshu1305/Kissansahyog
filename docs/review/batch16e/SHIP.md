# Batch 16E ship notes (founder)

**What this changes:** prices now come from a small program (Supabase Edge Function `mandi-refresh`) that runs in Mumbai, where the government server accepts it. A database timer (pg_cron) calls it every 3 hours (minute 5 and minute 12, five crops each). GitHub's job still refreshes weather and now also checks that prices are fresh.

**Pushing or merging to `main` does not change the website.** Nothing under `src/` or `public/` changed. Only the GitHub job's behaviour (via `main`) and the new files change; the fetcher goes live only when you run the ship script.

## Steps
1. Merge `release-16e` into `main` with the 16D worktree method. After that, the GitHub scheduled job uses the faster, fail-fast code (weather first, finishes in minutes even when data.gov.in is unreachable).
2. On `main`, in Git Bash: `bash scripts/ship-prod-16e.sh --dry-run` (prints what it will do, changes nothing), then `bash scripts/ship-prod-16e.sh`.
   - It asks you to type the production ref, then your data.gov.in key (typed silently, not saved), makes a random cron secret in memory, sets the function secrets on production and deploys the function.
   - It then prints ONE SQL block. Paste it in the **production SQL editor** and press Run. The block creates the two Vault secrets (the cron secret is shown once, never saved) and the schedule (migration 0071).
   - It prints two `curl` commands (about 20 seconds each) that fill the last 14 days. Run both in Git Bash.
3. Run `docs/review/batch16c/verify-prod.sql` in the production SQL editor. The newest Sagar-division price date should be within 1-2 days of today.
4. If the Supabase CLI is missing: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git` then `scoop install supabase`, then `supabase login`.

## The GitHub job after this batch
- The GitHub job **no longer fetches or writes prices at all**. The Mumbai Edge Function is the only price writer.
- **Production target:** weather refresh first, then a read-only freshness check. It is **red only if** the newest stored Sagar-division `price_date` is older than 3 days or the table has none; otherwise green. The summary always prints `newest stored price: <date> (<n> days old)`. (A crash of the weather step also turns it red.)
- **Staging target:** weather refresh only, no freshness check, green if weather ran.
- The "red by design while data.gov.in is unreachable" situation is gone. The "Reach data.gov.in" step, the `DATA_GOV_IN_API_KEY` GitHub secret use and the `days` input were removed from the workflow; the 14-day fill is now the `curl` call from the ship script. Until the Edge Function is live on production, the production job will be red once the newest stored price is more than 3 days old (that is the alarm working).

## Rollback
`bash scripts/rollback-prod-16e.sh` prints the SQL that unschedules both cron jobs and deletes the function. Stored prices stay.

## Staging evidence (this batch)
- Two calls with `days: 14`, 5 crops each, 19.9 s and 19.5 s (limit 100 s), 0 failed requests, newest price date 2026-10-28.
- Wrong or missing secret: `{"ok":false,"error":"forbidden"}` (403). Unknown crop: 400.
- Scheduler path proven on staging: Vault secrets -> pg_cron command -> pg_net -> function -> database (HTTP 200, 52 rows). Staging cron jobs and Vault secrets were removed again afterwards.
- Migration 0071 applied twice (idempotent) and rolled back cleanly on staging.
