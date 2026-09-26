# Sawaal grid · PWA banner fix · BackButton audit · Ticker · Agro Forestry depth — review (2026-09-26)

Covers all phases of `docs/SAWAAL_PWA_BACKBUTTON_TICKER_AGROFORESTRY_PROMPT.md`. No schema changes.

## Phase 1 — `/sawaal` grid layout
The Q&A cards were a single-column stacked accordion (`space-y-2`). Replaced with the exact
`/yojana` card grid: `grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3` (1 col <640px, 2 col
640–1023px, 3 col ≥1024px), and widened the page container to `max-w-6xl` so 3 columns have room.
Each card keeps the question, category badge, village, and a "जवाब देखें" toggle; the answer preview
is `line-clamp-3` so collapsed cards stay even, expanding inline to the full answer (+ related video /
answered-by). The search box and category chips are unchanged above the grid. Verified: 3 columns at
1280px, 1 at 375px (`e2e/phase17`).

## Phase 2 — PWA install banner: root cause
**Root cause (stated explicitly):** the banner component existed and *was* imported and rendered on the
homepage (`Homepage.jsx` line 157) — checks 1, 2, 5 all passed. The bug was in the component's own render
gate: `if (!hasPrompt && !ios) return null`. `hasPrompt` becomes true only when the browser fires
`beforeinstallprompt`, which Chrome dispatches solely under its private install-heuristics (and which
never fires on iOS/Firefox, in incognito, or once installed). So for the large majority of real visitors
the event never arrives and the banner rendered `null` — invisible. It was **not** a standalone
false-positive (check 3) or a stale localStorage flag (check 4); reproduced empirically in a fresh
Playwright browser (banner count = 0 before the fix).

**Why the earlier test didn't catch it (blind spot fixed):** the prior E2E dispatched a synthetic
`window.dispatchEvent(new Event('beforeinstallprompt'))` *before* asserting the banner was visible — so it
verified a state real users never reach. Fixed in `e2e/phase16` (and covered again in `e2e/phase17`): the
fresh-visitor assertion now does **no** dispatch, so it fails if the banner is gated on the event.

**Fix:** the banner now renders for every visitor except in standalone mode or after a session dismiss
(visibility decoupled from `beforeinstallprompt`). The button adapts: native `prompt()` when the event was
captured, otherwise it reveals platform-appropriate manual install steps — iOS shows the existing
Add-to-Home-Screen instructions (`pwa_ios_help`); other browsers show a generic browser-menu instruction
(`pwa_install_help`). Verified in three states: fresh browser (shows, with the no-spam line + install
button), simulated `display-mode: standalone` (hidden), simulated iOS Safari UA (instructions render).

## Phase 3 — Back-button audit + shared `BackButton`
Built one shared `src/components/BackButton.jsx` ("← वापस", top-left above the page heading, identical
everywhere). Behaviour: if `location.key !== 'default'` (arrived via in-app navigation) it calls real
`navigate(-1)` = `history.back()` — never a route push (so no double-back); if `location.key === 'default'`
(direct/shared link opened fresh) it navigates to a sensible fallback. Verified both paths in `e2e/phase17`
(direct link → fallback route; in-app → history.back, proven by `goForward()` returning to the detail page).

| Page | Route | Back before? | Back now? | Fallback |
|------|-------|--------------|-----------|----------|
| Scheme detail | `/yojana/:slug` | ❌ none (only in not-found state) | ✅ BackButton | `/yojana` |
| Agro Forestry | `/agro-forestry` | ❌ none | ✅ BackButton | `/` |
| Drone Didi | `/drone-didi` | ❌ none | ✅ BackButton | `/` |
| MSP crop/hub | `/msp`, `/msp/:crop` | ❌ none | ✅ BackButton | `/msp` (crop) / `/` (hub) |
| Article detail | `/articles/:slug` | ⚠️ hardcoded `navigate('/articles')` | ✅ BackButton (history-aware) | `/articles` |
| Listing detail | `/listing/:id` | ⚠️ `navigate(-1)` unconditional (no direct-link fallback) | ✅ Screen back → `goBack` helper | `/browse` |
| Fasal Salah | `/fasal-salah` | ❌ none | ✅ BackButton | `/mausam` |
| Videos | `/videos` | grid page; videos open on YouTube — **no separate detail route**, so N/A |  |  |

## Phase 4 — Mandi ticker vertical alignment
**Root cause:** a global base rule (`src/index.css` — every `a`/`button`/`input`/`select`/`textarea`
gets `min-height: 44px` as a tap target) forced each linked ticker commodity (`<a>`) to 44px, taller than
the 38px strip; `align-items:center` then centered a 44px item in a 38px `overflow-hidden` bar, clipping
top and bottom. (Measured: item height 44px in a 38px bar.) **Fix:** the ticker items opt out with
`min-h-0` + `flex items-center`, so each item sizes to its ~21px line and centers cleanly. Verified by
computed geometry: top gap = bottom gap = 9px, no clip (`e2e/phase17`), at 1280px and 375px.

## Phase 5 — `/agro-forestry` depth
Assessed the current page: the **hero image renders correctly** (self-hosted turmeric agroforestry photo —
not broken). Improvements, using only already-verified content (no new facts):
- **Expanded "आपके क्षेत्र में"** from one sentence to two — added an accurate paragraph on what FDAs are
  (registered bodies under the Forest Department implementing schemes via village forest committees:
  nurseries, saplings, bund/community planting) and where to seek help (local forest office / KVK). No
  invented South-Sagar-specific figures.
- **Embedded a short article excerpt inline** ("इंटरक्रॉपिंग — एक झलक"): the article's own 40–100-word
  direct-answer summary (pulled live from the `articles` row) + two verified key points + a
  "पूरा लेख पढ़ें →" link. Deliberately kept to a teaser to avoid duplicate-content competing with the
  article's own page (SEO).
- **Cross-links:** none added — a DB check found **no** genuinely relevant Kisan Sawaal question (the one
  keyword hit was a false positive: a gram pod-borer *pest* question) and **zero** matching videos. Per the
  prompt ("only if real matching content exists, do not force irrelevant links"), the section was omitted.
- Kept the two scheme cards, WhatsApp share, and FAQ as built; added the shared BackButton.

## Phase 6 — tests + screenshots
- **New/updated tests:** `e2e/phase17` (sawaal grid columns; PWA fresh-shows/standalone-hides; BackButton
  fallback vs real history.back; ticker vertical-centering via computed geometry). `e2e/phase16` PWA test
  blind spot fixed (no synthetic event on the fresh-visitor assertion).
- **Bilingual audit:** every new string (`nav_back`, `pwa_install_help`, `agro_region_body2`,
  `agro_excerpt_h`, `agro_read_full`, plus the `AGRO_KEYPOINTS` content module) goes through i18n. `v11_phase6`
  reports only the 4 pre-existing TD-1 files (shared.jsx, Admin.jsx, DroneDidi.jsx, Homepage.jsx) — no new
  file from this build was flagged.
- **Regression status:** backend 32 pass / 1 fail (only the pre-existing `v11_phase6` TD-1 i18n debt);
  maintained E2E `phase10–17` = **38/38**. (The legacy v1 specs `phase2–9` remain pre-existing-broken per
  KNOWN_ISSUES — untouched by this build.)
- **Screenshots** (`docs/review/shots-0033/`, all viewed) at 1280×800 and 375×812: sawaal grid; homepage
  with the PWA banner visible fresh; scheme + agro-forestry + msp pages with the back button (scheme/msp
  opened directly via URL); ticker close-up centered; improved agro-forestry in full; PWA standalone-hidden
  and iOS-instructions states.
