# BATCH 11A — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 11A myself** (`bash scripts/ship-prod-11a.sh`, log: `docs/review/batch11a/evidence/ship-real.log`), following `docs/review/batch11a/SHIP.md`:
- migration 0066 (and 0064 / 0065 if 10E / 10G were not live) pasted into the production SQL editor before the ship;
- the production secrets set with `bash scripts/set-otp-secrets.sh prod`;
- if not pasted before: the 10E mandi backfill parts pasted after `SHIP OK`.
- I may or may not have turned `otp_required` ON afterwards (SHIP.md step 9a). `session_enforced` should still be OFF.

Your job: check that production is healthy, record it, update the notes.

I may be away. Do not ask questions. Pick the SAFEST option, write it to `docs/review/batch11a/CLOSE_DECISIONS.md`, and carry on. Keep a log in `docs/review/batch11a/CLOSE_PROGRESS.md`; if it exists, resume from the first unfinished part.

**What was shipped:** branch `release-11a`, ship tag `ship-11a`. It contains 10C + 10D + 10E + 10F + 10G + 11A. Batches that had not shipped on their own went out with this ship.

11A changes:
- real mobile OTP (2Factor, through the Pages Functions `/api/otp/send`, `/api/otp/verify`, `/api/otp/config`) for phone sign-in and sign-up, used only while the database switch `otp_required` is ON;
- a secret per-login session token (header `x-ks-session`) that every actor-based database function checks only while BOTH `otp_required` and `session_enforced` are ON (migration 0066);
- the login screen shows the mobile box above the e-mail box; e-mail users get a session token after signing in.

**Previous production deployment:** printed by the ship as the "rollback target" and saved in `docs/review/batch11a/evidence/prod-ship/prod-deployment-before.txt`. Call it PREV below and always use the value from the log/file.

## HARD RULES
1. Never write to the PRODUCTION database (`eltmcznjcqiahqhjvpjg`) and never change the two switches.
   - No SQL at all. No sign-ups, logins, OTP sends, posts, closes, deletes or feedback on production. **Do NOT press "कोड भेजें" on production** (it sends a real SMS and spends credit).
   - Allowed: page loads, fetching assets, `GET /api/otp/config`, and `POST /api/otp/send` with the invalid number `123` only (it is rejected before anything else; no SMS). Nothing else on `/api/otp/*`.
   - The ship script's probes already proved 0064, 0065 and 0066 are there; do not repeat them.
2. Do NOT run the ship script again. Never ship, never redeploy. The only production action you may take is the rollback in Part 1's decision rule.
3. No secrets in output, logs, reports or commits (never print `.env*` values, the 2Factor key, a service-role key or any JWT).
4. Git: no `git add -A`; stage by explicit path. No force push. No merge into `main`. Never delete or move branches or tags (`pre-11a-ship` and `ship-11a` stay where they are).
5. Honest statuses only: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts per problem. This run should need NO code change: if one is needed, stop and report.

## PART 0 — PREFLIGHT
0.1 Read `docs/review/batch11a/evidence/ship-real.log` to the end: SHIP OK or rolled back? Find the shipped commit, the new deployment id, PREV, the new main chunk, the D/D2/D3 probe lines (0064, 0065, 0066 present, flags at ship time), the `[11a_otp]` gate lines, and whether step 3b needed a prerender re-run.
0.2 Confirm independently, read-only: which deployment is live (`npx wrangler pages deployment list --project-name kissansahyog-prod`, or the Cloudflare API read the ship script uses), and that `https://kissansahyog.com/` serves the main chunk named in the log.
0.3 Stop cases:
- If the log shows a rollback, or live is still PREV: write `docs/review/batch11a/CLOSE_REPORT.md` with the failing gate and a read-only diagnosis, and jump to the FINAL SUMMARY with status ROLLED-BACK.
- If live is neither PREV nor the new deployment: STOP and report (someone else changed production).

## PART 1 — LIVE VERIFICATION (READ-ONLY, https://kissansahyog.com, real browser via Playwright plus plain fetches)
Evidence under `docs/review/batch11a/evidence/prod-live/`. Test at 320, 360 and 412 px (1.1 also at 1280 px), Hindi and English.

1.1 These pages each return 200, render, show no ErrorBoundary text, have no uncaught console errors and make no failed requests to our own backend or `/functions`: `/`, `/browse`, `/signup`, `/login`, `/post`, `/my` (logged out: the login page is fine), `/admin` (logged out: fine), `/msp`, `/msp/wheat`, `/mausam`, `/guide`, `/guide/post`, `/kisan-mela`, `/yojana`, and one public `/listing/<id>` of an active listing.
1.2 **New code is really live.** Live main chunk = the one in the log; a live JS chunk contains `app_login_otp`; `GET /api/otp/config` answers JSON with both flags (record their values; `session_enforced` must be false); `POST /api/otp/send` `{"phone":"123","purpose":"login"}` with `Origin: https://kissansahyog.com` answers 400 `invalid_phone`. Earlier markers: a chunk with `delete_my_listing` (10G), `ks-date-badge` (10F), `app_register_phone` (10E), guide chunks with `ksg-`; no `localhost` / `127.0.0.1` in the live HTML of `/`, `/msp`, `/guide`, `/kisan-mela` and 5 more prerendered pages.
1.3 **Login screen.** `/login` at 320 px: the mobile box is above the e-mail box, no horizontal scroll. If `otp_required` is OFF the button reads "मोबाइल नंबर से लॉग इन करें"; if ON it reads "कोड भेजें". Do not press it.
1.4 **Earlier batches still live (regression):** 10G (no seller/admin buttons on a public listing for a logged-out visitor; a made-up `/listing/<random uuid>` shows "यह लिस्टिंग नहीं मिली।"), 10F static homepage hero and `/msp` badge, 10E phone-only sign-up form (do not submit), 10C `/guide` hub with four cards.
1.5 **SEO files.** `/sitemap.xml` valid and lists the child sitemaps; `/robots.txt` byte-identical to the one in `docs/review/batch11a/evidence/prod-before.json` (or the 10G one if the ship reused it).
1.6 Look at the screenshots yourself (at least ten) for overlap, clipped Hindi and horizontal scroll.
1.7 OTP sign-in / sign-up and session enforcement are NOT tested on production by you (they write and send SMS). Record them as NOT-RUN on production by rule; staging evidence: `docs/review/batch11a/evidence/final-otp-e2e.txt`, `db-tests.md`, `functions-integration.md`. If the founder already tested OTP on production, note what they reported as HUMAN-REVIEW.
1.8 Write `docs/review/batch11a/evidence/prod-live/RESULT.md` with each check's status and what you saw.

**Decision rule.** If 1.1 shows a blank page, an ErrorBoundary or a 5xx on `/`, `/signup`, `/login`, `/browse`, `/post`, `/my` or `/msp`:
1. If `GET /api/otp/config` shows a flag ON, do NOT change it yourself; write in the report that the founder must turn both flags OFF first (SHIP.md step 10.1).
2. Run `bash scripts/rollback-prod-11a.sh <PREV>`.
3. Re-check that `/`, `/browse` and `/signup` load.
4. Write the report and jump to the FINAL SUMMARY with status ROLLED-BACK.
Database steps (0064, 0065, 0066, backfill) stay in place after a rollback; do NOT run any rollback SQL. For anything smaller, do NOT roll back: record it as HUMAN-REVIEW.

## PART 2 — RECORD WHAT IS LIVE
2.1 Create the tag `prod-11a` on the shipped commit (it should equal `ship-11a`) and push it. If `prod-11a` exists on a different commit, do not move it: use `prod-11a-2` and record why. Do NOT create `prod-10e` / `prod-10f` / `prod-10g` for batches that only went out inside this ship; write that in the report.
2.2 Write `docs/review/batch11a/CLOSE_REPORT.md` with: the shipped commit, the new deployment id as a table row `| New production deployment | \`<id>\` |` (the format the next ship script parses), PREV, the time; the check results; database steps (0064 / 0065 / 0066 proven by the ship log's probe lines; flags at close time; backfill seen live yes/no); the undo order (flags OFF, then `bash scripts/rollback-prod-11a.sh <PREV>`, then `PROD_ROLLBACK_0066.sql` only if needed).

## PART 3 — PROJECT NOTES (documentation only; ADD sections, never rewrite existing text)
3.1 Read `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, `docs/review/batch11a/` (REPORT, DECISIONS, SHIP, HINDI_CAPTIONS, BACKLOG, evidence/db-tests.md, evidence/inventory.md) and `git log` since the last `prod-*` tag.
3.2 Append to `PROJECT_CONTEXT.md` a section "Batch 11A — mobile OTP and session tokens (state as of this ship)" with ONLY verified facts: what is live (commit, deployment id, date); the two switches and their state; the Pages Functions and their secrets (names only); migration 0066 (tables, `require_actor` guard on 100 functions, allow-list, `ks_fn_backup_0066`, pepper per database); the client pieces (`sessionToken.js`, `OtpStep.jsx`, `getAuthFlags`); how it was shipped and how to undo it.
3.3 Append to `KNOWN_ISSUES.md` (existing style), only what you verified: Hindi wording awaits review (`docs/review/batch11a/HINDI_CAPTIONS.md`); old APKs and the flag order; the 60-second switch cache; the prerender loading-state race on 5 pages (`evidence/text-diff.md`); any HUMAN-REVIEW item from Part 1.

## PART 4 — COMMIT AND PUSH
Stage ONLY, by explicit path: `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, and the files you created under `docs/review/batch11a/` (`CLOSE_REPORT.md`, `CLOSE_DECISIONS.md`, `CLOSE_PROGRESS.md`, `evidence/prod-live/**`, `evidence/ship-real.log`, `evidence/prod-ship/**`). Skip anything over 5 MB. No `.env*`, `.dev.vars`, keystores or APKs.
Commit message: `docs: record Batch 11A production ship and update project notes`. Push `origin release-11a`. Do not merge into `main`. Confirm `git log -1` and `git status` show nothing unintended.

## FINAL SUMMARY — print ONLY this (max 14 lines), plain language
- Status: SHIPPED-AND-VERIFIED / ROLLED-BACK / STOPPED (one-line reason).
- What is live now: deployment id, commit, `https://kissansahyog.com`; which earlier batches went out with it.
- The two switches right now (otp_required, session_enforced).
- Mandi backfill: seen live yes/no.
- Checks: how many passed; every HUMAN-REVIEW item by name.
- Tag `prod-11a`, notes updated, commit hash pushed.
- Undo: flags OFF, then `bash scripts/rollback-prod-11a.sh <PREV>` (with the real id).
- Next for me: read `docs/review/batch11a/HINDI_CAPTIONS.md`; turn `otp_required` ON and test with your number (if not done); build and publish the new Android APK before ever turning `session_enforced` ON.
