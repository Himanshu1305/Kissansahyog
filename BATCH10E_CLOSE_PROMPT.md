# BATCH 10E — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 10E myself** (`bash scripts/ship-prod-10e.sh`, log: `docs/review/batch10e/evidence/ship-real.log`), following `docs/review/batch10e/SHIP.md`:
- migration 0064 pasted into the production SQL editor before the ship;
- the mandi backfill parts pasted after `SHIP OK`.

Your job: check that production is healthy, record it, update the notes.

I may be away. Do not ask questions. Pick the SAFEST option, write it to `docs/review/batch10e/CLOSE_DECISIONS.md`, and carry on. Keep a log in `docs/review/batch10e/CLOSE_PROGRESS.md`; if it exists, resume from the first unfinished part.

**What was shipped:** branch `release-10e`, ship tag `ship-10e`. It contains 10C + 10D + 10E. If Batch 10D had not shipped on its own, its live homepage went out with this ship.

10E changes:
- listing photos visible (CSP `img-src` now lists both Supabase storage hosts);
- demo finish line "सीताराम 🙏";
- home photo tiles are links with pointer + hover glow;
- no localhost links in prerendered HTML;
- `/msp` trend: tabs show their real date ranges, paged history reads, and real Agmarknet history backfilled (data.gov.in, GODL);
- phone-only sign-up: name + mobile + village, no email/password (`app_register_phone`, migration 0064);
- login line "📱 ईमेल नहीं है? मोबाइल नंबर से लॉगिन करें";
- optional "अतिरिक्त जानकारी" box on every post form;
- mandatory start dates for equipment / land / labour / drone didi;
- guide "how to post" demo with a date step and a photo step (16 steps);
- Kisan Mela homepage teaser limited to MP + neighbouring states;
- 1024 px hero tile fix.

**Previous production deployment:** the ship log prints it as the "rollback target" and saves it in `docs/review/batch10e/evidence/prod-ship/prod-deployment-before.txt`. It is `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20` (Batch 10C), unless Batch 10D shipped first. Call it PREV below and always use the value from the log/file.

## HARD RULES
1. Never write to the PRODUCTION database (`eltmcznjcqiahqhjvpjg`).
   - No SQL that writes. No sign-ups, logins, form submits, posts or feedback on production.
   - On the live site, do READ-ONLY things only: page loads, taps that do not submit, fetching assets.
   - Typing into a form field is allowed ONLY if nothing is submitted. Never press the sign-up, login, post or submit buttons.
   - Do not call `app_register_phone` or any other RPC that could write. The ship script's read-only probe already proved 0064 is there; do not repeat it.
2. Do NOT run the ship script again. Never ship, never redeploy. The only production action you may take is the rollback in Part 1's decision rule.
3. No secrets in output, logs, reports or commits.
4. Git: no `git add -A`; stage by explicit path. No force push. No merge into `main`. Never delete or move branches or tags (`pre-10e-ship` and `ship-10e` stay where they are).
5. Honest statuses only: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts per problem. This run should need NO code change: if one is needed, stop and report.
6. New Hindi text only in `src/lib/i18n/strings.js` (not expected to be needed).

## PART 0 — PREFLIGHT
0.1 Read `docs/review/batch10e/evidence/ship-real.log` to the end.
- Did it print SHIP OK, or did it roll back?
- Find the shipped commit, the new deployment id, PREV, and the new main chunk name.

0.2 Confirm independently, read-only:
- which deployment is live (`npx wrangler pages deployment list --project-name kissansahyog-prod`, or the same Cloudflare API read the ship script uses);
- that `https://kissansahyog.com/` serves the main chunk named in the log.

0.3 Stop cases:
- If the log shows a rollback, or live is still PREV: STOP shipping work. Write `docs/review/batch10e/CLOSE_REPORT.md` with the failing gate and a read-only diagnosis, and jump to the FINAL SUMMARY with status ROLLED-BACK.
- If live is neither PREV nor the new deployment: STOP and report (someone else changed production).

0.4 Was the mandi backfill pasted? Read-only check from the live `/msp/wheat` page: does the 90 दिन tab reach back to about 20 Jul (90 days) and cover more days than the 30 दिन tab? Do NOT query the database.
- If the backfill does not look pasted, note it as HUMAN-REVIEW ("backfill not pasted yet") and check 1.6 for the date labels only.

## PART 1 — LIVE VERIFICATION (READ-ONLY, https://kissansahyog.com, real browser via Playwright plus plain fetches)
Evidence goes under `docs/review/batch10e/evidence/prod-live/`. Test at 360 px and 412 px wide (1.5 also at 1280 px), Hindi and English.

1.1 These pages each return 200, render, show no ErrorBoundary text, have no uncaught console errors, and make no failed requests to our own backend or `/functions` endpoints: `/`, `/browse`, `/signup`, `/login`, `/post`, `/msp`, `/msp/wheat`, `/guide`, `/guide/post`, `/guide/register`, `/kisan-mela`, `/mausam`, `/yojana`.
- `/post` while logged out may show the login page. That is fine.

1.2 **Photos under the CSP.**
- `curl -sI https://kissansahyog.com/`: the `Content-Security-Policy` `img-src` contains `https://eltmcznjcqiahqhjvpjg.supabase.co`.
- Find a real public listing with a photo. Browse equipment etc. and pick a card whose image `src` is on `eltmcznjcqiahqhjvpjg.supabase.co/storage/`.
- Its photo actually loads on the card and on `/listing/<id>` (`naturalWidth > 0`, no CSP violation in the console).
- If no live listing has a photo, record NOT-RUN with the reason. Do not post one.

1.3 **Sign-up without email (no submit).** `/signup` shows name, mobile, village/town, the details choice and the notice tick. There is NO email and NO password field.
- Type a sample name and mobile, then clear them. Never press Register.

1.4 **Login line.** `/login` shows "📱 ईमेल नहीं है? मोबाइल नंबर से लॉगिन करें" (English text in English).
- Tapping it scrolls to and focuses the mobile box. Do not submit.

1.5 **Home.**
- The photo tiles are `<a href>` links to the same destinations as before. Pointer cursor; hover shows the ring/glow at 1280 px; focus-visible outline when tabbing.
- The 10D live hero and Morning Field band are present (`data-testid="home-live"`, `home-field`), and the Guide pill (`nav-guide`).
- The Kisan Mela teaser lists only MP first, then UP / Maharashtra / Chhattisgarh / Gujarat / Rajasthan melas, or the section is hidden when none qualify. Compare with the live `/kisan-mela` list to judge.

1.6 **/msp dates.** On `/msp/wheat` (and one thin crop, e.g. paddy):
- the 7 / 30 / 90 दिन tabs each show a date range;
- the chart shows its first/last dates;
- the trend sentence carries the range;
- after the backfill, the 90-day tab covers more days than the 30-day tab (record the ranges and the "N दिन का भाव उपलब्ध" notes);
- the market search finds Sagar and Tikamgarh;
- the source line "Agmarknet / data.gov.in" is present (attribution wording = HUMAN-REVIEW).

1.7 **Guide post demo.** `/guide/post` plays to the end in Watch mode.
- Step "कब उपलब्ध है": "आज" fills the start box, "जब तक चाहें" is highlighted.
- Step "फोटो जोड़ें": the drawn picture "उदाहरण फोटो" appears and the count goes 0/3 → 1/3.
- The finish card says "सीताराम 🙏" (not "शाबाश").
- `/guide/register` shows no email/password step.
- Try-it mode works for two steps.

1.8 **New code is really live.**
- The live main chunk equals the one in the ship log.
- A live JS chunk contains `app_register_phone`.
- The guide chunks contain `ksg-`.
- **No `localhost` or `127.0.0.1`** appears in the live HTML of `/`, `/msp`, `/guide`, `/kisan-mela`, `/yojana/central` and 5 more prerendered pages of your choice (including WhatsApp share links).

1.9 **SEO files.**
- `/sitemap.xml` is valid XML and lists the child sitemaps.
- `/sitemap-pages.xml` still lists the `/guide` URLs and `/msp` pages.
- `/robots.txt` is byte-identical to the robots.txt in `docs/review/batch10e/evidence/prod-before.json` (or the latest snapshot).

1.10 **Old behaviour.** One existing public `/listing/<id>` without a photo still loads with its details. An older listing without dates shows no date row and no error.

1.11 Look at the screenshots yourself (at least ten) for overlap, clipped Hindi and horizontal scroll.

1.12 Write `docs/review/batch10e/evidence/prod-live/RESULT.md` with each check's status (RAN-PASSED / RAN-FAILED / NOT-RUN) and what you saw.

**Decision rule.** If 1.1 shows a blank page, an ErrorBoundary or a 5xx on `/`, `/signup`, `/browse`, `/post` or `/msp`, do all of this:
1. Run `bash scripts/rollback-prod-10e.sh <PREV>`.
2. Re-check that `/`, `/browse` and `/signup` load.
3. Write the report and jump to the FINAL SUMMARY with status ROLLED-BACK.

The database steps stay in place after a rollback (both are additive and safe for the older site). Do NOT run the 0064 rollback SQL; that is the founder's call.

For anything smaller (a visual nit, one clipped line, a photo-less sample, a thin crop), do NOT roll back. Record it as HUMAN-REVIEW.

## PART 2 — RECORD WHAT IS LIVE
2.1 Create the tag `prod-10e` on the shipped commit (`git rev-parse` of the commit the ship script printed; it should equal `ship-10e`) and push it. If `prod-10e` already exists on a different commit, do not move it: use `prod-10e-2` and record why.

2.2 Write `docs/review/batch10e/CLOSE_REPORT.md` with:
- the shipped commit, the new deployment id (as a table row `| New production deployment | \`<id>\` |`, the format the next batch's ship script parses), the previous deployment id PREV, and the time;
- the check results and whether the backfill was seen live;
- the database steps: 0064 applied by the founder (proven by the ship script's probe line in the log), backfill pasted yes/no as seen in 0.4;
- the rollback command.

## PART 3 — BRING THE PROJECT NOTES UP TO DATE (documentation only; ADD sections, never rewrite existing text)
3.1 Read these fully first:
- `PROJECT_CONTEXT.md` and `KNOWN_ISSUES.md`;
- `docs/review/batch10e/` (REPORT, DECISIONS, SHIP, HINDI_CAPTIONS, BACKLOG);
- `git log` since `prod-10c`.

3.2 Append to `PROJECT_CONTEXT.md` a section "Batch 10E — fixes, phone-only sign-up, mandi history (state as of this ship)". Use ONLY verified facts, in short plain sentences:
- What is live (commit, deployment id, date). How it was shipped and how to undo it (`ship-prod-10e.sh`, `rollback-prod-10e.sh`). Whether 10D went out inside this ship.
- Phone-only sign-up: `app_register_phone` (migration 0064 + rollback file), `authService.registerPhone`, same session as mobile login, no email/password on the form, admins still email + password only. It is trust-based until OTP.
- Photos: the CSP `img-src` lists both Supabase storage hosts. The two build guards strip exactly those tokens from the CSP line.
- B17: prerender localhost fix, the `check-no-localhost-dist.mjs` gate in `build:full` and `build:prod`, the share-link origin fix.
- /msp history: source (data.gov.in resource `35985678-…`, Agmarknet, GODL), window loaded, the paged newest-first reads (PostgREST `max_rows` 1000), Sagar Division scope, the date-range labels, and the backfill script (`scripts/backfill-mandi-history.mjs`, dry run by default, staging-only `--apply`, `--project prod` writes SQL files only).
- Post form: `ExtraInfoField` (`details.extra_info`, 300 chars, phone numbers blocked), `DateBlock` (`available_from`/`available_to`) for equipment / land / labour / drone didi, IST "today", client-side checks only.
- Guide: post demo 16 steps (date + photo), the engine's `set` item, register demo phone-only.
- Homepage: tile links + hover, Mela teaser region filter (`homeRegionMelas`), 1024 px tile wrap.

3.3 Append to `KNOWN_ISSUES.md` in its existing style, only what you verified:
1. Hindi wording awaits founder review (`docs/review/batch10e/HINDI_CAPTIONS.md`).
2. GODL attribution wording on /msp is HUMAN-REVIEW.
3. Phone-only accounts have no password and no recovery until OTP.
4. Date rules are client-side only (server enforcement is BACKLOG).
5. There is no edit-listing flow.
6. The Profile "Save" asks for a pincode.
7. Any HUMAN-REVIEW item from Part 1, named one by one.
8. The backfill status if it was not seen live.

3.4 If a statement cannot be proven from a file, command output or code, leave it out.

## PART 4 — COMMIT AND PUSH
Stage ONLY these, by explicit path: `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, and the files you created under `docs/review/batch10e/` (`CLOSE_REPORT.md`, `CLOSE_DECISIONS.md`, `CLOSE_PROGRESS.md`, `evidence/prod-live/**`, `evidence/ship-real.log`, `evidence/prod-ship/**`). Skip anything over 5 MB. No `.env*`, keystores or APKs.

Commit message: `docs: record Batch 10E production ship and update project notes`.

Push `origin release-10e`. Do not merge into `main`. Confirm that `git log -1` and `git status` show nothing unintended.

## FINAL SUMMARY — print ONLY this (max 14 lines), plain language
- Status: SHIPPED-AND-VERIFIED / ROLLED-BACK / STOPPED (one-line reason).
- What is live now: deployment id, commit, `https://kissansahyog.com`; whether 10D went out with it.
- What farmers see now (3 short lines): sign-up with mobile only, dates + extra info on posts, photos visible, /msp dates and longer history.
- Mandi backfill: seen live yes/no (90-day vs 30-day ranges on wheat).
- Checks: how many passed; every HUMAN-REVIEW item by name.
- Tag `prod-10e`, notes updated, commit hash pushed.
- Undo: `bash scripts/rollback-prod-10e.sh <PREV>` (with the real id).
- Next for me: read `docs/review/batch10e/HINDI_CAPTIONS.md` and send corrections; confirm the GODL attribution wording; OTP sign-up still waits for the Jio template.
