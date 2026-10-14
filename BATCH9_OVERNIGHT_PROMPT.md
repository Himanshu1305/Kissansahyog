# BATCH 9 — OVERNIGHT RUN (unattended): finish the Kisan Sahyog Android app end to end

You are Claude Code, the builder. I am Himanshu (non-technical founder). I will be ASLEEP. Nobody will answer questions tonight. When a decision is needed, choose the SAFEST option, write it to `docs/review/batch9/DECISIONS.md` (what, why, what the alternative was), and carry on. Never stop to ask.

Repo: `C:\Users\usdvi\projects\Kissansahyog` (Git Bash on Windows). Branch to work on: `android-app` (already pushed, 8B accepted). Emulator `ks_test_api36` is already set up (see `scripts/android/*`, `docs/review/batch8a`, `docs/review/batch8b`).

GOAL FOR TOMORROW MORNING: I can open an emulator, and then my real phone, and test a COMPLETE app — staging flavour with working feedback form, village lookup, offline mode, keyboard-safe forms — plus a ready Play Store pack. Everything below that CAN be done without me MUST be done tonight. Things that truly need me (passwords, accounts, real phone) are prepared so each takes me minutes.

---------------------------------------------------------------------
## 0. HARD RULES (override everything else)

1. **Never touch the PRODUCTION Supabase project** (ref `eltmcznjcqiahqhjvpjg`) in any way: no SQL, no writes, no test sign-ups. Prod is read-only through the website/app's normal public reads. Staging ref is `wzxtqbqlahyahsnoqqva`.
2. **No database migrations of any kind are applied tonight** (staging or prod). You may WRITE migration files only if a phase says so, and leave them unapplied.
3. **Never delete data or files that are not yours.** Never `git push --force`, never rewrite history, never `rm -rf` outside `android/ks-apks`, `dist`, build folders and your own scratch.
4. **Never run `~/ship-prod.sh` or any script that uses `git add -A` blindly.** The working tree has leftover files (16 modified 7L-1 screenshots, untracked `docs/review/ADMIN_ACCESS_DIAGNOSIS.md` and `BATCH7J_REPORT.md`, large screenshots). Stage files by explicit path only. Before every commit run `git status --short` and confirm nothing unintended (no `.dev.vars`, `.env*`, keystores, `*.apk`, `*.aab`, screenshots from tonight) is staged.
5. **No secrets in git, in chat output, in logs or in reports.** Never print a password or key in the terminal output, `PROGRESS.md`, `REPORT.md` or any committed file. Exactly TWO sanctioned places hold secrets, both OUTSIDE the repo and never committed: (a) `C:\Users\usdvi\ks-release-keys\` (release keystore + its random passwords, Phase 3) and (b) `C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md` (STAGING-only test persona logins, Phase 5B — fake data, shared test password allowed). `keystore.properties`, `*.jks`, `*.keystore` and `android/test-accounts*` are gitignored (verify with `git check-ignore`).
6. **Production is NOT deployed tonight, by decision.** Staging site only. Prod deployment is prepared as a gated, rollback-protected script that I run in the morning (Phase 4.5).
7. Honest statuses only: RAN-PASSED / RAN-FAILED / NOT-RUN / HUMAN-REVIEW, exactly as in 8B. Never write PASSED for something you did not run. A flaky test is RAN-FAILED until it passes twice in a row with the cause understood.
8. Max **3 fix attempts** per problem. After that: record RAN-FAILED with evidence and move on to the next phase. One stuck item must never block the rest.
9. New Hindi strings go ONLY in the sanctioned i18n location (`src/lib/i18n/strings.js`). No Devanagari in other `src/lib` files. Website behaviour must stay unchanged except where a phase names the change.
10. After EVERY phase: commit (explicit paths), `git push origin android-app`, and append a line to `docs/review/batch9/PROGRESS.md` (time, phase, status, one sentence). I will read this file first thing in the morning.
11. Keep the PC awake issues in mind: if the emulator hangs or shows "System UI isn't responding", answer Wait, reboot it with the existing harness helper, and continue. If adb or the emulator is dead after 2 reboots, mark device-dependent phases NOT-RUN with the reason, and still finish all non-device phases.

Create `docs/review/batch9/` for everything you produce tonight (evidence in `docs/review/batch9/evidence/`).

---------------------------------------------------------------------
## 0.5 EXECUTION MODEL (so one bad hour cannot ruin the night)

- You are the ORCHESTRATOR. Run EVERY phase as its own **subagent** (Task/Agent tool), one at a time, so each phase starts with a fresh context. Brief each subagent with: this file's path, "read section 0 and 0.5 first", the phase number, and the paths of the previous phases' outputs it needs. Do not paste whole phases from memory — tell it to read the phase text from this file.
- The orchestrator never trusts a subagent's claim. After each phase it CHECKS that the phase's promised artifacts exist and are non-empty (files, evidence folders, results JSON), re-reads the key evidence itself (open at least two screenshots or JSON files per phase), and only then marks the phase done in `PROGRESS.md` as `DONE`, `DONE-WITH-FAILURES` or `NOT-DONE`. A phase with missing artifacts is re-run once with a narrower brief; if it fails again it is `NOT-DONE` and you continue.
- **Resumable:** at start, if `docs/review/batch9/PROGRESS.md` already exists, read it and skip every phase marked `DONE` / `DONE-WITH-FAILURES`; continue from the first unfinished phase. (If the session dies or a login/usage limit hits, I will paste: "Resume Batch 9 from docs/review/batch9/PROGRESS.md".)
- **One emulator job at a time.** Reboot the emulator between phases that use it. Capture `adb logcat` for every test run and scan it for `FATAL EXCEPTION`, `ANR in`, `Process ... has died`, `StrictMode`, `WebView crash` — any hit is a finding even if the test assertion passed.
- On every web page the harness visits, also record browser-console errors and failed network requests (ignoring only the allowlist already used in T5); a new console error or a failed request to our own backend is a finding.

---------------------------------------------------------------------
## 1. ORDER OF WORK (priority order — if time or usage runs short, later phases are the ones dropped, and you say so in the report)

- Phase 0  Preflight and safety
- Phase 1  App fixes (keyboard, duplicate stamp, cold-storage message, location fallback)
- Phase 2  Sitemap / service-worker fix (old "Batch 9A")
- Phase 3  Release-readiness of the Android project (signing set-up, AAB build, sanity checks)
- Phase 4  Ship the web-side files to the STAGING site (gated); prepare the prod deploy + rollback scripts for the morning (not run)
- Phase 5  Rebuild the APKs against the deployed site, run the FULL suites (twice per flavour) plus live feedback / village / mic tests
- Phase 5B Real test accounts and the full sign-up / sign-in / post / contact matrix on STAGING (farmer-seller, farmer-buyer, every combination)
- Phase 5C Real-world conditions: old Android, small screen, big fonts, slow/flaky network, low memory, random-tap stress, route-by-route coverage map
- Phase 6  Play Store pack (text, data-safety answers, privacy additions, screenshots, graphics)
- Phase 7  Push-notification groundwork (documents only) and backlog notes
- Phase 8  Morning kit (emulator script, guides, real-phone checklist) and final report

Phases 3, 6, 7 do not depend on the deploy and may run while a long test is waiting — but run only ONE emulator job at a time.

---------------------------------------------------------------------
## PHASE 0 — PREFLIGHT AND SAFETY

0.1 `git status`, `git branch -a`, `git log --oneline -15`, `git tag --list "pre-*"`. Record in `docs/review/batch9/PREFLIGHT.md`.
0.2 Read `~/ship-prod.sh`, any `scripts/ship*`, `package.json` scripts (`build:prod`, `build:full`, deploy scripts) and `docs/` deploy notes. Write in PREFLIGHT.md, in plain words: how staging.kissansahyog.com is deployed, how prod is deployed (Cloudflare Pages project `kissansahyog-prod`, Direct Upload), which branch each comes from, how a rollback is done today. DO NOT GUESS — if something is unclear, find the evidence (script text, docs) and quote the lines.
0.3 Find every existing website test/regression script (e.g. `scripts/v11_*.mjs`, `npm test`, lint, build checks). Run them NOW on the current `android-app` branch to get a BASELINE (some are known to fail already, e.g. `v11_phase6.mjs` Devanagari check fails on Windows). Save the baseline list of pass/fail in PREFLIGHT.md. Later gates mean "no NEW failure versus this baseline".
0.4 Leftover files: put the untracked/modified leftovers in ONE separate commit named `chore: leftover review artefacts (no code)` — explicit paths only; skip anything over 5 MB or that is not text/screenshot evidence, and list skipped ones in PREFLIGHT.md. This keeps the ship commits clean.
0.5 Safety tags: create rollback tag `pre-9-start` at the current HEAD (and `git push origin pre-9-start`).
0.6 Check emulator health (`adb devices`, boot, one quick harness smoke). Record.
0.7 Verify the staging build guard still refuses a prod URL (re-run the S2 guard check only).

---------------------------------------------------------------------
## PHASE 1 — APP FIXES

All changes native-only (`isNative()`) unless stated. Each gets a test (extend `scripts/android/*` harness) with evidence screenshots/JSON.

### 1A. Keyboard must never hide a form field (was T14 flake — and the test itself was weak)
Facts from 8B: on prod run #2 T14 failed ("viewport didn't shrink" 839 of 915 px); the screenshot showed NO soft keyboard drawn at all, so the old test cannot prove fields are visible when a real keyboard is up. The app targets SDK 36 (edge-to-edge), where Android does not resize the WebView for the keyboard by default.
Do:
1. Make the emulator show a real on-screen keyboard (`adb shell settings put secure show_ime_with_hard_keyboard 1`; AVD hardware keyboard off if needed). PROVE it by screenshot that a keyboard is drawn.
2. Write a NEW test (call it K1) that, for each of: `/login`, `/join` (signup), `/post` (the lowest fields on every step), `/search`, the Feedback form, Profile edit: focuses the LOWEST text field, waits until the keyboard is drawn, and asserts (a) the focused field is fully inside the visible area above the keyboard, (b) the submit/next button is reachable by scrolling, (c) nothing is permanently covered. Evidence: screenshot WITH keyboard visible + measurements.
3. If K1 fails anywhere, fix it natively (preferred order: Capacitor Keyboard plugin with `resize: 'native'` or a `visualViewport`/inset padding handled inside `NativeShell` and `useNativeBack`-style hooks; `adjustResize` in the manifest only if the others do not work). Never change website behaviour. Re-run K1 until it passes twice in a row.
4. Rework old T14 so it asserts the real condition (keyboard drawn + field visible) and not a timing-sensitive "viewport shrank by N" check. Record the old assertion change in `assertion-changes.json` with the reason (as 8B did).

### 1B. Duplicate "last updated" on Home
Offline Home shows the orange banner "आप ऑफ़लाइन हैं — आख़िरी बार अपडेट …" AND a second "पिछली बार अपडेट …" stamp under the ticker. Keep ONE: when the offline banner is visible, hide the stamp that shows the same time; keep the stamp when online-but-showing-old-data. Test: offline home shows exactly one timestamp.

### 1C. /cold-storage: failed load must say so (website bug found in 8B)
Add the missing `catch`: on failure show the existing offline/"try again" notice component (same wording style as the other pages) instead of an empty list and an unhandled error. This is the ONE sanctioned website-behaviour change; it must not alter the success path. Test on web (Playwright) and in the app (airplane mode, empty cache).

### 1D. Post page location fallback
The Post page asks for a low-accuracy position with a 10 s timeout and can fail on phones without a recent fix. Improve (web+app safe): accept a cached position up to 10 minutes old, then try a fresh low-accuracy fix with 20 s timeout, then fall back to the existing manual pincode/village path with a clear message (new string in `strings.js`). Do not save more precise location than today (privacy rule from 7L-2 stays). Test with the emulator's GPS on, then with GPS off.

### 1E. Not to be changed (record in DECISIONS.md as "needs founder decision", do nothing)
Exact-location saving on listings; Profile→Edit requiring a pincode for e-mail accounts; lockout edge cases. Describe each in 3 lines with options and your recommendation.

Phase 1 exit: re-run the affected 8B tests (T9, T10, T14/K1, O3, O4, S4–S8) on BOTH flavours; no new failure.

---------------------------------------------------------------------
## PHASE 2 — SITEMAP / SERVICE-WORKER FIX (old Batch 9A)

Problem: in browsers that already have the app's service worker, `https://kissansahyog.com/sitemap.xml` shows the app's 404 page, because Workbox `navigateFallback: '/index.html'` also catches it. Google and private tabs are fine (live file is valid; GSC accepted it).
Do:
2.1 In `vite.config.js` add to the workbox config:
`navigateFallbackDenylist: [/^\/sitemap.*\.xml$/, /^\/robots\.txt$/, /^\/llms\.txt$/, /^\/search-index\.json$/, /^\/(api|geo|geocode|transcribe)(\/|$)/, /^\/_/]`.
Keep everything else in the workbox config exactly as is (skipWaiting, clientsClaim, globPatterns, runtimeCaching).
2.2 Build with `build:prod` (check how, from PREFLIGHT) into a scratch dist; confirm the denylist is inside the generated `sw.js`, confirm sitemap files (`sitemap.xml` index + `sitemap-pages/sawaal/cold-storage/schemes.xml`) exist in `dist` and are valid XML, and `robots.txt` points to `https://kissansahyog.com/sitemap.xml`.
2.3 PROVE the fix with a real service worker: serve the built `dist` locally over a static server that returns real XML for those files, open it in Playwright, wait until the SW controls the page, then navigate to `/sitemap.xml`, `/robots.txt`, `/sitemap-pages.xml` and assert the response body is XML/text (not the app HTML). Also run it against the OLD build as a negative control and show it fails there (so the test is meaningful). Evidence JSON + screenshots in `evidence/phase2/`.
2.4 Confirm normal app deep links still work with the SW (`/mausam`, `/browse`, an unknown path shows the app 404).
2.5 Do NOT deploy here — deploy happens in Phase 4 together with the middleware files.

---------------------------------------------------------------------
## PHASE 3 — RELEASE READINESS OF THE ANDROID PROJECT (no secrets, nothing uploaded)

3.1 Signing set-up: in `android/app/build.gradle` add a `release` signingConfig that reads `android/keystore.properties` ONLY if the file exists (storeFile, storePassword, keyAlias, keyPassword); if it does not exist the release build must still succeed UNSIGNED. Add `android/keystore.properties`, `*.jks`, `*.keystore` to `.gitignore` (verify with `git check-ignore`).
3.2 CREATE THE REAL RELEASE KEYSTORE NOW (I authorise it; nobody is awake to type passwords, so generate them):
 - Folder `C:\Users\usdvi\ks-release-keys\` (create it; refuse to overwrite if `kisansahyog-upload.jks` already exists — then reuse it).
 - `keytool -genkeypair` RSA 4096, validity 10000 days, alias `kisansahyog`, keystore `kisansahyog-upload.jks`, DN `CN=USD Vision AI LLP, O=USD Vision AI LLP, L=Hyderabad, C=IN`. Store and key passwords: 24+ random characters from a CSPRNG (`openssl rand` or node `crypto`), generated by the script, NEVER echoed to the terminal or any log.
 - Write the passwords ONLY into `C:\Users\usdvi\ks-release-keys\KEYSTORE_INFO.txt` (plus the alias, the SHA-1 and SHA-256 fingerprints, creation date) and into the gitignored `android/keystore.properties` (storeFile pointing at the absolute path above).
 - Also write `scripts/android/make-release-keystore.sh` (the reusable helper; no secrets inside; refuses to overwrite; prints fingerprints only) and test it with dummy inputs in a TEMP folder.
 - Because Play App Signing will be used, this key is the UPLOAD key: Google can reset an upload key if it is ever lost. Say so in `docs/store/KEYSTORE_README.md` (no secrets in that file) together with: where the files are, "BACK UP the whole `ks-release-keys` folder in TWO places outside this PC (e.g. a USB stick + a private cloud folder) TODAY", and what to do if lost.
 - Put ONLY the SHA-256 fingerprint (public information) into `docs/store/KEYSTORE_README.md` and PREFLIGHT/REPORT.
3.3 Build `bundleRelease` (AAB) for BOTH flavours, SIGNED with the new upload key (prod flavour is the one for the store; the staging one is for testing only). Verify the signature with `jarsigner -verify -verbose -certs` and show the fingerprint matches. Also build a signed release APK of the prod flavour (`ks-production-release.apk`) and install it on the emulator next to the debug builds to prove a release-signed build installs and starts (delete only that test install afterwards). Record size, versionCode, versionName. Set `versionCode 1`, `versionName 0.1.0` explicitly if not already. Confirm the AAB opens with `bundletool` if available (if not available, skip and say so). Never commit `*.aab`, `*.apk`, `*.jks`.
3.4 Release sanity audit with evidence (`evidence/phase3/*.json`): `debuggable=false` in release; WebView remote debugging OFF in release builds (find where `setWebContentsDebuggingEnabled`/Capacitor `webContentsDebuggingEnabled` is set; fix for release only if on); cleartext false; `allowBackup` decision (set to false unless the app stores anything worth restoring — default false) ; permissions list unchanged (INTERNET, ACCESS_NETWORK_STATE, ACCESS_COARSE/FINE_LOCATION, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS) and each justified by a code reference; no secrets in assets (reuse T3 scan) for both flavours; no `sb_secret`/service-role strings; targetSdk 36 / minSdk 24; icons and splash present.
3.5 Digital Asset Links: write `docs/store/assetlinks.template.json` and a note on when it is needed (only for verified App Links; fingerprint = Play App Signing certificate from Play Console AFTER first upload). DO NOT put anything in `public/.well-known/` tonight.

---------------------------------------------------------------------
## PHASE 4 — SHIP THE WEB-SIDE FILES TO THE STAGING SITE (gated) AND PREPARE THE PROD SHIP

What must reach the live site: `functions/_middleware.js` (CORS for the app only), `public/_routes.json`, the Phase 2 vite fix, the Phase 1C /cold-storage fix and Phase 1D post-page change. They live on `android-app`.

4.1 Plan from PREFLIGHT: create branch `release-9` from the branch that currently deploys, merge `android-app` into it (merge, not force). Resolve conflicts conservatively, log them in DECISIONS.md. Make sure the shipped build excludes anything Android-only that is not already gated (`isNative()`), and that `android/`, APKs, `.dev.vars` are not in `dist`.
4.2 Run the full website baseline from Phase 0.3 + `npm run build:prod` (or the documented command) + prerender count check (expect the same 263 routes as before; if it differs explain exactly why). Compare bundle size against 8B numbers (main chunk ≈ 94.5 KB, +1.7 KB gz acceptable). NEW failures versus baseline → STOP Phase 4 (no deploy), record, go on to Phase 5 using the STAGING site only if it already carries the functions; otherwise mark live tests NOT-RUN.
4.3 Tag `pre-9-ship` (and `git push origin pre-9-ship`). Deploy to **staging.kissansahyog.com** using the documented staging path. Never deploy to prod in this step.
4.4 STAGING GATES (all must pass, with evidence in `evidence/phase4/`):
 a. `https://staging.kissansahyog.com/` and 10 key pages return 200 and render (Playwright, real browser).
 b. `OPTIONS /api/feedback` with `Origin: https://localhost` → 204 and `Access-Control-Allow-Origin: https://localhost`; with `Origin: capacitor://localhost` → same pattern; with `Origin: https://evil.example` → NO allow-origin header; no `*` anywhere.
 c. `POST /api/feedback` with a marked KSTEST message from `Origin: https://localhost` → success and the row exists (check through the app's own public path or the response; do not use any service key).
 d. `/geo`, `/geocode?...`, `/transcribe` respond (200/expected JSON) and carry correct CORS for the app origins and none for others.
 e. Static pages carry NO CORS headers (middleware limited by `_routes.json`): check `/`, `/mausam`, `/sitemap.xml`.
 f. With a real SW installed in Playwright, `/sitemap.xml` returns XML (Phase 2 test against the live staging site).
 g. Service worker update works for an existing client (load old build in a second profile first if available; otherwise state NOT-RUN).
4.5 PRODUCTION IS **NOT DEPLOYED TONIGHT** (founder decision after review: an unattended production change gives no benefit for tomorrow's testing — the staging site carries everything the apps need — and adds risk). Instead PREPARE it so it is a 5-minute, reviewed step in the morning:
 - Take the pre-deploy read-only snapshot of prod pages NOW (title, h1, byte size, status for `/`, `/mausam`, `/msp`, `/browse`, `/sawaal`, `/yojana`, `/cold-storage`, `/about`, `/privacy`, `/terms`, `sitemap.xml` + four child sitemaps, `robots.txt`) into `evidence/phase4/prod-before.json`.
 - Write `scripts/ship-prod-9.sh` (NOT run): checks it is on `release-9` with a clean tree and that `pre-9-ship` exists; deploys using the documented prod path; then runs the prod gates (read-only requests only; no sign-ups, no feedback POST on prod): (a) the pages above are 200 with markers matching `prod-before.json` (title/h1 same, size within ±15%, no ErrorBoundary text); (b) sitemap index + four children valid, `robots.txt` unchanged, Playwright with a real service worker: `/sitemap.xml` is XML; (c) CORS OPTIONS/GET checks as in 4.4 b/d/e; (d) prod mandi ticker and /mausam still show data. If ANY gate fails the script rolls back by itself using the rollback method PREFLIGHT proved, re-runs gate (a), and prints loudly what happened.
 - Write `scripts/rollback-prod-9.sh` (NOT run) with the same proven rollback, and `docs/review/batch9/PROD_SHIP_STEPS.md`: three numbered steps for a non-technical reader (review SHIP.md → run one command → read the verdict it prints), plus the exact rollback command.
 - Dry-run both scripts in a mode that changes nothing (`--dry-run`: prints every command it WOULD run and validates the preconditions) and show the output.
4.6 Push `release-9`. Do NOT merge into `main`. Write `docs/review/batch9/SHIP.md`: what was deployed to STAGING, commit hashes, tag names, time, gate results, what the morning prod step will change (list of files), exact rollback command.

---------------------------------------------------------------------
## PHASE 5 — REBUILD APKs AND FULL TESTS (after Phase 4, same night)

5.1 Rebuild all three APKs (prod, staging, staging-local) from the final code with the existing npm scripts. Record sizes and sha256 in `docs/review/batch9/REPORT.md` (APKs themselves stay uncommitted in `android/ks-apks/`). Use the staging guard.
5.2 Reboot the emulator, run **staging flavour full suite twice**, then **prod flavour full suite twice** (`scripts/test-android.sh`), then both meta-tests (repeatability, negative controls). Include K1 and the new tests. If the staging site now has the functions deployed, the feedback form, village lookup and mic visibility must be re-tested against the LIVE staging site (not the local wrangler) — this turns the old NOT-RUN S9 into a real test:
 - submit a KSTEST feedback from the app → success state shown AND the response carries the right CORS;
 - type a village in Post → lookup returns places;
 - mic button visible only if `/transcribe` says `configured: true` (record which).
5.3 Prod flavour tests stay READ-ONLY (no sign-up, no posting, no feedback on prod). Because prod is NOT deployed tonight, the PROD flavour's feedback form, village lookup and mic will still be limited until the morning prod ship — expected, record it as "waits for prod ship", not as a failure. The STAGING flavour (pointing at the deployed staging site) is the one that proves the complete app.
5.4 Any RAN-FAILED: diagnose (max 3 attempts), fix, rerun only that test twice. If it is still failing, leave it RAN-FAILED with the evidence and cause. Do not mask failures by loosening assertions unless the assertion was wrong — then record the change and reason like 8B did.
5.5 Add an HONEST total at the top of REPORT.md: counts per flavour, per run, and every RAN-FAILED / NOT-RUN / HUMAN-REVIEW with one line each.
5.6 Update `docs/review/batch9/staging-test-data.json` with every KSTEST row created tonight (do NOT delete anything from the database).

---------------------------------------------------------------------
## PHASE 5B — REAL TEST ACCOUNTS AND THE FULL SIGN-UP / SIGN-IN / POST / CONTACT MATRIX (STAGING ONLY)

Why: there is no OTP yet (phone login signs in on the mobile number alone; email login uses email + password). I want to test the finished app tomorrow as every kind of user, with logins that already exist. THE APP HAS NO SEPARATE "SELLER" OR "BUYER" ACCOUNT TYPE: one registration form (`src/screens/Signup.jsx`: name, email, password, 10-digit mobile, village/town from the places list, language, show-my-details vs keep-hidden, optional किसान profile — land acres, main crops, lease interest, equipment interest, WhatsApp opt-in, preferred mandi — then a one-time disclaimer). "Seller" = a listing of type OFFER, "buyer" = a listing of type REQUIREMENT (`src/screens/Post.jsx`: 11 categories from `src/lib/listings/catalog.js` × offer/requirement × source farmer/vendor; some categories also need a provider declaration). So "all combinations" means: account options × login method × listing type × category × source × who is looking and from where. Read `Signup.jsx`, `Login.jsx`, `Post.jsx`, `Profile.jsx`, `MyListings.jsx`, `ListingDetail.jsx`, `ContactActions.jsx`, `lib/auth/authService.js`, `lib/listings/registry.jsx` and the SQL/RPC they use FIRST, and write the EXPECTED behaviour of each option into `docs/review/batch9/ACCOUNT_MATRIX.md` BEFORE testing (what "show my details" vs "keep hidden" really does to the contact reveal, which categories are enabled, which fields are required, the 30/50 km visibility rule, wide-visibility eligibility, photo limits). If the code contradicts what the screen text promises, that is a BUG: record it (RAN-FAILED with evidence), do NOT change app behaviour tonight.

**HARD LIMITS:** STAGING project and staging flavour/site ONLY (guards from 8B stay on). Prod: nothing. Fake data only: names start `KSTEST-KEEP` for the personas I will keep, `KSTEST` for throw-away test noise; e-mails `@example.com`; mobiles fake (check `isValidPhone`, pick a reserved pattern that cannot collide with the existing KSTEST numbers in `docs/review/batch8b/staging-test-data.json`, and never a real person's number). No real SMS/e-mail can go out (no OTP exists) — still confirm that from code.

### 5B.1 The persona accounts (created through the APP'S OWN sign-up form on the staging flavour in the emulator, not by SQL or direct API calls)
Create at least these, each with a different mix of options so every option is exercised on a real account:
- P1 Farmer-Seller, Hindi, details SHOWN, full किसान profile (acres, 2 crops, lease+equipment interest ticked, WhatsApp opt-in ticked, a preferred mandi), village in Sagar district.
- P2 Farmer-Buyer, Hindi, details SHOWN, किसान profile filled differently, village near P1 (inside 30 km).
- P3 Farmer-Seller, details HIDDEN, minimal profile (everything blank), village in Sagar.
- P4 Farmer-Buyer, details HIDDEN, English, village in Damoh.
- P5 Vendor/trader-Seller (uses source = vendor), English, details SHOWN, partial profile.
- P6 Vendor/trader-Buyer (source = vendor), Hindi, details HIDDEN.
- P7 Provider account (will post equipment / warehouse / greenhouse / jugaad OFFERS that need the provider declaration), Hindi, details SHOWN.
- P8 Far-away user (a village in a different state or >100 km from the others) to prove the 30/50 km rule and wide visibility, English, details SHOWN.
- P9 E-mail edge account: mixed-case e-mail, spaces around inputs, a long name with Devanagari + English, Hindi/English language switch at signup.
Each persona: sign up → success screen → log out → log in by E-MAIL+PASSWORD → log out → log in by MOBILE NUMBER ONLY → kill and reopen the app (session persists) → switch language (persists after next login) → Profile page shows the right data → edit one profile field and confirm it persists. Evidence per persona in `evidence/phase5b/<persona>/`.

### 5B.2 Negative and edge cases (use throw-away KSTEST accounts, never the KEEP personas, except where stated)
Duplicate e-mail; duplicate mobile; 9-digit and 11-digit and non-numeric mobile; mobile starting with a digit the validator rejects; invalid e-mail; password shorter than the minimum; empty name; no village chosen; disclaimer not accepted; correct e-mail wrong password; unregistered mobile; mobile login of an e-mail-registered user; leading/trailing spaces; upper-case e-mail; password show/hide toggle; Back from step 2 keeps entered data; language switch mid-form; offline sign-up attempt (clear message, nothing half-created); rapid double-tap on submit (only ONE account created); signing up with the keyboard open on the lowest field (K1 rules). Lockout/rate-limit: read the code to learn what exists, test it ONLY on a dedicated throw-away account, record the observed behaviour (how many tries, how long, message). It must NOT affect any KEEP persona. Write what you observe; do not change it (it is on the backlog).

### 5B.3 Listing matrix — every category × offer (seller) × requirement (buyer) × source
Enumerate the real, enabled categories from the registry (expected 11). For EACH category and EACH listing type that the category supports (OFFER = seller, REQUIREMENT = buyer), post at least one listing through the APP UI on the emulator (staging flavour), logged in as the matching persona (farmer personas post as source farmer; P5/P6 as vendor; P7 for provider categories with the provider declaration). For categories with photos, attach a photo (the harness's existing photo method; state clearly that the REAL camera/gallery picker is NOT covered — that is for the phone). Also cover: the wide-visibility toggle where `WIDE_ELIGIBLE_CATEGORIES` allow it; the maps-link field valid and invalid; the transport category's from/to fields; every required-field error message; photo limit per category; the 3-step form's Back keeping data; posting while offline (must fail fast with a clear message, nothing duplicated); posting twice quickly (one listing only). Record the matrix as a table (category | type | source | persona | result | listing id | evidence) in `docs/review/batch9/LISTING_MATRIX.md`. Marker text `KSTEST-KEEP` in the title/details so I can find them.
If one category/type is genuinely not offered by the app, say so in the matrix with the code reference instead of silently skipping.

### 5B.4 Who can see and contact whom (the part that matters to real farmers)
Using the listings above and a SECOND account looking at them:
- Browse and search as P2 (near P1), P8 (far away) and a logged-out visitor: confirm the 30/50 km rule and wide visibility exactly as `ACCOUNT_MATRIX.md` predicts, for offers and requirements.
- Open a listing → contact reveal as a logged-in user and as a logged-out user (must go to login and come back to the same listing). For each combination of poster (details SHOWN / HIDDEN) × viewer (logged in / logged out / own listing), record exactly what the viewer sees (call, WhatsApp, number, nothing) and compare with the expectation. HIDDEN-details posters must not leak a number in the page, the DOM, the network responses, the offline cache (re-use the O7 scan), or the share message.
- My Listings: each persona sees only their own listings; actions available there (edit / deactivate / delete / mark done — whatever exists) each tested once; the listing disappears from Browse for others when deactivated.
- Switch accounts on the same phone (P1 log out → P3 log in): nothing of P1 remains on screen, in Profile, in My Listings or in the offline cache.
- Report button, contact-click and view counters: one test each.

### 5B.5 Every other form that writes data
Grep `src/` for every screen/component that submits data (e.g. Feedback, Grievance, Kisan Mela submit, WhatsApp join, Report, any expert/lead forms). For EACH: one valid submission and one invalid one on staging (app + web), with `KSTEST-KEEP`/`KSTEST` markers. Feedback and anything that needs the Pages Functions uses the LIVE staging site from Phase 4 (if Phase 4 did not deploy, mark NOT-RUN with the reason). List each form in `FORMS.md` with result and evidence.

### 5B.6 Web layer (fast, same expectations)
Re-run the same account/listing/contact matrix in Playwright against the deployed staging WEBSITE (not the emulator) in a mobile viewport, using throw-away KSTEST accounts plus the KEEP personas for read-only checks. Differences between web and app behaviour go into `ACCOUNT_MATRIX.md` as findings.

### 5B.7 Hand-over of the logins (so I can use them tomorrow)
- Write `C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md` (OUTSIDE the repo, gitignored pattern as well): for every KEEP persona: persona name, what it is (e.g. "P3 farmer-seller, details hidden"), e-mail, mobile, the shared test password, village, language, which listings it owns (ids + titles). One shared simple test password for all personas is fine (staging, fake data, min length per the app). Add one line at the top: STAGING ONLY.
- In the repo write only `docs/review/batch9/TEST_ACCOUNTS_INDEX.md` listing persona names, roles and listing ids — NO e-mails, mobiles or passwords.
- FINAL GATE (run last, after all negative/lockout tests): every KEEP persona must be able to log in with BOTH e-mail+password and mobile only, in the emulator app. Any persona that cannot → fix by re-creating that persona through the sign-up form, and re-run its gate. Record the result.
- Update `docs/review/batch9/staging-test-data.json` (ids, markers, times; no passwords) so the cleanup afterwards can SPARE everything marked `KSTEST-KEEP` and remove only `KSTEST` noise.

Phase 5B exit: `ACCOUNT_MATRIX.md`, `LISTING_MATRIX.md`, `FORMS.md`, results JSON through `report.mjs` with the usual statuses, evidence folders, and the final login gate. If time is short, the ORDER of importance is: 5B.1 → 5B.7 gate → 5B.3 (one listing per category × type) → 5B.4 → 5B.2 → 5B.5 → 5B.6. Say exactly what was skipped.

---------------------------------------------------------------------
## PHASE 5C — REAL-WORLD CONDITIONS AND COVERAGE (staging flavour, emulator; nothing here may touch prod data)

Farmers use old, small, slow phones. Everything above ran on ONE modern emulator, so this phase widens it. Record every result in `docs/review/batch9/CONDITIONS.md` with evidence; honest statuses; an environment limitation (e.g. an emulator image that ships an outdated WebView) is recorded as such and is NOT counted as an app bug unless you can show a real phone would behave the same (state the WebView version for every device).

5C.1 **Route coverage map (the "did we test every screen" proof).** From the router (`src/App.jsx` and any route lists, `scripts/lib/prerender-routes.mjs`) generate `docs/review/batch9/ROUTE_COVERAGE.md`: EVERY route pattern in the app, which test visited it (app and/or web), and the result of the visit (renders real content, no ErrorBoundary, no blank page, no new console error, back button works). Routes that need data (listing detail, sawaal detail, scheme detail, crop pages) are visited with a real id. Any route no test visited is visited NOW by a small sweep test (staging flavour, logged in as a persona and logged out). Unvisitable routes are listed with the reason. Target: 100 % of route patterns visited at least once in the app, and a count printed at the top.
5C.2 **Old and different devices.** Create (script it in `scripts/android/avd-matrix.sh`, using the SDK's `sdkmanager`/`avdmanager`; if images cannot be downloaded, record NOT-RUN with the exact error) additional AVDs: (a) the oldest supported, API 24 (Android 7), (b) API 30, (c) a small-screen low-RAM profile (720×1280, density 280, 2 GB RAM) on the newest API. On each: install the staging APK, run a SMOKE suite (cold start, Home with data, Mausam, Msp, Browse, one listing detail, login with one persona, post one listing, offline once) with screenshots. On API 24 record the WebView version first; if it is below what Capacitor 8 needs, try the Play-Store-enabled or updated WebView image and say what you found. Run ONE device at a time; delete the extra AVDs' snapshots if disk gets tight, never the main `ks_test_api36`.
5C.3 **Text and display settings farmers actually use** (on the main emulator, restore defaults afterwards): font scale 1.3 and 1.5 (`adb shell settings put system font_scale`), display size "large" (`wm density`), dark mode forced on, and the phone language set to Hindi then English. Visit Home, Mausam, Browse, Post (all 3 steps), Signup, Login, Profile, a listing detail. Assertions: no horizontal page scroll, no text clipped behind buttons or the bottom nav, every tappable element still ≥ 44×44 CSS px, primary buttons reachable. Screenshots on any failure.
5C.4 **Bad networks.** Using the emulator's network controls (`adb emu network speed edge`, `network delay gsm`) and airplane-mode toggles mid-action: slow 2G-like load of Home/Browse (must show progress or content, no endless spinner beyond the 10 s rule), losing connection in the MIDDLE of: sign-up submit, post submit, photo upload, contact reveal, login. For each: the user sees a clear message, nothing is duplicated, no half-created account/listing remains, and retry works after reconnecting.
5C.5 **App lifecycle.** For Home, Post step 2 (filled), a listing detail: send the app to background and kill the process (`adb shell am kill`), reopen: state is sane (no crash, no blank screen, logged-in session intact). Rotate the device on each of those screens and on the keyboard-open form. Open the app from a deep link (`adb shell am start -a android.intent.action.VIEW -d https://kissansahyog.com/mausam` — and one for a listing) and confirm it opens the right screen or the browser as designed (T12 behaviour).
5C.6 **Random-tap stress.** `adb shell monkey` with a FIXED seed on the staging package only, 15 000 events at throttle 100 ms, logged in as a persona (`--pct-syskeys 0 --pct-appswitch 0 --pct-nav 5` so it cannot leave the app or press Home), `--ignore-security-exceptions` OFF so permission errors show. Run it 3 times with 3 different fixed seeds. Pass criteria: no crash, no ANR, app still responsive afterwards, logcat clean of FATAL/ANR. Any crash: reproduce with the same seed, capture the stack, find the screen, fix if in app code (max 3 attempts), and re-run that seed. (It may post junk to staging; that is fine — it is staging and the junk is not marked KEEP.)
5C.7 **Performance sanity.** On the small-screen low-RAM AVD and the main one, measure and record: cold start time to first meaningful Home content (3 runs, median), time to /mausam content, APK/AAB size, JS heap after 5 minutes of navigation (via CDP), IndexedDB cache size (must respect the 5 MB cap). No hard fail thresholds invented by you — report the numbers and flag anything above 5 s cold start on the low-RAM profile.

---------------------------------------------------------------------
## PHASE 6 — PLAY STORE PACK (files only; nothing is submitted)

All in `docs/store/`. Everything must be consistent with what the app really does (read the code; cite file/line for every data claim).
6.1 `listing-hi.md` and `listing-en.md`: app title (max 30 chars), short description (max 80), full description (max 4000), release notes for 0.1.0 (max 500), category suggestion, tags. Hindi-first, simple, farmer-friendly, no unverifiable claims (no "number 1", no "guaranteed price", no fake ratings). Mention only real features: mandi prices, weather, MSP, government schemes, Q&A, cold storage, marketplace for tractors/labour/storage/inputs, works in Hindi, offline last-saved data, free. Verify character limits PROGRAMMATICALLY and print them in `listing-limits.json`.
6.2 `data-safety-answers.md`: a table for Play Console's Data safety form — for each data type collected (name, phone number, e-mail, approximate and precise location, photos (listing photos), audio/voice for search, user-generated content, app activity, crash logs if any) say: collected? shared? required or optional? purpose? encrypted in transit (yes, HTTPS)? can the user delete it? — each answer backed by a code reference. Include what is NOT collected (no ads SDK, no analytics SDK — verify by scanning dependencies; if any analytics/ads library exists, say so).
6.3 `permissions-justification.md`: location (what for, coarse vs fine), microphone (voice search via `/transcribe`, audio sent to a server for transcription, not stored — verify in `functions/api/transcribe.js` and say exactly what happens), network state (offline banner). Plus the exact wording for the "foreground location/mic declaration" if Play asks.
6.4 `privacy-policy-additions.md`: DRAFT text (Hindi + English) to be added to the website privacy page for the app: what the app stores on the phone (offline cache of PUBLIC data only, login session), the cache never stores phone numbers/revealed contacts, location use, microphone use, how to delete account/data, contact e-mail `usdvisionai@gmail.com`, operator = USD Vision AI LLP. Do NOT edit the live privacy page; mark the draft "needs lawyer review".
6.5 `content-rating-answers.md` (IARC questionnaire answers) and `store-checklist.md` (every Play Console field with the value to paste or the action I must take, in order). Mark clearly what is blocked until the Play organisation account exists (needs D-U-N-S, pending) and what I can do today with a personal developer account.
6.6 Graphics: app icon 512×512 PNG (from the real launcher icon source), feature graphic 1024×500 PNG (logo + Hindi tagline "खेती का भाव, मौसम और सहयोग — एक ही जगह" or a better short line you verify fits; use a Devanagari-capable font rendered through Chromium/Playwright and CHECK the PNG visually), and **8 phone screenshots (1080×2400)** per language where the toggle exists: use the PROD flavour, logged out, public screens only (Home with mandi ticker, Mandi/MSP, Mausam, Browse, Schemes/Yojana, Q&A/Sawaal, Cold storage, About/Join). NO staging/KSTEST data, no personal data, no offline banner, no emulator status-bar clutter (use demo mode: `adb shell settings put global sysui_demo_allowed 1` + clean status bar, then turn it off). View each image and delete bad ones. Output PNGs to `docs/store/graphics/` (keep each under 2 MB; if too big for git, keep them in `docs/store/graphics/` but do NOT commit anything over 2 MB — list them instead).

---------------------------------------------------------------------
## PHASE 7 — PUSH NOTIFICATIONS (groundwork only) AND BACKLOG NOTES

7.1 `docs/review/batch9/PUSH_PLAN.md`: design for Firebase Cloud Messaging with Capacitor (`@capacitor/push-notifications`): token table (staging first), who sends what (e.g. daily mandi price alert for chosen crop, scheme deadlines, rain alert), opt-in screen wording (Hindi), Android 13 notification permission, how a Pages Function or Supabase Edge Function would send, privacy implications, effort estimate. List EXACTLY what I must create by hand (Firebase project, `google-services.json`, FCM server credentials) and where each file goes. No code, no migration, no dependency added tonight.
7.2 `docs/review/batch9/BACKLOG.md`: consolidate every open item you know of from `docs/review/*`, with owner (me / Claude Code / lawyer / Jio / Supabase) and priority: batch 7M security (admin_* functions exposure, `weather_grid_requests` anonymous write policies) — describe the concrete risk and the proposed fix in plain words but DO NOT write or apply SQL tonight; 5b-citations failures; lockout edge cases; Terms/Privacy lawyer review; large screenshots already committed (repo-size note); the pending Jio DLT header `KSAHYG` → OTP template → chain-bind Fast2SMS → wire OTP login; D&B D-U-N-S request DR1013202634704819920 → Play organisation account.

---------------------------------------------------------------------
## PHASE 8 — MORNING KIT AND FINAL REPORT

8.1 `scripts/android/morning.sh`: ONE command that (a) starts the emulator `ks_test_api36` if not running and waits for boot, (b) installs the staging APK and the prod APK, (c) launches the staging app, (d) prints in plain English what to do next and where the APKs are. Test it from a stopped emulator.
8.2 `docs/review/batch9/MORNING_EMULATOR_GUIDE.md`: for a non-technical reader. Numbered, one action per line, with the exact expected result for each: install/open the staging app → check the icon and name "Kisan Sahyog (Staging)" → Home shows prices → switch to Hindi/English → Mausam → Browse → log in with a ready persona from `C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md` (say which persona to use for which test: seller, buyer, details-hidden, vendor, far-away) by e-mail+password and then by mobile only → ALSO sign up a brand-new account yourself with a fake mobile (staging, any fake number works, name it "KSTEST …") → post a seller listing (OFFER) and a buyer listing (REQUIREMENT) in two different categories, with a photo → see them in My Listings → log in as the OTHER persona and find them in Browse → reveal contact (compare shown vs hidden details) → log out/in → airplane mode (how to toggle it in the emulator) → see saved data and "last updated" → turn it back on → open Feedback and send a message → check the keyboard does not hide the fields. Each step has a "if it looks different, take a screenshot of THIS screen" note.
8.3 `docs/review/batch9/PHONE_TEST_CHECKLIST.md`: for my REAL Android phone: how to copy `ks-staging.apk` to the phone (USB cable with Windows file copy; or upload to Google Drive and open on the phone — give both), how to allow "install unknown apps" for the file manager/Drive and turn it off afterwards, how to install, what to test (everything in 8.2 PLUS: real camera and gallery photo in Post, real GPS location prompt and refusal, real voice search prompt (if mic is configured), real keyboard on the lowest fields, back button, rotate phone, switch Hindi/English, kill the app and reopen, poor-network behaviour with mobile data off), what to screenshot, and a short table to fill: step | worked? | notes. Also "how to uninstall the staging app so it does not mix with the final one".
8.4 Final `docs/review/batch9/REPORT.md` (same structure as 8B: verdict first, results tables generated by `report.mjs`, APK table with sizes/sha256, what was deployed where, deviations, open issues, rerun commands, what needs a human). Must clearly separate: DONE & PROVEN, DONE BUT NEEDS PHONE, PREPARED FOR ME TO FINISH (keystore backup, Play account, Firebase, DLT, lawyer review, DB security migrations, KSTEST cleanup, privacy-policy text), and NOT DONE with the reason. It MUST contain a section **"What automation cannot prove"** listing, honestly, what is still untested and why (real camera/gallery picker, real GPS/microphone hardware, the vendor's own keyboard and WebView on my real phone, real mobile networks, Hindi text judged by a human, store review policy, OTP not built) and a **coverage table**: route patterns visited / total, categories × types posted / total, personas logged in both ways / total, devices run / planned. Never write "fully tested" anywhere. Include the persona table (names/roles only, no secrets), the account-matrix and listing-matrix summaries with counts, every bug found in 5B (with evidence path) ranked by how badly it would hurt a real farmer, and the keystore SHA-256 fingerprint.
8.5 Final commit(s) with explicit paths, push `android-app` and `release-9`, then print the SHORT summary below.

---------------------------------------------------------------------
## FINAL MESSAGE FORMAT (last thing you print)

Max 25 lines, plain English, no tables wider than 80 characters:
1. One-sentence verdict (ready to test / ready with caveats / not ready, and why).
2. Production: NOT touched (by design). Staging site deployed: yes/no and which gates passed; whether `scripts/ship-prod-9.sh` dry-run is clean.
3. Counts: staging suite and prod suite, run 1 and run 2; account/listing matrix counts (passed / failed / skipped) and the login gate result for the persona accounts.
4. The 3 things I should do first thing in the morning (the order I should do them) — always including: back up `C:\Users\usdvi\ks-release-keys\` in two places; where `TEST_ACCOUNTS.md` is.
5. Anything that failed or that you could not finish, one line each.
Do not claim anything you have not run.
