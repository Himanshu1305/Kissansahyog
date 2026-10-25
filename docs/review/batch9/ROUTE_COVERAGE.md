# Batch 9 — route coverage map (Phase 5C.1)

**Route patterns in `src/App.jsx`: 56** (incl. the `*` 404 route)
- **Visited in the APP (emulator), earlier runs: 26 / 56** — batch 8B and batch 9 Phase 1/5 emulator runs only. Tonight NO emulator ran (low PC memory), so this number did not grow; the 5C target "100 % in the app" is **NOT met** (30 patterns never opened inside the app).
- **Visited on the WEB tonight (staging website, phone viewport, web stand-in): 56 / 56** — 56 RAN-PASSED, 0 RAN-FAILED. Visited on the web at any time in batch 9: 56 / 56.
- **Unvisitable: 0** (every pattern was opened at least once, in the app or on the web).
- Guard checks (extra, not patterns): 11 / 11 RAN-PASSED.

"Web stand-in, not the app": the website serves the same React bundle the app wraps in an Android WebView, against the same staging Supabase project. Possible differences in the app: WebView version, native back button (NativeShell), links opened outside the app (T12), offline cache layer (app only), status/navigation-bar insets.

Each web visit (`scripts/phase5c/routes.mjs`, results in `evidence/phase5c/results-routes.json`): real id from the live parent page or a known real slug; assertions = real content (> 150 characters), no ErrorBoundary ("This page could not open"), not the 404 page (except `*`), stays on the route, no spinner left, no new console error or page error (allowlist: the known CSP block of Supabase-Storage photos from Phase 4), and **browser Back**: an in-app link on the page is followed (SPA navigation) and Back must return to the same route with its content. Logged-out visits use a fresh browser; logged-in visits use KEEP persona P2 (read-only; nothing submitted).

| # | Route pattern | Earlier in the APP | Earlier on the WEB | Tonight (web) | Concrete path | Result detail |
|---|---|---|---|---|---|---|
| 1 | `/` | T5 T7 T10 O2/O3 | P4 gates | RAN-PASSED (logged out) | `/` | h1 "आज किसान के लिए"; back via /bazaar → OK |
| 2 | `/welcome` | — | — | RAN-PASSED (logged out) | `/welcome` | h1 "किसान सहयोग"; back via / → OK |
| 3 | `/signup` | K1 S4 | P5B | RAN-PASSED (logged out) | `/signup` | h1 "नया खाता बनाएं"; back via / → OK |
| 4 | `/login` | T5 S5 K1 | P5B | RAN-PASSED (logged out) | `/login` | h1 "लॉग इन करें"; back via /signup → OK |
| 5 | `/privacy` | T5 | P4 | RAN-PASSED (logged out) | `/privacy` | h1 "गोपनीयता नीति"; back via / → OK |
| 6 | `/terms` | T5 | P4 | RAN-PASSED (logged out) | `/terms` | h1 "उपयोग की शर्तें"; back via / → OK |
| 7 | `/grievance` | K1 S11 | P4 P5B | RAN-PASSED (logged out) | `/grievance` | h1 "सुझाव और शिकायत"; back via / → OK |
| 8 | `/contact` | T5 T12 | — | RAN-PASSED (logged out) | `/contact` | h1 "हमसे संपर्क करें"; back via / → OK |
| 9 | `/founder` | — | — | RAN-PASSED (logged out) | `/founder` | h1 "42 वर्ष की सेवा। एक संकल्प: किसान की आय बढ़ाना।"; back via / → OK |
| 10 | `/about` | T5 | P4 | RAN-PASSED (logged out) | `/about` | h1 "हमारे बारे में"; back via / → OK |
| 11 | `/how-to-use` | — | — | RAN-PASSED (logged out) | `/how-to-use` | h1 "वेबसाइट कैसे इस्तेमाल करें"; back via / → OK |
| 12 | `/cold-storage` | T5 C1 | P4 C1-web | RAN-PASSED (logged out) | `/cold-storage` | h1 "मध्य प्रदेश कोल्ड स्टोरेज खोजें"; back via / → OK |
| 13 | `/cold-storage/:district` | — | — | RAN-PASSED (logged out) | `/cold-storage/indore` | h1 "Indore कोल्ड स्टोरेज"; back via / → OK |
| 14 | `/greenhouse/subsidy` | — | — | RAN-PASSED (logged out) | `/greenhouse/subsidy` | h1 "ग्रीनहाउस / पॉलीहाउस सब्सिडी और खेती गाइड (मध्य प्रदेश)"; back via / → OK |
| 15 | `/greenhouse` | — | — | RAN-PASSED (logged out) | `/greenhouse` | h1 "ग्रीनहाउस / पॉलीहाउस"; back via / → OK |
| 16 | `/carbon-credit/niti-sujhav` | — | — | RAN-PASSED (logged out) | `/carbon-credit/niti-sujhav` | h1 "कार्बन क्रेडिट — नीति सुझाव (मध्य प्रदेश)"; back via / → OK |
| 17 | `/carbon-credit` | — | P5B | RAN-PASSED (logged out) | `/carbon-credit` | h1 "कार्बन क्रेडिट: क्या यह किसानों की आय का नया ज़रिया बन सकता है — और क्या मध्य प्रदेश को इसे अपनाना चाहिए?"; back via / → OK |
| 18 | `/jugaad/jankari` | — | — | RAN-PASSED (logged out) | `/jugaad/jankari` | h1 "जुगाड़ और देसी आविष्कार: पूरी जानकारी गाइड"; back via / → OK |
| 19 | `/jugaad` | — | — | RAN-PASSED (logged out) | `/jugaad` | h1 "जुगाड़ / देसी आविष्कार"; back via / → OK |
| 20 | `/join` | — | — | RAN-PASSED (logged out) | `/join?src=ks5c-route-sweep` | h1 "आज किसान के लिए"; back: not tried (no in-app link / leaves the app) |
| 21 | `/bazaar` | T5 T11 | — | RAN-PASSED (logged out) | `/bazaar` | h1 "किसान सहयोग बाज़ार"; back via / → OK |
| 22 | `/bazaar/:slug` | — | — | RAN-PASSED (logged out) | `/bazaar/equipment` | h1 "🚜 कृषि मशीनें और उपकरण"; back via / → OK |
| 23 | `/search` | T5 T14 | — | RAN-PASSED (logged out) | `/search?q=gehu` | back via /msp/gehun → OK |
| 24 | `/articles` | — | — | RAN-PASSED (logged out) | `/articles` | h1 "लेख"; back via / → OK |
| 25 | `/articles/:slug` | — | — | RAN-PASSED (logged out) | `/articles/parali-pollution-kisaan-ki-majboori` | h1 "पराली जलाना — किसान की मजबूरी या हमारी गलत सोच?"; back via / → OK |
| 26 | `/resources` | T12 | — | RAN-PASSED (logged out) | `/resources` | h1 "उपयोगी संपर्क — किसान सहयोग"; back via / → OK; landed /resources/; server redirected to a trailing-slash URL |
| 27 | `/info` | — | — | RAN-PASSED (logged out) | `/info` | h1 "किसान की जानकारी"; back via / → OK |
| 28 | `/sawaal` | T5 | P4 P5B | RAN-PASSED (logged out) | `/sawaal` | h1 "किसान सवाल — आपके सवाल, हमारे जवाब"; back via /sawaal/masoor-fali-chhedak-control → OK |
| 29 | `/sawaal/vishay/:category` | — | — | RAN-PASSED (logged out) | `/sawaal/vishay/disease` | h1 "रोग — किसान सवाल — जानकारी"; back via / → OK; landed /sawaal/vishay/disease/; server redirected to a trailing-slash URL |
| 30 | `/fasal/:crop/samasya` | — | — | RAN-PASSED (logged out) | `/fasal/lentil/samasya` | h1 "मसूर की आम समस्याएँ और समाधान"; back via / → OK |
| 31 | `/sawaal/:slug` | T6 | — | RAN-PASSED (logged out) | `/sawaal/masoor-fali-chhedak-control` | h1 "मसूर में फली छेदक का नियंत्रण कैसे करें?"; back via / → OK |
| 32 | `/safalta` | — | P5B | RAN-PASSED (logged out) | `/safalta` | h1 "किसान सफलता — जब किसान जीतता है"; back via / → OK |
| 33 | `/yojana` | T5 | P4 | RAN-PASSED (logged out) | `/yojana` | h1 "सरकारी योजनाएं"; back via / → OK |
| 34 | `/yojana/central` | T6 T12 | — | RAN-PASSED (logged out) | `/yojana/central` | h1 "केंद्र सरकार की योजनाएं"; back via / → OK |
| 35 | `/yojana/mp` | — | — | RAN-PASSED (logged out) | `/yojana/mp` | h1 "मध्यप्रदेश सरकार की योजनाएं"; back via / → OK |
| 36 | `/yojana/:slug` | — | — | RAN-PASSED (logged out) | `/yojana/e-krishi-yantra` | h1 "ई-कृषि यंत्र अनुदान योजना"; back via / → OK |
| 37 | `/videos` | — | — | RAN-PASSED (logged out) | `/videos` | h1 "खेती के वीडियो"; back via / → OK |
| 38 | `/drone-didi` | — | — | RAN-PASSED (logged out) | `/drone-didi` | h1 "ड्रोन दीदी — महिला उद्यमी, आधुनिक तकनीक"; back via / → OK |
| 39 | `/mausam` | T5 T7 O2/O3 | P4 P2 P5B | RAN-PASSED (logged out) | `/mausam` | h1 "सागर मौसम — आज और 7 दिन का पूर्वानुमान"; back via /cold-storage → OK |
| 40 | `/fasal-salah` | — | — | RAN-PASSED (logged out) | `/fasal-salah` | h1 "फसल सलाह — इस मौसम में क्या करें"; back via / → OK |
| 41 | `/agro-forestry` | — | — | RAN-PASSED (logged out) | `/agro-forestry` | h1 "एग्रो फॉरेस्ट्री और उद्यानिकी"; back via /founder → OK |
| 42 | `/msp` | T5 O2/O3 | P4 | RAN-PASSED (logged out) | `/msp` | h1 "गेहूं भाव — आज व MSP से तुलना"; back via /cold-storage → OK |
| 43 | `/msp/:crop` | — | — | RAN-PASSED (logged out) | `/msp/gehun` | h1 "गेहूं भाव — आज व MSP से तुलना"; back via /cold-storage → OK |
| 44 | `/credits` | — | — | RAN-PASSED (logged out) | `/credits` | h1 "फोटो श्रेय"; back via / → OK |
| 45 | `/kisan-mela/submit` | — | P5B | RAN-PASSED (logged out) | `/kisan-mela/submit` | h1 "मेले की जानकारी दें"; back via / → OK |
| 46 | `/kisan-mela` | T5 T12 | P5B | RAN-PASSED (logged out) | `/kisan-mela` | h1 "किसान मेला कैलेंडर"; back via / → OK |
| 47 | `/home` | S4 | P5B | RAN-PASSED (logged in) | `/home` | back via / → OK |
| 48 | `/browse` | T5 O2/O3 | P4 P2 P5B | RAN-PASSED (logged out) | `/browse` | h1 "आस-पास खोजें"; back via / → OK |
| 49 | `/post` | K1 L1 S6 | P5B | RAN-PASSED (logged in) | `/post` | h1 "नई लिस्टिंग डालें · 1/3"; back via /sawaal/garlic-thrips-mite → OK |
| 50 | `/listing/:id` | S7 O2/O3 | P5B | RAN-PASSED (logged out) | `/listing/76e13f41-f2eb-4565-998a-5244640329b7` | h1 "लिस्टिंग"; back via /browse?cat=transport → OK |
| 51 | `/my` | S6 S8 | P5B | RAN-PASSED (logged in) | `/my` | h1 "मेरी लिस्टिंग"; back via / → OK |
| 52 | `/experts` | — | — | RAN-PASSED (logged in) | `/experts` | h1 "विशेषज्ञ / Experts"; back via / → OK |
| 53 | `/experts/:id` | — | — | RAN-PASSED (logged in) | `/experts/00000000-0000-4000-a000-0000000e0001` | h1 "विशेषज्ञ / Experts"; back via / → OK |
| 54 | `/profile` | K1 S8 | P5B | RAN-PASSED (logged in) | `/profile` | h1 "मेरी प्रोफ़ाइल"; back via / → OK |
| 55 | `/admin` | — | — | RAN-PASSED (logged in) | `/admin` | h1 "पहुँच नहीं"; back via / → OK; admin screen for a non-admin: expected a "no access" message, not a crash |
| 56 | `*` | T5 (invalid path) | P2 | RAN-PASSED (logged out) | `/ks-route-does-not-exist-5c` | h1 "यह पेज नहीं मिला (404)"; back via / → OK |

App test ids: T* = prod-flavour suite (8B / 9), S*/O* = staging-flavour suite, K1/H1/C1/L1 = batch 9 Phase 1. Web: P4 = Phase 4 staging gates, P2 = Phase 2 service-worker test, P5B = Phase 5B web runs, C1-web = Phase 1 web cold-storage test.

## Guard checks (tonight, web)

| Check | Expected (from the code) | Result | Landed on |
|---|---|---|---|
| /admin logged out → redirect-login | AdminOnly → /login | RAN-PASSED | `/login` |
| /login logged in → redirect-away | PublicOnly → /home | RAN-PASSED | `/home` |
| /signup logged in → redirect-away | PublicOnly → /home | RAN-PASSED | `/home` |
| /welcome logged in → redirect-away | PublicOnly → /home | RAN-PASSED | `/home` |
| /listing/76e13f41-f2eb-4565-998a-5244640329b7 logged in → content | page renders for a logged-in user | RAN-PASSED | `/listing/76e13f41-f2eb-4565-998a-5244640329b7` |
| /browse logged in → content | page renders for a logged-in user | RAN-PASSED | `/browse` |
| /home logged out → redirect-home | Protected → / (App.jsx `Protected` uses `<Navigate to="/">`) | RAN-PASSED | `/` |
| /post logged out → redirect-home | Protected → / (App.jsx `Protected` uses `<Navigate to="/">`) | RAN-PASSED | `/` |
| /my logged out → redirect-home | Protected → / (App.jsx `Protected` uses `<Navigate to="/">`) | RAN-PASSED | `/` |
| /experts logged out → redirect-home | Protected → / (App.jsx `Protected` uses `<Navigate to="/">`) | RAN-PASSED | `/` |
| /profile logged out → redirect-home | Protected → / (App.jsx `Protected` uses `<Navigate to="/">`) | RAN-PASSED | `/` |

## Notes and findings from the sweep
- **Logged-out /post, /home, /my, /profile, /experts send the visitor to the homepage (`/`), not to the login page** (App.jsx `Protected`). Works as coded (RAN-PASSED against the code), but a logged-out farmer tapping "Post" lands on the homepage without being told to log in — HUMAN-REVIEW (founder decision; /admin goes to /login instead). My first guard run expected /login and failed; the expectation was corrected to the code, not the code to the test.
- `/resources` is answered by the server with **308 → `/resources/`** (the only route with a trailing-slash redirect; content renders fine). Low; check the canonical URL / sitemap entry.
- `/join` (WhatsApp channel join) writes a row to `join_clicks` on every visit and then leaves for the channel, or goes to `/` when no channel is configured (staging: `/`). Visited with `?src=ks5c-route-sweep` so the row is identifiable (recorded in staging-test-data.json).
- `/sawaal/vishay/:category`: no page links to a category hub when the Q&A has a crop (SawaalDetail links the crop hub instead) and the staging sitemap lists no category hub, so a real category key (`disease`, from `scat_*` in strings.js) was used; the hub rendered with content.
- `/experts/:id` was reached by tapping the first expert card on `/experts` (logged in).
- `/admin` as a non-admin KEEP persona shows the "no access" screen (not a crash, not a 404) — as designed.
- The first sweep run had two harness problems, fixed and re-run: a moving ticker link could not be clicked for the Back test (now a DOM click on a main/footer link), and three data routes had no link on their parent page (real slugs from the search index / sitemap used instead).
