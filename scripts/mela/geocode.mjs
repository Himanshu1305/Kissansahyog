// Server-side venue geocoding for the Mela discovery job. Reuses the SAME Nominatim
// forward-geocoding approach as functions/geocode.js (same descriptive User-Agent that
// Nominatim's usage policy requires) rather than introducing a second geocoding path —
// here we query the full venue + district + state (nationwide) instead of a Sagar village.
// One Nominatim call per venue, serialized with a >=1s gap (Nominatim's 1 req/sec policy).
const UA = 'Kisan-Sahyog/1.0 (contact: usdvisionai@gmail.com)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function geocodeVenue({ venue, district, state }) {
  const parts = [venue, district, state, 'India'].map((x) => (x || '').trim()).filter(Boolean)
  if (parts.length < 2) return null
  const q = parts.join(', ')
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'hi,en' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const arr = await res.json()
    if (!Array.isArray(arr) || !arr.length) return null
    return { latitude: Number(arr[0].lat), longitude: Number(arr[0].lon) }
  } catch {
    return null
  }
}

// Geocode a list of rows in series, honoring Nominatim's 1 req/sec policy. Mutates each
// row's latitude/longitude in place when a hit is found; leaves them null otherwise.
export async function geocodeRows(rows) {
  for (const row of rows) {
    const hit = await geocodeVenue(row)
    if (hit) { row.latitude = hit.latitude; row.longitude = hit.longitude }
    await sleep(1100)
  }
  return rows
}
