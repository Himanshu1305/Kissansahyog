# Kisan Sahyog — Location Naming: Reverse Geocoding + Cloudflare IP Fallback + Manual Pincode

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md, KNOWN_ISSUES.md and docs/review/WEATHER_LOCATION_SPLIT_REVIEW.md first — this builds directly on the `{rawCoords, matchedVillage}` split from the last build.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 4 passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Context

Confirmed via real-device testing: GPS coordinates are accurate (Hyderabad resolved to 17.4665837, 78.3116609, ±13m, correctly). But the app has no way to turn coordinates into a place name unless the location happens to be near one of the 8 pilot villages — so for any other location on Earth, the UI shows raw latitude/longitude numbers instead of a city name. This is the actual bug to fix: a farmer (or anyone) should always see a real place name, never raw coordinates.

Three layers, used together, each for a different situation:
1. **Reverse geocoding on GPS coordinates** — when location permission is granted, turn the precise `rawCoords` into a real name (works anywhere on Earth).
2. **Cloudflare IP-based city** — when permission is not yet granted or is denied, silently pre-fill a rough guess with zero prompts, better than a blank pincode box.
3. **Manual pincode** — always available regardless of the above, unchanged from existing behavior, the final override.

None of this changes the existing `matchedVillage` logic (still used only for listings/mandi comparison, still gated to the 8-village pilot list and the 100km service-area check) — this prompt is entirely about the **display name** for weather and any other location-labeled UI, not about which villages have real listings data.

---

## Phase 1 — Reverse geocoding for GPS coordinates

**1a.** Add a reverse-geocoding call using BigDataCloud's free, keyless client-side API: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lng}&localityLanguage=hi` — returns a `city`/`locality` name, with Hindi-language results where available via the `localityLanguage=hi` param (if a Hindi name isn't available for a smaller town, the API may return an English name — accept this, don't block on it). No API key, no signup, confirm this before use by testing it directly with the Hyderabad coordinates already confirmed (17.4665837, 78.3116609) and verifying it returns "Hyderabad" or its Hindi equivalent.

**1a-i. CSP — add this first, before writing any fetch call.** This project's `public/_headers` has an explicit `connect-src` allowlist (added in an earlier build after Pexels images were silently blocked by CSP for the exact same reason). Add `https://api.bigdatacloud.net` to `connect-src` now. If this step is skipped, the reverse-geocoding fetch will fail silently on every call, and Phase 1c's failure handling will mask it as "the API is unreliable" when actually the browser never sent the request. Verify in the browser console (Network tab, not just "no error shown") that the request actually reaches bigdatacloud.net and returns 200 before moving on.

**1a-ii. Consistency with `matchedVillage`.** For a coordinate that resolves to (or near) one of the 8 pilot villages, reverse geocoding may return a differently-worded name than what `matchedVillage` already shows elsewhere (e.g. "Khurai Tehsil" vs. the existing "Khurai APMC" used in mandi/listings). Test this explicitly with a pilot-village coordinate (e.g. Khurai's known lat/lng). If the reverse-geocoded name and `matchedVillage`'s name for the same location don't reasonably match, prefer showing `matchedVillage`'s name for weather too when the location resolves within the pilot area — only fall through to the reverse-geocoded name when `matchedVillage` is null (i.e., genuinely outside the 100km service area, as with Hyderabad). This keeps the same physical location from appearing under two different names across different parts of the app.

**1b.** In `LocationControl`, whenever `rawCoords` is set (GPS granted and resolved), call this reverse-geocoding API once and store the returned place name alongside `rawCoords` — e.g. `rawCoords: {lat, lng, placeName}`. Use `placeName` everywhere the UI currently shows raw coordinates or nothing: the "आपकी जगह" label on `/mausam`, the homepage weather card, anywhere else identified in the Phase 1f consumer audit from the last build.

**1c. Failure handling.** If the reverse-geocoding call fails (network error, API down, rate-limited) or returns no usable name: fall back to showing the nearest seeded village's name with an approximate-distance qualifier if within a reasonable range (e.g. "लगभग Deori के पास" if under 50km), or simply omit a place name and show only the weather data with no location label, rather than ever showing raw latitude/longitude to a user. Raw coordinates must never appear in any user-facing view — only the existing `?debug=1` diagnostic overlay may show them.

**1d.** Cache the reverse-geocoding result for the session (don't re-call it on every re-render or every weather refresh) — one call per location resolution is sufficient.

---

## Phase 2 — Cloudflare IP-based city as a pre-permission fallback

**2a.** Cloudflare Pages/Workers expose request-level geolocation via the `cf` object on incoming requests (`request.cf.city`, `request.cf.country`, `request.cf.latitude`, `request.cf.longitude`). Since this is a static SPA (Vite/React, not server-rendered per-request), access this via a small Cloudflare Pages Function (`functions/geo.js` or similar) that returns the requesting client's `cf` data as JSON — the frontend calls this lightweight endpoint on load. **This project has not used a Cloudflare Pages Function before** (everything so far is a static build deployed via `npx wrangler pages deploy dist`). Verify first that placing a `functions/` directory at the project root is correctly picked up by the existing deploy command and routes as expected (e.g. `/geo` resolves to the function, not a 404) before building the rest of this phase on top of it — this is new infrastructure for the project, not a proven pattern, so confirm it works in isolation first.

**2b.** In `LocationControl`, before the user has granted or denied GPS permission (i.e., on first load, before any explicit choice), call this `/geo` endpoint and use the returned city as a **silent, non-committal pre-fill**: show "आप शायद [city] के आसपास हैं" as a soft suggestion alongside the "अपनी जगह अपने आप पता करें?" GPS prompt — never auto-applying it as the active location without the user seeing it first. This requires no permission prompt and no user action.

**2c.** If the user proceeds with GPS (Phase 1's flow), the IP-based guess is discarded in favor of the precise reverse-geocoded result. If the user dismisses the GPS prompt without granting or denying (leaves it pending), the IP-based city guess may be offered as a one-tap "हाँ, यही सही है" confirmation before falling through to manual pincode entry.

**2d.** Handle the case where `cf.city` is unavailable (e.g. testing locally where Cloudflare's edge context doesn't apply, or a VPN masking the real location) — fall through cleanly to the manual pincode input with no error shown.

---

## Phase 3 — Manual pincode (confirm unchanged)

**3a.** No new behavior needed here — confirm the existing manual pincode input (from the mega prompt's `LocationControl`) remains reachable and functional exactly as before, positioned as the final, always-available override beneath the GPS prompt and the new Cloudflare-based suggestion. Update its surrounding copy only if needed so the three options (GPS/precise, IP-suggested/approximate, manual pincode) read as a clear, ordered set of choices rather than a cluttered UI — e.g.:
```
📍 अपनी जगह अपने आप पता करें (सटीक)   [GPS button]
   आप शायद [IP-guessed city] के आसपास हैं — यही सही है?   [confirm button, shown only if cf.city resolved]
   या पिनकोड डालें: [___________] [लागू करें]
```

---

## Phase 4 — Screenshot self-review + tests (mandatory before deploy)

**4a.** Test reverse geocoding specifically with the confirmed-real Hyderabad coordinates (17.4665837, 78.3116609) via `?debug=1` — confirm the debug overlay now shows both the raw coordinates AND the resolved place name, and confirm the live (non-debug) `/mausam` page shows "Hyderabad" (or its Hindi equivalent) as the location label with correct current weather, not raw numbers.

**4b.** Test the Cloudflare IP fallback by simulating a fresh visit with no prior GPS permission decision — confirm the soft city suggestion appears without any permission prompt firing first.

**4c.** Test failure handling: mock the reverse-geocoding API failing (network block or invalid response) and confirm the fallback (Phase 1c) triggers cleanly — never raw coordinates on screen.

**4d.** Screenshots at 1280×800 and 375×812 of: `/mausam` with GPS granted showing a real place name (not coordinates); the pre-permission state showing the Cloudflare-suggested city; the manual pincode entry still working; the `?debug=1` overlay showing all values including the new resolved place name. **View every one.**

**4e.** Add permanent tests: reverse geocoding resolves a known coordinate pair to the expected city name (positive); reverse-geocoding failure never surfaces raw lat/lng in any non-debug view (negative); Cloudflare `cf.city` unavailable falls through cleanly to manual pincode (edge). Re-run the full existing suite, confirm no regressions to the Phase 0-4 geofencing/weather-split work from prior builds.

Write `docs/review/LOCATION_NAMING_REVIEW.md` covering all four phases, including confirmation that raw coordinates never appear in a non-debug user-facing view anywhere in the app (grep the codebase for any remaining direct `{lat}, {lng}` display in production UI, not just the paths touched in this prompt).

Commit message: "Location naming: reverse geocoding (BigDataCloud, free/keyless) turns GPS coordinates into real place names anywhere on Earth; Cloudflare IP-based city as a silent pre-permission suggestion; manual pincode unchanged as final override; raw coordinates never shown outside ?debug=1; permanent tests; screenshot-reviewed"
