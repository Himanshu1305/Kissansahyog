# BATCH 13A — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 13A myself** (`bash scripts/ship-prod-13a.sh`, log: `docs/review/batch13a/evidence/ship-real.log`), following `docs/review/batch13a/SHIP.md`. No database step. Check that production is healthy, record it, update the notes. Be economical. Do not ask questions; pick the SAFEST option, write it to `docs/review/batch13a/CLOSE_DECISIONS.md`; keep a log in `CLOSE_PROGRESS.md` and resume from the first unfinished part if it exists.

**What was shipped:** branch `release-13a`, ship tag `ship-13a`: release-12b + Batch 13A (Browse: All / Offering / Looking for with live counts, two headed sections, collapse arrows, applied-filter chips, popular block collapsed on phones; footer now `· India` / `· भारत`). PREV = the "rollback target" in the ship log (expected: the Batch 12B deployment `8c6a66f2-ad48-444c-8730-67a072c49e0c`). Tag `prod-13a`.

## HARD RULES
1. Never write to the PRODUCTION database; no SQL; never change a switch. No sign-ups, logins, OTP sends, posts. Allowed: page loads, asset fetches, `GET /api/otp/config`, `POST /api/otp/send` with `{"phone":"123"}` only.
2. Do NOT run the ship script again; never redeploy. The only production action allowed is the rollback in the decision rule.
3. No secrets anywhere. 4. Git: explicit paths only, no force push, no merge into `main`, never move tags (`pre-13a-ship`, `ship-13a`).
5. Honest statuses: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts; no code change is expected: if one is needed, stop and report.

## PART 0 — PREFLIGHT
Read `evidence/ship-real.log` to the end: SHIP OK or rolled back? Note commit, new deployment id, PREV, the `[13a_festival]`, `[12c_ticker]`, `[12a_switches]`, `[12a_whatsapp]` lines. Confirm read-only with `npx wrangler pages deployment list --project-name kissansahyog-prod` and that `https://kissansahyog.com/` serves the main chunk in the log. Rolled back or live == PREV: write `CLOSE_REPORT.md` (failing gate), status ROLLED-BACK. Live is neither: STOP.

## PART 1 — LIVE VERIFICATION (read-only; evidence in `docs/review/batch13a/evidence/prod-live/`)
1.1 Pages 200, render, no ErrorBoundary, no console errors at 320/360/412 px, Hindi and English: `/`, `/browse`, `/browse?cat=equipment`, `/signup`, `/login`, `/post`, `/my`, `/admin`, `/msp`, `/mausam`, `/guide`, `/about`, `/contact`.
1.2 Browse (read-only): All / Offering / Looking for buttons are 48 px high with counts; `?type=offer` shows only the Offering section; All shows two headed sections; popular block collapsed at 360 px; tag block collapsed on phones with no tag; no horizontal scroll at 320 px. Screenshots at 360 and 1366.
1.3 Footer shows `USD Vision AI LLP · India` (English) and `· भारत` (Hindi) on `/`, `/about`, `/browse`.
1.4 Earlier features still live (12A WhatsApp card, 12B Dussehra code, 12C ticker max 12 items), prerendered `/` has no ticker links and no `localhost`.
1.5 Switches: `GET /api/otp/config` = `otp_required=true`, `session_enforced=false`; `POST /api/otp/send` `{"phone":"123","purpose":"login"}` -> 400 `invalid_phone`.
1.6 Write `evidence/prod-live/RESULT.md`. Hindi wording: HUMAN-REVIEW (`HINDI_CAPTIONS.md`).
**Decision rule.** Blank page, ErrorBoundary or 5xx on `/`, `/signup`, `/login`, `/browse`, `/post`, `/my` or `/msp`: run `bash scripts/rollback-prod-13a.sh <PREV>`, re-check, status ROLLED-BACK. Anything smaller: no rollback; record HUMAN-REVIEW.

## PART 2 — RECORD
Create tag `prod-13a` on the shipped commit (= `ship-13a`) and push; if it exists elsewhere use `prod-13a-2`. Write `CLOSE_REPORT.md` with a row `| New production deployment | <id in backticks> |`, PREV, time, results, switches at close, undo (`bash scripts/rollback-prod-13a.sh <PREV>`; no database step).

## PART 3 — NOTES (add sections only)
Append to `PROJECT_CONTEXT.md` "Batch 13A — state as of this ship": Browse loads both listing types in one request (`fetchNearbyRows`), splits in the browser (`src/lib/listings/browseSplit.js`), `?type=` in the web address, block open/closed state in sessionStorage (`ks_browse_blocks_v1`). Append to `KNOWN_ISSUES.md`: Hindi wording awaits review; desktop-clipping not reproduced (docs/review/batch13a/BACKLOG.md); collapsible-10f C5 flaky.

## PART 4 — COMMIT AND PUSH
Stage only explicit paths (`PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, files under `docs/review/batch13a/`; force-add `ship-real.log`; skip anything over 5 MB; no secrets). Message: `docs: record Batch 13A production ship and update project notes`. Push `origin release-13a`. No merge into `main`.

## FINAL SUMMARY — ONLY this (max 12 lines)
Status; deployment id, commit, URL; switches now; checks passed and HUMAN-REVIEW items; tag `prod-13a`, notes updated, commit hash; undo command with the real id; next for me.
