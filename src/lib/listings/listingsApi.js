// Data-access layer for listings. All writes go through SECURITY DEFINER RPCs
// (ownership enforced server-side). Browse reads the anon-visible active rows
// directly, pre-filtered by a bounding box, then refined by exact Haversine.
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import { boundingBox, haversineKm, RADIUS_KM, FALLBACK_RADIUS_KM } from '../distance'

// --- lookups (cached in-memory for the session) ---
let cropsCache = null
let equipmentCache = null

export async function fetchCrops() {
  if (cropsCache) return cropsCache
  const { data, error } = await supabase.from('crops').select('*').order('name_en')
  if (error) throw toAppError(error)
  cropsCache = data
  return data
}

export async function fetchEquipmentTypes() {
  if (equipmentCache) return equipmentCache
  const { data, error } = await supabase.from('equipment_types').select('*').order('id')
  if (error) throw toAppError(error)
  equipmentCache = data
  return data
}

// Look up a single pincode row (anon-readable) to resolve the ASSET's location
// coordinates at listing-creation time. Returns the row or null if unknown.
// This is how a listing gets the location of the land/equipment/goods being
// offered — never the poster's profile location. See create_listing RPC, which
// re-derives coordinates from this same pincode server-side (authoritative).
export async function fetchPincode(pincode) {
  const pin = String(pincode || '').trim()
  if (!/^[0-9]{6}$/.test(pin)) return null
  const { data, error } = await supabase.from('pincodes').select('*').eq('pincode', pin).maybeSingle()
  if (error) throw toAppError(error)
  return data
}

// --- create ---
export async function createListing({
  actorId,
  listingType,
  category,
  details,
  latitude = null,
  longitude = null,
  pincode = null,
  selfDeclared = false,
  listingSource = 'farmer',
}) {
  const { data, error } = await supabase.rpc('create_listing', {
    p_actor_id: actorId,
    p_listing_type: listingType,
    p_category: category,
    p_details: details,
    p_latitude: latitude,
    p_longitude: longitude,
    p_pincode: pincode,
    p_self_declared: selfDeclared,
    p_listing_source: listingSource,
  })
  if (error) throw toAppError(error)
  return data
}

// --- browse (30 km nearest-first / newest, with a 30–50 km soft fallback) ---
// center: {latitude, longitude}. Distance is always measured from the viewer to
// each LISTING's own coordinates (row.latitude/row.longitude) — never any
// profiles row. Returns { primary, fallback }:
//   primary  = listings within RADIUS_KM (<= 30 km)
//   fallback = listings in the 30–50 km ring (only meaningful when primary is
//              sparse; the Browse screen shows it when primary has < 5 results).
export async function fetchNearby({ category, listingType = null, center, sort = 'nearest' }) {
  // Pre-filter with a bounding box sized to the wider fallback radius so the
  // single query covers both bands; the exact Haversine pass splits them.
  const box = boundingBox(center.latitude, center.longitude, FALLBACK_RADIUS_KM)
  let q = supabase
    .from('listings')
    .select('*')
    .eq('category', category)
    .eq('status', 'active')
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLon)
    .lte('longitude', box.maxLon)
  if (listingType) q = q.eq('listing_type', listingType)

  const { data, error } = await q
  if (error) throw toAppError(error)

  const withDistance = (data || []).map((row) => ({
    ...row,
    distanceKm: haversineKm(center.latitude, center.longitude, row.latitude, row.longitude),
  }))

  const byDistanceOrNewest = (a, b) =>
    sort === 'newest'
      ? new Date(b.created_at) - new Date(a.created_at)
      : a.distanceKm - b.distanceKm

  const primary = withDistance.filter((r) => r.distanceKm <= RADIUS_KM).sort(byDistanceOrNewest)
  const fallback = withDistance
    .filter((r) => r.distanceKm > RADIUS_KM && r.distanceKm <= FALLBACK_RADIUS_KM)
    .sort(byDistanceOrNewest)

  return { primary, fallback }
}

// --- public homepage feed (anonymised, no auth required) ---
// Recent active listings across ALL categories, newest first. The listings table
// carries NO name/phone (those live in `profiles`, which anon cannot read, and are
// revealed only via the get_listing_contact RPC), so this response is inherently
// contact-free. We enrich each row with village/town + district (from the public
// `pincodes` table) for a coarse, non-identifying location label.
export async function fetchRecentListings(limit = 12) {
  const { data, error } = await supabase
    .from('listings')
    .select('id,listing_type,category,pincode,details,created_at,listing_source,is_test_data')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw toAppError(error)
  const rows = data || []

  const pins = [...new Set(rows.map((r) => r.pincode).filter(Boolean))]
  let placeByPin = {}
  if (pins.length) {
    const { data: pinRows, error: pinErr } = await supabase
      .from('pincodes')
      .select('pincode,village_town,district')
      .in('pincode', pins)
    if (pinErr) throw toAppError(pinErr)
    placeByPin = Object.fromEntries((pinRows || []).map((p) => [p.pincode, p]))
  }

  return rows.map((r) => {
    const place = placeByPin[r.pincode]
    return {
      ...r,
      village_town: place?.village_town || null,
      district: place?.district || null,
    }
  })
}

// Phase 3e — homepage feed enriched with village/district + pincode coordinates,
// so the caller can order by distance from a center then recency. Contact-free,
// like fetchRecentListings. center = { latitude, longitude } | null.
export async function fetchHomeFeed({ center = null, limit = 8, pool = 40, category = null } = {}) {
  let query = supabase
    .from('listings')
    .select('id,listing_type,category,pincode,details,created_at,listing_source,is_test_data')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
  if (category) query = query.eq('category', category)
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(pool)
  if (error) throw toAppError(error)
  const rows = data || []

  const pins = [...new Set(rows.map((r) => r.pincode).filter(Boolean))]
  let pinByCode = {}
  if (pins.length) {
    const { data: pinRows, error: pinErr } = await supabase
      .from('pincodes')
      .select('pincode,village_town,district,latitude,longitude')
      .in('pincode', pins)
    if (pinErr) throw toAppError(pinErr)
    pinByCode = Object.fromEntries((pinRows || []).map((p) => [p.pincode, p]))
  }

  const enriched = rows.map((r) => {
    const p = pinByCode[r.pincode]
    const distanceKm = center && p?.latitude != null && p?.longitude != null
      ? haversineKm(center.latitude, center.longitude, p.latitude, p.longitude)
      : null
    return { ...r, village_town: p?.village_town || null, district: p?.district || null, distanceKm }
  })

  enriched.sort((a, b) => {
    if (center && a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm
    if (center && a.distanceKm != null) return -1
    if (center && b.distanceKm != null) return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })
  return enriched.slice(0, limit)
}

// Equipment availability calendar (Phase 7a). Public read of busy dates; owner-
// gated toggle via the set_listing_unavailable RPC (verifies listing.user_id).
export async function fetchUnavailableDates(listingId) {
  const { data, error } = await supabase
    .from('listing_unavailable_dates').select('unavailable_date').eq('listing_id', listingId)
  if (error) return []
  return (data || []).map((r) => r.unavailable_date)
}

export async function setUnavailableDate(actorId, listingId, dateStr, busy) {
  const { error } = await supabase.rpc('set_listing_unavailable', {
    p_actor_id: actorId, p_listing_id: listingId, p_date: dateStr, p_busy: busy,
  })
  if (error) throw toAppError(error)
  return true
}

// Single listing by id (active only, via RLS). Used by the detail screen.
export async function fetchListingById(id) {
  const { data, error } = await supabase.from('listings').select('*').eq('id', id).maybeSingle()
  if (error) throw toAppError(error)
  return data
}

// --- phone reveal (RPC; active listings only) ---
export async function getListingContact(listingId) {
  const { data, error } = await supabase.rpc('get_listing_contact', { p_listing_id: listingId })
  if (error) throw toAppError(error)
  return Array.isArray(data) ? data[0] : data
}

// --- my listings + close ---
export async function getMyListings(actorId) {
  const { data, error } = await supabase.rpc('get_my_listings', { p_actor_id: actorId })
  if (error) throw toAppError(error)
  return data || []
}

export async function closeListing({ actorId, listingId }) {
  const { data, error } = await supabase.rpc('close_listing', {
    p_actor_id: actorId,
    p_listing_id: listingId,
  })
  if (error) throw toAppError(error)
  return data
}
