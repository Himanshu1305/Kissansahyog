# BATCH 10G — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 10G myself** (`bash scripts/ship-prod-10g.sh`, log: `docs/review/batch10g/evidence/ship-real.log`), following `docs/review/batch10g/SHIP.md`:
- migration 0065 (and 0064 if 10E was not live) pasted into the production SQL editor before the ship;
- if not pasted before: the 10E mandi backfill parts pasted after `SHIP OK`.

Your job: check that production is healthy, record it, update the notes.

I may be away. Do not ask questions. Pick the SAFEST option, write it to `docs/review/batch10g/CLOSE_DECISIONS.md`, and carry on. Keep a log in `docs/review/batch10g/CLOSE_PROGRESS.md`; if it exists, resume from the first unfinished part.

**What was shipped:** branch `release-10g`, ship tag `ship-10g`. It contains 10C + 10D + 10E + 10F + 10G. If 10D, 10E or 10F had not shipped on their own, they went out with this ship.

10G changes:
- sellers can **disable / enable** their own listings (hidden from everyone else, still shown to them, greyed) and **delete them permanently** (row, child rows and photo files removed; a confirmation box first) from My Listings and from their own listing page;
- admins can **disable** (reason required; the seller sees it and cannot enable it), **enable** and **delete permanently** (reason + typing DELETE) any listing from the admin listings panel, the complaints list and the listing page; every admin action is logged (`listing_admin_actions`: admin, listing id, action, category, reason, time — no listing content);
- photo files of deleted listings are removed through the Storage API under a storage rule that only allows paths queued by a delete (migration 0065).

**Previous production deployment:** printed by the ship as the "rollback target" and saved in `docs/review/batch10g/evidence/prod-ship/prod-deployment-before.txt`. Call it PREV below and always use the value from the log/file.

## HARD RULES
1. Never write to the PRODUCTION database (`eltmcznjcqiahqhjvpjg`).
   - No SQL that writes. No sign-ups, logins, posts, disables, deletes or feedback on production. **Do NOT press "अक्षम करें", "चालू करें", "हटाएं" or "हमेशा के लिए हटाएं" on production** — not even on a test listing.
   - Read-only only: page loads, opening and cancelling dialogs ("नहीं"), fetching assets, read-only SELECTs are NOT allowed either (no database access at all).
   - Do not call any RPC that could write. The ship script's probes already proved 0064 and 0065 are there; do not repeat them.
2. Do NOT run the ship script again. Never ship, never redeploy. The only production action you may take is the rollback in Part 1's decision rule.
3. No secrets in output, logs, reports or commits.
4. Git: no `git add -A`; stage by explicit path. No force push. No merge into `main`. Never delete or move branches or tags (`pre-10g-ship` and `ship-10g` stay where they are).
5. Honest statuses only: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts per problem. This run should need NO code change: if one is needed, stop and report.

## PART 0 — PREFLIGHT
0.1 Read `docs/review/batch10g/evidence/ship-real.log` to the end: SHIP OK or rolled back? Find the shipped commit, the new deployment id, PREV, the new main chunk, the D/D2 probe lines (0064 and 0065 present), and whether step 3b needed a prerender re-run.

0.2 Confirm independently, read-only: which deployment is live (`npx wrangler pages deployment list --project-name kissansahyog-prod`, or the Cloudflare API read the ship script uses), and that `https://kissansahyog.com/` serves the main chunk named in the log.

0.3 Stop cases:
- If the log shows a rollback, or live is still PREV: write `docs/review/batch10g/CLOSE_REPORT.md` with the failing gate and a read-only diagnosis, and jump to the FINAL SUMMARY with status ROLLED-BACK.
- If live is neither PREV nor the new deployment: STOP and report (someone else changed production).

0.4 Is the 10E mandi backfill live? Read-only from `/msp/wheat`: does the 90 दिन tab reach back about 90 days and cover more days than the 30 दिन tab? If not, note HUMAN-REVIEW ("backfill not pasted yet").

## PART 1 — LIVE VERIFICATION (READ-ONLY, https://kissansahyog.com, real browser via Playwright plus plain fetches)
Evidence under `docs/review/batch10g/evidence/prod-live/`. Test at 360 and 412 px (1.2 also at 1280 px), Hindi and English.

1.1 These pages each return 200, render, show no ErrorBoundary text, have no uncaught console errors and make no failed requests to our own backend or `/functions`: `/`, `/browse`, `/signup`, `/login`, `/post`, `/my` (logged out: the login page is fine), `/admin` (logged out: login / access denied is fine), `/msp`, `/msp/wheat`, `/mausam`, `/guide`, `/guide/post`, `/kisan-mela`, `/yojana`, and one public `/listing/<id>` of an active listing.

1.2 **New code is really live.** Live main chunk = the one in the log; a live JS chunk contains `delete_my_listing` and one contains `admin_delete_listing`; one contains `ks-date-badge` (10F); one contains `app_register_phone` (10E); guide chunks contain `ksg-`; no `localhost` / `127.0.0.1` in the live HTML of `/`, `/msp`, `/guide`, `/kisan-mela` and 5 more prerendered pages.

1.3 **Logged-out public view.** A public `/listing/<id>` shows NO seller or admin buttons ("अक्षम करें", "हटाएं", "हमेशा के लिए हटाएं" absent). A made-up `/listing/<random uuid>` shows "यह लिस्टिंग नहीं मिली।" with no error.

1.4 **Earlier batches still live (regression):** 10F static homepage hero (no persona tabs / phone / field band; the demo button opens `/guide`), the `/msp` last-price badge and chart dates, collapsible sections; 10E phone-only sign-up form (no email/password field; do not submit), the login line, listing photos load under the CSP; 10C `/guide` hub with four cards.

1.5 **SEO files.** `/sitemap.xml` valid and lists the child sitemaps; `/robots.txt` byte-identical to the one in `docs/review/batch10g/evidence/prod-before.json`.

1.6 Look at the screenshots yourself (at least ten) for overlap, clipped Hindi and horizontal scroll.

1.7 The seller / admin flows themselves are NOT tested on production (they write). Record them as NOT-RUN on production by rule; staging evidence: `docs/review/batch10g/evidence/phase5/`.

1.8 Write `docs/review/batch10g/evidence/prod-live/RESULT.md` with each check's status and what you saw.

**Decision rule.** If 1.1 shows a blank page, an ErrorBoundary or a 5xx on `/`, `/signup`, `/browse`, `/post`, `/my` or `/msp`:
1. Run `bash scripts/rollback-prod-10g.sh <PREV>`.
2. Re-check that `/`, `/browse` and `/signup` load.
3. Write the report and jump to the FINAL SUMMARY with status ROLLED-BACK.
Database steps (0064, 0065, backfill) stay in place after a rollback; do NOT run any rollback SQL. For anything smaller, do NOT roll back: record it as HUMAN-REVIEW.

## PART 2 — RECORD WHAT IS LIVE
2.1 Create the tag `prod-10g` on the shipped commit (it should equal `ship-10g`) and push it. If `prod-10g` exists on a different commit, do not move it: use `prod-10g-2` and record why. Do NOT create `prod-10e` / `prod-10f` for batches that only went out inside this ship; write that in the report.

2.2 Write `docs/review/batch10g/CLOSE_REPORT.md` with: the shipped commit, the new deployment id as a table row `| New production deployment | \`<id>\` |` (the format the next ship script parses), PREV, the time; the check results; database steps (0064 and 0065 proven by the ship log's probe lines; backfill seen live yes/no); the rollback command.

## PART 3 — PROJECT NOTES (documentation only; ADD sections, never rewrite existing text)
3.1 Read `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, `docs/review/batch10g/` (REPORT, DECISIONS, SHIP, HINDI_CAPTIONS, BACKLOG, evidence/db-tests.md, evidence/photo-proof.md) and `git log` since the last `prod-*` tag.

3.2 Append to `PROJECT_CONTEXT.md` a section "Batch 10G — seller and admin disable / permanent delete of listings (state as of this ship)" with ONLY verified facts: what is live (commit, deployment id, date), how it was shipped and how to undo it (`ship-prod-10g.sh` incl. the 0065 probes, `rollback-prod-10g.sh`, `PROD_ROLLBACK_0065.sql` and its warning), whether 10D/10E/10F went out inside this ship; status `disabled` + `admin_disabled_at/_reason`; the four RPCs and their error codes; `listing_admin_actions`; the photo queue (`listing_photo_deletions`, `listing_photo_deletable`, storage policy `listing_photos_queued_delete`, retry on load); `OwnerListingActions` / `AdminListingActions`.

3.3 Append to `KNOWN_ISSUES.md` (existing style), only what you verified: Hindi wording awaits review (`docs/review/batch10g/HINDI_CAPTIONS.md`); a deleted photo viewed shortly before can stay at the CDN edge up to 1 hour; a deleted listing stays in the prerendered homepage / `/jugaad` cards until the next deploy; admin cannot open a hidden listing's detail page (use the admin panel); the old soft "हटाएं" next to "हमेशा के लिए हटाएं" in admin; the `p_actor_id` trust model; any HUMAN-REVIEW item from Part 1.

## PART 4 — COMMIT AND PUSH
Stage ONLY, by explicit path: `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, and the files you created under `docs/review/batch10g/` (`CLOSE_REPORT.md`, `CLOSE_DECISIONS.md`, `CLOSE_PROGRESS.md`, `evidence/prod-live/**`, `evidence/ship-real.log`, `evidence/prod-ship/**`). Skip anything over 5 MB. No `.env*`, keystores or APKs.
Commit message: `docs: record Batch 10G production ship and update project notes`. Push `origin release-10g`. Do not merge into `main`. Confirm `git log -1` and `git status` show nothing unintended.

## FINAL SUMMARY — print ONLY this (max 14 lines), plain language
- Status: SHIPPED-AND-VERIFIED / ROLLED-BACK / STOPPED (one-line reason).
- What is live now: deployment id, commit, `https://kissansahyog.com`; whether 10D / 10E / 10F went out with it.
- What sellers and admins can do now (2 short lines).
- Mandi backfill: seen live yes/no.
- Checks: how many passed; every HUMAN-REVIEW item by name.
- Tag `prod-10g`, notes updated, commit hash pushed.
- Undo: `bash scripts/rollback-prod-10g.sh <PREV>` (with the real id).
- Next for me: read `docs/review/batch10g/HINDI_CAPTIONS.md` and send corrections; try delete / disable once on production with a test listing of your own.
