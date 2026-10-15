# Batch 9 — Phase 5C: real-world conditions and coverage

**Run: 2026-10-15, ~12:10–13:50 IST, resume session. NO EMULATOR** — the PC was critically low on memory (Claude Code had
already stopped an emulator job with the instruction not to restart it; available memory during this phase was
0.4–0.8 GB). Everything below that "RAN" ran on the **STAGING WEBSITE** https://staging.kissansahyog.com in ONE headless
Chromium at a time, phone viewport, every command in the foreground under `timeout 540`.

> **Web stand-in, not the app.** The app runs the same React bundle inside an Android WebView, so these results are
> indicative for the app. Known differences: WebView version and its textZoom handling, native back button, the
> app's offline cache layer, the JS bundle is inside the APK (so the app never waits for JS over the network),
> status/navigation-bar insets. No result below is claimed for the app.

Scripts: `scripts/phase5c/` (routes, display, network, perf, helpers). Evidence: `docs/review/batch9/evidence/phase5c/`.
Throw-away accounts only for writes (`KSTEST 5C-S1`, `KSTEST 5C-S2`); KEEP personas only read (P2 logged in for
auth routes and the display checks; Post was never submitted). Prod: never opened by the interactive scripts (the
Phase 5B prod guard aborts any request to the prod ref / prod hosts).

## Summary

| Item | Status | One line |
|---|---|---|
| 5C.1 Route coverage map | **RAN-PASSED (web)** / app part **NOT-RUN** | 56 patterns; 56/56 visited on the web tonight, all passed (content, no ErrorBoundary, no new console error, Back works); in the app only 26/56 ever visited (earlier runs) — see ROUTE_COVERAGE.md |
| 5C.2 Old and different devices | **NOT-RUN** | no emulator (low memory); `scripts/android/avd-matrix.sh` written, `bash -n` only |
| 5C.3 Text and display (web stand-in) | **RAN-FAILED** | no horizontal scroll, nothing hidden behind the bottom bar, primary buttons reachable in all 8 settings × 11 screens; but Browse/Home cards clip text at font 1.3/1.5 and at display "large" (WhatsApp button cut to "WhatsA"), and small tap targets (< 44×44) exist even at default settings |
| 5C.4 Bad networks (web stand-in) | **RAN-FAILED** | 9 of 11 checks passed; **retrying a post whose answer was lost creates a DUPLICATE listing**; on 2G the website shows the homepage for ~45 s under the /browse URL |
| 5C.5 App lifecycle | **NOT-RUN** | no emulator |
| 5C.6 Random-tap stress (monkey) | **NOT-RUN** | no emulator; `scripts/android/monkey-stress.sh` written, `bash -n` only |
| 5C.7 Performance — web part | **RAN-PASSED (web numbers)** | cold load to live content ≈ 2.0 s (/) and 1.9 s (/mausam) with 4× CPU throttle; JS heap 5.2 → 7.2 MB after 3 min / 120 navigations (no climb) |
| 5C.7 Performance — device part | **NOT-RUN** | cold start on the low-RAM AVD, IndexedDB cache size: need the emulator |
| 5C.7 APK / AAB sizes | recorded (from files, nothing built) | see below |

## 5C.1 Route coverage — RAN-PASSED on the web; in-app coverage NOT-RUN

Full table: [`ROUTE_COVERAGE.md`](ROUTE_COVERAGE.md).
- Patterns total **56** · visited in the APP (earlier emulator runs, 8B + 9 Phase 1/5) **26** · visited on the WEB tonight **56** (56 RAN-PASSED) · unvisitable **0**.
- "Visited in the app" is ONLY what the earlier emulator runs reached; tonight added nothing in the app. The 100 %-in-the-app target is not met (30 patterns never opened inside the app). The morning command that closes it is below (T5/S10 + a sweep on the emulator).
- 11 guard checks RAN-PASSED (protected routes logged out, PublicOnly routes logged in, listing/browse logged in).
- HUMAN-REVIEW: logged-out `/post` `/home` `/my` `/profile` `/experts` go to the **homepage**, not to login (App.jsx `Protected`). Low: `/resources` → 308 `/resources/`.

## 5C.3 Text and display — RAN-FAILED (web stand-in)

How each Android setting was simulated (`scripts/phase5c/display.mjs`):
- **font_scale 1.3 / 1.5**: the Android WebView scales TEXT by the system font scale (textZoom) — every computed font-size grows, box sizes in px do not. Simulated by reading every element's computed font-size (and px line-height) after the page settled and re-applying it × 1.3 / × 1.5 as an inline style (re-applied after each Post step). Not used: `document.documentElement.style.fontSize` (misses the many `text-[13px]`-style px sizes and would also grow rem paddings, which textZoom does not) and `--force-device-scale-factor` (scales the whole page like a zoom, so nothing can overflow — it would hide exactly the problems we look for). Whether the real WebView applies the system font scale to this app must be confirmed on the phone/emulator (morning).
- **display size "large"**: CSS viewport 412 → 360 px wide, deviceScaleFactor 3.
- **dark mode**: `colorScheme: 'dark'`. The app has no dark styles and targets SDK 36 without algorithmic darkening, so the expectation is "stays fully light"; it did (body background `rgb(251,250,245)` in every page; the 1–2 dark blocks on /home are the same as in light mode — the dark-green bands — not partial darkening).
- **phone language**: browser locale hi-IN / en-IN plus the app's own language switch. Note: the phone language does NOT change the app's language — the app always starts in Hindi unless the user switches (`LanguageProvider.jsx`, `DEFAULT_LANG = 'hi'`). By design; recorded.

Screens: `/` (homepage = app start), `/mausam`, `/browse`, a listing detail, `/signup` (not submitted), `/login`, `/home`, `/profile`, Post step 1, 2 (filled) and 3 (NOT submitted). 8 settings × 11 screens = 88 checks, 0 errors.

| Setting | Horizontal page scroll | Content behind bottom bar | Primary buttons reachable | Clipped text | Tap targets < 44×44 (per screen) |
|---|---|---|---|---|---|
| default (font 1.0, 412 px, light, hi) | 0 / 11 | 0 / 11 | 11 / 11 | none | 5–28 (pre-existing) |
| font 1.3 (hi) | 0 | 0 | 11 / 11 | `/`, `/browse` | 4–28 |
| font 1.5 (hi) | 0 | 0 | 11 / 11 | `/`, `/browse` | 3–27 |
| font 1.5 (en, en-IN) | 0 | 0 | 11 / 11 | `/`, `/browse` | 3–27 |
| display large (360 px) | 0 | 0 | 11 / 11 | `/`, `/browse` | 5–28 (+ Call button 40 px wide on Browse cards) |
| large + font 1.5 | 0 | 0 | 11 / 11 | `/`, `/browse` | 3–27 |
| dark mode | 0 | 0 | 11 / 11 | none | 5–28 |
| English (en-IN + app en) | 0 | 0 | 11 / 11 | `/` | 4–27 |

Every one of the 88 checks is RAN-FAILED under the strict rule because of the tap-target assertion (or clipping); the three
layout assertions (no horizontal scroll, nothing under the bottom bar, primary buttons reachable) passed everywhere.
Per-check data: `evidence/phase5c/results-display.json`; screenshots per setting in `evidence/phase5c/display/<setting>/`.

Findings:
- **D1 (medium) — Browse listing cards clip their text and buttons** at font 1.5 (card content 219 px in a 184 px card) and at display "large" (165 in 158): the WhatsApp button reads "WhatsA", place names are cut. Same on the homepage listing/article preview cards at font 1.3+ and in English. Evidence: `display/cards/cards-412-font1.5.jpg` (vs `cards-412-font1.0.jpg`), `display/cards/cards-360-font1.0.jpg`, `display/f15/_browse.jpg`, `display/f13/_.jpg`, `display/en/_.jpg`.
- **D2 (medium, pre-existing at default settings) — tap targets below 44×44 CSS px** on every screen: header language toggle "हिं"/"EN" 32×32 and 39×32, search 38×44, menu ☰ 36×44, account "K" 36×44; location "बदलें" 29×23 and "मेरी लोकेशन हटाएँ" 107×23; homepage "सभी देखें →" links 21 px high; ticker price links 21 px high; Post step 2 help "?" 24×44; dismiss "✕" 23×44. Evidence: `display/base/*.jpg` + `results-display.json` (`detail.small`).
- No horizontal page scroll and no text hidden behind the bottom navigation in any setting.

## 5C.4 Bad networks — RAN-FAILED (web stand-in)

Method (`scripts/phase5c/network.mjs`): slow loads via CDP `Network.emulateNetworkConditions` with cache disabled
(2G-like 250 kbit/s down / 50 up / 800 ms RTT; EDGE-like 240/200 kbit/s, 400 ms — measured effective speed of the
biggest file confirms the throttle was active). Connection cuts IN THE MIDDLE of an action, two ways: **(a)** the
request is aborted (`internetdisconnected`) and the browser goes offline (`context.setOffline`); **(b) "answer lost"**:
the request reaches the server (`route.fetch`) but the reply is thrown away and the browser goes offline. Then the
connection returns and the user retries the obvious way.

| Check | Status | What happened |
|---|---|---|
| `/` on 2G, cold | RAN-PASSED | the prerendered homepage (incl. the build-time mandi ticker) visible at 1.5 s, no spinner left; the selector used for "content" is already in the prerendered HTML, so this does not time the live data |
| `/` on EDGE, cold | RAN-PASSED | content at 1.1 s |
| `/browse` on 2G, cold | **RAN-FAILED** | for ~45 s the visitor sees the **homepage** ("आज किसान के लिए") under the /browse URL (the server's SPA fallback is the prerendered homepage HTML while 927 kB download), then a spinner, Browse with cards at 52 s. WEB-ONLY: in the app the JS is inside the APK. Evidence `network/slow-2g-browse.jpg`, timeline in results-network.json |
| Sign-up, cut before the profile is created | RAN-PASSED | form comes back with all data kept, message "कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।" + the red "आप ऑफ़लाइन हैं" banner; the half-made account (auth user, no profile) cannot log in yet; tapping "create account" again after reconnect finishes it — ONE account, e-mail and mobile log in to the same id. `network/signup-S1-*.jpg` |
| Sign-up, answer lost (server created it) | RAN-PASSED | same message; no second account; e-mail and mobile both log in to the same id (a retry of the form would say "e-mail already registered" — safe but confusing) |
| Login by mobile, cut | RAN-PASSED | message, not logged in; retry logs in |
| Login by e-mail+password, cut | RAN-PASSED | message, not logged in; retry logs in |
| Contact reveal, cut | RAN-PASSED | error message in the sheet, no number, no endless spinner; close + tap again shows the number (masked in the screenshot) |
| Post, cut before the server | RAN-PASSED | message, stays on step 3; retry posts exactly ONE listing |
| **Post, answer lost (server created it)** | **RAN-FAILED** | message shown, user taps Post again → **TWO identical listings** (My Listings 1 → 3; ids `e0b5f22c-…` and `666ff01a-…`). No idempotency key on `create_listing_with_location`. On a flaky village network this will happen. Evidence `network/post-after-dropped.jpg`, `network/post-after-after-retry.jpg` |
| Post with photo, cut during the photo upload | RAN-PASSED | message, retry posts ONE listing and it carries the photo |

Findings: **N1 (high) duplicate listing on retry after a lost answer**; **N2 (medium, web only) homepage shown under /browse on 2G for ~45 s**; N3 (low) every network failure shows the generic "something went wrong" text rather than "no internet" (the offline banner does appear).

Data written on staging (all `KSTEST`, keep:false): 2 throw-away accounts (5C-S1, 5C-S2), 4 bhusa listings (`932fb10d…`, `e0b5f22c…`, `666ff01a…`, `70517023…`), 1 `join_clicks` row, contact-click/view counters on KEEP listing `76e13f41…` — all in `staging-test-data.json`.

## 5C.7 Performance — web numbers RAN-PASSED; device numbers NOT-RUN

**Sizes** (files from earlier phases, nothing built tonight): debug APKs (Phase 5, release-9): ks-production.apk 11,921,269 B · ks-staging.apk 11,921,793 B · ks-staging-local.apk 11,952,283 B. Release builds (Phase 3, 03:29, from the pre-Phase-4 tree): ks-production-release.aab 10,093,854 B · ks-staging-release.aab 10,093,930 B · ks-production-release.apk 10,345,947 B · ks-staging-release.apk 10,345,995 B.

**Web cold load** (`scripts/phase5c/perf.mjs`, new browser context each run = empty cache, service worker blocked, 412×915, **4× CPU throttling**, real network; 3 runs, median). "Live content" = the hydrated page showing its own live data (home: place banner/nearby counts from a granted Sagar position; /mausam: a temperature from the weather service):

| Page | First paint (median) | Live content (median) | Runs (live, ms) | Transferred |
|---|---|---|---|---|
| `/` | 852 ms | **1,986 ms** | 2,371 / 1,986 / 1,897 | 2,119 kB |
| `/mausam` | 812 ms | **1,879 ms** | 1,996 / 1,783 / 1,879 | 581 kB |

**Web JS heap** after ~3 minutes / 120 in-app navigations over 12 screens (CDP `Performance.getMetrics`): start 5.2 MB → end 7.3 MB → after forced GC 7.2 MB; per-lap 7.3–8.9 MB with no upward trend; DOM nodes back to 1,772 and listeners 460. No sign of a leak. (Spec asked 5 minutes on the device; 3 minutes on the web was what fitted the memory budget.)
Not measured: cold start of the APK (needs the emulator), IndexedDB cache size vs the 5 MB cap (app-only cache layer).

## NOT-RUN items and why

All for the same reason: **no emulator this session** (critically low PC memory; Claude Code stopped an emulator job and said not to restart it — see DECISIONS.md "Orchestrator (resume session) — low memory").
- 5C.1 in-app part (30 patterns never opened in the app), 5C.2 device matrix, 5C.3 on the real WebView (font_scale / wm density / dark / phone locale via adb), 5C.4 in the app (adb emu network, airplane mode, offline cache), 5C.5 lifecycle (kill/reopen, rotation, deep links), 5C.6 monkey, 5C.7 device numbers (cold start, low-RAM AVD, IndexedDB size).

## Morning commands (run ONE emulator job at a time; close Firefox/ChatGPT first — the emulator needs ~4 GB free)

```bash
cd ~/projects/Kissansahyog
# 0. main emulator up + staging APK present
bash scripts/android/avd-setup.sh
ls -l android/ks-apks/ks-staging.apk

# 5C.1 in the app: all 15 T5 routes + 404 inside the staging app, then the full staging smoke
ANDROID_SERIAL=emulator-5554 KS_FLAVOR=staging timeout 3600 node scripts/android/run-tests.mjs --skip-build --only S10,S4,S5,S6,S7,S8 \
  --out docs/review/batch9/evidence/phase5c/app-routes/results.json --evidence docs/review/batch9/evidence/phase5c/app-routes

# 5C.3 on the real WebView (restore defaults afterwards!)
adb shell settings put system font_scale 1.3    # then 1.5; restore: adb shell settings put system font_scale 1.0
adb shell wm density 480                         # "large" on the 420-dpi Pixel 7 AVD; restore: adb shell wm density reset
adb shell cmd uimode night yes                   # restore: adb shell cmd uimode night no
#   (after each: open Home, Mausam, Browse, Post 1-3, Signup, Login, Profile, a listing; look for the D1 card clipping)

# 5C.4 in the app
adb emu network speed edge && adb emu network delay gsm      # restore: adb emu network speed full && adb emu network delay none
adb shell cmd connectivity airplane-mode enable              # mid-action; restore: ... disable

# 5C.5 lifecycle
adb shell am kill com.kissansahyog.app.staging               # after sending the app to background (KEYCODE_HOME)
adb shell am start -a android.intent.action.VIEW -d https://kissansahyog.com/mausam
adb shell am start -a android.intent.action.VIEW -d https://kissansahyog.com/listing/76e13f41-f2eb-4565-998a-5244640329b7
adb shell settings put system accelerometer_rotation 0 && adb shell settings put system user_rotation 1   # landscape; back: user_rotation 0

# 5C.6 monkey (log the staging app in as a THROW-AWAY KSTEST account first, never a KEEP persona)
bash scripts/android/monkey-stress.sh                         # seeds 5150, 20261015, 777; 15 000 events each, throttle 100
bash scripts/android/monkey-stress.sh --seed 5150             # reproduce one seed

# 5C.2 old / small devices (downloads system images, ~1.5 GB each; stops the matrix emulator after each device)
bash scripts/android/avd-setup.sh --stop                      # free the memory of the main emulator first
bash scripts/android/avd-matrix.sh --device api24             # then api30, then small (or --device all)
bash scripts/android/avd-matrix.sh --delete api24             # free disk afterwards (never touches ks_test_api36)
```
