# Batch 16H ship notes (founder)

**What this changes:** the weather forecast is now refreshed by a small program in Supabase (Edge Function `weather-refresh`, runs in Mumbai) that a timer inside your database starts every 2 hours. It no longer depends on GitHub's scheduler, which was skipping runs (nothing for 9+ hours on 29 Oct). The GitHub job stays exactly as it is: a second refresher and the alarm (red when the Sagar cell is older than 2 hours). Two refreshers are harmless, each one simply overwrites the same fields with fresh data.

**Pushing or merging to `main` does not change the website or anything live.** Nothing under `src/` or `public/` changed. It goes live only when you run the ship script. No key and no new secret are needed: the passwords from Batch 16E are reused.

## Steps
1. **Push and merge.** Push `release-16h` and merge it into `main` with the worktree method (same as 16E). The pushed files change nothing live.
2. **Dry run.** In Git Bash on `main`: `bash scripts/ship-prod-16h.sh --dry-run`. It prints every step and changes nothing.
3. **Real run.** `bash scripts/ship-prod-16h.sh`
   - Type the production ref when asked. The script deploys the function (it first checks that the two 16E function secrets exist, names only).
   - It prints **SQL block 1** (the timer, migration 0072). Paste it in the production SQL editor and press Run. If it says the Vault secrets are missing, stop and tell the architect. Running it twice is safe.
   - It prints **SQL block 2**: run it in a new tab. It fires the function once now (the password comes from the Vault and is never shown).
   - Wait about 30 seconds, then run **SQL block 3** (read-only). Healthy: the 10 newest rows are a few minutes old and include `23.8_78.7`; the newest reply has `status_code 200` and `"ok":true`.
4. **Check the site.** Open `/mausam`: it should say "Updated today" with a time from the last 2 hours. Then, after the next even UTC hour plus 20 minutes (for example 12:20, 14:20 UTC = 17:50, 19:50 IST), run block 3 again: the newest `fetched_at` should have moved on its own, without GitHub.
5. **Rollback (if ever needed).** `bash scripts/rollback-prod-16h.sh` prints the SQL that stops both timers and then deletes the function (you type the ref). Stored weather stays and the GitHub job keeps refreshing.

## Things to know
- First production reply: look at `cells_total`, `rate_limited` and `cells_left_over_4h`. If `cells_left_over_4h` is above 0 on a later run, there are more requested cells than one run covers (60), and the older ones rotate through.
- Season rainfall (the "rain this season" bar) is recomputed by a second timer every 6 hours, 6 cells at a time. It only touches that one column.
- The staging scheduler path could not be tested (the Supabase connector refused SQL on staging). The timer SQL is the same pattern as 0071 plus a guard; block 2 is the real-world proof on production. See `PROBE_RESULTS.md`.
- Open-Meteo's free tier is non-commercial; the licence question is still open and not part of this batch.
