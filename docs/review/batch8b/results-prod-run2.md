**Verdict:** 18 tests — 16 RAN-PASSED / 1 RAN-FAILED / 0 NOT-RUN / 1 HUMAN-REVIEW

Source: `docs/review/batch8b/results-prod-run2.json` · run 2026-10-14T11:52:30.620Z → 2026-10-14T12:04:53.330Z · device emulator-5554 (API 36, WebView 133.0.6943.137) · APK sha256 d741da28427574eb… · emulator "System UI isn't responding" dialogs answered "Wait": 1

| ID | Test | Status | Assertion | Evidence |
|---|---|---|---|---|
| T1 | Clean build | **RAN-PASSED** | npm run android:debug from a clean tree exits 0 and produces the debug APK (size + sha256 recorded) | docs/review/batch8b/evidence/prod/T1/ (3 files) |
| T2 | APK facts | **RAN-PASSED** | aapt2: package com.kissansahyog.app, label "Kisan Sahyog", minSdk 24, targetSdk 36, versionName 0.1.0, debuggable, permissions exactly the decided set | docs/review/batch8b/evidence/prod/T2/ (3 files) |
| T3 | Bundle safety | **RAN-PASSED** | APK web assets: production ref present; staging ref/host, service_role, GEMINI_API_KEY, sb_secret all absent; packaged capacitor.config has no server.url (counts only) | docs/review/batch8b/evidence/prod/T3/ (2 files) |
| T4 | Install + cold start | **RAN-PASSED** | After install and am start -W: process alive at 10 s, no FATAL EXCEPTION, page is https://localhost/, text contains "किसान", screenshot is not blank | docs/review/batch8b/evidence/prod/T4/ (3 files) |
| T5 | Routes render | **RAN-PASSED** | 15 routes + 1 invalid path: main content renders, no ErrorBoundary, no uncaught page error, no console.error outside the documented allowlist | docs/review/batch8b/evidence/prod/T5/ (19 files) |
| T6 | Deep link + reload | **RAN-PASSED** | Direct navigation to /yojana/central and a real /sawaal/<slug>, then reload: the same page renders (SPA fallback) | docs/review/batch8b/evidence/prod/T6/ (3 files) |
| T7 | Live data (read-only) | **RAN-PASSED** | /mausam, /msp, the mandi ticker on / and the listings on /browse load real data: HTTP 200 from the data host AND non-empty values in the DOM | docs/review/batch8b/evidence/prod/T7/ (6 files) |
| T8 | No service worker | **RAN-PASSED** | navigator.serviceWorker.getRegistrations() is empty, no update/install banner in the DOM, sw.js is absent from the APK | docs/review/batch8b/evidence/prod/T8/ (2 files) |
| T9 | Edge-to-edge / safe areas | **RAN-PASSED** | API 36 portrait: NavBar below the status bar, tab bar buttons above the navigation bar and not covered, offline banner below the status bar, last footer link fully visible above the tab bar | docs/review/batch8b/evidence/prod/T9/ (9 files) |
| T10 | Offline | **RAN-PASSED** | Airplane mode + cold launch: app shell renders (not a browser error page), offline banner visible, no crash; /, /browse, /mausam, /msp, /about show content or an in-app failure state; back online the banner goes within 15 s and /mausam loads data | docs/review/batch8b/evidence/prod/T10/ (10 files) |
| T11 | Back button | **RAN-PASSED** | / → /browse → /bazaar, back, back lands on /; back on / leaves the app (launcher resumed) — adb keyevent 4 + dumpsys activity | docs/review/batch8b/evidence/prod/T11/ (4 files) |
| T12 | External intents | **RAN-PASSED** | A real external https link leaves the WebView and returning shows the same in-app page; a mailto: and a tel: link dispatch their intents | docs/review/batch8b/evidence/prod/T12/ (6 files) |
| T13 | Location | **RAN-PASSED** | With location permission granted and the emulator position set, "Share my location" shows that place; with permission refused the app shows its fallback state without crashing | docs/review/batch8b/evidence/prod/T13/ (4 files) |
| T14 | Keyboard + search | **RAN-FAILED** | On /search a tap opens the keyboard, the input stays inside the visual viewport, and a query known to have results renders results | docs/review/batch8b/evidence/prod/T14/ (4 files) |
| T15 | Persistence | **RAN-PASSED** | A localStorage value set over CDP survives force-stop + relaunch (then it is deleted) | docs/review/batch8b/evidence/prod/T15/ (2 files) |
| T16 | Icon + splash | **HUMAN-REVIEW** | Launcher icons at all densities + adaptive-icon XML exist and are packaged; launcher and splash screenshots captured for a person to judge | docs/review/batch8b/evidence/prod/T16/ (7 files) |
| T17 | Server calls + CORS | **RAN-PASSED** | (a) no raw relative fetch() to a server function is left in src/; (b) functions/_middleware.js answers OPTIONS/GET with the exact origin for the two app origins and adds nothing for other origins | docs/review/batch8b/evidence/prod/T17/ (3 files) |
| T18 | Web regression | **RAN-PASSED** | (a) apiUrl()/isNative() are inert without Capacitor; (b) the web build succeeds; (c) main-chunk size before vs after is reported; (d) vite preview in desktop Chromium loads, registers a service worker, no console errors | docs/review/batch8b/evidence/prod/T18/ (5 files) |

**Not a plain pass — read these:**

- **T14 RAN-FAILED** — FAILED: the viewport shrank for the keyboard ({"viewportHeight":839.2380981445312,"screenHeight":915}) \| query "wheat" → 16 results
- **T16 HUMAN-REVIEW** — File checks passed; whether the icon and splash LOOK right needs a person (see launcher-app-list.jpg and splash-frame-*.jpg).
