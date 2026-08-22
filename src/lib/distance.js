// Distance helpers for the 30 km nearby-search.
//
// BOUNDARY POLICY: a listing is "nearby" when its great-circle distance from the
// viewer is <= RADIUS_KM (INCLUSIVE of exactly 30.0 km). See scripts/test/phase3.mjs
// for boundary tests (a point just inside and just outside 30 km).

export const RADIUS_KM = 30
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
