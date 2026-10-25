# Batch 10F — SHIP (founder checklist)

Branch `release-10f` (from `release-10e` `dd49223`; safety tag `pre-10f-ship`). Ship tag `ship-10f` = the final head.
**10F already contains 10C + 10D + 10E.** Use `ship-prod-10f.sh` INSTEAD of `ship-prod-10e.sh`.
Today production is still the Batch 10C deployment `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20` (read-only check in the dry run, 2026-10-19).

## Step 1 — staging: look at it on your phone
Staging upload is **DONE** by the builder: deployment `f9011c22-5ed5-4e9b-b3ee-6a985613b6b3` (commit `dd904ef`), **https://staging.kissansahyog.com**. Nothing to run. (Only if you ever need to upload again: `node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true`.)

What to look at on your phone:
1. **Home page:** under "आज किसान के लिए" only the two big buttons, the "1 मिनट का डेमो देखें" button and the three cards (मौसम / आज का भाव / आज की सलाह). No persona list, no phone picture, no moving tractor, no number boxes. Nothing moves except the mandi ticker.
2. **Arrows next to headings:** scroll down the home page — "आज की 2 मिनट की वीडियो सलाह ⌄", "किसान सवाल ⌄" … are folded on the phone; tap a heading row to open. Your choice is remembered next time.
3. **/msp (wheat):** "आज का भाव" has an orange badge "अंतिम भाव: 17 अक्टू 2026" (green "आज का भाव · …" when the price is from today). No "2026-10-17" anywhere.
4. **/msp chart:** open "रुझान ⌄". Tap a dot or slide your finger along the chart: date, price and number of mandis appear. The first, last, highest and lowest points always show their date and price. Open "सारणी देखें" for every date.
5. **/msp wheat 30 days:** the sentence now says "30 दिन में (21 सित – 16 अक्टू) भाव ₹1 बढ़ा" (it used to say "₹44 गिरा" because of a Saturday with few mandis); a line under the chart says how many such days were left out.

## Step 2 — ONLY IF Batch 10E is not on production yet: its database step first
Production is still 10C today, so **yes, do this first**: follow `docs/review/batch10e/SHIP.md` **Step 2** exactly (PRODUCTION project `eltmcznjcqiahqhjvpjg` → SQL Editor → paste `supabase/migrations/0064_app_register_phone.sql` → Run → "Success. No rows returned"; check `select proname from pg_proc where proname = 'app_register_phone';` → one row). 10F has no database step of its own.

## Step 3 — dry run (changes nothing)
```
bash scripts/ship-prod-10f.sh --dry-run
```
Must end with **DRY RUN OK** (no "pending" left: the tag `ship-10f` exists, and the probe says "migration 0064 is on production"). It also shows which deployment is live (10C, 10D or 10E are all accepted) and prints the rollback target.

## Step 4 — the real ship
```
bash scripts/ship-prod-10f.sh 2>&1 | tee docs/review/batch10f/evidence/ship-real.log
```
It checks 0064 again, builds with production settings, checks the build (10C/10E/10F markers, no removed 10D hero parts, no localhost, no staging, photo rule), **checks the page sizes before deploying (new in 10F: re-runs the prerender up to 2 times if a page was captured half-loaded; stops without deploying if it still fails)**, deploys, runs read-only checks on the live site, and **rolls back by itself** if any check fails. Wait for **SHIP OK** (or "back on the previous version").

## Step 5 — after SHIP OK: the 10E mandi history backfill (if not done yet)
In the PRODUCTION SQL editor, in this order, each file pasted whole and Run (as in `docs/review/batch10e/SHIP.md` Step 5):
`docs/review/batch10e/backfill-prod/verify.sql` (read-only, note the numbers) → `part-01.sql` → `part-02.sql` → … → `part-18.sql` → `verify.sql` again.
Only after a ship with the new /msp code is live (it reads more than 1,000 rows).

## Step 6 — undo (only if something is wrong)
```
bash scripts/rollback-prod-10f.sh <previous deployment id>
```
Use the id the ship printed as "rollback target" (today: `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20`). The database steps can stay (they only add things).

## Step 7 — close
Paste `BATCH10F_CLOSE_PROMPT.md` (repo root) into Claude Code.
