# Village geocoding — Part A review (2026-09-26)

Replaces the pincode centroid with village-level forward geocoding as the platform's distance
anchor. Migration `0027_village_geocoding.sql`. Full Phase-1 investigation in
`VILLAGE_GEOCODING_FINDING.md`.

## Phase 1 — current state (see VILLAGE_GEOCODING_FINDING.md)
Every listing's coordinates were derived from its **pincode** (`create_listing` → `pincodes`
table), read back denormalized by Browse/`nearby_counts` and re-derived via a live pincodes join
in `fetchHomeFeed`. MSP mandi ranking already used a town gazetteer. The `pincodes` table is a real
DB table; there was no `village_coordinates` table; the form asked for a pincode.

**Phase 1b — was the bug real in seed data?** Theoretical-but-real: the seed maps each pincode to
exactly one village (1:1), so no two *seeded* villages collapse today. But a real pincode covers a
cluster of villages, so any real farmer sharing a pincode with the seeded town is misplaced at that
town's centroid — and the system was capped to the 20 seeded pincodes.

## Phase 2 — forward geocoding service
- **Nominatim** (free/keyless) via the `/geocode` Cloudflare Pages Function, which sets the required
  `User-Agent: Kisan-Sahyog/1.0 (contact: usdvisionai@gmail.com)` (browsers cannot set that header).
  Verified live: `/geocode?village=Khurai` → `{found:true, lat:24.052, lng:78.331, …}` HTTP 200.
- **CSP** (2b): `https://nominatim.openstreetmap.org` added to `connect-src` first.
- **Rate limit, enforced server-side (2a-i):** a single-row `geocode_state.last_nominatim_call_at`
  + `claim_geocode_slot()` RPC that atomically permits ≤1 call/sec across ALL concurrent callers.
  Verified: a burst of 8 concurrent claims granted exactly **1**; after a 1.1s wait, 1 more. The
  client `drainGeocodeQueue` worker claims a slot before every `/geocode` call.
- **Cache + queue (2c):** `village_coordinates` (keyed by lower(village_name, district)); pending
  rows are the queue, resolved rows are the cache + autocomplete source. Never re-geocodes a
  resolved name. Seeded from the 20 `pincodes` rows so the 8 pilot villages are pre-resolved.
- **Failure handling (2d):** `fail_village` retries up to 3× then marks `failed`; failures/pending
  appear in the admin unresolved log (`get_admin_unresolved_villages`). A listing never gets 0,0 —
  it stays `pending` (excluded from distance views) and the manual pincode fallback remains.
- **Non-blocking creation (2e):** `create_listing` uses a cached village immediately; a new name
  saves the listing with `geocoding_status='pending'` (coords null) and enqueues — the post
  succeeds instantly and the post-success screen shows "आपकी जगह की पुष्टि हो रही है …". The drain
  worker fills coords within seconds, flipping the listing into distance views.

## Phase 3 — village as the primary anchor
- **3a / 3a-i:** `create_listing` resolves coords from the **village** and writes them onto the
  listing row (denormalized). `fetchHomeFeed` now reads the listing's OWN coords (dropped the live
  pincodes join). `nearby_counts` + `fetchNearby` already read the denormalized `latitude/longitude`
  (now village-derived); pending listings (null coords) are naturally excluded.
- **3b:** the listing form's location field changed from pincode → **village name** with autocomplete
  against `village_coordinates` (resolved names), falling through to the queued-geocoding path for a
  new name. Verified: cache-hit "Khurai" → resolved immediately (24.045); a brand-new name → saved
  `pending`, coords null, enqueued.
- **3c — backward compatibility (decision):** **option (b)** — existing seed/dummy listings KEEP
  their pincode-derived coordinates as a documented approximation; only NEW listings use village
  geocoding. Their `village_name` was backfilled from the pincode's town so they still display a
  place name. (Chosen over batch re-geocoding 54 seed rows, which would spend Nominatim calls on
  demo data and risk shifting long-standing seed positions.)
- **3d:** pincode remains only as `LocationControl`'s manual viewer fallback (area centroid), never
  the listing anchor.

## Phase 4 — verification against the reported problem
- **4a — the exact bug, demonstrated:** two real villages under Sagar pincode **470117** (Karampur,
  which OSM lists within Khurai/470117, and adjacent Bamhori):
  - OLD (both share pincode 470117 → both get Khurai's centroid): **0.0 km** — collapsed to one point.
  - NEW (village-geocoded): Karampur (24.181, 78.372) vs Bamhori (24.126, 78.241) = **14.6 km** — accurate.
- **4b — pilot consistency:** all 8 pilot villages' `village_coordinates` equal the `pincodes` coords
  the weather/mausam system uses (seeded from the same source) — one coordinate set per place, no
  divergence. Verified for Khurai/Bina/Rehli/Deori/Banda/Rahatgarh/Malthon (all ✓).

## Phase 5 — permanent tests + screenshots

### Permanent regression tests (Nominatim MOCKED — never live)
Per the run rule, no automated test calls the live Nominatim API; they exercise the DB pipeline
with stubbed coordinates + static source assertions.

- **`scripts/test/p_0029_village_geocoding.mjs`** (15/15 pass) covers:
  - *Static wiring:* CSP allows `nominatim.openstreetmap.org`; `/geocode` sets the required
    `User-Agent`; the drain worker claims the 1/sec slot **before** calling `/geocode`; `fetchHomeFeed`
    ranks on the listing's own coords (no live pincodes-join).
  - *1-req/sec serialization (2a-i regression):* a burst of 8 concurrent `claim_geocode_slot` calls
    grants exactly **1**; a further claim succeeds only after the 1s gap — proving outbound calls are
    serialized, not fired concurrently. (Tests the DB gate, no live Nominatim.)
  - *The reported bug (direct regression):* two villages sharing pincode 470117 → OLD pincode-centroid
    distance = **0 km**; NEW village-geocoded distance = **>5 km** (14.6 km) — genuinely different points.
  - *Non-blocking creation (2e):* a new-village listing saves immediately as `pending` with null coords
    and enqueues; *cache hit:* a resolved name geocodes immediately at create time.
  - *Resolve pipeline:* `resolve_village` marks the cache resolved **and** denormalizes coords onto the
    pending listing, flipping it into distance views.
  - *Failure fallback (2d):* 3 failed attempts mark the village `failed` (admin log); the listing stays
    `pending` with **NULL coords — never 0,0**.
- **`e2e/phase14_village_geocoding.spec.js`** (2/2 pass): the Equipment and Land forms both show the
  **village-name input** with an autocomplete `datalist` populated from resolved villages, and the old
  numeric asset-pincode field is **gone**.

### Full suite re-run (no regressions)
- Backend: **30 pass / 1 fail** — the single failure is the pre-existing `v11_phase6` i18n debt (TD-1),
  unrelated to this change. The `create_listing` 10→11-arg change did **not** break any prior suite
  (`p_0025` visibility etc. still pass — old named calls bind to the new arg's default).
- E2E: prior specs **26/26 pass** (geofencing, weather-split, location-naming) + new **2/2**.

### Screenshots (`docs/review/shots-0029/`, all viewed)
- `post-village-form-{d,m}` — the listing form's location field is now **"जगह — गाँव/शहर का नाम"** with an
  autocomplete dropdown + the privacy hint ("…उसका नाम लिखें (आपके घर का नहीं)।"); no pincode field.
- `post-pending-note-d` — posting a brand-new village shows the success screen + the pending note
  **"आपकी जगह की पुष्टि हो रही है — कुछ ही देर में लिस्टिंग नज़दीकी खोज में दिखेगी।"**
- `browse-distance-{d,m}` — a freshly-geocoded **non-pilot** village (Demopur, resolved ~14 km NW of the
  Khurai viewer) renders an accurate **"14 किमी दूर"** on its card, correctly sorted nearest-first among
  the pincode-anchored seed listings (0/14/18/18/20/29 km) and displaying **village-only** (no pincode).

### Admin unresolved-geocoding log
Exposed as the `get_admin_unresolved_villages(p_actor_id)` RPC (require_admin), returning
failed/pending/processing rows. No dedicated admin UI screen was built this run, so there is no
screenshot; its behaviour (a nonsense name surfaces as `failed` after 3 attempts) is covered by the
failure-fallback case in `p_0029`.
