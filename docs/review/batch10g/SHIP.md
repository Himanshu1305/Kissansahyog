# Batch 10G — SHIP (founder checklist)

Branch `release-10g` (from `release-10f` `c44c418`; safety tag `pre-10g-ship`). Ship tag `ship-10g` = the final head.
**10G already contains 10C + 10D + 10E + 10F.** Use `ship-prod-10g.sh` INSTEAD of the 10E / 10F scripts.
Production today (read-only check in the dry run, 2026-10-19): still the Batch 10C deployment `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20`.

## Step 1 — staging: look at it on your phone
Staging upload is **DONE** by the builder: deployment `31c03979-fc96-4b58-b426-7690f1a99fa2` (commit `e0001e0`), **https://staging.kissansahyog.com**. Migration 0065 is already on the STAGING database. Nothing to run. (Only if you ever need to upload again: `node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true`.)

What to click on your phone (staging; use a test listing, e.g. post one with a name starting "KSTEST"):
1. Log in → bottom bar **मेरी लिस्टिंग** (My Listings).
2. Under a listing: tap **⏸ अक्षम करें** → a message "विज्ञापन अक्षम किया गया…" appears, the card turns grey with the badge **अक्षम**. Open **खोजें** (Browse) in another tab or phone: that listing is not there.
3. Back in My Listings: tap **▶ चालू करें** → the badge is back to **चालू**, and Browse shows it again.
4. Tap the red **🗑 हटाएं** → a box asks "यह विज्ञापन और इसकी फोटो हमेशा के लिए हट जाएंगे…". Tap **नहीं** → nothing happens. Tap **🗑 हटाएं** again → **हाँ, हटाएं** → the card disappears and "विज्ञापन हटा दिया गया।" shows. Opening its old link shows "यह लिस्टिंग नहीं मिली।"
5. Admin (your admin login, on a computer): **/admin** → "हाल की लिस्टिंग": per listing **⏸ अक्षम करें** (type a reason), **▶ चालू करें**, **🗑 हमेशा के लिए हटाएं** (type a reason and the word DELETE). In "शिकायतें" each complaint also has **हमेशा के लिए हटाएं**. On a listing's own page an admin sees the same buttons in a red box.
6. As the seller, a listing the admin disabled shows **एडमिन ने अक्षम किया** with the reason, no enable button, but **हटाएं** still works.

## Step 2 — ONLY IF earlier batches are not on production yet: their steps first
Production is still 10C today, so **yes**:
- **Migration 0064** (10E, phone-only sign-up): exactly as `docs/review/batch10e/SHIP.md` Step 2 (PRODUCTION project `eltmcznjcqiahqhjvpjg` → SQL Editor → paste `supabase/migrations/0064_app_register_phone.sql` → Run → "Success. No rows returned"; check `select proname from pg_proc where proname = 'app_register_phone';` → one row).
- 10F has no database step. The 10E mandi backfill comes AFTER the ship (Step 6).

## Step 3 — PRODUCTION database: migration 0065 (BEFORE shipping)
1. https://supabase.com/dashboard → the **PRODUCTION** project (`eltmcznjcqiahqhjvpjg`; NOT staging `wzxtqbqlahyahsnoqqva`).
2. SQL Editor → New query → paste the whole file **`docs/review/batch10g/PROD_MIGRATION_0065.sql`** (same text as `supabase/migrations/0065_listing_delete_disable.sql`) → **Run**.
3. Expected: "Success. No rows returned".
4. Check with a new query: `select proname from pg_proc where proname in ('delete_my_listing','admin_delete_listing','set_my_listing_disabled','admin_set_listing_disabled');` → **four rows**.
   It only ADDS things (a status value "disabled", two columns, an admin log table, functions, and a storage rule that lets the app remove photos of listings that were already deleted — nothing else in the photo bucket can be removed).

## Step 4 — dry run (changes nothing)
```
bash scripts/ship-prod-10g.sh --dry-run
```
Must end with **DRY RUN OK** with nothing "pending" (tag `ship-10g` present; the probes say "migration 0064 is on production" and "migration 0065 is on production"). It shows which deployment is live (10C, 10D, 10E or 10F are all accepted) and prints the rollback target.

## Step 5 — the real ship
```
bash scripts/ship-prod-10g.sh 2>&1 | tee docs/review/batch10g/evidence/ship-real.log
```
Use this INSTEAD of `ship-prod-10f.sh`. It probes 0064 and 0065 again (stops before building if missing), builds with production settings, checks the build (10C/10E/10F/10G markers, no removed 10D hero parts, no localhost, no staging, photo rule), checks the page sizes before deploying (re-runs the prerender up to 2 times if a page was captured half-loaded), deploys, runs read-only checks on the live site, and **rolls back by itself** if any check fails. Wait for **SHIP OK**.

## Step 6 — after SHIP OK: the 10E mandi history backfill (if not done yet)
PRODUCTION SQL editor, in order, each file pasted whole and Run (as in `docs/review/batch10e/SHIP.md` Step 5):
`docs/review/batch10e/backfill-prod/verify.sql` → `part-01.sql` → … → `part-18.sql` → `verify.sql` again.

## Step 7 — undo (only if something is wrong)
```
bash scripts/rollback-prod-10g.sh <previous deployment id>
```
Use the id the ship printed as "rollback target" (today: `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20`). The database steps can stay: older websites never call the 0065 functions.
Only if you also want 0065 gone: AFTER the website rollback, paste `docs/review/batch10g/PROD_ROLLBACK_0065.sql` in the PRODUCTION SQL editor. Warning: every listing that is **disabled** at that moment becomes **active (public) again** and the admin-disable reasons and the admin log are dropped; listings that were **deleted stay deleted** (that is fine).

## Step 8 — close
Paste `BATCH10G_CLOSE_PROMPT.md` (repo root) into Claude Code.
