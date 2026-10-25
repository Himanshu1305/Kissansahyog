// Small location helpers that outlived the old pincode-based control.
//
// Batch 7L-1: the visitor's location now lives in ./userLocation.js (the one
// { lat, lng, label, source } object) and ./LocationProvider.jsx. Pincode lookup, the
// IP-city guess, the "recent places" list and the service-area gate were removed with the
// old control — nothing here resolves a visitor's location any more.
export const geolocationSupported = () =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator

// ADMIN ONLY — the fixed point (Khurai) the admin "today's post" builder reads weather for.
// It is never used as a visitor's location: with no location set, visitors see the prompt
// card, not this place.
export const DEFAULT_COORDS = { latitude: 24.045, longitude: 78.33 }

// Reverse-geocode a device position to a place name via BigDataCloud's free, keyless client
// API (Hindi names where available). Used only to NAME a device fix that is not close to a
// place in the places list. Session-cached by rounded coordinate. Returns a name, or null on
// failure (the caller falls back to a generic label — never raw coordinates).
const geocodeCache = new Map()
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null
  const key = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`
  if (geocodeCache.has(key)) return geocodeCache.get(key)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=hi`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) throw new Error(`geocode HTTP ${res.status}`)
    const d = await res.json()
    const name = d.city || d.locality || null
    if (name) geocodeCache.set(key, name) // cache successes only, so a transient failure can retry
    return name
  } catch {
    return null
  }
}
