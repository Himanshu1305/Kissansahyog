# Batch 18 ship notes (founder) - six-district weather in the morning post

**What this changes:** the daily morning post (message, and when done also card and voice) now carries the weather of all 6 districts of Sagar Sambhag, and ends the section with an invitation to check your own village at kissansahyog.com/mausam.
**Only these things change:** `scripts/morning/**`, the Edge Function's shared list `supabase/functions/_shared/weather-core.js`, `scripts/refresh-data.mjs` and ONE line in `.github/workflows/morning-post.yml`. The website is NOT changed: no Cloudflare ship, no migration, no new secret.
**The deadline:** tomorrow's post is made by the first scheduled try at **01:07 IST** from the code on `main`. So steps 1 to 4 must be done **before 00:45 IST**. Step 6 (Edge Function) is useful but NOT needed for tomorrow: any district without a fresh saved forecast is fetched straight from Open-Meteo by the job.

Do the steps one at a time. If anything looks wrong, stop and tell the architect.

## 1. Push the branch and tag the ship point
```
cd ~/projects/ks-b18
git push -u origin release-18
git tag ship-18
git push origin ship-18
```
(Run it in the folder where `release-18` lives. This changes nothing live: the morning job runs from `main`.)

## 2. Rehearsal on the branch (GitHub)
GitHub, Actions, **Morning post**, **Run workflow**, choose branch **release-18**, leave "check_first" OFF, run.
Plainly: this makes today's post again and **REPLACES today's post in /admin/morning (including the video)**, and uses a little ElevenLabs credit. Today's post was already sent this morning, so this is harmless.
Open the run, then the job summary / report: it must list the **six districts**, each with its source (`cache`, `open-meteo-direct` or `unavailable - reason`) and the age of the saved forecast. Sagar must show `cache` or `open-meteo-direct`. Note: the district variable is not set yet, which means the feature is ON.

## 3. Read it on your phone
Open **/admin/morning**: read the message (new section after the Sagar weather: heading, six district lines, closing line with kissansahyog.com/mausam), view the card, play the voice. If anything is wrong: **do NOT merge**; tell the architect.

## 4. Merge to `main` (before 00:45 IST)
Same method as 17F, with the guard first:
```
cd ~/projects/Kissansahyog
git fetch origin
git merge-base --is-ancestor origin/main origin/release-18 && echo "OK: release-18 contains main"
git worktree add ../Kissansahyog-main origin/main --detach
cd ../Kissansahyog-main
git checkout -b merge-18
git merge --no-ff origin/release-18 -m "Merge Batch 18: six-district weather in the morning post"
git push origin merge-18:main
cd ../Kissansahyog
git worktree remove ../Kissansahyog-main
```
If the first command does not print `OK`, stop and ask the architect. After the push, the 01:07 IST try makes tomorrow's post with the districts. If you merge **after 01:07** and tomorrow's post is already complete, run the workflow once by hand from `main` (Run workflow, branch `main`) to replace it.

## 5. The kill switch (turn the feature off in one minute)
GitHub, the repository, **Settings**, **Secrets and variables**, **Actions**, tab **Variables**, **New repository variable**: name `MORNING_DISTRICTS`, value `off`. Then run the **Morning post** workflow by hand (branch `main`) to remake the post without the districts (message, card and voice are then exactly as before this batch).
To turn the feature back on: delete the variable (an empty value also means on).

## 6. Edge Function (useful, not required for tomorrow)
This makes the five new district cells refresh every 2 hours on their own, so the job reads the saved forecast instead of calling Open-Meteo. Method = Batch 16H (`scripts/ship-prod-16h.sh` step 3: `supabase functions deploy weather-refresh ... --no-verify-jwt --use-api`). There is no script for 18; these are the commands (Supabase CLI logged in; no key is asked and no secret is made):

a. Note the version that is live now (needed for rollback). For staging and production, write down VERSION and UPDATED_AT of `weather-refresh`:
```
supabase functions list --project-ref <STAGING_REF>
supabase functions list --project-ref <PROD_REF>
```
b. Deploy to **STAGING** first, then check the list again (VERSION must go up by one):
```
cd ~/projects/Kissansahyog
git checkout main && git pull
supabase functions deploy weather-refresh --project-ref <STAGING_REF> --no-verify-jwt --use-api
supabase functions list --project-ref <STAGING_REF>
```
c. Then **PRODUCTION** (same command with `<PROD_REF>`), and check the list again.
d. Confirm on **PRODUCTION** (Supabase SQL editor, read-only). Wait up to about 2 hours 20 minutes after the deploy (the timer runs every 2 hours):
```
select grid_key, fetched_at, now() - fetched_at as age
from public.weather_cache_v2
where grid_key in ('23.8_78.7','23.8_79.4','24.7_80.2','24.7_78.8','24.9_79.6','25.4_78.8')
order by grid_key;
```
Expected: **6 rows**, every `age` under 3 hours. Fewer than 6 rows or an older age before the timer has run once is normal; check again later. (The job still works without this step.)

## 7. Next morning check
Open /admin/morning: the post has the six districts. Open the GitHub run summary: one line per district with its source. A district shown as `unavailable` does not make the job red; if several are unavailable on the next days, look at step 6.

## 8. Rollback
Fastest: the kill switch (step 5). Or revert the merge on `main` (`git revert -m 1 <merge commit>` in the worktree and push). Or redeploy the previous Edge Function version noted in step 6a (`git checkout <previous commit> -- supabase/functions` then the deploy command). The extra cached cells are harmless.

## Verified / unverified
Verified by tests offline: everything in DECISIONS.md. Unverified: the live Open-Meteo batched call; the production cache for the new cells before the first refresh; Open-Meteo's terms (open item from 16A/17B).
