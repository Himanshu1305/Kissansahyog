# Weather/Location split + missing-mandi-rates + 5-mandi comparison — review (2026-09-25)

Execution of `docs/WEATHER_LOCATION_SPLIT_PROMPT.md`, all 4 phases. **I viewed every
screenshot** (1280×800 + 375×812). Migration `0026_weather_cache_write.sql`.

## Phase 1 — Architectural split: rawCoords (global weather) vs matchedVillage (village features)

`LocationControl` now emits a **split** location instead of one conflated value:
```
{ rawCoords: {latitude,longitude}|null,          // weather — global, never gated
  matchedVillage: {pincode,village_town,distanceKm}|null,  // village features; null if >100km
  label, source }
```
- **1a/1b — weather is global.** On GPS success `rawCoords` is **always** committed; weather
  consumes `rawCoords` directly and calls Open-Meteo for any lat/lng. Screenshot-verified:
  `/mausam` at Hyderabad shows Hyderabad's weather (27° cloudy) with **no** out-of-service
  message; `/mausam` at **London** (clearly outside India) renders live weather (24° partly
  cloudy) — no residual MP-only assumption.
- **1b-i — cache-miss live fetch + write-back.** `fetchWeatherCell` no longer falls back to the
  nearest *cached* cell (which would serve a 670 km-away MP cell to a global user — the exact
  bug shape). On a cache miss it fetches **live** from Open-Meteo and persists via a new
  SECURITY-DEFINER RPC `cache_weather_cell` (migration 0026; anon can't write `weather_cache_v2`
  directly) + `requestGridCell` so the cron adds season_rain later. **Verified against a
  genuinely un-cached cell (London 51.5_-0.1):** live fetch returned data, the anon RPC wrote it,
  read-back confirmed — NOT a coordinate the cron had already populated. (Note: Hyderabad
  17.4_78.5 was *already* cached from prior 0026 debugging — the false-pass trap 1b-i warns
  about — which is why London was used for the un-cached test.)
- **1c — village features stay gated.** The 30/50 km listings radius, "आपके आसपास" counts, and
  the MSP mandi distance-ranking consume `matchedVillage`; when it is null (>100 km) they show
  the honest "सेवा क्षेत्र से बाहर" message. Screenshot-verified: `/msp` and homepage
  "आपके आसपास" at Hyderabad show the notice + **counts = 0** (not a silent Khurai fallback —
  `fetchNearbyCounts` now returns honest zeros for a missing pincode).
- **1d — manual pincode** sets BOTH `rawCoords` (from the pincode's coords) and `matchedVillage`.
- **1e — REAL-DEVICE verification: PENDING USER TEST (not marked complete).** The prior fix
  falsely passed on emulation. Real-device testing isn't possible from this environment, so per
  instruction the `?debug=1` overlay now surfaces the raw returned **lat/lng, accuracy radius
  (m), and timestamp** on-screen (`data-testid="geo-debug"`). **Owner action:** open
  `https://<deploy>/mausam?debug=1` on your phone, tap "हाँ", and report the three values. Only
  then is 1e closed.
- **1f — consumer audit (highest-risk step).** Grepped every consumer of `LocationControl`'s
  output. Resolved value per consumer:
  | consumer | uses | notes |
  |---|---|---|
  | `Mausam.jsx` (weather) | **rawCoords** | + `matchedVillage.pincode` for signup/share label |
  | `FasalSalah.jsx` (action-window weather) | **rawCoords** | **was BROKEN** — still on the pre-0025 `pincode`/`place` props → `value.label` crash; migrated to the split value/onChange. The audit's key catch. |
  | `Homepage.jsx` | **rawCoords** for weather; **matchedVillage** for counts + nearby feed | counts=0 when out of area |
  | `Msp.jsx` | **matchedVillage** for mandi-ranking center (null → price-sort); `matchedVillage.pincode` for signup | |
  | `locationStore.initialLocation` | builds the split shape | |
  | `nearbyCounts.fetchNearbyCounts` | matchedVillage pincode | returns zeros for missing pincode |
  Weather-only pages (`/mausam`, `/fasal-salah`) pass `showOutOfArea={false}` so they show
  weather with no village-feature notice (matching "not an out-of-service message" for /mausam).
- **1g — recent chips carry both.** Each chip now stores `rawCoords` + `matchedVillage`;
  selecting one repopulates weather AND village features. Dedicated E2E confirms re-selecting a
  chip restores the location and weather re-renders.

## Phase 2 — Missing mandi rates (root cause)

**2a diagnosis (per-commodity `MAX(price_date)` + mandi count):** most commodities have FRESH
(today) data but in only 2–5 mandis each (wheat: 2 — Khurai + Shahagarh). So the "wheat gap"
was **not** missing data — it was a selected mandi simply not being one of the 2 that report
wheat. मसूर/मूंग are sparse (1 mandi, 3-day-old). **उड़द (Urad) has ZERO rows ever** — genuinely
absent. Root cause: the comparison showed a bare "—" without indicating the price exists
elsewhere.
- **2b — cross-mandi hint.** An empty cell whose commodity is priced at another mandi now shows
  "— ⓘ" with an InfoTip: **"यहाँ उपलब्ध नहीं — निकटतम भाव: Shahagarh APMC ₹2,560 (25/09)"**
  (screenshot-verified on the wheat row). Sourced from `fetchMandiSnapshot` (best price anywhere).
- **2c — honest note for genuinely-absent commodities.** Commodities with no row at any mandi
  keep a bare "—" and the table shows a dynamically-built note:
  **"उड़द जैसी कुछ फसलें फ़िलहाल किसी मंडी से रिपोर्ट नहीं हो रहीं — जैसे ही डेटा मिलेगा, यहाँ दिखेगा।"**
  (lists only the actually-absent commodities — currently just उड़द).
- **2d — cron health.** Last 5 "Refresh Mandi Prices" runs all **succeeded**; the latest
  (2026-09-25 14:13Z) wrote today's date (15 rows). The 3-day-old prices were sparse
  source-feed commodities (मसूर/मूंग), **not** a cron gap.

## Phase 3 — Comparison cap 3 → 5

- **3a** cap raised to 5 (blocks the 6th) — logic (`prev.length >= 5`) + copy ("अधिकतम 5 मंडी").
- **3b** 7 columns (commodity + 5 + MSP) at 375px: **no whole-page horizontal scroll**
  (scrollWidth 393 = clientWidth), sticky commodity column stays visible while scrolling the
  mandi columns — verified programmatically + screenshot.
- **3c** zero-selected auto-nearest picks up to 5.

## Phase 4 — Tests + screenshots

**Permanent tests** (updated, not duplicated): `scripts/test/p_0027_weather_split.mjs` (24 —
split shape, live-fetch/write-back RPC incl. malformed-key rejection, 1g, consumer wiring, 2a/2b/
2c, cap 5) + `e2e/phase12_weather_split.spec.js` (7 — global weather MP + non-India, /msp gate
+ local no-gate, 1g chip). `p_0026`'s 3-cap and SERVICE_AREA assertions were **updated** to the
new reality (cap 5, `<=` gate); `phase11`'s cap test updated 3→5 and its out-of-area tests moved
to phase12 (weather-only pages no longer show that message).

**Full regression:** backend **28 pass / 1 fail** (only `v11_phase6` — the pre-existing i18n
debt, TD-1); E2E **22/22**. Geofencing/wide_visibility (`p_0025`) re-confirmed green after the
LocationControl refactor.

Screenshots viewed (both viewports): /mausam Hyderabad (weather, no OOS), /mausam London
(weather), /msp Hyderabad (OOS), homepage आपके आसपास Hyderabad (OOS + counts 0), मंडी तुलना 5
selected + 6th blocked, wheat-row cross-mandi hint popover, honest absent note.

## Open item
- **1e real-device confirmation is PENDING** the owner's phone test with `?debug=1` (above). All
  other phases are complete and verified.
