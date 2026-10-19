# BATCH 10F — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 10F myself** (`bash scripts/ship-prod-10f.sh`, log: `docs/review/batch10f/evidence/ship-real.log`), following `docs/review/batch10f/SHIP.md`:
- if Batch 10E was not live before: migration 0064 pasted into the production SQL editor before the ship;
- if not pasted before: the 10E mandi backfill parts pasted after `SHIP OK`.

Your job: check that production is healthy, record it, update the notes.

I may be away. Do not ask questions. Pick the SAFEST option, write it to `docs/review/batch10f/CLOSE_DECISIONS.md`, and carry on. Keep a log in `docs/review/batch10f/CLOSE_PROGRESS.md`; if it exists, resume from the first unfinished part.

**What was shipped:** branch `release-10f`, ship tag `ship-10f`. It contains 10C + 10D + 10E + 10F. If 10D or 10E had not shipped on their own, they went out with this ship.

10F changes:
- homepage hero: the 10D persona tabs, phone mock-up, caption bubble, facts row, "रजिस्टर करें" hero button and the animated field band are gone; static hero with the heading, the two big buttons "मुझे कुछ चाहिए" / "मेरे पास कुछ है", ONE "1 मिनट का डेमो देखें" button (to `/guide`) and the three info cards (मौसम / आज का भाव / आज की सलाह); no homepage animation except the mandi ticker;
- collapsible sections (arrow after the section heading) on `/msp`, `/mausam` and the homepage below the hero; on phones the secondary sections start collapsed; the visitor's choice is remembered;
- `/msp`: a prominent last-price badge ("अंतिम भाव: 17 अक्टू 2026", saffron; green "आज का भाव · …" when the price is from today); readable dates everywhere (no "2026-10-17");
- `/msp` trend chart: dates on the dots (tooltip by hover / tap / drag / keyboard, always-visible labels on first, last, highest, lowest; every dot in the 7-day view), date ticks, a "सारणी देखें" table;
- `/msp` trend integrity: the line uses a stable basket of regularly reporting mandis and skips days when too few of them reported (no more fake dips/spikes like wheat 17 Oct / 15 Aug); calculator and WhatsApp text use the same series; "कम मंडियों का भाव" label for thin crops.

**Previous production deployment:** the ship log prints it as the "rollback target" and saves it in `docs/review/batch10f/evidence/prod-ship/prod-deployment-before.txt`. Call it PREV below and always use the value from the log/file.

## HARD RULES
1. Never write to the PRODUCTION database (`eltmcznjcqiahqhjvpjg`).
   - No SQL that writes. No sign-ups, logins, form submits, posts or feedback on production.
   - On the live site, do READ-ONLY things only: page loads, taps that do not submit, opening/closing sections, hovering/tapping the chart, fetching assets.
   - Typing into a form field is allowed ONLY if nothing is submitted. Never press the sign-up, login, post or submit buttons.
   - Do not call `app_register_phone` or any other RPC that could write.
2. Do NOT run the ship script again. Never ship, never redeploy. The only production action you may take is the rollback in Part 1's decision rule.
3. No secrets in output, logs, reports or commits.
4. Git: no `git add -A`; stage by explicit path. No force push. No merge into `main`. Never delete or move branches or tags (`pre-10f-ship` and `ship-10f` stay where they are).
5. Honest statuses only: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts per problem. This run should need NO code change: if one is needed, stop and report.

## PART 0 — PREFLIGHT
0.1 Read `docs/review/batch10f/evidence/ship-real.log` to the end: SHIP OK or rolled back? Find the shipped commit, the new deployment id, PREV, the new main chunk, and whether step 3b (pre-deploy size check) needed a prerender re-run.

0.2 Confirm independently, read-only: which deployment is live (`npx wrangler pages deployment list --project-name kissansahyog-prod`, or the Cloudflare API read the ship script uses), and that `https://kissansahyog.com/` serves the main chunk named in the log.

0.3 Stop cases:
- If the log shows a rollback, or live is still PREV: write `docs/review/batch10f/CLOSE_REPORT.md` with the failing gate and a read-only diagnosis, and jump to the FINAL SUMMARY with status ROLLED-BACK.
- If live is neither PREV nor the new deployment: STOP and report (someone else changed production).

0.4 Is the 10E mandi backfill live? Read-only from `/msp/wheat`: does the 90 दिन tab reach back about 90 days and cover more days than the 30 दिन tab? Do NOT query the database. If not, note HUMAN-REVIEW ("backfill not pasted yet").

## PART 1 — LIVE VERIFICATION (READ-ONLY, https://kissansahyog.com, real browser via Playwright plus plain fetches)
Evidence under `docs/review/batch10f/evidence/prod-live/`. Test at 320, 360 and 412 px (1.2 and 1.6 also at 1280 px), Hindi and English.

1.1 These pages each return 200, render, show no ErrorBoundary text, have no uncaught console errors and make no failed requests to our own backend or `/functions`: `/`, `/browse`, `/signup`, `/login`, `/post`, `/msp`, `/msp/wheat`, `/mausam`, `/guide`, `/guide/post`, `/kisan-mela`, `/yojana`. (`/post` logged out may show the login page.)

1.2 **Homepage hero.** No persona tabs, no phone mock-up, no caption bubble, no facts row, no field band (no `data-testid="home-live"`, `home-field`, `home-band`, `home-facts`); no LiveStage chunk is requested. Present: the chip, "आज किसान के लिए" + sub-line, "मुझे कुछ चाहिए", "मेरे पास कुछ है", ONE "1 मिनट का डेमो देखें" (`data-testid="home-hero-demo"`) that opens `/guide`, the "पहली बार? 1 मिनट में सीखें" banner, the three info cards. Nothing on the page animates except the mandi ticker (check `document.getAnimations()`). No horizontal scroll 320–1440.

1.3 **Collapsible sections.** On a phone width, `/msp/wheat`: explainer, "सभी फसलें — आज का भाव" and "आज का भाव" open; रुझान, calculator, "MSP पर कहाँ बेचें", "MSP से नीचे बिक गया?", FAQ collapsed; the arrow sits right after the heading text; tapping toggles; the choice survives a reload. Same idea on `/mausam` and on the homepage below the hero (search, near you, listings open; videos, सवाल, मेले, सरकारी मदद, भरोसेमंद लोग, लेख collapsed). At 1280 px everything is open. `curl` the raw HTML of `/msp/wheat/`: every `<details>` has `open` and the collapsed sections' text is in the HTML.

1.4 **Last-price badge and dates.** `/msp/wheat`: the badge next to "आज का भाव" (and "सभी फसलें — आज का भाव") reads "अंतिम भाव: <d> <month> <yyyy>" (saffron) or "आज का भाव · <d> <month>" (green, only when the price date is today in India), fits on one line at 360 px. No ISO date (`2026-10-17` style) anywhere in the page text or the WhatsApp share text, Hindi and English.

1.5 **Chart.** On `/msp/wheat`, 7 / 30 / 90 days: hover/tap a dot shows "<d> <month> · ₹<price>" and "<N> मंडी"; first/last/highest/lowest labels visible and not overlapping (320, 412, 1280 px); 7-day view labels every dot (or every second at 320 px); arrow keys move between dots; "सारणी देखें" lists one row per dot. Thin crop (e.g. maize): "कम मंडियों का भाव" shown.

1.6 **Trend integrity.** Record the wheat 30-day first and last points and the trend sentence; the sentence equals last − first of the plotted line; the calculator's "हिसाब का भाव" equals the last plotted point. Note (do not judge as a failure) if the last plotted day is older than the newest table date — that day had too few mandis.

1.7 **Earlier batches still live (regression).** 10E: phone-only sign-up form (no email/password field; do not submit), the login line, listing photos load under the CSP, post demo 16 steps with "सीताराम 🙏". 10C: `/guide` hub with four cards.

1.8 **New code is really live.** Live main chunk = the one in the log; a live JS chunk contains `ks-date-badge`; one contains `app_register_phone`; guide chunks contain `ksg-`; no `localhost` / `127.0.0.1` in the live HTML of `/`, `/msp`, `/guide`, `/kisan-mela` and 5 more prerendered pages.

1.9 **SEO files.** `/sitemap.xml` valid and lists the child sitemaps; `/robots.txt` byte-identical to the one in `docs/review/batch10f/evidence/prod-before.json`.

1.10 Look at the screenshots yourself (at least ten) for overlap, clipped Hindi and horizontal scroll.

1.11 Write `docs/review/batch10f/evidence/prod-live/RESULT.md` with each check's status and what you saw.

**Decision rule.** If 1.1 shows a blank page, an ErrorBoundary or a 5xx on `/`, `/signup`, `/browse`, `/post` or `/msp`:
1. Run `bash scripts/rollback-prod-10f.sh <PREV>`.
2. Re-check that `/`, `/browse` and `/signup` load.
3. Write the report and jump to the FINAL SUMMARY with status ROLLED-BACK.
Database steps (0064, backfill) stay in place after a rollback; do NOT run any rollback SQL. For anything smaller, do NOT roll back: record it as HUMAN-REVIEW.

## PART 2 — RECORD WHAT IS LIVE
2.1 Create the tag `prod-10f` on the shipped commit (it should equal `ship-10f`) and push it. If `prod-10f` exists on a different commit, do not move it: use `prod-10f-2` and record why. If 10E went out with this ship and `prod-10e` does not exist, do NOT create it (10E was not shipped on its own); write that in the report.

2.2 Write `docs/review/batch10f/CLOSE_REPORT.md` with: the shipped commit, the new deployment id as a table row `| New production deployment | \`<id>\` |` (the format the next ship script parses), PREV, the time; the check results; database steps (0064 proven by the ship log's probe line; backfill seen live yes/no); the rollback command.

## PART 3 — PROJECT NOTES (documentation only; ADD sections, never rewrite existing text)
3.1 Read `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, `docs/review/batch10f/` (REPORT, DECISIONS, SHIP, HINDI_CAPTIONS, BACKLOG, evidence/trend-investigation.md, evidence/collapsible-defaults.md) and `git log` since `prod-10e` (or `prod-10c` if 10E went out with this ship).

3.2 Append to `PROJECT_CONTEXT.md` a section "Batch 10F — static hero, collapsible sections, /msp dates and trend integrity (state as of this ship)" with ONLY verified facts: what is live (commit, deployment id, date), how it was shipped and how to undo it (`ship-prod-10f.sh`, `rollback-prod-10f.sh`, the new pre-deploy size check), whether 10D/10E went out inside this ship; the static hero (`HomeHero` in `src/screens/Homepage.jsx`, `src/features/home-live/` deleted); `CollapsibleSection` (native details/summary, defaults, `ks_sections_v1`); `LastPriceBadge`, `formatDateFull`/`todayIst`; `TrendChart` + `chartLayout.js`; the stable-basket rule (`src/lib/mandi/basket.js`: 60 % basket, ⅔ per day, < 3 → plain median labelled), `fetchMandiHistoryRows`.

3.3 Append to `KNOWN_ISSUES.md` (existing style), only what you verified: Hindi wording awaits review (`docs/review/batch10f/HINDI_CAPTIONS.md`); section defaults are HUMAN-REVIEW; at 360 × 640 the two big buttons sit just below the first screen; Lentil's trend is noisier with the basket rule; the trend's last plotted day can be older than the newest table date (by design); any HUMAN-REVIEW item from Part 1.

## PART 4 — COMMIT AND PUSH
Stage ONLY, by explicit path: `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, and the files you created under `docs/review/batch10f/` (`CLOSE_REPORT.md`, `CLOSE_DECISIONS.md`, `CLOSE_PROGRESS.md`, `evidence/prod-live/**`, `evidence/ship-real.log`, `evidence/prod-ship/**`). Skip anything over 5 MB. No `.env*`, keystores or APKs.
Commit message: `docs: record Batch 10F production ship and update project notes`. Push `origin release-10f`. Do not merge into `main`. Confirm `git log -1` and `git status` show nothing unintended.

## FINAL SUMMARY — print ONLY this (max 14 lines), plain language
- Status: SHIPPED-AND-VERIFIED / ROLLED-BACK / STOPPED (one-line reason).
- What is live now: deployment id, commit, `https://kissansahyog.com`; whether 10D / 10E went out with it.
- What farmers see now (3 short lines): simple homepage hero with the demo button; sections that fold on phones; /msp with a clear price date and dates on the chart.
- Mandi backfill: seen live yes/no.
- Checks: how many passed; every HUMAN-REVIEW item by name.
- Tag `prod-10f`, notes updated, commit hash pushed.
- Undo: `bash scripts/rollback-prod-10f.sh <PREV>` (with the real id).
- Next for me: read `docs/review/batch10f/HINDI_CAPTIONS.md` and `evidence/collapsible-defaults.md` and send corrections.
