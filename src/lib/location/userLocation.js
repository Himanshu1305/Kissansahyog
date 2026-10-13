// Batch 7L-1 — the ONE location object used by every distance / "near you" / weather /
// mandi-proximity feature:
//
//   { lat, lng, label, source }     source = 'device' | 'saved' | 'typed' | 'picked'
//
//   device  the browser gave us a position after the visitor pressed "Share my location"
//   saved   restored from this device (localStorage) or from the coordinates the logged-in
//           profile already carries
//   typed   the visitor typed a village/town and chose a match
//   picked  the visitor chose district → town from the picker
//
// There is NO default place and pincode is not used for location anywhere. The saved
// location lives on this device only — nothing here writes to the profile.

const KEY = 'ks_location_v1'
const DECLINED_KEY = 'ks_location_share_declined'
export const SOURCES = ['device', 'saved', 'typed', 'picked']

const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v))

// Returns a clean location object, or null when the input is not a usable point.
export function makeLocation(lat, lng, label, source) {
  const la = num(lat), ln = num(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null
  return { lat: la, lng: ln, label: String(label || '').trim(), source: SOURCES.includes(source) ? source : 'saved' }
}

// Adapter for the helpers that take { latitude, longitude } (haversine, listings, weather).
export function toCenter(loc) {
  return loc ? { latitude: loc.lat, longitude: loc.lng } : null
}

// What is stored keeps the ORIGINAL source (`from`) so a deliberate typed/picked choice is
// not overwritten by a later automatic device fix. When read back the source is 'saved'.
export function saveLocation(loc) {
  if (!loc) return false
  try {
    localStorage.setItem(KEY, JSON.stringify({ lat: loc.lat, lng: loc.lng, label: loc.label, from: loc.source === 'saved' ? (loc.from || 'saved') : loc.source }))
    return true
  } catch { return false }
}

export function loadSavedLocation() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    const loc = raw && makeLocation(raw.lat, raw.lng, raw.label, 'saved')
    return loc ? { ...loc, from: SOURCES.includes(raw.from) ? raw.from : 'saved' } : null
  } catch { return null }
}

// Coordinates the logged-in profile ALREADY has (read only — never written from here).
export function profileLocation(user) {
  if (!user || user.latitude == null || user.longitude == null) return null
  const loc = makeLocation(user.latitude, user.longitude, user.village_town || '', 'saved')
  return loc ? { ...loc, from: 'profile' } : null
}

// "Not now" on the pre-permission card: remembered on this device so the card is not shown
// again on every page. "Change → Share my location" stays available.
export function isShareDeclined() {
  try { return localStorage.getItem(DECLINED_KEY) === '1' } catch { return false }
}
export function setShareDeclined(v = true) {
  try { v ? localStorage.setItem(DECLINED_KEY, '1') : localStorage.removeItem(DECLINED_KEY) } catch { /* ignore */ }
}

export const geolocationSupported = () => typeof navigator !== 'undefined' && !!navigator.geolocation

// 'granted' | 'denied' | 'prompt' | 'unknown' — never triggers the browser prompt.
export async function geoPermissionState() {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const s = await navigator.permissions.query({ name: 'geolocation' })
    return s?.state || 'unknown'
  } catch { return 'unknown' }
}

// Resolves { lat, lng } or rejects with 'denied' | 'unavailable'. Calling this is what makes
// the browser show its own permission prompt, so only call it after the visitor agreed.
export function getDevicePosition() {
  return new Promise((resolve, reject) => {
    if (!geolocationSupported()) { reject(new Error('unavailable')); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err && err.code === 1 ? 'denied' : 'unavailable')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
}
