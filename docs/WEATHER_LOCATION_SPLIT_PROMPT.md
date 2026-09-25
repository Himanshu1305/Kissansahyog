# Kisan Sahyog — Weather/Location Split, Missing Mandi Rates Diagnosis, 5-Mandi Comparison

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md, KNOWN_ISSUES.md, docs/review/LOCATION_MANDI_COMPARISON_REVIEW.md and the most recent test-fix summary first.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 4 passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Context

The last build's "out of service area" logic (added when a Hyderabad user's location resolved to Deori, 670km away) was applied uniformly to every use of `LocationControl`'s resolved location — including weather. That's wrong for weather specifically: Open-Meteo serves any lat/lng on Earth directly, with no concept of a "service area." A farmer or tester in Hyderabad should see Hyderabad's actual current weather, not an "out of service area, nearest known village is Deori" message. The service-area / nearest-village restriction only makes sense for MP-specific, village-anchored features: the 30km listings radius, "आपके आसपास" counts, and the MSP mandi comparison — because those genuinely have no meaning outside the seeded MP village/mandi data.

---

## Phase 1 — Split raw coordinates from village-matching; fix weather to always be global

**1a. In `LocationControl`, separate two distinct outputs from a single geolocation capture:**
- `rawCoords: {lat, lng}` — always set whenever GPS succeeds, regardless of distance from any seeded village. Never gated by the 100km service-area threshold.
- `matchedVillage: {name, pincode, distanceKm} | null` — the nearest-seeded-village match, `null` when the nearest seeded village exceeds `SERVICE_AREA_KM` (100km, from the last build). This is the value the 100km sanity-check and "out of service area" messaging apply to.

**1b. Weather (`/mausam`, homepage weather card) must consume `rawCoords` directly** and call Open-Meteo with those coordinates — never `matchedVillage`, never blocked or gated by the service-area check. Remove any code path where weather falls back to or is restricted by the nearest-village logic. Weather should work correctly and specifically for ANY location worldwide where GPS succeeds — verify this explicitly for a non-MP, non-India location during testing (e.g. mocked coordinates for Hyderabad, and separately for somewhere clearly outside India) to confirm no residual MP-only assumption remains anywhere in the weather path.

**1b-i. Handle the cache-miss case explicitly.** `weather_cache_v2` is only pre-populated by the cron for grid cells that have been requested in the last 30 days (via `weather_grid_requests`). A first-time visit from Hyderabad, or any location never checked before, will have no cached row. If the weather page only reads from cache and has no live-fetch fallback, this will look identical to the service-area bug — "no data" — even after Phase 1's split is otherwise correct, and could pass testing by accident if the test happens to reuse a coordinate the cron already populated during earlier debugging. Fix: on a cache miss for the resolved grid cell, fetch live from Open-Meteo directly (client-side, or via a lightweight edge/serverless call if a direct browser call to Open-Meteo isn't already how this works) rather than showing an empty state, and write the result into `weather_cache_v2` / `weather_grid_requests` so subsequent visits and the next cron run benefit from it. Test this specifically with a grid cell confirmed NOT already in the cache (check the table first, pick a genuinely new cell) — not one already populated from prior testing.

**1c. Village/mandi-anchored features must consume `matchedVillage`** and keep the existing 100km sanity-check and honest "सेवा क्षेत्र से बाहर" messaging exactly as built: the 30km/50km listings radius, "आपके आसपास" counts, and the MSP mandi-distance-ranking (Phase 3 of the previous build). This is unchanged in behavior — only the plumbing changes, so it now reads from `matchedVillage` explicitly rather than a single conflated location value.

**1d. Manual pincode override** continues to work exactly as before and sets both `rawCoords` (geocoded from the pincode's known lat/lng) and `matchedVillage` (the pincode's own village) — no change needed here, just confirm it still populates both outputs correctly after the split.

**1e. Re-verify the original bug report on a REAL device, not emulation only.** The previous fix was verified via mobile emulation with mocked Hyderabad coordinates; the user has now reported that a real device still did not show correct behavior. Before declaring this fixed: check whether `getCurrentPosition`'s actual returned coordinates were logged/confirmed correct on a real device test, or whether this was only ever validated via emulation. If real-device testing isn't possible directly, add temporary instrumentation (same `?debug=1` pattern as before) that surfaces the raw returned lat/lng, accuracy radius, and timestamp on-screen, and ask the user to test once more on their own phone and report exactly what these three values show — do not mark this phase complete on emulation alone given it already once falsely passed that way.

**1f. Consumer audit — the highest-risk step in this refactor.** Before considering Phase 1 done, grep the entire codebase for every file that imports or consumes `LocationControl`'s output (not just the three call sites named above — search broadly, including any hook, context, or store the component writes into). For each consumer found, explicitly confirm which of the two new values (`rawCoords` or `matchedVillage`) it should be using, and confirm it now uses the correct one. A silently-missed consumer still reading the old conflated shape is the most likely failure mode of this change — list every consumer found and its resolved value in the review doc, not just the ones anticipated in this prompt.

**1g. Recent-locations chips must carry both values.** The existing recent-locations feature (up to 5 localStorage chips) stores a location for quick re-selection. Confirm what it currently stores — if it's only a pincode or a single coordinate pair, update it to store both `rawCoords` and the resolved `matchedVillage` (or enough information to recompute both) at the time the chip is saved. Selecting a recent-location chip must correctly repopulate weather (via `rawCoords`) AND village-anchored features (via `matchedVillage`) exactly as a fresh GPS detection or manual pincode entry would — this is a narrow, easy-to-miss regression path specific to this refactor and needs its own explicit test in Phase 4.

---

## Phase 2 — Diagnose and fix missing mandi rates (starting with the wheat gap)

**2a. Diagnose first.** Run a direct query: for wheat (गेहूं) and every other tracked commodity, `SELECT market, MAX(price_date) FROM mandi_prices WHERE commodity_hi = '<crop>' GROUP BY market ORDER BY MAX(price_date) DESC`. Determine, per commodity: which mandis have ever reported it, how recent the latest data is, and whether commodities showing "—" everywhere (e.g. मसूर, उड़द in the reported screenshot) have zero rows ever, or rows that exist but weren't being queried correctly.

**2b. Fix the "data exists elsewhere but this mandi shows a bare dash" case.** When a selected mandi has no price for a commodity but at least one other mandi (anywhere, not just the 3-5 selected) has reported it recently: the cell should not be a bare "—". Show a small inline hint/tooltip (reuse `InfoTip`): "यहाँ उपलब्ध नहीं — निकटतम भाव: [mandi name] ₹[price] ([date])" so the farmer knows the feature is working and can see where that price actually exists, rather than assuming the page is broken.

**2c. For commodities confirmed genuinely absent everywhere in the current data** (zero rows across all mandis for a meaningful recent window — determine the actual window from 2a's findings): keep the bare "—" but add a one-time small note under the table: "मसूर, उड़द जैसी कुछ फसलें फ़िलहाल किसी मंडी से रिपोर्ट नहीं हो रहीं — जैसे ही डेटा मिलेगा, यहाँ दिखेगा" so this reads as an honest data-availability statement, not a bug.

**2d. Confirm the daily refresh cron is still running reliably.** Check the last 5 runs of the "Refresh Mandi Prices" GitHub Actions workflow — confirm they are succeeding and writing today's date, not just historical dates. If the 3-day-old "पुराना भाव" prices seen in the reported screenshot indicate the cron had gaps, investigate and fix separately from 2a-2c (this may be unrelated to the diagnosis above, but must be checked, not assumed fine).

---

## Phase 3 — Mandi comparison: cap 3 → 5

**3a.** Change the maximum simultaneous mandi selection in the मंडी तुलना view from 3 to 5, updating both the enforcement logic and all UI copy ("अधिकतम 3 मंडी" → "अधिकतम 5 मंडी", the 4th-selection-blocked message, etc.).

**3b. Mobile layout re-check.** With 5 price columns + commodity + MSP (7 columns total) on a 375px viewport, confirm the existing sticky-commodity-column + table-only-horizontal-scroll pattern (from the previous build) still works cleanly — no whole-page horizontal scroll, the sticky column remains visible while scrolling through the 5 mandi columns. Adjust column widths/font-size slightly if needed to keep it usable, but do not abandon the sticky-column approach for something more complex.

**3c.** Update the default zero-selected auto-nearest behavior to pick up to 5 nearest mandis (was up to 3), consistent with the new cap.

---

## Phase 4 — Screenshot self-review + permanent tests (mandatory before deploy)

Build + preview; screenshots at 1280×800 and 375×812 of: `/mausam` with mocked Hyderabad coordinates showing Hyderabad's actual real-time weather (not an out-of-service message); `/mausam` with mocked coordinates clearly outside India, confirming weather still renders correctly with no residual MP-only restriction; `/msp` and homepage "आपके आसपास" with the same mocked Hyderabad coordinates showing the out-of-service message for those features specifically (confirming the split is correct — weather works, village-anchored features still show the honest message); मंडी तुलना with 5 mandis selected and a 6th blocked; a wheat row showing the "निकटतम भाव" hint when the selected mandis have no wheat data but another mandi does. **View every one.**

Add permanent tests (same suite, same discipline as before): weather renders for arbitrary global coordinates regardless of distance from any seeded village (positive, for both an MP location and a non-India location); village-anchored features (nearby counts, mandi distance-ranking) still correctly gate on the 100km threshold (regression — must not have broken from the Phase 1 split); mandi comparison allows exactly 5, blocks a 6th (updated from the 3-cap test written in the previous build — update, don't duplicate); selecting a recent-location chip correctly repopulates both weather and village-anchored features (Phase 1g).

Re-run the full suite, confirm no regressions, especially re-confirming the geofencing/wide_visibility tests from the mega-prompt build are still passing after this refactor of `LocationControl`'s internals.

Write `docs/review/WEATHER_LOCATION_SPLIT_REVIEW.md` documenting: the architectural split made in Phase 1, the actual root-cause finding from Phase 2's per-commodity/per-mandi query, cron health check result, and confirmation of real-device (not just emulated) verification for the original bug report per 1e.

Commit message: "Split weather (always global, raw GPS) from village-anchored features (30km listings, आपके आसपास, mandi distance — service-area-gated); diagnosed and fixed missing-mandi-rate display with cross-mandi price hints; honest note for genuinely unreported commodities; mandi comparison cap 3→5; permanent tests updated; screenshot-reviewed"
