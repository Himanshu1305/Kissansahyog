# BATCH 12A — CLOSE: VERIFY LIVE, TAG, UPDATE NOTES (one run, unattended)

You are Claude Code, the builder. I am Himanshu, the non-technical founder. Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows).

**I have just run the production ship of Batch 12A myself** (`bash scripts/ship-prod-12a.sh`, log: `docs/review/batch12a/evidence/ship-real.log`), following `docs/review/batch12a/SHIP.md`. There is no database step in this batch. Your job: check that production is healthy, record it, update the notes. Use the model I selected, be economical.

I may be away. Do not ask questions. Pick the SAFEST option, write it to `docs/review/batch12a/CLOSE_DECISIONS.md`, carry on. Keep a log in `docs/review/batch12a/CLOSE_PROGRESS.md`; if it exists, resume from the first unfinished part.

**What was shipped:** branch `release-12a`, ship tag `ship-12a`: release-11a plus the "join our WhatsApp channel" card/link (`https://whatsapp.com/channel/0029VbDtjiJBqbr1a2Nv1F3I`) on the home page, /msp, /mausam, About, Contact, Guide hub, the Profile page, the post-listing success state and as a footer link. Previous production deployment (PREV): the "rollback target" in the ship log / `docs/review/batch12a/evidence/prod-ship/prod-deployment-before.txt` (expected `11f140ef-859d-419a-85ee-7f1309bb0256`).

## HARD RULES
1. Never write to the PRODUCTION database and never change a switch. No SQL at all. No sign-ups, logins, OTP sends, posts or feedback on production. Do NOT press "कोड भेजें". Allowed: page loads, asset fetches, `GET /api/otp/config`, and `POST /api/otp/send` with the invalid number `123` only.
2. Do NOT run the ship script again; never redeploy. The only production action allowed is the rollback in Part 1's decision rule.
3. No secrets in output, logs, reports or commits.
4. Git: no `git add -A`; stage by explicit path. No force push. No merge into `main`. Never move or delete tags (`pre-12a-ship`, `ship-12a`).
5. Honest statuses only: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW. Max 2 fix attempts per problem; this run should need NO code change: if one is needed, stop and report.

## PART 0 — PREFLIGHT
Read `docs/review/batch12a/evidence/ship-real.log` to the end: SHIP OK or rolled back? Find the shipped commit, new deployment id, PREV, the `[12a_switches]` and `[12a_whatsapp]` lines. Confirm independently (read-only) which deployment is live (`npx wrangler pages deployment list --project-name kissansahyog-prod`) and that `https://kissansahyog.com/` serves the main chunk named in the log. If the log shows a rollback or live is still PREV: write `CLOSE_REPORT.md` with the failing gate and jump to the final summary with status ROLLED-BACK. If live is neither PREV nor the new deployment: STOP and report.

## PART 1 — LIVE VERIFICATION (read-only, Playwright + fetches; evidence under `docs/review/batch12a/evidence/prod-live/`)
1.1 These pages return 200, render, no ErrorBoundary text, no uncaught console errors, no failed requests to our backend, at 320/360/412 px in Hindi and English: `/`, `/browse`, `/signup`, `/login`, `/post`, `/my`, `/admin` (logged out is fine), `/msp`, `/msp/wheat`, `/mausam`, `/guide`, `/guide/post`, `/kisan-mela`, `/yojana`, `/about`, `/contact`, one public `/listing/<id>`.
1.2 The channel link: present with the exact URL, `rel="noopener noreferrer"` and `target="_blank"` in the footer of `/`, `/about`, `/msp`; exactly one card on `/`, `/msp/gehun`, `/mausam`, `/about`, `/contact`, `/guide`; no card and no footer link on `/login`, `/signup`, `/admin`. Do not click through to whatsapp.com.
1.3 Home at 360x640: the two big buttons are where production had them before the ship (about y 615-638 and 691-714) and the card is below them. No horizontal scroll at 320 px in Hindi and English.
1.4 Switches: `GET /api/otp/config` must be exactly what it was before the ship (expected `otp_required=true`, `session_enforced=false`); `POST /api/otp/send` `{"phone":"123","purpose":"login"}` with `Origin: https://kissansahyog.com` answers 400 `invalid_phone`. `/login` shows the mobile box above the e-mail box and the button "कोड भेजें" (do not press it).
1.5 Earlier batches still live: markers `app_login_otp`, `delete_my_listing`, `ks-date-badge`, `app_register_phone`, `ksg-`; no `localhost` / `127.0.0.1` in the live HTML of 10 prerendered pages; `/robots.txt` byte-identical to the one in `docs/review/batch12a/evidence/prod-before.json`; `/sitemap.xml` valid with its child sitemaps.
1.6 Look at least eight screenshots yourself (home, /msp, /about, footer, login; Hindi and English).
1.7 Android: NOT-RUN here; the founder tests the link on the phone with a new APK (HUMAN-REVIEW). Hindi wording: HUMAN-REVIEW (`HINDI_CAPTIONS.md`).
1.8 Write `evidence/prod-live/RESULT.md` with each check's status.
**Decision rule.** If 1.1 shows a blank page, an ErrorBoundary or a 5xx on `/`, `/signup`, `/login`, `/browse`, `/post`, `/my` or `/msp`: run `bash scripts/rollback-prod-12a.sh <PREV>`, re-check `/`, `/browse`, `/signup`, write the report, status ROLLED-BACK. Anything smaller: do NOT roll back; record HUMAN-REVIEW.

## PART 2 — RECORD
2.1 Create tag `prod-12a` on the shipped commit (should equal `ship-12a`) and push it. If it exists elsewhere, do not move it: use `prod-12a-2` and say why.
2.2 Write `docs/review/batch12a/CLOSE_REPORT.md`: shipped commit, a table row `| New production deployment | <id in backticks> |` (the format the next ship script parses), PREV, time, check results, switches at close, undo order (`bash scripts/rollback-prod-12a.sh <PREV>`; no database step).

## PART 3 — NOTES (add sections only)
3.1 Append to `PROJECT_CONTEXT.md` "Batch 12A — WhatsApp channel card (state as of this ship)": what is live (commit, deployment id, date), `src/lib/social.js`, `WhatsAppChannelCard` variants and where each is placed, the footer rule (hidden on login/signup/admin/offline), the Organization `sameAs`, that no migration or switch changed, how it was shipped and undone.
3.2 Append to `KNOWN_ISSUES.md`: Hindi wording awaits review; Android link not tested on a device; the old gated `WhatsAppJoin` / `/join` mechanism would double the cards if an admin ever sets `whatsapp_channel_url`; the second big home button is below the 640 px fold (as before); any HUMAN-REVIEW item from Part 1.

## PART 4 — COMMIT AND PUSH
Stage ONLY by explicit path: `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, and the files you created under `docs/review/batch12a/` (`CLOSE_*`, `evidence/prod-live/**`, `evidence/ship-real.log` (force-add: `*.log` is ignored), `evidence/prod-ship/**`). Skip anything over 5 MB; no `.env*`, `.dev.vars`, keystores, APKs. Commit message: `docs: record Batch 12A production ship and update project notes`. Push `origin release-12a`. Do not merge into `main`.

## FINAL SUMMARY — print ONLY this (max 14 lines)
Status (SHIPPED-AND-VERIFIED / ROLLED-BACK / STOPPED); deployment id, commit, URL; switches now; checks passed and every HUMAN-REVIEW item; tag `prod-12a`, notes updated, commit hash; undo command with the real id; next for me (read `HINDI_CAPTIONS.md`; test the channel link in the Android app with a new APK).
