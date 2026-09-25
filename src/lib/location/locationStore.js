// Phase 2 — one source of truth for the farmer's location, shared by the homepage
// "nearby" (aapke aaspaas) control, /mausam, and /msp.
//
// A location is { pincode, latitude, longitude, label, source }:
//   - pincode  drives pincode-dependent features (nearby counts, listings, MSP mandi
//              ranking) — always one of the seeded pincodes.
//   - latitude/longitude are the PRECISE coordinates when auto-detected via GPS
//     (used directly for weather — Open-Meteo takes lat/lng natively); when the user
//     picks a pincode they are that pincode's coordinates.
//   - label    a human place name for display.
//   - source   'gps' | 'pincode' | 'recent' | 'default'.
//
// The seeded `pincodes` table is the SINGLE coordinate source (same one the mausam/MSP
// build already uses via fetchPincode) — we do not create a parallel gazetteer.
import { supabase } from '../supabaseClient'
import { haversineKm } from '../distance'

export const DEFAULT_PINCODE = '470117' // Khurai, Sagar (MP) — pilot default.
export const DEFAULT_COORDS = { latitude: 24.045, longitude: 78.33 }

// Distance-sanity threshold for GPS auto-detect. Every seeded pincode is in the Sagar
// pilot area, so a genuinely far-away user (e.g. Hyderabad, ~670 km) would otherwise be
// silently matched to the nearest Sagar village. Beyond this radius we treat the user as
// OUT OF THE SERVICE AREA and never present a far village's data as local without an
// explicit opt-in. See LocationControl.
export const SERVICE_AREA_KM = 100

let pincodesCache = null
export async function fetchAllPincodes() {
  if (pincodesCache) return pincodesCache
  const { data, error } = await supabase
    .from('pincodes')
    .select('pincode,village_town,district,latitude,longitude')
  if (error) return []
  pincodesCache = (data || []).map((p) => ({
    ...p,
    latitude: p.latitude != null ? Number(p.latitude) : null,
    longitude: p.longitude != null ? Number(p.longitude) : null,
  }))
  return pincodesCache
}

// Nearest seeded pincode to a lat/lng (for pincode-dependent features after a GPS
// grant). Returns the pincode row + distanceKm, or null when the list is empty.
export function nearestPincode(lat, lng, pincodes) {
  let best = null
  let bestD = Infinity
  for (const p of pincodes || []) {
    if (p.latitude == null || p.longitude == null) continue
    const d = haversineKm(lat, lng, p.latitude, p.longitude)
    if (d < bestD) { bestD = d; best = p }
  }
  return best ? { ...best, distanceKm: bestD } : null
}

// --- active pincode (localStorage; shared with the older nearbyCounts helpers) ---
export function resolvePincode(profilePincode) {
  if (profilePincode && /^\d{6}$/.test(String(profilePincode))) return String(profilePincode)
  try {
    const saved = localStorage.getItem('ks_pincode')
    if (saved && /^\d{6}$/.test(saved)) return saved
  } catch { /* ignore */ }
  return DEFAULT_PINCODE
}

export function savePincode(pincode) {
  if (!/^\d{6}$/.test(String(pincode))) return false
  try { localStorage.setItem('ks_pincode', String(pincode)) } catch { /* ignore */ }
  return true
}

// --- recent locations (localStorage, max 5, newest first) ---
// Each chip carries BOTH outputs so re-selecting it repopulates weather (rawCoords) AND
// village-anchored features (matchedVillage) exactly like a fresh detection (Phase 1g).
const RECENT_KEY = 'ks_recent_locations'
const MAX_RECENT = 5

// Stable dedupe key: the matched village's pincode if any, else the raw coordinates
// (rounded), else the label — so a far GPS location (no village) still de-dupes sensibly.
export function recentKey(loc) {
  if (loc?.matchedVillage?.pincode) return `p:${loc.matchedVillage.pincode}`
  if (loc?.rawCoords?.latitude != null) return `c:${Number(loc.rawCoords.latitude).toFixed(2)},${Number(loc.rawCoords.longitude).toFixed(2)}`
  return `l:${loc?.label || ''}`
}

export function getRecentLocations() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    // Keep only entries that can repopulate at least one feature (coords or a village).
    return raw.filter((r) => r && (r.rawCoords || r.matchedVillage || r.label)).slice(0, MAX_RECENT)
  } catch { return [] }
}

export function addRecentLocation(loc) {
  if (!loc || (!loc.rawCoords && !loc.matchedVillage)) return getRecentLocations()
  const entry = {
    label: loc.label || loc.matchedVillage?.village_town || loc.matchedVillage?.pincode || '',
    rawCoords: loc.rawCoords || null,
    matchedVillage: loc.matchedVillage || null,
  }
  const key = recentKey(entry)
  const prev = getRecentLocations().filter((r) => recentKey(r) !== key)
  const next = [entry, ...prev].slice(0, MAX_RECENT)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}

// One-time geolocation-prompt dismissal, so we don't nag on every mount.
const GEO_DISMISS_KEY = 'ks_geo_prompt_dismissed'
export function isGeoPromptDismissed() {
  try { return localStorage.getItem(GEO_DISMISS_KEY) === '1' } catch { return false }
}
export function dismissGeoPrompt() {
  try { localStorage.setItem(GEO_DISMISS_KEY, '1') } catch { /* ignore */ }
}

export const geolocationSupported = () =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator

// Build an initial location from the profile pincode / localStorage / default. The split
// shape: rawCoords (for weather — resolved from the pincode by the consumer until a GPS
// fix supplies precise ones) and matchedVillage (for village-anchored features — the
// default pincode is always in-area, distance 0).
export function initialLocation(profilePincode) {
  const pincode = resolvePincode(profilePincode)
  return {
    rawCoords: null,
    matchedVillage: { pincode, village_town: null, distanceKm: 0 },
    label: '',
    source: 'default',
  }
}
