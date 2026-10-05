// Distance helpers for the 30 km nearby-search.
//
// BOUNDARY POLICY: a listing is "nearby" when its great-circle distance from the
// viewer is <= RADIUS_KM (INCLUSIVE of exactly 30.0 km). See scripts/test/phase3.mjs
// for boundary tests (a point just inside and just outside 30 km).

export const RADIUS_KM = 30
// Soft fallback ring: when a search returns ZERO results within RADIUS_KM, results
// between RADIUS_KM and FALLBACK_RADIUS_KM are shown in a clearly-labelled secondary
// section so a low-density pilot area is never a blank screen (Phase 0b).
export const FALLBACK_RADIUS_KM = 50
export const MIN_PRIMARY_RESULTS = 5

// Phase 1 — per-listing wide-visibility opt-in. Only these two categories may set the
// wide_visibility flag (enforced server-side in create_listing); when set, such a
// listing is visible out to WIDE_RADIUS_KM. Every other listing obeys the 30/50 rule.
export const WIDE_RADIUS_KM = 100
export const WIDE_ELIGIBLE_CATEGORIES = ['bhusa', 'agri_inputs', 'warehouse']

// True only for an eligible category flagged wide_visibility, in the 30–100 km band.
// (Within 30 km every listing is already "primary"; this only extends the reach.)
export function isWideVisible(category, wide, distanceKm) {
  return (
    wide === true &&
    WIDE_ELIGIBLE_CATEGORIES.includes(category) &&
    distanceKm != null &&
    distanceKm > RADIUS_KM &&
    distanceKm <= WIDE_RADIUS_KM
  )
}

// Phase 0/1 visibility policy, applied to any list of listing rows that already carry a
// computed distanceKm. Returns { primary, fallback }:
//   primary  = within 30 km, PLUS wide-eligible+flagged rows out to 100 km (always shown).
//   fallback = the 30–50 km ring, returned ONLY when there are zero within-30 results
//              (Phase 0b), never including wide rows (those are in primary).
// Rows with a null distanceKm are dropped (missing coordinates → cannot be trusted as
// nearby → excluded gracefully, not errored).
export function partitionByRadius(rows, { getDistance, getCategory, getWide }) {
  const within30 = []
  const wideFar = []
  const ring = []
  for (const r of rows || []) {
    const d = getDistance(r)
    if (d == null || Number.isNaN(d)) continue
    if (d <= RADIUS_KM) { within30.push(r); continue }
    if (isWideVisible(getCategory(r), getWide(r), d)) { wideFar.push(r); continue }
    if (d <= FALLBACK_RADIUS_KM) ring.push(r)
  }
  const primary = [...within30, ...wideFar]
  const fallback = within30.length === 0 ? ring : []
  return { primary, fallback }
}
const EARTH_R_KM = 6371
const KM_PER_DEG_LAT = 111.045

const toRad = (deg) => (deg * Math.PI) / 180

// Great-circle distance in km (Haversine).
export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

// Bounding box around a center for a cheap server-side pre-filter before the
// exact Haversine pass. Padded slightly so no in-radius point is excluded by
// the box. cos(lat) guards against longitude degrees shrinking away from equator.
export function boundingBox(lat, lon, radiusKm = RADIUS_KM) {
  const pad = 1.02 // 2% padding
  const dLat = (radiusKm * pad) / KM_PER_DEG_LAT
  const cos = Math.max(0.01, Math.cos(toRad(lat)))
  const dLon = (radiusKm * pad) / (KM_PER_DEG_LAT * cos)
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  }
}

export function isWithinRadius(distanceKm, radiusKm = RADIUS_KM) {
  return distanceKm <= radiusKm
}
