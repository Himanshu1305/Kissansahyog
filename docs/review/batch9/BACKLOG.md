# Kisan Sahyog — consolidated backlog (Batch 9, Phase 7.2)

Written 2026-10-15 during the overnight run, from the review documents in `docs/review/` and tonight's
Phase 0 baseline. Every item cites where it comes from. **No SQL was written or applied for any item;
no Supabase project was touched.** Items being fixed tonight in Phase 1–2 are listed at the end so they are
not forgotten if the run stops early (check `docs/review/batch9/PROGRESS.md` for their real status).

**Owners:** **Me** = Himanshu (founder) · **Claude Code** · **Lawyer** · **Jio** (DLT portal) ·
**Supabase** = a database change that Claude Code writes as a migration file and **you apply** (staging first).

**Priority:**
- **P0** — fix before the Play Store release / before telling more farmers. Security or legal risk.
- **P1** — fix in the next 1–2 batches.
- **P2** — should be done; no real-user harm today.
- **P3** — housekeeping.

## Summary table

| # | Item | Owner | Priority |
|---|---|---|---|
| B1 | `admin_*` functions trust any caller who sends an admin's id | Supabase + Claude Code | **P0** |
| B2 | `weather_grid_requests`: anyone can write any row; old exact positions still stored | Supabase + Claude Code | **P0** (writes) / P1 (old rows) |
| B3 | Mobile sign-in has no secret (number only) until OTP exists | Me + Jio → Claude Code | **P0** (chain below) |
| B4 | Jio DLT header `KSAHYG` → OTP template → Fast2SMS chain-bind → wire OTP login | Me + Jio, then Claude Code | **P0** |
| B5 | D-U-N-S request `DR1013202634704819920` → Play Console **organisation** account | Me | **P0** for the store |
| L1 | Terms + Privacy lawyer review (list of open points) | Lawyer (Me to send) | **P0** before store |
| L2 | Privacy page gaps (email, login log, visibility choice, "draft" note, push later) | Claude Code after L1 | **P0** before store |
| B6 | Lockout edge cases (anyone can lock anyone for 15 min; per-number only) | Me decides → Supabase | P1 |
| B7 | No forgot-password; half-finished registration has no way out | Claude Code + Supabase | P1 |
| B8 | Profile → Edit still requires a pincode (e-mail accounts can't save) | Me decides → Claude Code | P1 |
| B9 | Exact location saved on listings | Me decides → Claude Code | P1 |
| B10 | `verify-batch5b-citations`: 0 of 17 Q&As have citation evidence | Claude Code | P1 |
| B11 | 11 other baseline test failures (stale tests, Windows path bugs, real wording leftovers) | Claude Code | P2 |
| B12 | Old e2e / DB-writing tests are out of date | Claude Code | P2 |
| B13 | KSTEST rows piling up on staging | Me (or Claude Code with your OK) | P2 |
| B14 | Admin dashboard not visible for 9849993171 (data/identity, not code) | Me | P2 |
| B15 | Large screenshots already committed (repo ≈ 192 MB packed) | Claude Code (policy) | P3 |
| B16 | Smaller tidy-ups (ESLint missing, "information platform" wording, founder page confirmations, 18 dead source links, dynamic imports) | mixed | P3 |
| P1–P6 | Tonight's Phase 1–2 items (keyboard, duplicate stamp, cold-storage catch, post-page location, sitemap SW) | Claude Code | tracked in PROGRESS.md |
| N1 | Push notifications (plan in `PUSH_PLAN.md`) | Me (Firebase) → Claude Code | P2 |

---------------------------------------------------------------------

## Security (the "Batch 7M" items)

### B1 — `admin_*` database functions can be used by anyone who knows an admin's id — **P0**

- **Evidence:** `docs/review/BATCH7L2_REPORT.md` "Could not decide" item 1 ("Every `admin_*` function
  trusts the `p_actor_id` it is sent. Anyone who knows an admin's profile id can call them without
  signing in at all"); "Passwords/Session" section ("every later call sends `p_actor_id = user.id`").
  Code: `supabase/migrations/0012_p3_admin.sql:36–48` (`require_admin(p_actor_id)` only checks that the
  id belongs to a row with `is_admin = true`) and `:259–270` (`grant execute … to anon, authenticated`
  on `require_admin`, `get_admin_stats`, `get_admin_users`, `remove_listing`, `admin_upsert_*`,
  `admin_delete_*`…). There are **41 `admin_*` functions** across the migrations plus
  `get_admin_*` / `remove_listing`; `0021_community_features.sql:374` repeats the same pattern.
  The app calls them like this: `src/lib/admin/adminApi.js:18`.
- **Concrete risk, in plain words:** the "who is calling" check is a value the caller types in. The
  database never checks that the caller really *is* that person. Profile ids are long random codes,
  but they are not secret: they travel in API answers (for example, a listing row carries its owner's
  id, `user_id`, and listings are publicly readable — `supabase/migrations/0002_rls.sql:47`), and
  they sit in the browser's storage of anyone who has logged in as that person. Someone who obtains an
  admin's id can, **with no login**, from any computer: download the user list with phone numbers
  (`get_admin_users`), delete any farmer's listing (`remove_listing`), publish, change or delete
  articles, schemes, MSP rows, melas, videos, expert phone numbers and site settings. 7L-2 closed the
  easy door (an admin can no longer sign in just by typing the admin's mobile number — proven on
  staging, `docs/review/batch7l2/STAGEB_OUTPUT.txt` lines 28–30), but not this one.
- **Proposed fix (plain words, no SQL tonight):**
  1. Admins already sign in by e-mail + password through Supabase Auth (`ADMIN_ACCESS_DIAGNOSIS.md` §3,
     `supabase/manual/admin_accounts.sql`). Change every admin function so it **ignores the id it is
     sent** and instead looks up the profile of the **signed-in Supabase Auth user** (the same way
     `app_login_email` already does with `auth.uid()`), and refuses unless that profile is an admin.
  2. Remove the "anyone (anon) may run this" permission from all admin functions; only signed-in
     (authenticated) users may call them, and the check in step 1 does the rest.
  3. The Admin page must then send its calls with the e-mail session (it already exists as
     `ks_sb_auth`, `BATCH7L2_REPORT.md`) instead of the stored profile id.
  4. Test on **staging** with a throw-away admin and a throw-away normal user: anon call refused,
     normal user refused, admin allowed; then production.
  - Also worth doing at the same time: the same "trusts the id it is sent" pattern exists for
    **normal user** functions (editing one's own listing/profile — `BATCH7L2_REPORT.md` "Session").
    Lower impact than admin, same fix. List them in that batch.
- **Owner:** Claude Code writes the migration + app change; **you apply** it (staging, then prod).
  **Priority P0** — this is the biggest open risk on the live site.

### B2 — `weather_grid_requests`: anonymous write policy, and old exact positions — **P0 / P1**

- **Evidence:** `supabase/migrations/0024_mausam_msp.sql:24–35` — the table is readable by everyone
  (`wgr_read … using (true)`) and **insertable and updatable by anyone** (`wgr_insert … with check
  (true)`, `wgr_update … using (true) with check (true)`). `docs/review/BATCH7L2_REPORT.md` item 5:
  "anon can still write any coordinate into `weather_grid_requests` directly; only a database rule
  would stop that", plus the one-time clean-up idea for old rows. `docs/legal/TERMS_DRAFT_FOR_LAWYER.md`
  lines 192–196: rows saved before 7L-2 "still hold exact positions" and are publicly readable;
  nothing rewrites them. `docs/review/batch8b/PREFLIGHT.md:66` classes it "PRIVATE / write".
- **Concrete risk:**
  1. **Privacy:** rows written before 13 Oct 2026 contain visitors' **exact** device positions and can
     be read by anyone with the public key. That contradicts the new Privacy text ("only the rounded
     position … is saved").
  2. **Abuse / cost:** anyone can insert thousands of fake cells or overwrite existing ones. The
     3-hourly refresh job fetches weather for every cell requested in the last 30 days
     (`docs/MAUSAM_MSP_PAGES_PROMPT.md:49`), so a flood of fake rows makes the GitHub job slow, can
     exhaust the Open-Meteo free quota and so break weather for real farmers. Rows can also be
     rewritten with wrong coordinates for a real cell key.
  3. `weather_cache_v2` has the same "publicly readable" history for exact positions (rewritten by the
     refresh job over time, per the lawyer note).
- **Proposed fix (plain words):**
  1. Stop direct writes from the browser/app: remove the insert/update permission for anon and
     signed-in users and replace it with **one small function** that accepts a cell, **rounds it
     itself** to the 0.1° cell centre (never trusts the caller's rounding), checks it is inside India
     (or the service area), and only refreshes `last_requested_at` if the cell already exists.
     Optionally cap how many new cells can be created per hour.
  2. Stop public **reading** of the table (only the refresh job needs it; it uses the service key).
  3. One-time clean-up: round every existing row's latitude/longitude to the cell centre (the
     statement idea is already in `BATCH7L2_REPORT.md` item 5, **not run**), and delete cells not
     requested in 30+ days. Same for `weather_cache_v2`.
  4. Update the app's `requestGridCell` call (`src/lib/weather/weatherApiV2.js`, see
     `BATCH7L2_REPORT.md:126`) to use the function. Test on staging (T7 in the Android suite writes
     this table — `docs/review/batch8a/REPORT.md` deviation 5 — so re-run it).
- **Owner:** Claude Code writes; **you apply**. **P0** for the write policy, **P1** for the clean-up
  (but do it before the Privacy text is shown to the lawyer as final).

### B3 — Mobile-number sign-in has no secret — **P0** (fixed by B4)

- **Evidence:** `docs/review/BATCH7L2_REPORT.md` function table: `app_login(p_phone)` "Returns the
  profile for a 10-digit number. No check of any kind"; the login screen says "OTP verification is
  coming soon" (`BATCH7L2_REPORT.md:89`). Admins are refused on this path since 0059 (proven,
  `STAGEB_OUTPUT.txt`).
- **Risk:** anyone who types a farmer's mobile number is logged in as that farmer and can edit or
  delete their listings and see their profile. The 5-failures throttle does not help when the number
  is right.
- **Fix:** OTP (B4). Until then, keep the admin refusal; consider hiding "edit/delete" for
  mobile-only sessions — needs your decision. **Owner:** Me (B4 chain), then Claude Code.

### B4 — SMS OTP chain: Jio DLT → template → Fast2SMS → OTP login — **P0**

- **Evidence:** this batch's brief (`BATCH9_OVERNIGHT_PROMPT.md` Phase 7.2); no repo document mentions
  DLT/Fast2SMS yet (searched). The code is ready to receive OTP: `startPhoneLogin()` /
  `verifyPhoneOtp()` in `src/lib/auth/authService.js` — "When OTP exists it returns `{ step: 'otp' }`
  and the screen already shows a code box" (`BATCH7L2_REPORT.md:91–93`). Terms clause 3 is already
  titled "Account, mobile, and OTP" (`docs/legal/TERMS_DRAFT_FOR_LAWYER.md:17`).
- **Steps, in order (each waits for the previous):**
  1. **Me + Jio:** get the sender **header `KSAHYG`** approved on the Jio DLT portal (pending).
  2. **Me + Jio:** register the **OTP content template** under that header (transactional/service-
     implicit; exact text with `{#var#}` for the code, Hindi and/or English). Claude Code can draft
     the template text on request.
  3. **Me:** in Fast2SMS, link (chain-bind) the DLT entity, header and template IDs; note the API key
     → store it **only** as a server secret (Cloudflare Pages / Supabase), never in the repo.
  4. **Claude Code + Supabase:** server-side OTP: a Pages Function or Edge Function that sends the
     code via Fast2SMS, a table of hashed codes with expiry (5 min) and attempt limits (reuse the
     `login_attempts` throttle), then `app_login` only after a verified code. Test on staging with a
     real phone of yours.
- **Owner:** Me + Jio (1–3), Claude Code + your migration apply (4).

### B5 — D-U-N-S → Play Console organisation account — **P0 for the store**

- **Evidence:** this batch's brief (`BATCH9_OVERNIGHT_PROMPT.md` Phase 7.2): D&B D-U-N-S request
  **`DR1013202634704819920`** pending.
- **Steps:** wait for the D-U-N-S number from D&B (follow up with the request id if it takes more than
  ~30 days) → create the Google Play Console **organisation** account with it (one-time fee; legal name
  and address must match D&B exactly) → verify the developer identity → then upload the AAB
  prepared in Phase 3/6. Organisation accounts are not subject to the new personal-account
  "closed test with 12+ testers for 14 days" rule.
- **Owner:** Me. Nothing for Claude Code until the account exists.

---------------------------------------------------------------------

## Legal

### L1 — Terms and Privacy lawyer review — **P0 before the store**

- **Evidence:** `docs/legal/TERMS_DRAFT_FOR_LAWYER.md` "Open points for lawyer" (lines 101–108:
  governing law and Sagar jurisdiction, limitation of liability, sand/gravel permission wording,
  land-listing/title wording, labour and wage wording, data retention) + the 7J note (new "courts at
  Sagar" sentence and "its owner, operator and service providers" wording — `BATCH7J_REPORT.md` §5
  item 4) + the 7L-1 "Your location" section (line 142) + the 7L-2 list (lines 175 onward: old exact
  positions, email not listed, pre-selected "Show my details" as consent under DPDP Rules 2025,
  `login_attempts` record).
- **Action:** send `docs/legal/TERMS_DRAFT_FOR_LAWYER.md` and the live `/terms` and `/privacy` pages to
  the lawyer. Add the Play Store Data-safety answers (Phase 6) and, later, push notifications
  (`PUSH_PLAN.md` §7).
- **Owner:** Me → Lawyer.

### L2 — Privacy page gaps — **P0 before the store**

- **Evidence:** `BATCH7J_REPORT.md` §5 item 2 (Privacy still says "this is an initial draft. Legal
  review is pending"); `TERMS_DRAFT_FOR_LAWYER.md` 7L-2 section (email not listed in "What we collect",
  visibility choice and `login_attempts` not mentioned).
- **Fix:** after L1, Claude Code updates `/privacy` (Hindi + English) and removes the draft note.
  Google Play requires a privacy policy URL that matches the Data-safety form.
- **Owner:** Lawyer → Claude Code.

---------------------------------------------------------------------

## Accounts and sign-in

### B6 — Lockout edge cases — **P1** (needs your decision)

- **Evidence:** `BATCH7L2_REPORT.md` item 7: "Anyone can lock anyone's sign-in for 15 minutes by
  failing five times with that mobile number or email … For mobile it also means the throttle does
  little against someone trying many different numbers; a per-device or per-IP limit would, but it
  means storing IP addresses." Proven behaviour: `docs/review/batch7l2/STAGEB_OUTPUT.txt` lines 31–36
  (attempt 6 locked; while locked even the correct password is refused). Also listed as a 1E
  "needs founder decision" item in tonight's brief.
- **Options:** (a) keep as is (simple, a nuisance attack only locks 15 min); (b) add a per-IP limit in
  the Pages Function layer, keeping IPs only 24 h (Privacy text needed); (c) once OTP exists (B4),
  lock only the *OTP sending* per number and per IP, and let a correct OTP always succeed.
- **Recommendation:** (c) together with B4; until then (a).
- **Owner:** Me decides → Supabase/Claude Code.

### B7 — No forgot-password; half-finished registration — **P1**

- **Evidence:** `BATCH7L2_REPORT.md:56` ("Forgot password. There is none") and item 8 (email accepted
  but mobile taken → the e-mail exists in Supabase Auth; retry with another password says "email
  already used"; "There is still no forgot-password flow to get out of that").
- **Fix:** Supabase Auth's password-reset e-mail + a reset page in the app/site; and make the
  registration either finish or roll back the Auth user when the mobile number is taken.
- **Owner:** Claude Code (+ a migration you apply if needed). Needs Supabase e-mail templates set up
  (Me, Supabase dashboard, staging first).

### B8 — Profile → Edit requires a pincode — **P1** (needs your decision)

- **Evidence:** `BATCH7L2_REPORT.md` item 4 ("a new user who opens Profile → Edit must enter a pincode
  to save, because that older form still requires one"); confirmed in the app by 8B S8
  (`docs/review/batch8b/REPORT.md` §9, "Profile shows the e-mail … saving still needs a 6-digit
  pincode"). Listed as 1E tonight.
- **Recommendation:** replace the pincode box on Profile → Edit with the same town picker as
  registration (`src/components/location/PlaceField.jsx`), pincode optional. Also show the mobile on
  Profile for e-mail accounts.
- **Owner:** Me decides → Claude Code.

### B9 — Exact location saved on listings — **P1** (needs your decision)

- **Evidence:** tonight's brief Phase 1E; 7L-1/7L-2 rounded weather positions but did not change
  listings (`BATCH7L2_REPORT.md` table at line 126 covers weather only); 8B notes the Post page
  asks the device for a position (`docs/review/batch8b/REPORT.md` §9).
- **Options:** keep exact (best "near me" search, but shows where a farmer's field/house is); round to
  ~1 km; or store only the village/town centre. **Recommendation:** round to ~1 km or village centre;
  the Privacy page must say which. Lawyer item.
- **Owner:** Me decides → Claude Code.

### B14 — Admin dashboard not visible for 9849993171 — **P2**

- **Evidence:** `docs/review/ADMIN_ACCESS_DIAGNOSIS.md` — no code defect; the session's profile row
  has `is_admin = false` (likely the flag is on a different row/project: staging vs production, or the
  e-mail row vs the phone row). Note: since 0059, **admins can no longer sign in by mobile at all**
  (`BATCH7L2_REPORT.md` Part 3), so the admin must use the **e-mail** login.
- **Action:** follow "Confirm in two minutes" in that file (it contains a read-only query to run in the
  production dashboard yourself). Optional polish: label the ⚙️ button, refresh the profile on app load.
- **Owner:** Me.

---------------------------------------------------------------------

## Tests and quality

### B10 — `verify-batch5b-citations`: 0 / 17 pass — **P1**

- **Evidence:** `docs/review/batch9/evidence/baseline/summary.tsv` (`verify-batch5b-citations 1 0 17`);
  `docs/review/batch9/PREFLIGHT.md` §0.3 ("no evidence for block:N" on all 17 Q&As); the on-disk log
  `docs/review/batch9/evidence/baseline/logs/verify-batch5b-citations.log` ends "TARGET 25 Q&As: NOT
  MET (17)", "TARGET 6 publishers: NOT MET (5)", "0 passed, 17 failed".
- **Risk:** every block of every Sawaal answer lacks a recorded source. Either the evidence store the
  verifier reads moved/was emptied, or the answers really have no sources — farmers are shown
  official-looking facts (KCC, NABARD, e-NAM, Soil Health Card) without a checkable citation.
- **Fix:** Claude Code first finds out which (read the script and its evidence source); if it is the
  data, re-attach citations; if it is the test, fix the test. Also: 17 of the target 25 Q&As, 5 of 6
  publishers.
- **Owner:** Claude Code (+ Me for any fact that needs a human source check).

### B11 — The other 11 pre-existing baseline failures — **P2**

From `docs/review/batch9/PREFLIGHT.md` §0.3 / `evidence/baseline/summary.tsv`. None are new; each is
either a stale test or a real small leftover:

| Test | Failure | Kind | Fix |
|---|---|---|---|
| `test/batch3_style` | avoid-list word in Hindi content | real wording | find and replace the word |
| `test/batch4_ui_style` | `loc_card_text` 30 words; removed keys `tab_phone`/`tab_email` | stale test + long string | shorten string; update the key list (removed on purpose in 7L-2) |
| `test/batch4_voice` | `ERR_MODULE_NOT_FOUND …src\lib\apiBase` | test can't load 8A import without `.js` | add `.js` to the import or run via Vite |
| `test/v11_phase6` | disclaimer lacks hi+en; removed keys; Devanagari check Windows path bug | stale + Windows bug | fix the path handling; real offenders `PromoBento.jsx`, `termsContent.js`, `places.js`, `melaFormat.js` |
| `test/v2_brand` | single-s "Kisan Sahyog" in `src/lib/i18n/disclaimers.js` | real wording (or brand decision — the app name is "Kisan Sahyog") | **Me:** which spelling is the brand? Then make it consistent |
| `test/v2_citation_audit` | `ERR_UNSUPPORTED_ESM_URL_SCHEME` | Windows path | use `pathToFileURL` |
| `verify-batch7a` | header not sticky / one bar | stale after 8B header move | update assertions |
| `verify-batch7b` | feedback posts only to `/api/feedback` | stale after 8A `apiUrl()` | update assertions |
| `verify-batch7d` | built `mausam/index.html` contains "pilot"/"पायलट" | real leftover (7J removed "pilot" elsewhere) | find the source and reword, or whitelist if it is a cited fact |
| `verify-batch7l1` | `functions/_middleware.js` is a new Pages Function | stale after 8A CORS | allow the middleware |
| `npm run lint` | ESLint not installed | tooling | add ESLint + config in a tooling batch |

Owner: Claude Code. The `v2_brand` spelling needs **Me**.

### B12 — Old DB-writing tests out of date — **P2**

- **Evidence:** `BATCH7L2_REPORT.md` item 9; `docs/review/batch9/PREFLIGHT.md` §0.3 "Scripts NOT-RUN"
  (22 Playwright `e2e/` specs + 45 `scripts/test/*` that import `e2e/support.js`); DECISIONS.md 4.
- **Fix:** rewrite them for the one-form registration/login, make every created row a KSTEST row with
  automatic cleanup, run only against staging. Retire the ones the Android harness now covers.
- **Owner:** Claude Code.

### B13 — KSTEST rows piling up on staging — **P2**

- **Evidence:** `docs/review/batch8b/staging-test-data.json` (profiles, listings, photos created by 8B);
  `docs/review/batch8b/REPORT.md` §8 ("Someone with database access: clean up the KSTEST rows") and §9
  ("every rerun … adds 2 accounts, 1 listing, 1 reveal …"). Tonight's Phase 5B adds named personas
  (keep those) and throw-away KSTEST accounts.
- **Fix:** a reviewed clean-up list per batch (ids are recorded), deleted by you in the staging
  dashboard, or a staging-only clean-up script that refuses to run against the production ref.
- **Owner:** Me (or Claude Code with your explicit OK). Staging only.

---------------------------------------------------------------------

## Repository

### B15 — Large screenshots already committed — **P3** (repo-size note)

- **Evidence (measured tonight, read-only):** 784 image files tracked under `docs/` totalling
  ≈ **79 MB** on disk (≈ 87 MB for all tracked images); `git count-objects -vH` → packed size
  **≈ 192 MB**. Largest: `docs/review/shots-batch2/cold-storage-search-d.png` 6.0 MB,
  `docs/review/shots-batch3/cold-storage-d.png` 6.0 MB, `docs/review/batch7d/home-360-en.png` 6.0 MB,
  `docs/review/batch7d/home-360-hi.png` 5.9 MB, `docs/review/shots-v2/cold-storage-d.png` 5.5 MB,
  three `home-d.png` at 2.8 MB each. Phase 0 committed 45 more (largest 0.37 MB,
  `docs/review/batch9/PREFLIGHT.md` §0.4).
- **Risk:** slow clones and pushes; GitHub warns above 50 MB per file and recommends repos under
  1–5 GB — not urgent, but it grows every batch.
- **Proposed fix:** **do not rewrite history** (Hard rule 3; it would break every clone and tag).
  From now on: full-page shots as JPEG quality ~80 or WebP, max 1440 px wide, viewport-only where
  possible; long logs and raw evidence stay on disk (as tonight's DECISIONS.md 8 already does).
  Optionally Git LFS for `docs/review/**/*.png` for future files only.
- **Owner:** Claude Code (policy in future batches). A history clean-up would be a separate, explicit
  decision by **Me**.

### B16 — Small tidy-ups — **P3**

- "Information platform" wording left in How-to-use, grievance FAQ and the home meta description no
  longer matches the new "farm marketplace" description — `BATCH7J_REPORT.md` §5 item 6. Claude Code.
- Founder page sentences still to confirm (Guinness wording, sabai grass, Bijawar awards, spelling) —
  `docs/review/FOUNDER_CONFIRM_LIST.md`. **Me** (Shri Abhinandan Dixit to confirm).
- 18 dead external source links reported by `test/v2_link_check` (informational) —
  `docs/review/batch9/PREFLIGHT.md` §0.3. Claude Code to replace with live official URLs.
- `@capacitor/network` loaded by dynamic import in three places; centralise — `docs/review/batch8b/REPORT.md` §9. Claude Code.
- Main JS chunk grew +4.9 KB in 8B (94.5 KB) — watch the bundle budget (`test/phase8`) —
  `docs/review/batch8b/REPORT.md` §9 item 13. Claude Code.
- `npm install` audit warnings from `@capacitor/assets`' dependency tree (dev only, unused) —
  `docs/review/batch8a/REPORT.md` §7; consider removing that dev dependency. Claude Code.
- Admin "today's post" builder reads weather for a fixed point (Khurai) — `BATCH7L1_REPORT.md`
  "Other things to know". Low priority.

---------------------------------------------------------------------

## Needs a real phone (from 8A/8B, still open until Phase 8's checklist is done)

- Camera/gallery photo in Post, contact reveal, profile edit on a real phone (`batch8b/REPORT.md` §8,
  `batch8a/REPORT.md` §6).
- Edge-to-edge layout on a current WebView ≥ 140 (emulator has 133) and real cold-start time
  (`batch8a/REPORT.md` §6).
- Keyboard behaviour with the vendor keyboard (8B T14 flake, `batch8b/REPORT.md` §9) — Phase 1A tonight.
- Hindi offline wording judged by a person (`batch8b/REPORT.md` §8).
- Owner: **Me** (with `PHONE_TEST_CHECKLIST.md` from Phase 8).

## Tonight's items (Phase 1–4), for completeness

Fixed or attempted in this run — see `docs/review/batch9/PROGRESS.md` and `REPORT.md` for the real
status before relying on them:

| # | Item | Source |
|---|---|---|
| P1 | Keyboard hiding form fields (8B T14 flake; new K1 test) | `batch8b/REPORT.md` §9 |
| P2 | Duplicate "last updated" stamp on offline Home | brief 1B |
| P3 | `/cold-storage` load has no `catch` → empty list, no message | `batch8b/REPORT.md` §9 |
| P4 | Post page low-accuracy 10 s location request | `batch8b/REPORT.md` §9 |
| P5 | `sitemap.xml` shows the app 404 for visitors with the service worker | brief Phase 2 |
| P6 | Deploy `functions/_middleware.js` + `public/_routes.json` to staging (prod prepared, not run) — until then feedback/village lookup/voice don't work in the app | `batch8b/REPORT.md` §7 |

## Planned feature

- **N1 — Push notifications:** design and your hand-steps in `docs/review/batch9/PUSH_PLAN.md`
  (two Firebase projects, `google-services.json` locations, FCM service-account secret). **P2**;
  depends on B1 being fixed if any admin-triggered send is wanted.
