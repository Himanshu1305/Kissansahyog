// Server-side venue geocoding for the Mela discovery job. Reuses the SAME Nominatim
// forward-geocoding approach as functions/geocode.js (same descriptive User-Agent that
// Nominatim's usage policy requires) rather than introducing a second geocoding path —
// here we query the full venue + district + state (nationwide) instead of a Sagar village.
// One Nominatim call per venue, serialized with a >=1s gap (Nominatim's 1 req/sec policy).
const UA = 'Kisan-Sahyog/1.0 (contact: usdvisionai@gmail.com)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Map Nominatim's result class/type to our two-level precision (Phase 2a-i):
//   'venue'  → a specific building/campus/amenity we can trust for a coordinate-distance match
//   'area'   → only a town/city/district/state centroid — coordinates alone must NOT merge two Melas
// Nominatim returns `class`/`type` (e.g. class=amenity type=university) and `addresstype`.
export function precisionOf(hit) {
  if (!hit) return null
  const cls = String(hit.class || '').toLowerCase()
  const type = String(hit.type || hit.addresstype || '').toLowerCase()
  // Area-level results: administrative boundaries and place=city/town/village/suburb/etc.
  const areaTypes = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'state', 'district', 'county', 'municipality', 'administrative', 'region', 'province', 'city_district', 'postcode'])
  if (cls === 'boundary' || cls === 'place') return areaTypes.has(type) ? 'area' : 'venue'
  if (areaTypes.has(type)) return 'area'
  // amenity/building/leisure/tourism/office/campus/highway-node etc. → a specific place.
  return 'venue'
}

export async function geocodeVenue({ venue, district, state }) {
  const parts = [venue, district, state, 'India'].map((x) => (x || '').trim()).filter(Boolean)
  if (parts.length < 2) return null
  const q = parts.join(', ')
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'hi,en' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const arr = await res.json()
    if (!Array.isArray(arr) || !arr.length) return null
    const hit = arr[0]
    return { latitude: Number(hit.lat), longitude: Number(hit.lon), precision: precisionOf(hit) }
  } catch {
    return null
  }
}

// Reverse-geocode coordinates to a STATE name (1c fallback) via BigDataCloud's free keyless API —
// the same provider src/lib/location/locationStore.js uses, but reading `principalSubdivision` (the
// state) instead of the city. Returns the raw state string (caller passes it through normalizeState),
// or null on failure. Used only when a Mela's own state value can't be mapped but it has coordinates.
export async function reverseGeocodeState({ latitude, longitude }) {
  if (latitude == null || longitude == null) return null
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: AbortSignal.timeout(10000) },
    )
    if (!res.ok) return null
    const d = await res.json()
    return d.principalSubdivision || null
  } catch {
    return null
  }
}

// Geocode a list of rows in series, honoring Nominatim's 1 req/sec policy. Mutates each
// row's latitude/longitude/geocode_precision in place when a hit is found; leaves them null otherwise.
export async function geocodeRows(rows) {
  for (const row of rows) {
    const hit = await geocodeVenue(row)
    if (hit) { row.latitude = hit.latitude; row.longitude = hit.longitude; row.geocode_precision = hit.precision }
    await sleep(1100)
  }
  return rows
}
