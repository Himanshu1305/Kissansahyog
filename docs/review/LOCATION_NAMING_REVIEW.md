# Location naming — reverse geocoding + Cloudflare IP city + manual pincode (2026-09-26)

Execution of `docs/LOCATION_NAMING_PROMPT.md`, all 4 phases. **I viewed every screenshot**
(1280×800 + 375×812). Builds on the `{rawCoords, matchedVillage}` split from the last build.
No DB migration.

## Phase 1 — Reverse geocoding for GPS coordinates

- **1a — API verified.** BigDataCloud's free, keyless `reverse-geocode-client` resolves the
  confirmed Hyderabad fix (17.4665837, 78.3116609) to **हैदराबाद** (city), with Hindi names via
  `localityLanguage=hi` (also tested: Khurai → खुरई, London → लंदन).
- **1a-i — CSP FIRST.** Added `https://api.bigdatacloud.net` to `connect-src` in
  `public/_headers` before writing the fetch; verified the request reaches the API and returns
  the city.
- **1a-ii — consistency with `matchedVillage`.** Only coordinates *outside* the pilot area are
  reverse-geocoded. When a location is in-area (`matchedVillage` non-null) the weather label
  reuses `matchedVillage.village_town` (e.g. "Khurai", not the geocoder's "खुरई") so the same
  place never appears under two names across the app.
- **1b — placeName stored + displayed.** On GPS resolution `LocationControl` reverse-geocodes
  once and stores `rawCoords: {latitude, longitude, placeName}`; `placeName` is the display label
  everywhere (the "आपकी जगह"/label on `/mausam`, the homepage weather card, `/fasal-salah`).
  Screenshot: `/mausam` at Hyderabad shows "हैदराबाद" as H1 + location label with correct weather.
- **1c — failure handling.** If the geocode fails/returns nothing: the nearest seeded village
  with a "लगभग … के पास" qualifier when within 50km, else a generic "आपकी जगह" — **never raw
  coordinates**. Screenshot/E2E: with BigDataCloud blocked, the label falls back to "आपकी जगह"
  and weather still renders; no lat/lng shown.
- **1d — session cache.** `reverseGeocode` is memoised by rounded coordinate (one call per
  resolution, not per re-render/weather refresh).

## Phase 2 — Cloudflare IP-based city (pre-permission)

- **2a — new infra verified in isolation first.** Added `functions/geo.js` (the project's first
  Cloudflare Pages Function). Confirmed with `npx wrangler pages dev dist` that a top-level
  `functions/` dir is picked up by the existing deploy and `/geo` routes to the function
  (HTTP 200 JSON `{"city":"Hyderabad","latitude":…,"longitude":…}`) while `/` still serves the
  SPA — before building the client on top.
- **2b — silent soft suggestion.** On first load (before any GPS choice) `LocationControl`
  calls `/geo` and, if a city resolves, shows "आप शायद [city] के आसपास हैं" beside the GPS
  prompt with a one-tap "हाँ, यही सही है" — no permission prompt, non-committal. Screenshot
  (mocked Indore): the suggestion appears with no permission dialog.
- **2c — GPS supersedes / dismissal offers confirm.** Granting GPS discards the IP guess
  (`setIpSuggest(null)` in `detect`); accepting the IP guess sets `rawCoords` from the IP
  lat/lng (weather) + a `matchedVillage` if that guess falls in-area.
- **2d — clean fall-through.** When `cf.city` is unavailable (local dev / `vite preview` / VPN),
  `fetchIpCity` returns null with no error and the manual pincode remains. E2E: `/geo` → 404
  shows no suggestion and the pincode input stays reachable.

## Phase 3 — Manual pincode (unchanged, tidied copy)

The existing manual pincode input is unchanged and always reachable; the first-visit prompt now
reads as an ordered set of three choices (screenshot-confirmed, desktop + mobile):
```
📍 अपनी जगह अपने आप पता करें? (सटीक)              [हाँ]
   आप शायद [IP city] के आसपास हैं                 [हाँ, यही सही है]   ← only if cf.city resolved
   या पिनकोड डालें: [__________]                  [लागू करें]
```
After any choice the prompt collapses to "📍 <place> · जगह बदलें", which re-opens the manual
controls (pincode + recent chips + "अभी की जगह").

## Phase 4 — Tests, screenshots, raw-coordinate audit

- **Permanent tests:** `scripts/test/p_0028_location_naming.mjs` (20 — CSP, geocode contract
  live-resolving Hyderabad, placeName wiring, in-area consistency, failure fallback, `/geo`
  function shape, IP fetch + cache + fall-through, ordered copy, and the raw-coord audit) and
  `e2e/phase13_location_naming.spec.js` (4 — 4a real place name + debug overlay, 4c geocode
  failure never shows coords, 4b IP suggestion with no permission prompt, edge `/geo` → manual).
- **Full regression:** backend **29 pass / 1 fail** (only `v11_phase6` = the documented TD-1
  i18n debt); E2E **26/26** across `phase10`–`phase13` — the Phase 0–4 geofencing/weather-split
  work from prior builds still green.
- **Raw coordinates never in a non-debug view (grep-confirmed).** A codebase grep for a
  `${…lat…}, ${…lng…}` display pair found only two matches, both **internal cache/dedup keys**
  (`recentKey` and `reverseGeocode`'s cache key in `locationStore.js`) — neither is rendered.
  The only user-facing raw-coord render is the `?debug=1` `geo-debug` overlay, asserted by a
  permanent test (`shared.jsx` coord template exists solely inside the geo-debug block; the four
  screens have none).
- **Screenshots viewed** (both viewports): `/mausam` GPS-granted showing "हैदराबाद"; the
  pre-permission ordered prompt with the Cloudflare-suggested city + manual pincode; the
  `?debug=1` overlay showing raw coords AND "resolved place name: हैदराबाद".

## Notes
- In-area GPS keeps the seeded village name (1a-ii); reverse geocoding only ever changes the
  *display* label for out-of-area locations — `matchedVillage` (listings/mandi gating) is
  untouched.
- The IP suggestion only appears on Cloudflare's edge (production) or when `/geo` is mocked;
  under `vite preview` there is no Pages Function, so it cleanly no-shows (2d) — expected.
