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

// --- recent locations (localStorage, max 5, newest first, deduped by pincode) ---
const RECENT_KEY = 'ks_recent_locations'
const MAX_RECENT = 5

export function getRecentLocations() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((r) => r && r.pincode).slice(0, MAX_RECENT)
  } catch { return [] }
}

export function addRecentLocation(loc) {
  if (!loc || !loc.pincode) return getRecentLocations()
  const entry = {
    pincode: String(loc.pincode),
    label: loc.label || String(loc.pincode),
    latitude: loc.latitude ?? null,
    longitude: loc.longitude ?? null,
  }
  const prev = getRecentLocations().filter((r) => r.pincode !== entry.pincode)
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

// Build an initial location from the profile pincode / localStorage / default. Coords
// are left null here and resolved by the consumer (from the pincode row) unless a GPS
// fix later supplies precise ones.
export function initialLocation(profilePincode) {
  const pincode = resolvePincode(profilePincode)
  return { pincode, latitude: null, longitude: null, label: '', source: 'default' }
}
