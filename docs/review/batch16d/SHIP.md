# Batch 16D - ship steps (plain English)

Nothing here changes the website. It changes what the GitHub job fetches and writes.

## 1. Push and merge into main
```
cd ~/projects/Kissansahyog
git push origin release-16d
git fetch origin
git worktree add ../Kissansahyog-main origin/main --detach
cd ../Kissansahyog-main
git checkout -b merge-16d
git merge --no-ff release-16d -m "Merge Batch 16D: daily mandi feed from the variety-wise resource

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Xe3SevpU2btuPQ9f1qiSu5"
git push origin merge-16d:main
cd ../Kissansahyog
git worktree remove ../Kissansahyog-main
```
A trial merge into `origin/main` in a throwaway folder merged cleanly (result is in the final report). Pushing to `main` does not change the website (it is deployed by upload).

## 2. Fill the gap since 18 Oct
GitHub > Actions > "Refresh Mandi Prices" > Run workflow > branch `main`, days = `14`.
Open both jobs (production and staging):
- Step "Reach data.gov.in" should say `HTTP status 200`. If it says anything else, copy that line to the architect and stop.
- The job summary should say `result: ok`, with a newest date within 3 days of today.
Green = rows written and newest date within 3 days.

## 3. Check production
Open the PRODUCTION SQL editor (the address must contain `eltmcznjcqiahqhjvpjg`) and run `docs/review/batch16c/verify-prod.sql`.
Healthy: newest `price_date` is today or yesterday, with Sagar-division rows, and one row per day since 18 Oct. Paste the result to the architect.

## 4. Next day
Run the same SQL again. Expect one more date. If it is red, copy the workflow summary to the architect.

## 5. Rollback
GitHub > Actions > "Refresh Mandi Prices" > "..." > Disable workflow. Nothing else changed; stored prices stay as they are.
