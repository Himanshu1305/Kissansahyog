# Village geocoding — Phase 1 finding (2026-09-26)

Investigation of the current distance/proximity system **before** any change, per Part A Phase 1.

## 1a — Every distance consumer and its coordinate source

| # | Consumer | Viewer/center coord source | Listing/target coord source |
|---|---|---|---|
| 1 | **`create_listing` RPC** (`0018`→`0025`) | — | **PINCODE** — derives `listing.latitude/longitude` from `v_pinrow` (the `pincodes` table row for the listing's pincode). This is the PRIMARY ANCHOR and the root of the bug. |
| 2 | **`fetchNearby`** (Browse, `listingsApi.js`) | viewer's **profile** lat/lng (`user.latitude/longitude`) | `row.latitude/row.longitude` — the listing's **denormalized** coords (currently pincode-derived via #1). Good pattern; just needs the source fixed at #1. |
| 3 | **`fetchHomeFeed`** (homepage "आपके आसपास" feed + `/drone-didi`) | `matchedVillage` pincode's coords | **LIVE JOIN to `pincodes`** — re-looks-up the pincode row's lat/lng and measures to THAT, ignoring the listing's own stored coords. Second pincode-anchor; must switch to the listing's denormalized coords (Phase 3a-i). |
| 4 | **`nearby_counts` RPC** (`0022`) | **PINCODE** (`pincodes` table row for `p_pincode`) | `l.latitude/l.longitude` (denormalized, pincode-derived via #1) |
| 5 | **MSP mandi distance-ranking** (`Msp.jsx` + `mandiCoords.js`) | `matchedVillage` pincode coords | mandi **town gazetteer** (`mandiCoords.js`, town-level, not pincode). Mandi side already town-anchored; only the viewer center is pincode/village. Not listing-coord related. |
| — | `LocationControl.matchedVillage` (`locationStore.nearestPincode`) | nearest of the **8 seeded `pincodes`** rows | — |

**Net:** the platform's listing coordinates are anchored to the **pincode centroid** (set once in
`create_listing`, read back denormalized by #2/#4, and re-derived live in #3). Village name is
never the anchor. The `pincodes` table is a proper DB table (20 Sagar rows: `pincode` PK,
`village_town`, `latitude`, `longitude`, …). There is **no** `village_coordinates` table yet; the
8 pilot villages live in `pincodes`. The listing creation form (`ListingForm.jsx`) asks for an
**asset pincode**, not a village name.

## 1b — Is the bug real in current seed data, or theoretical?

**Theoretical-but-real, not demonstrable with the current seed.** The `pincodes` seed maps each
pincode to exactly **one** village (1:1) — every one of the 8 pilot villages (Khurai 470117,
Sagar-area 470001–470004, Bina 470113, Rehli 470227, Deori 470226, Banda 470335, Rahatgarh
470119, Malthon 470441) has a **distinct** pincode. So no two *seeded* villages currently collapse
to the same point.

The bug is nonetheless real in principle and will bite real users:
- A real Indian rural pincode covers a **cluster of villages** (often >10km across). The `pincodes`
  table stores ONE (village_town, lat/lng) per pincode, so **any** real farmer whose village
  differs from that pincode's named town — but shares the pincode — is placed at the wrong point
  (the named town's centroid), silently skewing every distance shown.
- The system is also **capped to the 20 seeded pincodes**: `create_listing` raises
  `pincode_not_found` for any unseeded pincode, so villages outside the seed can't be placed at all.

The village-name forward-geocoding fix makes the **village** the anchor: every distinct village
name resolves to its own coordinates (via Nominatim, cached), regardless of a shared pincode and
regardless of whether the pincode was pre-seeded.

## 1c — Decisions this drives (for Phases 2–3)
- New `village_coordinates` cache table keyed by (village_name, district), seeded from the
  `pincodes` rows so the 8 pilot villages stay coordinate-consistent with weather/mausam (4b).
- `create_listing` resolves coords from the **village** (cache hit → immediate; new name →
  `geocoding_status='pending'` + enqueue), writing the resolved lat/lng **onto the listing row**
  (denormalized, 3a-i).
- `fetchHomeFeed` switched to the listing's own stored coords (stop the live pincodes join).
- Pincode retained only as `LocationControl`'s manual fallback (3d).
