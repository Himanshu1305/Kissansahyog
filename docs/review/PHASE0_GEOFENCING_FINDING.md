# Phase 0 — Geofencing finding (2026-09-25)

## Verdict

**Hard cutoff: PARTIAL (YES for the two named surfaces, NO for one adjacent feed).**

- **`nearby_counts` RPC (migration 0022)** — **Hard cutoff: YES.** Evidence: the RPC
  counts a listing only when its Haversine distance from the pincode's coordinates is
  `<= greatest(1, coalesce(p_km, 30))`. Anything beyond `p_km` is excluded from the
  count entirely. No widening, no fallback. Confirmed empirically below.
- **`fetchNearby` (Browse — the nearby-listings query, `src/lib/listings/listingsApi.js`)**
  — **Hard cutoff: YES.** Evidence: (1) the server-side bounding-box pre-filter is sized
  to `FALLBACK_RADIUS_KM` (50 km), so no row beyond ~50 km is ever fetched; (2) the exact
  Haversine pass splits results into `primary` (`distanceKm <= RADIUS_KM`, 30 km) and
  `fallback` (30–50 km ring). Nothing beyond 50 km can appear.
  - **Deviation from Phase 0b's letter:** the fallback ring was surfaced whenever
    `primary.length < MIN_PRIMARY_RESULTS` (5). Phase 0b says the ring should widen
    **only when a category has zero results within 30 km**. Aligned to the spec (see 0b
    below) — the ring is now only returned when there are **zero** within-30 results.
- **`fetchHomeFeed` (homepage "आपके आसपास की ताज़ा लिस्टिंग" + `/drone-didi` local list)**
  — **Hard cutoff: NO (gap).** Evidence: it fetched the newest `pool` (40) active rows
  across categories and, when a center was supplied, only **sorted** by computed distance —
  it never **excluded** by distance. A listing 200 km away could appear under a "near you"
  heading with its km label. This is exactly the fraud-prevention hole Phase 0 targets, so
  it is now enforced (see 0b).

## 0d — Zero-listings safety check (kill-switch)

Total active listings per category (`SELECT category, COUNT(*) ... WHERE status='active'`):

| category | active total |
|---|---|
| agri_inputs | 7 |
| bhusa | 7 |
| drone_didi | 8 |
| equipment | 10 |
| labor | 7 |
| land | 9 |
| warehouse | 4 |
| **total** | **52** |

`nearby_counts` from two test locations (the six homepage-chip categories the RPC returns;
`agri_inputs` is not one of the six):

| category | Khurai 470117 @30km | Khurai 470117 @50km | Bandri 470442 @30km |
|---|---|---|---|
| bhusa | 3 | 4 | 1 |
| drone_didi | 3 | 4 | 1 |
| equipment | 5 | 5 | 0 |
| labor | 2 | 2 | 0 |
| land | 5 | 6 | 1 |
| warehouse | 2 | 2 | 0 |

**Both failure modes ruled out:**
- **Not zero for every category** — Khurai has results in all six; even sparse Bandri has
  bhusa/drone_didi/land ≥ 1. The clause is not silently hiding everything.
- **Not identical to the unfiltered total** — Khurai @30km (land 5, bhusa 3, drone_didi 3,
  equipment 5) is strictly below the totals (land 9, bhusa 7, drone_didi 8, equipment 10),
  and the @50km counts exceed the @30km counts (bhusa 3→4, drone_didi 3→4, land 5→6). The
  cutoff is demonstrably applied, and the 30↔50 boundary demonstrably shifts results.

## 0b — Enforcement applied

Centralised the policy in `src/lib/distance.js`:
- `RADIUS_KM = 30` (default), `FALLBACK_RADIUS_KM = 50` (ring / hard ceiling for standard
  listings), `WIDE_RADIUS_KM = 100` (Phase 1 opt-in ceiling),
  `WIDE_ELIGIBLE_CATEGORIES = ['bhusa', 'agri_inputs']`.
- `isWideVisible(category, wide, distanceKm)` — true only for an eligible category with
  `wide_visibility = true` at 30 < d ≤ 100.
- `partitionByRadius(rows, {getDistance, getCategory, getWide})` → `{ primary, fallback }`:
  - `primary` = rows within 30 km **plus** any wide-eligible-and-flagged rows out to 100 km
    (Phase 1 — always shown, no threshold).
  - `fallback` = the 30–50 km ring, **returned only when there are zero within-30 results**
    (Phase 0b), and never containing wide rows (those are already in `primary`).

Applied to `fetchNearby` (single-category; bounding box widened to 100 km only for the two
eligible categories, 50 km otherwise) and `fetchHomeFeed` (multi-category showcase; the same
partition, ring shown only when the whole pool has zero within-30 rows). When no center is
available (e.g. `/drone-didi` with no location) distance filtering is skipped — you cannot
measure distance without a viewer coordinate — and the newest-first order is preserved.

The fallback label reuses the existing UI string `radius_fallback` ("30–50 किमी दूर" /
"30–50 km away") per Phase 0b's "reuse the existing pattern" instruction.

`nearby_counts` is left strict at ≤ `p_km`: it is a **local density** indicator, and letting
a wide-visibility listing 80 km away inflate a "within 30 km" count would be dishonest. This
is intentional and called out here.

## Separation from Phase 3

Phase 3's mandi price search is deliberately **not** geofenced and does not import any of the
above. Enforced by a code-level regression test in Phase 7 and a header comment on the mandi
module.
