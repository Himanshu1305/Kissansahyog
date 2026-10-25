# Batch 10D — Report: the homepage comes alive ("Kisan Studio" hero + "Morning Field" band)

Branch `release-10d` (from `release-10c` head `0c7379f`, which is what production runs: 10C shipped and closed, tag `prod-10c`).
**Website only, no database change. Production was not touched.** All numbers come from a local STAGING `build:full` (268/268 prerendered, staging guard OK).
Decisions: `DECISIONS.md` (1–33+) · progress: `PROGRESS.md` · baseline: `BASELINE.md` · SEO: `evidence/seo/SEO_DIFF.md` · ship: `SHIP.md`.
Each task A–E was done by a subagent and then checked by the orchestrator (diffs, screenshots, re-running the SEO diff and the failing-test comparison).

## Task status
| task | status | notes |
|---|---|---|
| A baseline | RAN-PASSED | BASELINE.md (LCP 9,880 ms, CLS 0.661, TBT 552 ms, main 27,576 B gz, e2e 76/47) |
| B+B2 live hero | RAN-PASSED | `src/features/home-live/`; decisions 8–19 |
| C band / crops / facts / reveal | RAN-PASSED | shared `FieldScene` with /guide; decisions 20–27 |
| D SEO safety | RAN-PASSED | NOTHING LOST (520 required words, 0 lost; re-run on the final build) |
| E tests + perf gates | RAN-PASSED (HUMAN-REVIEW notes below) | two fixes: hero CSS into the main stylesheet (dec 28), layout-shift fix (dec 29) |
| F staging + ship scripts | RAN-PASSED | staging `af949ffd-b49b-4312-97a9-c8df6c49b1a3`; home spec 32/32 on staging; ship dry run `DRY RUN OK`; real ship NOT-RUN (founder) |

## What farmers will see
- Under "आज किसान के लिए": five tabs (machine on rent, sell, mandi prices, weather, schemes). A phone plays a short example for the active tab (labelled "उदाहरण"), the guide avatar says one line, and there are two big buttons: "रजिस्टर करें" and "1 मिनट का डेमो देखें". The old weather / price / advice tiles and the "मुझे कुछ चाहिए / मेरे पास कुछ है" buttons are still there, just below.
- Under the hero: a warm field band (sun, clouds, hills, swaying wheat, a tractor crossing), a slow crop-name strip, and four facts that count up: **11** kinds of goods and services, **10** crops with mandi prices, **6** districts of Sagar division, **4** short demos. Lower sections rise gently into view.
- Desktop (≥1024): two columns, the phone with the faded farmer photo behind it. Tablet: one column. Phones: no farmer photo any more (the phone hero takes its place).

## Truthfulness
- Facts are counted at build time from repo files, never from the database: `ENABLED_CATEGORIES` in `src/lib/listings/registry.jsx` (11), `CROPS` in `src/content/crops.js` (10), `DIVISION_DISTRICTS` in `src/lib/location/places.js` (6), `GUIDE_ORDER` in `src/features/guide/config.js` (4). Test E4 checks each.
- Every phone screen carries "उदाहरण / Example". The example prices appear only inside that labelled phone and do not tick. The real mandi ticker is untouched.

## Tests: `e2e/home-10d.spec.js` — 32/32 RAN-PASSED (`evidence/e2e-home-10d.txt`)
| id | what | scope | status |
|---|---|---|---|
| E1 | Server HTML = persona 1, tick 0 poster; first client render identical; poster styled; live chunk lazy, requested once; no hydration warnings, no console errors (only B17 + CF beacon filtered), no failed backend requests; stops after 13 rotations | 360/412 × hi/en | RAN-PASSED |
| E2 | Rotation through all 5 personas; tap stops it; arrows/Home/End; ARIA tablist/tab/aria-selected/roving tabindex/tabpanel; tabs ≥ 44 px | 360/412 × hi/en | RAN-PASSED |
| E3 | Off-screen / hidden tab → hero timer frozen, band and crop strip paused; reduced motion and save-data → static hero and band, tabs still switch | 360/412 × hi/en | RAN-PASSED |
| E4 | Each fact = its source file; count-up ends at the final number | 360/412 × hi/en | RAN-PASSED |
| E5 | No overflow / clipped text 320–1440 hi+en; I-need top 360x640 hi **1490** (allowance ≤ 1504, baseline 1184), en 1610; 1280x720 H1 + tabs + both buttons visible (360–697 px); breakpoints 767/768/1023/1024 exact; farmer photo 0 requests below 1024, 1 at 1024/1280/1440 | | RAN-PASSED |
| E6 | `/`, `/browse`, `/guide`, `/signup`, `/mausam` load directly; in-app navigation to and from `/` works | 360 hi | RAN-PASSED |

## Performance (E.6) — slow profile 360x640, CPU 4x, Slow 4G; baseline and after interleaved in one session, 5 runs each
| metric (median) | baseline | after | gate | status |
|---|---|---|---|---|
| LCP | 7,092 ms (photo) | **3,024 ms** (H1) | ≤ +300 ms | PASS |
| CLS | 0.860 (Task A: 0.661) | **0.0098** | < 0.02 and not worse | PASS |
| long tasks > 300 ms, first 10 s of auto-play | – | **0** (5×10 s, and 2×25 s) | none | PASS |
| main chunk gzip | 27,576 B | **27,758 B (+182 B)** | < 3 KB growth | PASS |
| live-hero chunk `LiveStage` | – | **821 B gzip**, lazy | lazy, < 40 KB | PASS |
| FCP | 2,748 ms | 3,024 ms | recorded | – |
| TBT | 139 ms | 338 ms | recorded | HUMAN-REVIEW |
| homepage first-visit JS gzip | 293,575 B | 305,777 B | recorded | – |
| main CSS gzip | 12,369 B | 15,575 B | recorded | HUMAN-REVIEW |

Files: `evidence/perf/` (`slow-baseline-rerun.json`, `slow-after.json`, `after-autoplay*.json`, before-fix runs `slow-after-nofix.json`, `slow-after-fix1.json`).

### The layout-shift (CLS) story
The baseline page jumped once (0.66): `createRoot` replaces the prerendered HTML, and its first commit was the loading spinner, because `React.lazy` suspends on its first render even when the chunk is already there. Attempt 1 (only waiting for the chunk) still gave 0.673. Attempt 2 (kept): `main.jsx` preloads the homepage chunk on `/`, and `App.jsx` draws the loaded module directly → 0.0098. Other routes start exactly as before. Side effect: the homepage now renders in one bigger task (TBT 139 → 338 ms; longest load task 260–275 ms, under 300).
Also found: the hero/band styles were in lazy CSS chunks, which the prerender baked into `/` as `localhost:4178` stylesheet links (B17). They are now in the main stylesheet (+3.2 KB gzip on every page).

## SEO (Task D)
Every word of the baseline prerendered homepage text is still there. Title, meta description, canonical, both JSON-LD blocks (byte-identical), the single h1 and all 11 h2 (same order) are unchanged. There was no FAQ before and there is none after. Sitemaps are unchanged (lastmod-stripped hashes). Hero copy that used to be rendered twice (desktop + mobile copies) now appears once. Nothing from `design/` is shipped.

## Regression (E.7) — `evidence/e2e-full.txt`, `evidence/e2e-failed.txt`
155 tests: 109 passed, 46 failed (baseline 123: 76/47; plus 32 new, all pass). **New failures: none** (checked by the orchestrator: the only difference is one baseline failure that now passes, `guide-10c F3 hi 360`, which is B17 console-noise flakiness). The old 93 tests have the same 23 failures as 10A/10C. 23 of the 30 guide-spec tests fail only on the B17 `localhost:4178` console errors, which happens only on prerendered builds.

## Screenshots (`evidence/screens/`, 60 files)
Looked at 10 (360 hi first + sell, 360 en weather, 412 en mandi, 768 hi weather, 1024 en schemes, 1440 hi rent, 1440 en first, the 360 poster), plus the orchestrator's own checks of 1280 hi, 412 en sell, and the band at 360 hi / 1280 en. No overflow, no clipped Hindi, and the Example tag is on every screen.

## HUMAN-REVIEW
1. Hindi wording of the tabs, bubble lines, fact labels and the band's screen-reader line (`home_live_*`, `home_facts_*`, `home_field_sr`, `home_crops_*` in `strings.js`).
2. Sell example says "आपका विज्ञापन लग गया ✓" (the brief's text); the real app says "आपकी लिस्टिंग जुड़ गई!". Pick one.
3. "6 districts of Sagar division": true for the location picker. Is it a promise you want to show?
4. The crop strip shows Hindi and English together in both languages (as listed in the brief).
5. At 1440 px the hero is 1200 px wide and centred, while the nav, ticker and open strip are full width.
6. `scripts/verify-batch7d.mjs` counts 2 hero badges; there is now 1 (the hero renders once). The old check will report it.
7. At first paint the phone shows persona 1 at tick 0 (header, Example tag, empty search box) for 1–2 s on a slow phone, until the live part starts.
8. On phones the mandi and weather example screens leave the lower half of the phone empty.
9. At 1024 px the left-column info tiles are narrow (4-line wraps).
10. Side effects of the E fixes: TBT +200 ms, FCP +276 ms, +3.2 KB render-blocking CSS on every page.
11. B17 (prerender writes `localhost:4178` preload links) is still open. It is the reason the 10C guide spec fails on prerendered builds and one cause of the slower live numbers seen at the 10C close. Recommended as its own small fix.
12. Logged-in visitors see "पोस्ट करें" (→ `/post`) instead of "रजिस्टर करें" as the primary hero button (decision 17).
13. The preview had no desktop section; desktop and tablet follow the written B2 spec (decision 2).

## Task F — staging and ship preparation
- Staging build (`build:full`, guard before and after OK, 268/268) and upload: RAN-PASSED, deployment `af949ffd-b49b-4312-97a9-c8df6c49b1a3`, https://staging.kissansahyog.com serves `/assets/index-DfikRbEu.js` with the live hero.
- `e2e/home-10d.spec.js` against staging: 32/32 RAN-PASSED (after filtering two pre-existing CSP messages, decision 35).
- Slow phone on staging (real network, 5 runs): LCP 6,372 ms median (H1; FCP = LCP), CLS 0, TBT 551 ms, farmer photo 0 requests; auto-play: longest task 76 ms, none over 300 ms. Deployed numbers are slower than the local ones because of real latency; no deployed baseline exists to compare with (production was not measured, decision 36).
- `scripts/ship-prod-10d.sh` + `scripts/rollback-prod-10d.sh` created from the 10C versions; dry runs RAN-PASSED (`SHIP.md`).
- 14. **CSP blocks listing photos from Supabase storage** on staging and production (`img-src` lacks `*.supabase.co`). Pre-existing, outside 10D. HUMAN-REVIEW.
