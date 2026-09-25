# Geofencing / Location / Mandi search / PWA / Inputs / Testing — full review (2026-09-25)

Execution of `docs/MEGA_PROMPT_GEOFENCING_LOCATION_PWA_TESTING.md`, all phases in order.
**I viewed every screenshot** (local preview at 1280×800 and 375×812, plus the live
staging site). Cross-references: [`PHASE0_GEOFENCING_FINDING.md`](./PHASE0_GEOFENCING_FINDING.md)
and [`E2E_TEST_REPORT.md`](./E2E_TEST_REPORT.md).

**Migration:** `supabase/migrations/0025_visibility_location_inputs.sql` — applied.
**Deployed:** https://75d320fb.kissansahyog.pages.dev (verified live; see Phase 8).

## Phase 0 — Geofencing verified + enforced
Full finding in `PHASE0_GEOFENCING_FINDING.md`. Summary:
- **Hard cutoff existed** for `nearby_counts` (≤ `p_km`) and `fetchNearby` (bounding box
  capped at 50 km; primary ≤ 30, ring 30–50). **Gap:** `fetchHomeFeed` (homepage "आपके
  आसपास" feed + `/drone-didi`) only sorted by distance, never excluded — now enforced.
- Centralised the policy in `src/lib/distance.js` (`partitionByRadius`, `isWideVisible`,
  `WIDE_RADIUS_KM`, `WIDE_ELIGIBLE_CATEGORIES`). Default 30 km; 30–50 km ring returned
  **only when zero within-30 results** (aligned to the spec's letter); wide-eligible
  opt-in rows to 100 km. `nearby_counts` deliberately left strict at ≤30 (local density).
- **0d kill-switch check** (2 locations): Khurai@30 land 5/bhusa 3 (< totals 9/7, and
  < @50 counts 6/4) — cutoff genuinely applies and hides nothing everywhere. Recorded.

## Phase 1 — Per-listing wide-visibility opt-in (Parali/Inputs only)
- `listings.wide_visibility` column; `create_listing` gains `p_wide_visibility` with a
  **server-side guard**: true is permitted only for `bhusa`/`agri_inputs`, else the RPC
  raises `wide_visibility_not_allowed` (verified rejected via a direct RPC call bypassing
  the UI — E2E test report §7b).
- Listing form shows the checkbox **only** for Bhoosa/Parali + Seeds & Inputs, default
  unchecked, with the required note. Screenshot-confirmed present on Bhoosa, **absent on
  Equipment**.
- Query: wide rows appear to searchers up to 100 km; every other listing obeys 30/50.

## Phase 2 — Unified LocationControl (auto-detect + manual + recent)
- One shared component (`src/components/pages/shared.jsx` `LocationControl` +
  `src/lib/location/locationStore.js`) replaces the three separate controls on the
  homepage, `/mausam`, and `/msp`. Screenshot-confirmed **identical** on all three.
- Browser Geolocation behind a dismissible prompt ("अपनी जगह अपने आप पता करें? · हाँ ·
  पिनकोड डालें · ✕"); on grant, precise lat/lng is used directly for weather and matched
  to the nearest **seeded pincode** (single coordinate source — the `pincodes` table) for
  pincode-dependent features. Manual pincode input stays reachable after a grant. Up-to-5
  recent-location chips in `localStorage`. E2E: grant / deny / far-outside-MP / manual all
  pass.

## Phase 3 — MSP nearby-mandi ranking + free mandi search (NOT geofenced)
- `/msp/:crop` "आज का भाव" table gains a **दूरी** column and is sorted nearest-first,
  using an approximate town gazetteer (`src/content/mandiCoords.js`) for informational
  distance only. Screenshot: Shahagarh APMC · 74 किमी · ₹2,560.
- Mandi search box ("मंडी का नाम खोजें …") sourced from `SELECT DISTINCT market`; fuzzy
  chips; selecting shows that mandi's latest price **with its date**, or an honest empty
  state (screenshot: "Indore APMC → इस मंडी में इस फसल का ताज़ा भाव उपलब्ध नहीं।").
- **Phase 3c separation** enforced by a header comment on `lib/mandi/mandiApi.js` and a
  static code-level regression test asserting the module never imports the cutoff logic.

## Phase 4 — Small fixes
- फसल सलाह present as the last item of the बाज़ार dropdown (screenshot-confirmed) and in
  `public/sitemap.xml` (both already in place from the prior build; verified).
- CSP: `fonts.googleapis.com` added to `style-src`, `fonts.gstatic.com` to `font-src` in
  `public/_headers`. **Live-verified:** fonts load 200 and the Google-Fonts CSP console
  notice is **gone** (zero CSP messages).

## Phase 5 — PWA
- `registerType: 'prompt'` (no silent auto-swap). Manifest name "किसान सहयोग" / short_name
  "Kisan Sahyog", theme `#24733F`, bg `#FBFAF5`, 192/512/maskable icons — live-verified
  (`manifest.webmanifest`, `sw.js`, all icons return 200).
- Runtime caching: live data (supabase / open-meteo / mandi / data.gov) is **NetworkFirst**
  (never CacheFirst); static shell is precached; fonts CacheFirst. `clientsClaim` on
  (offline-first) but **no skipWaiting** (updates gated by the prompt).
- `PwaPrompts.jsx`: update-available banner (`onNeedRefresh` → `updateServiceWorker(true)`),
  offline banner ("आप ऑफ़लाइन हैं — आख़िरी बार अपडेट: …"), and a home-screen install prompt
  shown only to returning visitors (visit ≥ 2), suppressed 14 days after dismissal.
  Screenshot-confirmed install banner copy; E2E confirms not-on-first-visit + offline
  banner + cached-shell-on-offline-reload.
- **5e Lighthouse/installability sanity:** installable criteria all satisfied on the live
  site (manifest + SW + icons + standalone + start_url). Recorded here in lieu of a full
  Lighthouse HTML report (CLI not in this environment).

## Phase 6 — Input price tracker
- `input_prices` table (public read of active; admin RPCs `get_admin_input_prices` /
  `admin_set_input_price_active` / `admin_upsert_input_price`), seeded with 3 Khurai-area
  shops × Urea/DAP/diesel (starter data — maintenance caveat added to PROJECT_CONTEXT).
- Displayed on `/info` as "कृषि सामग्री के भाव" (item / shop / price / unit + "अपडेट: …"
  disclaimer) — screenshot-confirmed. Admin CRUD panel added. (Homepage teaser omitted to
  keep the homepage uncluttered — "optionally" per spec.)

## Phase 7 — Automated E2E + bug-fix loop
See `E2E_TEST_REPORT.md`. Baseline backend suites 21 pass / 5 fail (all 5 **pre-existing**,
verified by stashing this build). New permanent tests: `scripts/test/p_0025_visibility.mjs`
(44/44 — geofencing logic, wide-visibility server guard, mandi separation, PWA config,
input prices, downstream feed-non-empty) and `e2e/phase10_location_pwa.spec.js` +
`e2e/phase10_downstream.spec.js` (15/15 — location, mandi search, PWA install/offline,
downstream public-page sweep incl. the homepage mandi-ticker regression guard). Six issues
found and fixed during the loop (one app fix: `clientsClaim` for offline-first; five test
corrections), each re-verified by a full re-run. Backend pass count rose 21 → 22; never
decreased.

## Phase 8 — Screenshot review + deploy
Viewed at 1280×800 and 375×812: homepage, `/mausam`, `/msp/gehun` (search performed),
`/post` Bhoosa (checkbox present) and Equipment (checkbox absent), PWA install prompt,
बाज़ार dropdown (फसल सलाह), `/info` (input tracker), mobile homepage. Checklist:
- ✓ LocationControl identical on homepage / /mausam / /msp.
- ✓ Geolocation prompt clear + dismissible; manual pincode always reachable.
- ✓ Mandi search present; a >30 km mandi shown (distance column) + honest empty state.
- ✓ Bhoosa/Seeds forms show the checkbox + note; every other category does not.
- ✓ PWA install prompt copy + manifest icons render.
- ✓ फसल सलाह reachable from nav (desktop dropdown; mobile hamburger).
- ✓ Google-Fonts CSP console notice gone (live-verified).
- ✓ No horizontal scroll; nothing under 14px.

Deployed, then re-checked live: fonts load (CSP clean), the **homepage mandi ticker shows
live prices** on the live site (मक्का ₹1,930 · गेहूं ₹2,560 · सोयाबीन ₹5,700 …), and the
homepage renders with Noto Devanagari. Full suite re-confirmed green before deploy.

### Minor / follow-up
- `index.html`'s `theme-color` meta was `#15803d`; corrected to `#24733F` (manifest was
  already correct). Cosmetic browser-chrome tint; ships on the next deploy.
- Mandi distance uses approximate town-centre coordinates (informational only), and the
  town gazetteer covers the ~19 markets currently reporting; unlisted markets fall back to
  a district centre or show "—".
