# Batch 10E — Phase 6 step 1: full verification

Branch `release-10e`, HEAD `aaafc80` (Phases 0–5). Date 2026-10-19. Everything ran on STAGING (`wzxtqbqlahyahsnoqqva`) or on a local preview of the STAGING build. Nothing was uploaded and no ship script was written in this step.
Product code changed: **none**. Test code changed: `e2e/phase10_location_pwa.spec.js` (a timing fix, see §3).

| Check | Status | Key number |
|---|---|---|
| Build (`check-staging-env && build:full && check-staging-env --dist`) | RAN-PASSED | 268/268 prerendered (1 via fallback: `/`), localhost gate OK, staging guard OK (406 files) |
| `check-no-localhost-dist.mjs dist` (run on its own) | RAN-PASSED | 276 files, no localhost/127.0.0.1 |
| Main chunk budget | RAN-PASSED | 27,569 B gz vs 27,565 baseline (+4 B; budget +1,500) |
| Unit tests | RAN-PASSED | 66/66 |
| E2E, file by file (29 files) | RAN-PASSED (1 known environment failure) | 177/178 after the test fix; 0 new failures |
| Perf, interleaved with the frozen Phase 0 dist | RAN-PASSED | LCP median 2,872 → 2,888 ms (+16); CLS 0.01184 = 0.01184 |
| Render-blocking assets | RAN-PASSED | none new (1 stylesheet + 1 module script, same as baseline) |
| Auto-play long tasks | RAN-PASSED | 3 runs: 0 long tasks, max 0 ms, 0 over 300 ms |
| SEO prerender text diff | RAN-PASSED (nothing lost) | 25 routes differ: intended, data, time or loading-state captures; every removed line re-checked live |
| Widths 320–1440 hi+en (7 pages) | RAN-PASSED | 98 page/width/language combinations, 0 with horizontal scroll |
| Screenshots of the changed screens | RAN-PASSED | 8 taken, all 8 looked at |

## 1. Build and chunks
- Log: `build.txt`. "Prerendered 268/268 (1 via fallback). Failed: 0". The fallback is the known `/ (fallback, no marker)` (decision 5). `check-no-localhost-dist: OK — 276 files checked`. `STAGING GUARD: OK — dist (406 files)`.
- Chunk sizes: `chunk-sizes.txt`. Same tool as `phase1/chunk-sizes.txt` (Git Bash `gzip -9 -c | wc -c`), measured against the frozen baseline-dist in the same session.

| Asset | Baseline (raw / gz) | Phase 6 (raw / gz) | Change (gz) |
|---|---|---|---|
| Main `index-*.js` | 81,931 / 27,565 | 81,997 / 27,569 | **+4 B** (budget ≤ 29,065) |
| Main CSS | 77,384 / 15,505 | 79,151 / 15,927 | +422 B |

Lazy chunks, gzip:

| Chunk | Change |
|---|---|
| strings (`LanguageProvider`) | +1,077 |
| guide demos `registry` | +1,445 |
| `DemoPlayer` | +605 |
| `guide.css` | +167 |
| `Msp` | +377, plus a new `mspWindow` chunk of 668 |
| `mandiApi` | +330 |
| `melaApi` | +770; `melaFormat` (898) was merged into it, so −128 net |
| `Post` | +215 |
| `Login` | +145 |
| `Signup` | −284 |
| `Homepage` | −66 |

All JS and CSS together grew by 5,386 B gz. Except the main chunk and the main CSS, all of it is lazy-loaded.

## 2. Unit tests
`node --test "tests/unit/*.test.mjs"`: **66 pass, 0 fail** (`unit.txt`).

## 3. E2E (one spec file at a time, `--workers=1`, against the build:full dist on 4173)
Each output is in `e2e/<file>.txt` and the run log is `e2e/_runlog.txt`. `globalTeardown` ran after every CLI call ("[teardown] test data cleaned" in every file).

| File | Passed / total | | File | Passed / total |
|---|---|---|---|---|
| batch1 | 5/5 | | phase16_legal_availability | 4/4 |
| batch5a | 4/4 | | phase17_sawaal_pwa_backbutton_ticker | 4/4 |
| guide-10c-browse-etag | 5/5 | | phase18_transport | 2/2 |
| guide-10c | 34/34 | | **phase19_voice_mandi** | **5/6** (environment) |
| home-10d | 32/32 | | phase2 | 7/7 |
| msp-trend-10e | 4/4 | | phase20_mela | 8/8 |
| phase10_downstream | 8/8 | | phase3 | 3/3 |
| **phase10_location_pwa** | **6/7 → 7/7 after the test fix** | | phase4 | 3/3 |
| phase11_location_compare | 2/2 | | phase5 | 3/3 |
| phase12_weather_split | 5/5 | | phase6 | 2/2 |
| phase13_location_naming | 5/5 | | phase7 | 3/3 |
| phase14_village_geocoding | 2/2 | | phase8 | 2/2 |
| phase15_land_acreage | 2/2 | | phase9 | 2/2 |
| photos-10e | 3/3 | | post-10e | 5/5 |
| signup-phone-10e | 6/6 | | | |

**Totals**

| Run | Tests | Passed | Failed |
|---|---|---|---|
| Phase 6 loop | 178 | 176 | 2 |
| After the test fix | 178 | 177 | 1 |
| 10D reference (`docs/review/batch10d/evidence/e2e-failed.txt`) | 155 | 109 | 46 |

The 23 extra tests are the new 10E tests: guide F4b ×4, photos ×3, post ×5, signup ×6, msp-trend ×4 and mela ×1.

**Failing list** (`e2e-failed.txt`, titles normalised; the raw loop list is `e2e-failed-loop.txt`):
- `e2e\phase19_voice_mandi.spec.js:103:1 › mandi: /msp shows dated "कल का भाव / पिछला भाव (dd/mm)" tags and "—" for never-recorded`
  - Expected. Classed **environment** in `failing-triage.md` #13: it needs a crop that has never had a price, and staging has prices for all of them.

**Diff against the 10D reference list:**
- 45 of the 46 reference failures now pass: 23 guide-10c tests fixed in Phase 1, and 22 stale tests fixed in Phases 3A and 5.
- **One title failed in the loop that is not in the reference list:** `phase10_location_pwa.spec.js:91 › install prompt: not on first visit, shows on a returning visit`. It failed in the loop and again on one rerun.
  - Investigation (`pwa-install-probe.txt`): when `page.reload()` resolves, `ks_visit_count` is still "1". The `useEffect` in `WebPrompts` has not run yet, so the `beforeinstallprompt` listener is not attached when the test dispatches the event. Whether the listener is there in time is a race, and it is worse when a service worker controls the page.
  - The frozen Phase 0 / 10D baseline dist fails the same way in 2 of 3 probe runs. The Phase 6 dist showed the banner in 3 of 3.
  - 10E did not touch `PwaPrompts.jsx`, `PwaInstallBanner.jsx` or the install logic in `App.jsx`.
  - Class: **TEST BUG (timing)**, not a product regression.
  - Fix (test only): after the reload, wait for `ks_visit_count >= 2` before dispatching the event. Result: 7/7 twice (`e2e/phase10_location_pwa.after-fix{1,2}.txt`).
- **New product regressions: none.**

## 4. Performance
Method (decision 4):
- `scripts/batch10d/perf.mjs`, slow-phone profile, 1 run per call, interleaved base → p6 five times.
- base = frozen Phase 0 `baseline-dist` served on 4198; p6 = frozen copy of this build (`scratchpad/p6/final-dist`) served on 4199.
- Raw results: `perf-interleaved.txt` and `perf-{base,p6}-N.json`.

| Run | Base LCP (ms) | P6 LCP (ms) | Base TBT (ms) | P6 TBT (ms) | CLS (both) |
|---|---|---|---|---|---|
| 1 | 2,872 | 2,880 | 187 | 179 | 0.01184 |
| 2 | 2,888 | 2,888 | 227 | 217 | 0.01184 |
| 3 | 2,864 | 2,900 | 224 | 186 | 0.01184 |
| 4 | 2,892 | 2,884 | 202 | 191 | 0.01184 |
| 5 | 2,868 | 2,948 | 200 | 188 | 0.01184 |
| **Median** | **2,872** | **2,888 (+16 ms)** | 202 | 188 | 0.01184 |

- LCP budget is +300 ms: **PASS**. CLS is identical: **PASS** (≤ 0.05).
- The machine is much faster now than in Phase 0 (LCP 9.6 s then); memory had been freed. Only the same-session comparison counts.
- Auto-play, 3 runs on the Phase 6 build (`perf-p6-autoplay.txt`): 0 long tasks, max 0 ms, 0 over 300 ms. The hero went live after 54–65 ms.
- Render-blocking (`head-tags.txt`): the `<head>` of `dist/index.html` has 44 link/script tags, the same as the baseline.
  - Still 1 stylesheet (`index-*.css`) and 1 `type="module"` script.
  - Differences: modulepreload URLs are now root-relative (the B17 fix; the baseline had `http://localhost:4178/...`); `melaFormat` was dropped (merged into `melaApi`); `months` moved; one new **modulepreload** `mspWindow` (does not block rendering).
  - No new render-blocking asset: **PASS**.

## 5. SEO: prerender text diff (`text-diff.md`)
Command: `prerender-text.mjs dist evidence/phase6-text`, then `prerender-text-diff.mjs evidence/baseline-text evidence/phase6-text --md`.

Result: 268/268 routes compared, 0 missing, 0 added. 25 routes differ (24 with removals, 1 with additions only).

Every route with removed lines was re-checked:
- `text-diff-recheck-lines.jsonl` (scratchpad `recheck-lines.mjs`): each line that is in the baseline snapshot but not in the Phase 6 snapshot was looked up in a **live render of the frozen Phase 6 dist**, and also in a live render of the frozen baseline dist. Both renders reached the data marker.
- `text-diff-recheck.txt` holds the `scripts/batch10e/recheck-routes.mjs` output (marker reached and h1 present on every route).
- Its "loading: true" flag is not reliable: it matches any "थोड़ा रुकें" on the page. The line-level recheck is the proof.

| Route | Classification | Detail |
|---|---|---|
| `/guide` | INTENDED | Register card text "नाम, मोबाइल, ईमेल, पासवर्ड और गाँव।" → "नाम, मोबाइल और गाँव।" |
| `/guide/register` | INTENDED | The e-mail/password step and its fields are removed from the demo text. Meta description no longer says ईमेल, पासवर्ड. The card text is the same as on `/guide`. |
| `/guide/post` | INTENDED (additions only) | The two new step captions (dates, photo) and step numbers 15 and 16. |
| `/msp`, and `/msp/{chana,dhan,gehun,lahsun,makka,masoor,moong,sarson,soyabean,urad}` (11 routes) | INTENDED + DATA | Tab labels changed from "7दिन/30दिन/90दिन" to "7 दिन" + date range. The trend sentence and the range now come from the backfilled history. More markets are listed after the backfill (the "आज केवल Shahagarh APMC…" note is gone because many mandis now report). Prices, "पिछला भाव (17/10)", `dateModified`, `temporalCoverage` and the up/down word ऊपर→नीचे are data. |
| `/kisan-mela` | NON-DETERMINISTIC + TIME | The snapshot was taken in a loading state. 276 of 282 removed lines are present live. The other 6 lines are one event, "डेयरी इंडस्ट्री एक्सपो 2026" (Kolhapur, 16–18 Oct 2026, "चल रहा है"). It ended yesterday, and it is missing from the live render of the **baseline** dist too, so this is time/data, not a loss. |
| `/agro-forestry` (6), `/articles` (9), `/drone-didi` (8), `/info` (30), `/mausam` (13, incl. the FAQ and its FAQPage JSON-LD), `/safalta` (3), `/sawaal` (105), `/videos` (48), `/yojana/central` (24), `/yojana/mp` (20) | NON-DETERMINISTIC (loading-state captures, decision 5) | **Every** removed line (count in brackets) is present in the live render of the Phase 6 dist. |
| `/` | unchanged in the snapshot | The homepage is the known fallback capture (no marker). The Mela teaser is data-loaded: checked live in §7 (Indore, Bhopal, Meerut; MP first). The tile links were already `<a>` and are seen in the overflow and screenshot run. |
| `/signup`, `/login` | unchanged in the snapshot | The prerendered snapshots of these pages show no form text difference against the baseline. The sign-up form without e-mail/password is checked live (§6 `signupHasEmail: 0`, screenshot §7). |
| Demo finish line सीताराम | not in prerendered HTML | It is rendered only after a demo plays (decision 14). |

**Verdict: nothing lost.** Every difference is either one of the intended changes, a data or time change, or a loading-state capture whose text is present on the live page.

## 6. Widths (`overflow.json`, `overflow-and-screens.txt`)
- Temporary spec (deleted after the run, not committed). 7 widths (320/360/412/768/1024/1280/1440) × hi + en × 7 pages = **98 combinations, 0 with horizontal scroll**.
- Pages: `/`, `/msp/gehun`, `/signup`, `/login`, `/guide/post`, `/post`, and `/listing/<KSTEST id>` with a photo.
  - `/post`: logged in as a KSTEST phone-only user made with `app_register_phone`, then step 2 for an equipment offer (Trolley, आज pressed, extra info filled).
  - `/listing/<KSTEST id>`: shown under the production CSP, injected as in `photos-10e`; the photo loaded on every width.
- Visitor writes were stubbed. The KSTEST profile and listing were removed by the teardown, and the storage object in `afterAll`.

## 7. Screenshots (`docs/review/batch10e/evidence/screens/phase6-*.png`) — all 8 looked at
1. `phase6-home-tiles-hover-hi-1280.png`: the hovered tile (पानी का टैंकर) shows the saffron ring and the lift. Computed: `<a href="/browse?cat=equipment&etype=water_tanker">`, cursor pointer, `translateY(-2px)`, ring + green halo. The first in-spec measurement read "none" because the page was still shifting under the mouse; it was re-measured after the page settled (scratchpad `hover.mjs`).
2. `phase6-msp-tabs-hi-360.png`: tabs `7 दिन 11–17 अक्टू` / `30 दिन 18 सित – 17 अक्टू` / `90 दिन 20 जुल – 17 अक्टू`, sentence "30 दिन में (18 सित – 17 अक्टू) भाव ₹54 गिरा", dated x-axis.
3. `phase6-post-dates-extra-hi-360.png`: "कब से उपलब्ध *" with आज selected (19-10-2026), "कब तक (वैकल्पिक)" / जब तक चाहें, extra info 30/300 with the "फ़ोन नंबर यहाँ न लिखें" note, photo box.
4. `phase6-signup-hi-360.png`: name, mobile, village/town, "show my details", notice and accept. No e-mail and no password (0 such inputs).
5. `phase6-listing-photo-csp-hi-360.png`: the photo is visible under the production CSP (naturalWidth 320, 0 CSP console errors). "अतिरिक्त जानकारी" is shown.
6. `phase6-guide-post-date-step-hi-360.png`: demo step 9, the date box with आज highlighted.
7. `phase6-guide-post-photo-step-hi-360.png`: after the photo step, the sample tractor picture with the "उदाहरण फोटो" tag and 1/3.
8. `phase6-home-mela-teaser-hi-360.png`: "आस-पास के किसान मेले": Indore (MP), Bhopal (MP), Meerut (UP).

Observations (no action, HUMAN-REVIEW):
- (a) The `/post` page's side widgets show a "किसान मेला — कृषि विज्ञान विश्वविद्यालय बेंगलुरु" card. The 5.1 regional filter covered only the homepage teaser, by design; the founder may want the same filter there (BACKLOG candidate).
- (b) In the homepage teaser the 2–4 Nov 2026 Meerut Mela is listed after two 2027 MP Melas because MP comes first (decision 65–67).
- (c) In full-page and element screenshots the fixed header and bottom bar appear in the middle of the picture. This is how full-page capture works, not a layout bug.

## HUMAN-REVIEW from this step
- The phase10_location_pwa test change (timing wait), see §3.
- Observations (a) and (b) in §7.
- Perf absolute numbers depend on this machine; only the interleaved comparison is a gate.

## Files
- Evidence: `docs/review/batch10e/evidence/phase6/*`, `docs/review/batch10e/evidence/phase6-text/`, `docs/review/batch10e/evidence/screens/phase6-*.png`.
- Test fix: `e2e/phase10_location_pwa.spec.js`.
- Servers started by this step on 4198 and 4199 were stopped. The pre-existing previews on 4173, 4183 and 4190 were left running; they were not started by this step.
