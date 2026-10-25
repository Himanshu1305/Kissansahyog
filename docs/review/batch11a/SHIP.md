# Batch 11A — SHIP (founder checklist, in this order)

Branch `release-11a` (from `release-10g` `d14264f`; safety tag `pre-11a-ship`). Ship tag `ship-11a` = the final head.
**11A already contains 10C + 10D + 10E + 10F + 10G.** Use `ship-prod-11a.sh` INSTEAD of the 10G script.
Includes 11B: unregistered-number message (staging verification in `docs/review/batch11b/REPORT.md`).
Production today: still the Batch 10C deployment `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20` (read-only check in the dry run).
Both new switches (`otp_required`, `session_enforced`) start **OFF** everywhere: until you flip them, the site behaves exactly as before.

## 1. Staging upload — DONE
Deployment `2c67eb33` (https://2c67eb33.kissansahyog.pages.dev), live on **https://staging.kissansahyog.com**. Migration 0066 is already on the STAGING database. Both flags OFF.
(Only if you ever need it again: `node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true`.)

## 2. Put the secrets on STAGING (you, not Claude)
`bash scripts/set-otp-secrets.sh staging` — hidden prompts for the 2Factor key and the **staging** service-role key (Supabase → staging project → Project Settings → API). It prints only the names it set. Then upload staging once more (the command in step 1) so the functions pick up the new secrets.
Today the staging secret names are: ANTHROPIC_API_KEY, GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL — **`TWOFACTOR_API_KEY` is not set yet.**

## 3. Test OTP on STAGING with your own phone
3a. Turn OTP ON for staging only — STAGING project (`wzxtqbqlahyahsnoqqva`) → SQL Editor:
`update public.site_settings set value = 'true'::jsonb, updated_at = now() where key = 'otp_required';`
Wait 1 minute (the site caches the switch for 60 s).
3b. On your phone, https://staging.kissansahyog.com/login → the **मोबाइल नंबर से** box (now above e-mail) → type your number → **कोड भेजें** → an SMS arrives → type the 6 digits → you are logged in. Also try: a wrong code (clear message), **नंबर बदलें**, and waiting 30 s for **कोड दोबारा भेजें**. Then log out, and try sign-up (**नया खाता बनाएं**) with a second number you own: fill the form → **स्वीकार करें और आगे बढ़ें** → code → account created.
3c. Turn session enforcement ON for staging: `update public.site_settings set value = 'true'::jsonb, updated_at = now() where key = 'session_enforced';` → wait 1 minute → log out and in again by OTP → post a listing, close it, edit your profile: all must work.
3d. Turn each back OFF (one line each, instant after 1 minute):
`update public.site_settings set value = 'false'::jsonb, updated_at = now() where key = 'session_enforced';`
`update public.site_settings set value = 'false'::jsonb, updated_at = now() where key = 'otp_required';`

## 4. ONLY IF earlier batches are not on production yet: their steps first
Production is still 10C today, so **yes**, exactly as in `docs/review/batch10g/SHIP.md` step 2:
- migration **0064** (10E): PRODUCTION project (`eltmcznjcqiahqhjvpjg`) → SQL Editor → paste `supabase/migrations/0064_app_register_phone.sql` → Run;
- migration **0065** (10G): paste `docs/review/batch10g/PROD_MIGRATION_0065.sql` → Run;
- the 10E mandi backfill is pasted AFTER the ship (`docs/review/batch10g/SHIP.md` step 6).

## 5. Migration 0066 on PRODUCTION
PRODUCTION project (`eltmcznjcqiahqhjvpjg`, NOT staging) → SQL Editor → New query → paste the whole file `docs/review/batch11a/PROD_MIGRATION_0066.sql` → Run.
Check: `select public.get_auth_flags();` → `{"otp_required": false, "session_enforced": false}`.

## 6. Secrets on PRODUCTION
`bash scripts/set-otp-secrets.sh prod` — hidden prompts for the 2Factor key and the **production** service-role key.

## 7. Dry run
`bash scripts/ship-prod-11a.sh --dry-run` → must end with `DRY RUN OK` (any "pending" lines tell you what is still missing).

## 8. The real ship (INSTEAD of the 10G script)
`bash scripts/ship-prod-11a.sh 2>&1 | tee docs/review/batch11a/evidence/ship-real.log`
It checks 0064 / 0065 / 0066 on production first, builds, deploys, checks everything (also that `/api/otp/config` answers with both switches OFF and that `/api/otp/send` is deployed), and rolls back by itself if a check fails.

## 9. Later, on production (separate days)
9a. Turn OTP ON: production SQL Editor → `update public.site_settings set value = 'true'::jsonb, updated_at = now() where key = 'otp_required';` → after 1 minute log in on kissansahyog.com with your own number by OTP.
   Old Android APKs cannot do OTP: while `otp_required` is ON they cannot sign in **by phone** (they show their general error). E-mail login still works there.
9b. Turn `session_enforced` ON only **after a new Android APK with 11A is out and most phones have updated**. Why: old APKs never send the session token, so with enforcement ON they cannot post, close, edit or delete anything. Same SQL with `key = 'session_enforced'`.
9c. The guide demo's OTP step: `GUIDE_OTP_LIVE` in `src/features/guide/config.js` is a build-time switch (not tied to the database flag). When OTP is ON on production for good, ask the builder to set it to `true` (unit + e2e tests pin it) and ship again.

## 10. Undo (in this order)
1. Switches OFF first (instant, after 1 minute): `update public.site_settings set value = 'false'::jsonb, updated_at = now() where key in ('otp_required','session_enforced');`
2. Website back: `bash scripts/rollback-prod-11a.sh <previous deployment id>` (the ship prints it as "rollback target"; also in `docs/review/batch11a/evidence/prod-ship/prod-deployment-before.txt`).
3. Only if really needed, and only with both switches OFF: paste `docs/review/batch11a/PROD_ROLLBACK_0066.sql` in the PRODUCTION SQL Editor (puts back every changed function exactly as it was before 0066 and removes the new tables; all sessions are lost).

## 11. Close
Paste `BATCH11A_CLOSE_PROMPT.md` (repo root) into Claude Code.
