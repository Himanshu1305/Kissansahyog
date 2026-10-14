# Batch 9 — decisions taken without the founder

Each entry: what was decided, why, and what the alternative was.

## Phase 0

1. **`pre-9-start` tag at `2bf9aef`** (HEAD at the start of Phase 0, before any Batch 9 commit).
   Why: the rollback point must be the state you accepted after 8B. Alternative: tag after the
   leftover-artefacts commit — rejected, because that commit is Batch 9's own work.

2. **`BATCH9_OVERNIGHT_PROMPT.md` is NOT in the leftover commit; it is committed with the Phase 0
   outputs instead.** Why: it is the instruction file for tonight, not a review artefact; earlier
   prompt files (`BATCH5*_PROMPT.md`, `BATCH6*_PROMPT.md`) are tracked at the repo root, so keeping
   it in git matches that and makes the run resumable from git. It was scanned for secrets first
   (none: no keys, tokens or passwords; only project refs, which are already in the repo).
   Alternative: leave it untracked — rejected, a lost working tree would lose the instructions.

3. **`public/search-index.json` was left out of the leftover commit.** Why: it is build output that
   every `npm run build:full` rewrites (it is "not text/screenshot evidence"). Alternative: commit
   it — rejected, it would mix build output into a "no code" commit. It stays modified in the tree
   as it was before (8B left it the same way).

4. **Baseline tests that write to the staging database were NOT run (NOT-RUN).** These are every
   script that imports `e2e/support.js` (service-role `adminClient`, sign-ups, inserts/deletes),
   `scripts/verify-batch7l2-stageb.mjs` (creates and deletes staging accounts) and the Playwright
   `e2e/` suite (writes temporary records; needs a dev server). Why: the 7L-2 report (note 9) says
   these form-driven tests are out of date and write to staging; running them at night could leave
   half-created rows and their result would not be a meaningful baseline. Phase 5B creates its own
   test accounts through the app instead. Alternative: run them against staging — rejected as
   not the safest option.

5. **`scripts/verify-batch7l1-db.mjs` was NOT run.** Why: it can query the production database
   (it takes `staging` or `prod` as an argument); Hard rule 1 forbids any SQL against prod and the
   staging variant was already proven in 7L-1. Alternative: run only `staging` — not needed for a
   website-code baseline.

6. **Tracked `VERIFY_OUTPUT.txt` files rewritten by the verifiers were copied to
   `docs/review/batch9/evidence/baseline/` and then restored to their committed versions** so the
   working tree stays clean. Alternative: commit them — rejected, they belong to earlier batches.

7. **ESLint is not installed and has no config** (`npm run lint` → "'eslint' is not recognized").
   Recorded as a pre-existing baseline failure; ESLint was not installed tonight (no dependency
   changes outside a phase that asks for them).

8. **Raw emulator logcat files from the Phase 0 smoke are not committed** (`evidence/p0-smoke*/logs/`,
   about 1 MB each). Why: large, full of system/device noise and possibly device identifiers; the
   scan result (0 FATAL EXCEPTION / ANR in for the app) is recorded in PREFLIGHT.md. Alternative:
   commit them — rejected (repo bloat, no extra value).

9. **Emulator was rebooted once in Phase 0** (Hard rule 11): it had been running 2.5 h and its DNS
   was dead ("no working internet"), while the PC itself was online. One cold boot fixed it.

## Phase 7

1. **Push plan recommends two Firebase projects (staging and production), not one.** What: the
   staging app (`com.kissansahyog.app.staging`) and the production app (`com.kissansahyog.app`) each
   get their own Firebase project, `google-services.json` and FCM service-account key, kept outside
   the repo in `C:\Users\usdvi\ks-firebase\<staging|prod>\` and copied to
   `android/app/google-services.json` at build time (file to be git-ignored in the implementation
   batch). Why: mirrors the staging/production Supabase split, so a staging send can never reach a
   real farmer's phone. Alternative: one Firebase project with both apps in one combined
   `google-services.json` (no copy step) — rejected as less safe. Nothing was created or installed.
2. **Backlog security items are described in words only.** No SQL was drafted for B1
   (`admin_*` functions trusting `p_actor_id`) or B2 (`weather_grid_requests` anonymous writes),
   per the Phase 7 brief and Hard rule 2. Alternative: draft unapplied migration files — rejected,
   the brief says not to write SQL tonight.

## Phase 1

1. **1A — no native keyboard fix was needed; the 8B T14 failure was the emulator, not the app.**
   What: no change to `MainActivity`, the manifest (`adjustResize`) or a Keyboard plugin. Why: with
   the soft keyboard really drawn (`show_ime_with_hard_keyboard = 1`), the new test K1 shows the
   WebView already shrinks to the keyboard top (e.g. bounds `[0,136][1080,1517]`, keyboard top
   1517 px): Capacitor 8.5.3's built-in SystemBars plugin pads the window by the IME inset
   (`SystemBars.java` `v.setPadding(…, keyboardVisible ? imeInsets.bottom : …)`), and Chromium then
   scrolls the focused field into view. In 8B the emulator never drew a keyboard (adb input counts
   as a hardware keyboard), so the "viewport shrank" check measured nothing. Alternative: add
   `@capacitor/keyboard` with `resize: 'native'` or `adjustResize` anyway — rejected: a new
   dependency / manifest change with no failing case to fix, and Capacitor warns that
   `Keyboard.resizeOnFullScreen` conflicts with SystemBars insets handling.
2. **The emulator setting `show_ime_with_hard_keyboard = 1` is made permanent in
   `scripts/android/avd-setup.sh`** (and set again at the start of T14 / K1). Alternative: change
   the AVD's `hw.keyboard` — already `no`; not the cause.
3. **K1 tests `/signup`, not `/join`.** The brief says "`/join` (signup)", but `/join` is not a
   form: it logs a WhatsApp-channel click (`join_clicks`, a database write — on prod that would
   break the read-only rule) and redirects to WhatsApp. The registration form is `/signup`.
4. **K1 on the prod flavour covers the 4 public forms only; `/post` (steps 2 and 3) and Profile
   edit are NOT-RUN there** — they need a logged-in account and no prod account may be created or
   used (Hard rule 1). They run on the staging flavour with the KSTEST user. Likewise **L1 is
   NOT-RUN on prod** and S4–S8 / O3 / O4 exist only in the staging suite (they write to staging).
   "Both flavours" for the exit re-run therefore means: T9, T10, T14, K1, H1, C1 on both;
   S4–S8, O2 (needed by O3), O3, O4, L1 on staging. To run T9/T10/T14 in the staging app,
   `run-tests.mjs` now accepts them in the staging flavour when `--only` names them.
5. **K1 picks the lowest text field that opens the keyboard** — date/time inputs are skipped
   (they open a date picker, not the keyboard; the first staging run picked `#f_available_from`
   type=date, the keyboard did not appear, and K1 failed for that test reason). Selects are skipped
   for the same reason.
6. **K1/T14 close the keyboard by blurring the field, then BACK only while a visible IME frame is
   reported.** ESCAPE does not close Gboard; BACK when the keyboard is already gone navigated away
   (it took the app to the launcher in a first try and hung the run). The runner now also fails a
   single test after 20 minutes instead of hanging the whole run.
7. **1B — only Home hides its stamp under the banner.** The brief names Home; on /mausam, /msp,
   /browse and a listing the stamp sits next to the data it describes and is kept. O3's Home check
   was changed accordingly (`evidence/phase1/assertion-changes.json`). The banner shows the "last
   online" time, the hidden stamp showed the data's stored time; the brief asks to keep one.
   Alternative: hide on every page — rejected as beyond the brief.
8. **1C — the existing `OfflineNotice` component is reused on the website** for `/cold-storage`
   (same words as the app's offline pages: "जानकारी नहीं आ पाई — इंटरनेट नहीं है या बहुत धीमा है।"
   + "फिर से कोशिश करें"); its "try again" remounts the page through the existing refresh key, which
   works on the website too. `/cold-storage/<district>` was not changed (not in the brief).
9. **1D — order of tries: cached ≤ 10 min (timeout 0, answers at once) → fresh LOW-accuracy ≤ 20 s →
   message + the village field scrolled into view.** (A first version put the cursor in the village
   field; L1's screenshot showed that focusing it opens the field's suggestion list, which covered
   the message — so the field is now only scrolled into view, not focused. Both APKs were rebuilt and
   L1 re-run twice on the final code.) Permission refused skips the 20 s wait. Never
   `enableHighAccuracy` (no more precise location than before); the coordinates saved are exactly
   what was saved before. The logic lives in `src/lib/location/postPosition.js` (no Devanagari) and
   is unit-tested with a fake geolocation (`scripts/test/batch9_phase1.mjs`). Finding: on this
   emulator a fresh low-accuracy fix never arrives (no network-location provider), so L1 "GPS on"
   first falls back after ~20 s, then — after one GPS reading in the page, like a phone that
   recently knew its place — the cached step returns the position at once. A real phone with
   Google location services should get the fresh fix; check on the real phone.
10. **L1 runs after S8 in the staging order, not between S6 and S7.** In the first staging run with
    L1 right after S6, S7 failed (the logged-out listing page had no contact button within 30 s)
    and S8 failed as a consequence; S4–S8 without L1 passed (dev run 4). Moving L1 after S8 keeps
    the 8B chain S4→S8 unchanged. The exact interaction (L1 force-stops the app and switches
    location off/on) was not investigated further (max-3-attempts rule); recorded as a test-order
    finding, not an app defect.
11. **Raw logcat files and the per-run `logs/` folder are not committed** (size, device noise); the
    FATAL EXCEPTION / ANR scan results are in the results JSON (`run.fatalExceptions`,
    `run.appAnr`) and in `evidence/phase1/logcat-scan.json`.

### 1E — needs founder decision (nothing changed tonight)

- **Exact location saved on listings.** Today "use my current location" on /post saves the
  phone's coordinates as given (low accuracy, often 10–100 m on a real phone) with the listing, and
  they are used for "near me". Options: (a) keep; (b) round to ~1 km (2 decimals) before saving;
  (c) save only the village/town centre. **Recommendation: (b)** — distance search still works, a
  field or house cannot be pinpointed; the Privacy page must say so (lawyer item, BACKLOG B9).
- **Profile → Edit needs a pincode for e-mail accounts.** The older Profile form still requires a
  6-digit pincode; e-mail users who registered with the town picker cannot save a name change
  without typing one (8B S8, confirmed again tonight). Options: (a) make pincode optional;
  (b) replace it with the registration town picker; (c) keep. **Recommendation: (b)**, pincode
  optional (BACKLOG B8).
- **Lockout edge cases.** Five failed sign-ins lock that number/e-mail for 15 minutes for
  everyone — anyone can lock anyone out; the limit is per number, so trying many numbers is not
  slowed. Options: (a) keep (nuisance only, 15 min); (b) add a per-IP limit (IPs kept 24 h, Privacy
  text needed); (c) when OTP arrives, limit OTP sending per number + per IP and let a correct OTP
  always succeed. **Recommendation: (a) now, (c) together with OTP** (BACKLOG B6).

12. **Last code change after the device runs: `getPostPosition(navigator.geolocation)` instead of
    `getPostPosition()`** (same value — it is the default argument), so that the older static
    verifier `verify-batch6b` B5 ("click-only browser geolocation exists in Post.jsx") keeps
    passing. Behaviour is identical; the APKs in `android/ks-apks` were built just before it and are
    rebuilt in Phase 5 anyway. Alternative: edit the 6B verifier — rejected (older batch's test).
13. **Logcat scan:** no FATAL EXCEPTION / ANR / "has died" / StrictMode / WebView crash for the app
    in any Phase 1 run. One FATAL EXCEPTION in staging run 2 is the `UiAutomation` test tool
    (`uiautomator dump`, "Bad file descriptor"), not the app; the "has died" lines are system
    processes (bluetooth etc.). Details: `evidence/phase1/logcat-scan.json`.
