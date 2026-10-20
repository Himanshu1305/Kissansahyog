# BATCH 12B — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 12B myself** (`bash scripts/ship-prod-12b.sh`, log: `docs/review/batch12b/evidence/ship-real.log`), following `docs/review/batch12b/SHIP.md`. No database step. Check that production is healthy, record it, update the notes. Be economical. Do not ask questions; pick the SAFEST option, write it to `docs/review/batch12b/CLOSE_DECISIONS.md`; keep a log in `CLOSE_PROGRESS.md` and resume from the first unfinished part if it exists.

**What was shipped:** branch `release-12b`, ship tag `ship-12b`: release-12c (WhatsApp channel card 12A + mandi ticker 12C) + Batch 12B (one-day Dussehra greeting card with a Neelkanth picture, shown only on 20 Oct 2026 India time, client-side; home page desktop layout: the "पहली बार?" banner and the WhatsApp card sit in the centered column). PREV = the "rollback target" in the ship log (expected: the Batch 12C deployment `e85e91a0-1674-4726-91e6-1051ebdb47a5`). Note: if this runs after 20 Oct 2026 India time the card is correctly NOT visible.

## HARD RULES
1. Never write to the PRODUCTION database; no SQL; never change a switch. No sign-ups, logins, OTP sends, posts. Allowed: page loads, asset fetches, `GET /api/otp/config`, `POST /api/otp/send` with `{"phone":"123"}` only.
2. Do NOT run the ship script again; never redeploy. The only production action allowed is the rollback in the decision rule.
3. No secrets anywhere. 4. Git: explicit paths only, no force push, no merge into `main`, never move tags (`pre-12b-ship`, `ship-12b`).
5. Honest statuses: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts; no code change is expected: if one is needed, stop and report.

## PART 0 — PREFLIGHT
Read `evidence/ship-real.log` to the end: SHIP OK or rolled back? Note commit, new deployment id, PREV, the `[12b_festival]`, `[12c_ticker]`, `[12a_switches]`, `[12a_whatsapp]` lines. Confirm read-only with `npx wrangler pages deployment list --project-name kissansahyog-prod` and that `https://kissansahyog.com/` serves the main chunk in the log. Rolled back or live == PREV: write `CLOSE_REPORT.md` (failing gate), status ROLLED-BACK. Live is neither: STOP.

## PART 1 — LIVE VERIFICATION (read-only; evidence in `docs/review/batch12b/evidence/prod-live/`)
1.1 Pages 200, render, no ErrorBoundary, no console errors, no failed backend requests at 320/360/412 px, Hindi and English: `/`, `/browse`, `/signup`, `/login`, `/post`, `/my`, `/admin`, `/msp`, `/msp/gehun`, `/mausam`, `/guide`, `/about`, `/contact`.
1.2 The picture: `https://kissansahyog.com/festival/neelkanth.webp` and `/festival/neelkanth-112.webp` answer 200 with an image content type.
1.3 Card, using Playwright's fake clock against the live site: at 2026-10-20 10:00 IST `/` shows `[data-testid="festival-card"]` with the Hindi title, a 48 px close button, height <= 100 px at 360 px, no horizontal scroll at 320 px; it is absent on `/msp`; absent at 2026-10-19 23:59 IST and 2026-10-21 00:00 IST; closing hides it after a reload. The prerendered HTML of `/` (curl) must NOT contain `festival-card`. Look at screenshots at 360, 1366 and 1920 px.
1.4 Desktop layout at 1366 and 1920 px: the "पहली बार?" banner and the WhatsApp card start at the same left edge as the hero heading and stay inside the hero column. Mobile 360 x 640: the two big buttons at about y 615 and 691 (card dismissed or fake date 21 Oct).
1.5 Ticker and channel link still as in 12C/12A: ticker at most 12 items, no Latin letters, height 38; channel link exact URL with `rel="noopener noreferrer"` in the footer of `/`, `/about`, `/msp`.
1.6 Switches: `GET /api/otp/config` = `otp_required=true`, `session_enforced=false`; `POST /api/otp/send` `{"phone":"123","purpose":"login"}` -> 400 `invalid_phone`.
1.7 Earlier markers still live: `app_login_otp`, `delete_my_listing`, `ks-date-badge`, `app_register_phone`, `ksg-`; no `localhost` in 10 prerendered pages.
1.8 Write `evidence/prod-live/RESULT.md`. Hindi wording: HUMAN-REVIEW (`HINDI_CAPTIONS.md`); Android: NOT-RUN.
**Decision rule.** Blank page, ErrorBoundary or 5xx on `/`, `/signup`, `/login`, `/browse`, `/post`, `/my` or `/msp`: run `bash scripts/rollback-prod-12b.sh <PREV>`, re-check, status ROLLED-BACK. Anything smaller: no rollback; record HUMAN-REVIEW.

## PART 2 — RECORD
Create tag `prod-12b` on the shipped commit (= `ship-12b`) and push; if it exists elsewhere use `prod-12b-2`. Write `CLOSE_REPORT.md` with a row `| New production deployment | <id in backticks> |`, PREV, time, results, switches at close, undo (`bash scripts/rollback-prod-12b.sh <PREV>`; no database step).

## PART 3 — NOTES (add sections only)
Append to `PROJECT_CONTEXT.md` "Batch 12B — state as of this ship": `src/lib/festivals.js` (India-date gate, add an entry for a new festival), `src/components/FestivalCard.jsx` (client-side only, skipped when `window.__KS_PRERENDER`, localStorage key `ks_festival_closed_v1`), picture in `public/festival/` (CC0, `docs/review/batch12b/IMAGE_LICENSE.md`), home desktop layout via `.ks-section-inner`. Append to `KNOWN_ISSUES.md`: Hindi greeting wording awaits review; the card is Dussehra-only text; the old home e2e specs pre-dismiss the card; any HUMAN-REVIEW item. If `BATCH12C_CLOSE_PROMPT.md` was never run, say so and note that 12C and 12A are live via this ship.

## PART 4 — COMMIT AND PUSH
Stage only explicit paths (`PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, files under `docs/review/batch12b/`; force-add `ship-real.log`; skip anything over 5 MB; no secrets). Message: `docs: record Batch 12B production ship and update project notes`. Push `origin release-12b`. No merge into `main`.

## FINAL SUMMARY — ONLY this (max 12 lines)
Status; deployment id, commit, URL; switches now; checks passed and HUMAN-REVIEW items; tag `prod-12b`, notes updated, commit hash; undo command with the real id; next for me.
