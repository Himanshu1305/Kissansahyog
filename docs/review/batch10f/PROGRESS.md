# Batch 10F — progress

## Precondition — DONE
- `git fetch`; `release-10e` at `dd49223` (tag `ship-10e`), `docs/review/batch10e/SHIP.md` and `scripts/ship-prod-10e.sh` exist.
- Branch `release-10f` created from `release-10e` head `dd49223` (no pull). Tracked changes: only the 7 allowed generated files.
- Tag `pre-10f-ship` → `dd49223`, pushed.

## Phase 0 — baseline (no code change) — DONE
- Branch `release-10f`, head `dd49223`. Node v24.19.0.
- **Build: RAN-PASSED** (`check-staging-env && build:full && check-staging-env --dist`): Prerendered 268/268 (1 via fallback: the known `/`), localhost gate OK (276 files), staging guard OK (406 files). Log `evidence/build-baseline.txt`. Frozen copy of `dist` in the scratchpad, served on :4196.
- **Chunks** (`gzip -9`, `evidence/chunk-sizes-baseline.txt`): main `index-*.js` 81,997 B raw / **27,569 B gz**; main CSS 79,151 / **15,927 gz**; Homepage 47,895 / 14,729 gz; LiveStage 844 gz; Msp 7,857 gz.
- **Text snapshot: RAN-PASSED** — 268 pages, 36,242 body lines, no page without h1 → `evidence/baseline-text/`.
- **Unit: RAN-PASSED** 75/75 (66 existing + 9 new 10F basket tests written during the Phase 3C investigation, see below).
- **E2E (all 29 files, one at a time, frozen baseline): RAN-PASSED with 1 known failure** — 177/178. Only `phase19_voice_mandi` "price-missing" fails (the known 10E environment failure). `home-10d` (the 10D hero tests): **32/32** (re-run with the dd49223 strings; DECISIONS 3). `evidence/baseline-e2e/`, `evidence/baseline-failing.txt`.
- **Perf (10D slow-phone method, 5 runs): RAN** — LCP 2,852 ms (H1), CLS 0.0117, TBT 268 ms, FCP 2,852 ms (`evidence/perf-baseline.json`). Later phases are compared interleaved with this frozen build.
- **Screens + hero measurements:** `evidence/screens/phase0-*.png`, `evidence/phase0-measure.jsonl`. At 360 px the hero starts at 440 px; hero + 10D band = 1,734 px before the next section; "मुझे कुछ चाहिए" ends at 1,554 px.
- **Phase 3C investigation done early** (read-only staging SELECT): `evidence/trend-investigation.md`.

## Phase 1 — homepage hero — DONE
- Removed: persona tabs, phone mock-up, caption bubble, example scenes + engine/timer (lazy `LiveStage` chunk gone), facts row (count-up), "रजिस्टर करें / पोस्ट करें" hero button, animated field band + crop marquee, the 10D section rise-and-fade reveal; `src/features/home-live/` deleted (12 files), FieldScene "wide" variant removed, 41 strings removed. Kept: chip, badge, h1 + sub-line, two big buttons, free-registration line, "पहली बार?" banner, ONE demo button → **`/guide`** (same as 10D), three static info cards with the same real data. DECISIONS 5–13.
- **Build: RAN-PASSED** 268/268, localhost gate OK, staging guard OK (`evidence/phase1/build.txt`).
- **Chunks:** main JS 27,569 → **27,526 B gz (−43)**; main CSS 15,927 → **13,235 B gz (−2,692)**; Homepage chunk 14,729 → 9,262 B gz; LiveStage chunk gone (`evidence/phase1/chunk-sizes.txt`).
- **Hero height (Hindi):** 360 px: hero + band before the next section **1,734 → 794 px (−940 px)**; hero section alone 1,230 → 774 px. 412 px: 1,679 → 739. 1280 px: 1,157 → 380. Page height at 360: 9,356 → 8,417 px. At 360 × 640: h1 bottom 565 (on screen), "मुझे कुछ चाहिए" 667, "मेरे पास कुछ है" 743, demo 828 — just below the first screen because 440 px above the hero is kept (DECISIONS 10, HUMAN-REVIEW).
- **Perf, interleaved 5 × 5 with the frozen baseline: RAN-PASSED** — LCP 2,956 → **2,736 ms (−220)**, CLS 0.0117 → **0.0106**, TBT 194 → 157 ms (`evidence/phase1/perf-interleaved.txt`).
- **Text diff: RAN-PASSED** — `/` intended (removed hero text); `/agro-forestry` one DB line captured mid-load (present in a live render of both builds); 4 pages only gained text (baseline captured loading state). `evidence/phase1/text-diff.txt`.
- **Tests: RAN-PASSED** — new `e2e/home-10f.spec.js` 19/19 (replaces the 32 10D hero tests); homepage-related specs on the Phase 1 build: guide-10c 34/34 (after a test-only fix, DECISIONS 19), guide-10c-browse-etag 5/5, phase20_mela 8/8, phase12 5/5, phase17 4/4, batch1 5/5, phase13 5/5, phase10_location_pwa 7/7, phase10_downstream 8/8. Unit 75/75.
- Screens looked at: `evidence/screens/phase1-hero-hi-360.png`, `phase1-hero-en-1280.png` (+ full pages `phase1-home-*`).
- HUMAN-REVIEW: first-screen fit at 360 × 640 (DECISIONS 10); desktop farmer photo removed (DECISIONS 9).

## Phase 2 — collapsible sections — DONE
- One component `src/components/CollapsibleSection.jsx` (native `<details>/<summary>`, chevron right after the `<h2>` text, ≥ 44 px row, hand cursor, 10E glow, focus ring, `aria-expanded`, SR "खोलें/बंद करें", remembered per page+section in `localStorage` with try/catch, `#hash` opens + scrolls, print opens all). CSS in `src/index.css`. Applied to `/msp` (+ crop pages), `/mausam` and the homepage below the hero; `PageExplainer` / `FaqAccordion` got an opt-in prop (other pages unchanged). Defaults: `evidence/collapsible-defaults.md` (HUMAN-REVIEW). DECISIONS 21–31.
- Also: prerender readiness for `/mausam` (FAQ) and `/yojana` (scheme list) — DECISIONS 32; ship tooling `--min-ratio` + pre-deploy size check prepared (DECISIONS 33, used in Phase 4).
- **Build: RAN-PASSED** 268/268, localhost gate OK, staging guard OK.
- **Chunks:** main JS **27,528 B gz** (Phase 0 27,569: −41); main CSS 13,551 gz (−2,376); Homepage 9,400; Msp 7,914; Mausam 3,631; shared 5,196 (`evidence/phase2/chunk-sizes.txt`).
- **Page height at 412 px (hi):** `/msp/gehun` 6,595 → **4,455 px (−2,140)**; `/` 8,057 (Phase 1) → **5,412 px (−2,645)**.
- **Perf interleaved 5×5: RAN-PASSED** — LCP 2,912 → **2,732 ms**, CLS 0.0117 → **0.0106**, TBT 186 → 165 ms.
- **Text diff: RAN-PASSED** — `/`: only the removed hero/band/facts lines (+ "बंद करें" ×9 and listing data); `/msp` + 10 crop pages and `/mausam`: only "बंद करें" added; `/yojana` (+ central, mp): spinner text replaced by the real scheme list (readiness fix). Nothing else lost (`evidence/phase2/text-diff.txt`).
- **E2E: RAN-PASSED** — full suite on the first Phase 2 build: 170/175 (`evidence/phase2/e2e/`); the failures were msp-trend-10e ×3 and phase20_mela ×1 (sections now collapsed on phone viewports → tests open them as a remembered choice, test-only) and the known phase19. Re-run on the final Phase 2 build: collapsible-10f **10/10**, msp-trend-10e 4/4, phase20_mela 8/8, phase12 5/5, home-10f 19/19, phase19 5/6 (known environment failure). `evidence/phase2/e2e-rerun/`.
- Screens: `evidence/screens/phase2-*.png` (looked at: collapsed rows on /msp and home, today section).
