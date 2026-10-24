# Batch 16B ship checklist (founder, plain English)

One step each, in this order. Nothing here has been done for you: no migration is applied anywhere, no GitHub secret is set, nothing is pushed or tagged.

## 1. The architect applies the migration to staging and tests it
You do nothing. The architect runs `supabase/migrations/0070_morning_posts.sql` on **staging** and tests the functions (wrong secret, right secret, admin and non-admin).

## 2. Make your secret (on your laptop)
In Git Bash in the project folder: `node scripts/morning/make-secret.mjs`
It prints (a) a secret, once, and (b) the SQL with its hash. Copy the secret to a safe place now (a password manager). It is not saved anywhere else.

## 3. Production database
Open the **production** Supabase SQL editor. Check that the browser address contains `eltmcznjcqiahqhjvpjg`. Then:
1. Run the whole file `docs/review/batch16b/PROD_MIGRATION_0070.sql` (safe to run twice).
2. Run the one-line SQL that step 2 printed (it holds only the hash, never the secret).

## 4. Add the 3 GitHub secrets
GitHub repository > Settings > Secrets and variables > Actions > New repository secret:
- `SUPABASE_URL` = the production URL (`https://eltmcznjcqiahqhjvpjg.supabase.co`)
- `SUPABASE_ANON_KEY` = the production **anon (public)** key. Never the service-role key.
- `MORNING_POST_SECRET` = the secret from step 2.
Optional, for a "ready" e-mail: `RESEND_API_KEY` and `ALERT_EMAIL`.

## 5. Push, tag, dry run, real ship
```
git push origin release-16b
git tag ship-16b
git push origin ship-16b
bash scripts/ship-prod-16b.sh --dry-run
bash scripts/ship-prod-16b.sh
```
The script checks that the migration is on production (it sends one harmless test with a wrong secret and expects "forbidden"), checks the live version is the expected one, builds, deploys, and rolls back by itself if a check fails. It never changes the login switches.

## 6. Put the workflow file on the default branch (`main`)
GitHub only runs a schedule from the default branch (`main`). `main` is far behind the release branches, so do **not** merge everything: copy only the one workflow file. The file itself checks out the `release-16b` branch to get the generator (see `MORNING_REF` inside it). In a new, separate folder so your current work is not disturbed:
```
git fetch origin
git worktree add ../Kissansahyog-main origin/main --detach
cd ../Kissansahyog-main
git checkout -b add-morning-workflow
git checkout release-16b -- .github/workflows/morning-post.yml
git add .github/workflows/morning-post.yml
git commit -m "Add morning-post workflow"
git push origin add-morning-workflow:main
cd ../Kissansahyog
git worktree remove ../Kissansahyog-main
```
(If `main` is protected and refuses the push, open a pull request from `add-morning-workflow` into `main` on GitHub and merge it.)

## 7. Run it once and look on your phone
GitHub > Actions > "Morning post" > Run workflow. When it is green, open `https://kissansahyog.com/admin/morning` on your phone (signed in as admin). You should see today's message, the card, the poll, and the Copy / Download / Mark as posted buttons.

## 8. Check again the next morning
At about 05:00 IST (the job is scheduled for 04:30 IST; GitHub may delay it up to 30 minutes) open `/admin/morning`. If today's post is missing: open GitHub > Actions > "Morning post" to see why, or use "Run workflow", or run `npm run morning` on the laptop (manual backup, `docs/review/batch16a/HOWTO.md`). A failed scheduled run also sends an e-mail from GitHub to the repository owner.

## Rollback
- **Website:** `bash scripts/rollback-prod-16b.sh f0973175-2eac-4c95-bbd2-09f48e644735` goes back to the version live before this ship (source 775ffd7). The ship script runs this by itself if a check fails.
- **Database (optional, by hand only):** `supabase/migrations/rollback/0070_morning_posts_rollback.sql` removes the table and functions and every saved post. No script runs it. The old website works with or without the tables.
- **Job:** disable the "Morning post" workflow in GitHub (Actions > Morning post > ... > Disable workflow).

## Founder-only manual steps (summary)
Step 2 (make the secret), step 3 (production SQL x2), step 4 (GitHub secrets), step 5 (push, tag, ship), step 6 (workflow file onto `main`), step 7 (first run), plus confirming the MSP values and the content flags in `docs/review/batch16a/REVIEW.md`.
