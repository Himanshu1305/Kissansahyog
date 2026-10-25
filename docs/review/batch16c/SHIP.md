# Batch 16C - ship steps (founder)

Nothing in this batch changes the website or any database. It only fixes the daily price job.

## 1. Add two GitHub secrets
GitHub > the repo > Settings > Secrets and variables > Actions > New repository secret.
- `PROD_SUPABASE_URL` = `https://eltmcznjcqiahqhjvpjg.supabase.co`
- `PROD_SUPABASE_SERVICE_ROLE_KEY` = the PRODUCTION service-role key. Copy it yourself from the production Supabase dashboard (Project Settings > API keys).

Warning: this key can do anything to the production database. Never paste it into chat, a file or an email. It lives only in GitHub secrets. The three existing secrets stay as they are (they feed staging).

## 2. Push and bring it into main
`main` has one extra commit (the morning-post workflow), so use a merge, not a fast-forward. A trial merge against `origin/main` was done in a throwaway folder: it merged cleanly, with no conflicts.

```
cd ~/projects/Kissansahyog
git push origin release-16c
git fetch origin
git worktree add ../Kissansahyog-main origin/main --detach
cd ../Kissansahyog-main
git checkout -b merge-16c
git merge --no-ff release-16c -m "Merge Batch 16C: fix daily mandi price feed

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Xe3SevpU2btuPQ9f1qiSu5"
git push origin merge-16c:main
cd ../Kissansahyog
git worktree remove ../Kissansahyog-main
```
Note: the live site is deployed by upload (Cloudflare Pages is not connected to Git), so pushing to `main` does not change the website.

Why main: GitHub runs scheduled jobs only from `main`, and uses `main`'s copy of the scripts.

## 3. Run it once
GitHub > Actions > "Refresh Mandi Prices" > Run workflow > branch `main`.
Two jobs run: `refresh (production)` and `refresh (staging)`. Open each one and read the Summary: it lists rows written per crop, Sagar-division rows and the newest date. Green = rows written and the newest date is within 3 days. Red = the new "fail loudly" rules fired; the message says why (a missing secret, the wrong database, no rows, or only old prices).

## 4. Check production
Open `docs/review/batch16c/verify-prod.sql`, paste it in the PRODUCTION SQL editor (the address must contain `eltmcznjcqiahqhjvpjg`) and run it. Paste the result to the architect.
Healthy: the newest `price_date` is today or yesterday, and the newest date has more than 0 Sagar-division rows (the first query shows a row per day for the last 10 days). Note the government feed may not report on Sundays or holidays.

## 5. Next-day check
Run the same SQL a day later. Healthy: one more new `price_date`. If red or no new date: open the workflow run, copy its Summary text and send it to the architect.

## 6. Rollback
GitHub > Actions > "Refresh Mandi Prices" > "..." > Disable workflow. Nothing else changed: no database change, no website change.
