# BATCH 12C — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 12C myself** (`bash scripts/ship-prod-12c.sh`, log: `docs/review/batch12c/evidence/ship-real.log`), following `docs/review/batch12c/SHIP.md`. No database step. Check that production is healthy, record it, update the notes. Be economical. Do not ask questions; pick the SAFEST option, write it to `docs/review/batch12c/CLOSE_DECISIONS.md`; keep a log in `CLOSE_PROGRESS.md` and resume from the first unfinished part if it exists.

**What was shipped:** branch `release-12c`, ship tag `ship-12c`: release-11a + Batch 12A (WhatsApp channel card/link `https://whatsapp.com/channel/0029VbDtjiJBqbr1a2Nv1F3I`, never shipped before) + Batch 12C (home mandi ticker: one price per crop, max 12; Hindi name for every mandi; steady ~35 px/s scroll, min 40 s). PREV = the "rollback target" in the ship log / `evidence/prod-ship/prod-deployment-before.txt` (expected: the Batch 11A deployment).

## HARD RULES
1. Never write to the PRODUCTION database; no SQL; never change a switch. No sign-ups, logins, OTP sends, posts. Allowed: page loads, asset fetches, `GET /api/otp/config`, `POST /api/otp/send` with `{"phone":"123"}` only.
2. Do NOT run the ship script again; never redeploy. The only production action allowed is the rollback in the decision rule.
3. No secrets anywhere. 4. Git: explicit paths only, no force push, no merge into `main`, never move tags (`pre-12c-ship`, `ship-12c`).
5. Honest statuses: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts; no code change is expected: if one is needed, stop and report.

## PART 0 — PREFLIGHT
Read `evidence/ship-real.log` to the end: SHIP OK or rolled back? Note commit, new deployment id, PREV, the `[12c_ticker]`, `[12a_switches]`, `[12a_whatsapp]` lines. Confirm read-only with `npx wrangler pages deployment list --project-name kissansahyog-prod` and that `https://kissansahyog.com/` serves the main chunk in the log. Rolled back or live == PREV: write `CLOSE_REPORT.md` (failing gate), status ROLLED-BACK. Live is neither: STOP.

## PART 1 — LIVE VERIFICATION (read-only; evidence in `docs/review/batch12c/evidence/prod-live/`)
1.1 Pages 200, render, no ErrorBoundary, no console errors, no failed backend requests at 320/360/412 px, Hindi and English: `/`, `/browse`, `/signup`, `/login`, `/post`, `/my`, `/admin`, `/msp`, `/msp/gehun`, `/mausam`, `/guide`, `/about`, `/contact`.
1.2 Ticker on `/` (Hindi, 360x640 and 1366x768): at most 12 items, one per crop, no Latin-letter mandi names, strip height 38 px, `animation-duration` >= 40 s and (width of the first half / duration) <= 40 px/s, no horizontal scroll at 320 px. With `prefers-reduced-motion` no animation. Look at the screenshots yourself.
1.3 Channel link (12A): exact URL, `rel="noopener noreferrer"`, `target="_blank"` in the footer of `/`, `/about`, `/msp`; one card on `/`, `/msp/gehun`, `/mausam`, `/about`, `/contact`, `/guide`; none on `/login`, `/signup`, `/admin`.
1.4 Switches: `GET /api/otp/config` = `otp_required=true`, `session_enforced=false`; `POST /api/otp/send` `{"phone":"123","purpose":"login"}` -> 400 `invalid_phone`.
1.5 Earlier markers still live: `app_login_otp`, `delete_my_listing`, `ks-date-badge`, `app_register_phone`, `ksg-`; no `localhost` in 10 prerendered pages; `/robots.txt` and `/sitemap.xml` as before.
1.6 Write `evidence/prod-live/RESULT.md`. Hindi wording: HUMAN-REVIEW (`HINDI_CAPTIONS.md`); Android: NOT-RUN.
**Decision rule.** Blank page, ErrorBoundary or 5xx on `/`, `/signup`, `/login`, `/browse`, `/post`, `/my` or `/msp`: run `bash scripts/rollback-prod-12c.sh <PREV>`, re-check, status ROLLED-BACK. Anything smaller: no rollback; record HUMAN-REVIEW.

## PART 2 — RECORD
Create tag `prod-12c` on the shipped commit (= `ship-12c`) and push; if it exists elsewhere use `prod-12c-2`. Write `CLOSE_REPORT.md` with a row `| New production deployment | <id in backticks> |`, PREV, time, results, switches at close, undo (`bash scripts/rollback-prod-12c.sh <PREV>`; no database step).

## PART 3 — NOTES (add sections only)
Append to `PROJECT_CONTEXT.md` "Batch 12A + 12C — state as of this ship" (WhatsApp card as in `docs/review/batch12a/REPORT.md`; ticker: `src/lib/mandi/tickerRows.js`, `marketNames.js`, `--ticker-duration`, and why the old map never matched "X APMC"). Append to `KNOWN_ISSUES.md`: Hindi mandi labels await review; `/msp` still shows raw market names; Android link untested; any HUMAN-REVIEW item.

## PART 4 — COMMIT AND PUSH
Stage only explicit paths (`PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, files under `docs/review/batch12c/`; force-add `ship-real.log`; skip anything over 5 MB; no secrets). Message: `docs: record Batch 12C production ship and update project notes`. Push `origin release-12c`. No merge into `main`.

## FINAL SUMMARY — ONLY this (max 12 lines)
Status; deployment id, commit, URL; switches now; checks passed and HUMAN-REVIEW items; tag `prod-12c`, notes updated, commit hash; undo command with the real id; next for me (read `HINDI_CAPTIONS.md`).
