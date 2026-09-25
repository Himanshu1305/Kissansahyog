# Overnight run — Village Geocoding (Part A) + Land Acreage (Part B)

Run date: 2026-09-26 (unattended). One production deploy at the very end, after Part B Phase 4.
**Live URL:** https://baba7884.kissansahyog.pages.dev

## Outcome
Both parts completed in order. Part A did not fail, so Part B proceeded. Every phase is committed;
the single production deploy ran once at the end and was re-verified live.

## Part A — Village Geocoding (pincode → village as the distance anchor)

| Phase | What | Commit | Status |
|-------|------|--------|--------|
| A1 | Investigate distance consumers + seed pincode state; `VILLAGE_GEOCODING_FINDING.md` | `038fc29` | ✅ pass |
| A2 | Forward geocoding service — `village_coordinates` cache/queue, `geocode_state` 1/sec slot, `/geocode` Pages Function (Nominatim + UA), client drain worker, CSP | `1631369` | ✅ pass |
| A3 | Village = primary anchor; form asks village name (autocomplete); denormalized coords; new-village pending flow | `ab0cc78` | ✅ pass |
| A4 | Verify the bug — Karampur/Bamhori share pincode 470117: OLD 0 km → NEW 14.6 km | `e437530` | ✅ pass |
| A5 | Permanent tests (MOCKED Nominatim) + screenshots + `VILLAGE_GEOCODING_REVIEW.md` | `6fd0999` | ✅ pass |

Reviews: `docs/review/VILLAGE_GEOCODING_FINDING.md`, `docs/review/VILLAGE_GEOCODING_REVIEW.md`,
screenshots `docs/review/shots-0029/` (all viewed).
Migrations: `0027_village_geocoding.sql`.
Tests: `scripts/test/p_0029_village_geocoding.mjs` (15/15), `e2e/phase14_village_geocoding.spec.js` (2/2).

**Key results:** Nominatim runs server-side (browsers can't set UA); 1-req/sec enforced by an atomic
DB slot (8 concurrent → exactly 1). New village names save instantly as `pending` (excluded from
distance views) and resolve within seconds; a geocode failure marks the village `failed` (admin log)
and never writes 0,0. Backward-compat decision (3c): **option (b)** — seed listings keep their
pincode-derived coords (documented approximation), village_name backfilled; only new listings use
village geocoding.

## Part B — Land Acreage (numeric acres, per-acre rate, contact)

| Phase | What | Commit | Status |
|-------|------|--------|--------|
| B1 | Dependency check (village geocoding landed) + inspect Land schema/form/card; `LAND_ACREAGE_REVIEW.md` | `c4cae0e` | ✅ pass |
| B2 | Remove `size_range` buckets → numeric `size_acres` (min 0.1, no cap) across ठेका/बटाई/पट्टा; migration converts seed | `595fbbc` | ✅ pass |
| B3 | Per-acre rate label (₹/एकड़ for fixed/ठेका) + optional per-listing contact number | `bea5d11` | ✅ pass |
| B4 | Screenshots + tests + 30km geofence check + privacy hardening + `LAND_ACREAGE_REVIEW.md` | `3c6a4cd` | ✅ pass |

Review: `docs/review/LAND_ACREAGE_REVIEW.md`, screenshots `docs/review/shots-0031/` (all viewed).
Migrations: `0028_land_acreage.sql` (bucket→numeric), `0029` (interim contact RPC),
`0030_private_listing_contact.sql` (private contact table), `0031_scope_private_contact_to_land.sql`
(scope to Land only + restore vendor public contact).
Tests: `scripts/test/p_0031_land_acreage.mjs` (19/19), `e2e/phase15_land_acreage.spec.js` (2/2).

**Key results:** a 50-acre ठेका listing stores and displays exactly (no cap, no rounding); the fixed
type shows "प्रति एकड़ दर (₹)" and renders "₹X/एकड़"; बटाई keeps its % split. The optional contact
override is stored in a private table anon cannot read (mirrors the profiles pattern) and revealed only
through the gated `get_listing_contact` RPC — never leaked in the anon-readable `details`. The 30km
visibility rule is unchanged for Land (verified).

## Final verification (single deploy)
- Build OK → `npx wrangler pages deploy dist --project-name kissansahyog` → **https://baba7884.kissansahyog.pages.dev** (Functions bundle + `_headers` uploaded).
- Live `/geocode?village=Rehli&district=Sagar` → `200 {found:true, lat:23.64, lng:79.07, "Rehli, Rehli Tahsil, सागर, …"}` — the Nominatim proxy works end-to-end in production.
- Live CSP header includes `nominatim.openstreetmap.org`; homepage 200 and renders fully (mandi ticker, weather/MSP hero, आपके आसपास 30 किमी). Screenshot `docs/review/shots-live-overnight/live-home.jpg` (viewed).

## Test baseline after the run
- Backend: **31 pass / 1 fail** — the single failure is the pre-existing `v11_phase6` i18n debt (TD-1), unrelated to this work.
- E2E: **33 / 33 pass** (mega-prompt journeys, geofencing, weather-split, location-naming, + new village & land specs).
- Per the run rule, all permanent tests MOCK Nominatim; the only live Nominatim calls were this session's one-time manual verifications.

## Notes / known limitations
- One regression was caught and fixed mid-run: 0030's generic contact-strip removed the *public* vendor
  contact_phone; `0031` restores it and scopes the private override to Land only.
- The admin unresolved-geocoding log is the `get_admin_unresolved_villages` RPC (no dedicated UI screen
  built this run); its behaviour is covered by the failure-fallback test.
- Dead code left in place (not referenced): `locationLabelKey`/`locationPlaceholderKey` pincode exports
  in `land.jsx`/`equipment.jsx`, superseded by the shared village field in A3.
