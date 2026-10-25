import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import { haversineKm } from '../distance'

// District slug — MUST match scripts/lib/prerender-routes.mjs slugifyDistrict.
export function slugifyDistrict(d) {
  return String(d || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// All active directory entries (public view — notes/contact person excluded).
export async function fetchColdStorageAll() {
  const { data, error } = await supabase.from('cold_storage_public').select('*').order('district').order('name')
  if (error) throw toAppError(error)
  return data || []
}

// Districts with counts (for the hub filter + district index).
export async function fetchColdStorageDistricts() {
  const rows = await fetchColdStorageAll()
  const map = new Map()
  for (const r of rows) {
    const d = r.district || 'Other'
    map.set(d, (map.get(d) || 0) + 1)
  }
  return [...map.entries()].map(([district, count]) => ({ district, slug: slugifyDistrict(district), count })).sort((a, b) => b.count - a.count)
}

// Entries for one district (by slug).
export async function fetchColdStorageByDistrict(slug) {
  const rows = await fetchColdStorageAll()
  const inDistrict = rows.filter((r) => slugifyDistrict(r.district) === slug)
  const districtName = inDistrict[0]?.district || null
  return { districtName, rows: inDistrict }
}

// --- Batch 2 item B: distance search ---------------------------------------
// The claim flow was removed from the UI (owner decision — directory phones are
// public). The table + RPCs stay in the DB (hidden), replaced by the report flow.

// Parse a directory `phone` field (may hold several numbers, landlines, STD codes,
// "+91 ", separators) into actionable contacts:
//   { mobile: '9876543210' | null, tel: '07582...' | null }
// A valid Indian mobile is a 10-digit number starting 6–9 (after stripping a
// leading 0 / 91 / +91). `tel` is the best dialable number for the Call button
// (the mobile if present, else the first run of >= 6 digits — e.g. a landline).
export function parseDirectoryPhone(phoneStr) {
  const raw = String(phoneStr || '')
  if (!raw.trim()) return { mobile: null, tel: null }
  const tokens = raw.split(/[,;/|\n]+/).map((s) => s.trim()).filter(Boolean)
  let mobile = null
  let tel = null
  for (const tok of tokens) {
    let d = tok.replace(/\D/g, '')
    if (d.startsWith('91') && d.length === 12) d = d.slice(2)
    else if (d.startsWith('0') && d.length === 11) d = d.slice(1)
    if (!mobile && /^[6-9]\d{9}$/.test(d)) mobile = d
    if (!tel && tok.replace(/\D/g, '').length >= 6) tel = tok.replace(/\D/g, '')
  }
  if (mobile) tel = mobile
  return { mobile, tel }
}

// Google Maps "search" directions link from the place details. No API key needed.
export function directionsUrl(entry) {
  const parts = [entry.name, entry.address, entry.city, entry.district, 'Madhya Pradesh'].filter(Boolean)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`
}

// Sort directory rows by distance from a {latitude, longitude} centre, nearest
// first. Rows without coordinates sort last. Returns NEW objects carrying
// `distanceKm` (number | null) so the card can show "~X किमी".
export function sortByDistance(rows, centre) {
  if (!centre || centre.latitude == null || centre.longitude == null) {
    return rows.map((r) => ({ ...r, distanceKm: null }))
  }
  return rows
    .map((r) => {
      const hasGeo = r.latitude != null && r.longitude != null
      const distanceKm = hasGeo ? haversineKm(centre.latitude, centre.longitude, Number(r.latitude), Number(r.longitude)) : null
      return { ...r, distanceKm }
    })
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0
      if (a.distanceKm == null) return 1
      if (b.distanceKm == null) return -1
      return a.distanceKm - b.distanceKm
    })
}
