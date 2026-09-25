# E2E / regression test report — 0025 build (2026-09-25)

Covers Phase 7 of `MEGA_PROMPT_GEOFENCING_LOCATION_PWA_TESTING.md`: geofencing,
location, mandi search, PWA. New tests are **permanent** and committed into the
existing suite directories (`scripts/test/`, `e2e/`) so every future Phase 7a re-runs
them.

## 7a — Baseline (before writing any new test)

**Backend suites** (`node --env-file=.env scripts/test/*.mjs`): **21 pass / 5 fail** at the
time of this build.

> **CORRECTION (added 2026-09-25, after the 0026 build).** This section originally called
> all 5 failures "pre-existing / unrelated," justified by a `git stash -u` check. That
> justification was **flawed for `phase8`**: `phase8.mjs` asserts against the build output
> `dist/` (git-ignored), so the stash never rebuilt it — it tested the new build against
> reverted source and gave a false "pre-existing" reading. On review, **`phase8` was caused
> by this build's PWA change**, and **`v11_phase6`'s Devanagari check gained files from this
> build**. Both have since been fixed (see the corrected table + "Post-fix" note below).

| suite | failure | honest classification |
|---|---|---|
| p_community | "nav has a single Community dropdown" | **Pre-existing, unrelated.** NavBar restructured into बाज़ार/योजना dropdowns in a pre-0025 build; NavBar untouched here. |
| phase1 | "anon reads equipment_types" (expects 11, got 15) | **Pre-existing, listings-adjacent.** `equipment_types` feeds the listings equipment category (a changed area), but the failing assertion is a hardcoded row count (seed drift); the table/RLS/seed were not touched by geofencing/wide_visibility. |
| phase8 | "registerSW.js generated" | **CAUSED BY THIS BUILD (PWA).** `registerType:'prompt'` + `injectRegister:null` (register via `virtual:pwa-register/react`) means no `registerSW.js` is emitted. Pre-0025 `injectRegister:'auto'` did emit it. **Fixed:** `phase8.mjs` now asserts the prompt-flow architecture (registerType prompt, virtual-module registration, NetworkFirst live data) instead of the stale artifact. |
| v11_phase2 | labor Hindi label includes "(Labor)" | **Pre-existing, listings-adjacent.** `labor` is a listing category; label suffix added in an earlier build; catalog.js/labels untouched here. |
| v11_phase6 | (a) empty `mausam_h1_a`; (b) Devanagari-outside-allowlist | **(a) pre-existing** (empty key predates this build; /mausam H1 composes as `{place} {mausam_h1_b}`). **(b) partly this build:** the crude check flags any Devanagari (incl. comments + a regex range); it was already red from many pre-existing comment-based files, but this build's new `mandiCoords.js` / `locationStore.js` / `inputsApi.js` were added to it. **Fixed:** those three are now Devanagari-free at source (unicode-escaped regex range, transliterated comments, removed a hardcoded `'बोरी'` default that the RPC already coalesces). The check still fails on pre-existing comment-based files. |

**Post-fix state (2026-09-25):** backend suites **24 pass / 4 fail** — `phase8` fixed and
passing; the 4 remaining are `p_community`, `phase1`, `v11_phase2`, `v11_phase6`, all
genuinely pre-existing (with `phase1`/`v11_phase2` in listings-adjacent code whose *failing
assertions* are not from these builds, and `v11_phase6` red only on pre-existing files after
this build's additions were removed).

**Playwright E2E** baseline: the legacy `e2e/phase{2..9}.spec.js` predate new required
create-listing fields (documented in KNOWN_ISSUES) and are not part of the green
baseline; new coverage is added in dedicated specs below.

## 7b — New permanent tests

### Backend + logic + static-config — `scripts/test/p_0025_visibility.mjs` (44 checks, all green)

*Geofencing (Phase 0/1), via the single-source `partitionByRadius` in `src/lib/distance.js`:*
- **Positive:** a ~15 km listing appears (primary); a ~60 km Bhoosa listing with
  `wide_visibility=true` appears.
- **Negative:** a ~60 km Equipment listing does NOT appear; a direct `create_listing`
  RPC call setting `wide_visibility=true` on **equipment** is **rejected server-side**
  (`wide_visibility_not_allowed`) — the UI cannot be bypassed.
- **Positive (guard):** `wide_visibility=true` on **bhusa** is allowed and stored true;
  omitting the flag defaults to false.
- **Edge:** 29.5 km inside / 30.5 km outside the cutoff, consistent across 3 repeated
  calls; the 30–50 km ring is returned ONLY when there are zero within-30 results
  (Phase 0b); a null/undefined-distance row is excluded gracefully with no throw.

*Mandi search (Phase 3):*
- **Positive:** the DISTINCT-market list is non-empty; a known market+crop returns a
  **dated** price.
- **Negative:** a market with no rows for a crop returns an empty result (no fabricated
  price).
- **Edge (3c separation, static/code-level):** `src/lib/mandi/mandiApi.js` does **not**
  import `../distance` and does **not** reference `partitionByRadius` / `RADIUS_KM` /
  `FALLBACK_RADIUS_KM` outside comments — directly verifying the Phase 3c requirement.

*PWA (Phase 5, static/config-level):* `registerType` is `'prompt'`; the supabase/
open-meteo/mandi/data.gov live-data block uses **NetworkFirst** and never **CacheFirst**.

*Input prices (Phase 6):* `input_prices` is public-readable and seeded (≥3 rows).

### UI flows — `e2e/phase10_location_pwa.spec.js` (7 tests, all green)

*Location (Phase 2):* geolocation grant (`context.setGeolocation` + `grantPermissions`)
updates the location without console errors; denial falls back to the always-reachable
manual pincode input; coordinates far outside MP (Hyderabad) don't crash; manual pincode
applies a location.

*Mandi search (Phase 3):* on `/msp/gehun`, a searched mandi surfaces either a **dated**
price or the honest empty state — never a price without a date, never a crash.

*PWA (Phase 5):* the install prompt does **not** appear on the first visit and **does**
appear on a simulated returning visit; going offline shows the offline banner, and a full
offline reload still serves the precached shell + lazy chunk (real content, not a blank
screen).

## 7c — Downstream touchpoint sweep — `e2e/phase10_downstream.spec.js` (8 tests, all green)

Public pages that read listings/location/mandi render with no fatal console errors:
`/`, `/msp/gehun`, `/mausam`, `/drone-didi`, `/info`, `/sawaal`. The **homepage mandi
ticker** shows live prices (`₹` present — the regression that recurred earlier is
guarded), the LocationControl renders, and the nearby listings feed is populated for the
default Khurai location (a `wa.me` card link present). `/drone-didi`'s local-listings
section renders. The authoritative feed-emptiness guard is the DB-backed check in
`p_0025_visibility.mjs` ("homepage/browse feed non-empty for Khurai; cutoff genuinely
applies; nothing beyond the 100 km wide ceiling"). Auth-gated pages (`/browse`, `/post`,
`/listing/:id`, `/admin`) are verified by the logged-in Phase 8 screenshot pass plus the
backend RPC guard tests.

## 7d — Bug-fix loop (each fix re-verified by a full re-run)

| # | Found in | What broke | Fix | Kind |
|---|---|---|---|---|
| 1 | backend edge test | asserted the 30.5 km row lands in the ring while a within-30 row coexists — but Phase 0b correctly suppresses the ring then | corrected the **test** to assert the boundary + isolated-ring behaviour | test |
| 2 | E2E offline | offline reload showed a blank screen — the SW wasn't controlling the first navigation (clientsClaim had been removed) | re-added `clientsClaim: true` (no skipWaiting, so the update prompt still gates new versions); restructured the test to assert the banner on the `offline` event | **app** + test |
| 3 | E2E negative-geolocation | test toggled the manual panel closed | assert the manual panel opens once | test |
| 4 | E2E downstream | `h1,h2 .first()` matched a hidden desktop-only homepage h1 | target `:visible` headings | test |
| 5 | E2E downstream | ticker locator matched a hidden node | target `[role="marquee"]` + assert `₹` | test |
| 6 | E2E downstream | fragile listing-card text regex | assert a `wa.me` card link instead | test |

Only #2 required an app change (`clientsClaim`); the rest were test-correctness fixes.
After every fix the **entire** 7a–7c sequence was re-run (not just the failed test).

## Final state
- Backend suites at the time of this (0025) build: **22 pass / 5 fail**. **See the
  CORRECTION above** — one of those 5 (`phase8`) was actually caused by this build's PWA
  change, not pre-existing; it was fixed afterward and the suites are now **24 pass / 4
  fail** (post-0026-review fixes).
- New backend suite `p_0025_visibility.mjs`: **44 / 44**.
- New E2E `phase10_location_pwa` + `phase10_downstream`: **15 / 15**, stable across two
  consecutive full runs.
