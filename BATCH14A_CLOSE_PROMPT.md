# BATCH 14A — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 14A myself:** I pasted `docs/review/batch14a/PROD_MIGRATION_0067.sql` into the PRODUCTION Supabase SQL editor, ran `bash scripts/ship-prod-14a.sh` (log: `docs/review/batch14a/evidence/ship-real.log`), following `docs/review/batch14a/SHIP.md`, and signed in again on the admin page. Check that production is healthy, record it, update the notes. Be economical. Do not ask questions; pick the SAFEST option, write it to `docs/review/batch14a/CLOSE_DECISIONS.md`; keep a log in `docs/review/batch14a/CLOSE_PROGRESS.md`.

**What was shipped:** branch `release-14a`, ship tag `ship-14a`: release-13a + Batch 14A (admin console: six tabs + panel search, announcement cards on the home page, security switches + OTP/SMS usage + 2Factor balance, block/unblock users + super/editor roles, admin action log; migration 0067). PREV = the "rollback target" in the ship log (expected: the Batch 12B deployment `8c6a66f2-ad48-444c-8730-67a072c49e0c` unless the log says otherwise).

## HARD RULES
1. Never write to the PRODUCTION database; no SQL; never change a switch (`otp_required` must still be TRUE, `session_enforced` FALSE). No sign-ups, logins, OTP sends, posts, no announcement created, no user blocked. Allowed: page loads, asset fetches, `GET /api/otp/config`, `POST /api/otp/send` with `{"phone":"123"}` only, `POST /rest/v1/rpc/get_active_announcements` with the public key from `.env.production` (read-only function; never print the key), `GET /api/admin/sms-balance` with no session header (must answer 401).
2. Do NOT run the ship script again; never redeploy. The only production action allowed is the rollback in the decision rule.
3. No secrets anywhere. 4. Git: explicit paths only, no force push, no merge into `main`, never move tags (`pre-14a-ship`, `ship-14a`).
5. Honest statuses: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts; no code change is expected: if one is needed, stop and report.

## PART 0 — PREFLIGHT
Read `evidence/ship-real.log` to the end: SHIP OK or rolled back? Note commit, new deployment id, PREV, the `[14a_chunks]`, `[14a_admin_fn]`, `[14a_db]`, `[12a_switches]` lines. Confirm read-only with `npx wrangler pages deployment list --project-name kissansahyog-prod` and that `https://kissansahyog.com/` serves the main chunk in the log. Rolled back or live == PREV: write `CLOSE_REPORT.md` with status ROLLED-BACK / NOT-SHIPPED and stop.

## PART 1 — LIVE VERIFICATION (read-only; evidence in `docs/review/batch14a/evidence/prod-live/`)
1.1 Pages 200, render, no ErrorBoundary, no console errors at 320/360/412 px, Hindi and English: `/`, `/browse`, `/signup`, `/login`, `/post`, `/my`, `/admin`, `/msp`, `/mausam`, `/guide`, `/about`, `/contact`. `/admin` while signed out must show the normal access-denied screen (no sign-in is attempted by you).
1.2 Announcement RPC: `POST $PROD/rest/v1/rpc/get_active_announcements` with the anon key answers HTTP 200 and a JSON array (empty is correct until you create a card). Prerendered `/` contains no `announcement-card`, no `festival-card`, no `localhost`, and the home page still shows both big buttons and the 12C ticker (max 12 items).
1.3 Admin function: `GET https://kissansahyog.com/api/admin/sms-balance` with no session header -> 401 `{"error":"session_required"}`; with a fake 40-character `x-ks-session` -> 401 as well.
1.4 Switches unchanged: `GET /api/otp/config` = `otp_required=true`, `session_enforced=false`; `POST /api/otp/send` `{"phone":"123","purpose":"login"}` -> 400 `invalid_phone`.
1.5 Earlier features still live: 12A WhatsApp card, 12C ticker, 13A Browse (`/browse` two sections), footer `· India` / `· भारत`.
1.6 Write `evidence/prod-live/RESULT.md`. Hindi wording: HUMAN-REVIEW (`HINDI_CAPTIONS.md`).
**Decision rule.** Blank page, ErrorBoundary or 5xx on `/`, `/signup`, `/login`, `/browse`, `/post`, `/my` or `/msp`: run `bash scripts/rollback-prod-14a.sh <PREV>`, re-check, status ROLLED-BACK (the migration stays; it is additive and the old site ignores it). Anything smaller: no rollback; record HUMAN-REVIEW.

## PART 2 — RECORD
Create tag `prod-14a` on the shipped commit (= `ship-14a`) and push; if it exists elsewhere use `prod-14a-2`. Write `CLOSE_REPORT.md` with a row `| New production deployment | <id in backticks> |`, PREV, time, results, switches at close, undo (`bash scripts/rollback-prod-14a.sh <PREV>`; no database step; `PROD_ROLLBACK_0067.sql` is optional and destructive for blocked flags, roles, announcements and the action log).

## PART 3 — NOTES (add sections only)
Append to `PROJECT_CONTEXT.md` "Batch 14A — state as of this ship": admin page = shell + six lazy tabs (`src/screens/admin/`), panel search from `registry.js`; announcement cards replace the Dussehra card (`get_active_announcements`, `AnnouncementCards`, India time); new admin RPCs take `p_actor` and need a live session even when `session_enforced` is false (`require_admin_session`); roles `super` / `editor` (`profiles.admin_role`); blocking = `profiles.is_blocked` + BEFORE INSERT triggers on listings and kisan_mela_interest + OTP verify check; console log = `admin_actions` (old admin writes are logged by the console `withLog`, see `docs/review/batch14a/BACKLOG.md`); `functions/lib/admin-auth.js` is reused by 14B. Append to `KNOWN_ISSUES.md`: Hindi wording awaits review; the block does not reach anonymous inserts (Sawaal, reports, feedback); rate-limited OTP refusals are not counted.

## PART 4 — COMMIT AND PUSH
Stage only explicit paths (`PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, files under `docs/review/batch14a/`; force-add `ship-real.log`; skip anything over 5 MB; no secrets). Message: `docs: record Batch 14A production ship and update project notes`. Push `origin release-14a`. No merge into `main`.

## FINAL SUMMARY — ONLY this (max 12 lines)
Status; deployment id, commit, URL; switches now; checks passed and HUMAN-REVIEW items; tag `prod-14a`, notes updated, commit hash; undo command with the real id; next for me (create the first announcement card from `EXAMPLE_ANNOUNCEMENT.md`).
