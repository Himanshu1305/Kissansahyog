// Data-access layer for listings. All writes go through SECURITY DEFINER RPCs
// (ownership enforced server-side). Browse reads the anon-visible active rows
// directly, pre-filtered by a bounding box, then refined by exact Haversine.
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import {
  boundingBox, haversineKm, RADIUS_KM, FALLBACK_RADIUS_KM, WIDE_RADIUS_KM,
  WIDE_ELIGIBLE_CATEGORIES, partitionByRadius,
} from '../distance'

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

// Resolved village names for the listing-form autocomplete (0027). Cached in-memory.
let villageNamesCache = null
export async function fetchResolvedVillages() {
  if (villageNamesCache) return villageNamesCache
  const { data, error } = await supabase
    .from('village_coordinates')
    .select('village_name')
    .eq('status', 'resolved')
    .order('village_name', { ascending: true })
    .limit(2000)
  if (error) return []
  villageNamesCache = [...new Set((data || []).map((r) => r.village_name).filter(Boolean))]
  return villageNamesCache
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
  wideVisibility = false,
  villageName = null,
  rulesAgreed = false,
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
    p_wide_visibility: wideVisibility,
    p_village_name: villageName,
    p_rules_agreed: rulesAgreed,
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
  // Pre-filter with a bounding box. Standard listings never appear beyond 50 km, but
  // the two Phase-1 eligible categories can carry wide-visibility rows out to 100 km,
  // so widen the box for those categories to fetch them; the exact Haversine + policy
  // pass (partitionByRadius) then decides which rows are actually visible.
  const maxKm = WIDE_ELIGIBLE_CATEGORIES.includes(category) ? WIDE_RADIUS_KM : FALLBACK_RADIUS_KM
  const box = boundingBox(center.latitude, center.longitude, maxKm)
  let q = supabase
    .from('listings')
    .select('*')
    .eq('category', category)
    .eq('status', 'active')
    .eq('is_available', true) // Phase 3e: hide owner-marked-unavailable listings
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

  // Phase 0/1 hard cutoff + wide-visibility opt-in (single source of truth).
  const { primary, fallback } = partitionByRadius(withDistance, {
    getDistance: (r) => r.distanceKm,
    getCategory: (r) => r.category,
    getWide: (r) => r.wide_visibility,
  })
  return { primary: primary.sort(byDistanceOrNewest), fallback: fallback.sort(byDistanceOrNewest) }
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
    .select('id,listing_type,category,pincode,details,created_at,listing_source,is_test_data,is_sponsored')
    .eq('status', 'active')
    .eq('is_available', true) // Phase 3e: hide owner-marked-unavailable listings
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

// Homepage feed. Distance is measured from the center to each LISTING's OWN denormalized
// coordinates (row.latitude/longitude — set from village geocoding, 0027 3a-i), NOT a live
// pincodes join. village_name is the listing's stored anchor; district falls back to the
// pincode row only for the display label. center = { latitude, longitude } | null.
export async function fetchHomeFeed({ center = null, limit = 8, pool = 40, category = null } = {}) {
  let query = supabase
    .from('listings')
    .select('id,listing_type,category,pincode,village_town:village_name,latitude,longitude,geocoding_status,details,created_at,listing_source,is_test_data,wide_visibility,is_sponsored')
    .eq('status', 'active')
    .eq('is_available', true) // Phase 3e: hide owner-marked-unavailable listings
    .gt('expires_at', new Date().toISOString())
  if (category) query = query.eq('category', category)
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(pool)
  if (error) throw toAppError(error)
  const rows = data || []

  // District for the display label only (from the listing's pincode, if any).
  const pins = [...new Set(rows.map((r) => r.pincode).filter(Boolean))]
  let pinByCode = {}
  if (pins.length) {
    const { data: pinRows } = await supabase.from('pincodes').select('pincode,district').in('pincode', pins)
    pinByCode = Object.fromEntries((pinRows || []).map((p) => [p.pincode, p]))
  }

  const enriched = rows.map((r) => {
    // Own coords (village-geocoded). Pending listings have null coords → excluded from
    // distance views (distanceKm null) but still shown in the no-center category showcase.
    const distanceKm = center && r.latitude != null && r.longitude != null
      ? haversineKm(center.latitude, center.longitude, Number(r.latitude), Number(r.longitude))
      : null
    return { ...r, district: pinByCode[r.pincode]?.district || null, distanceKm }
  })

  // Without a viewer center we cannot measure distance, so no cutoff can apply — keep the
  // newest-first showcase (used by /drone-didi with no location). With a center this feed
  // is labelled "near you", so it obeys the SAME Phase 0/1 cutoff as Browse: within 30 km
  // (plus wide-eligible rows to 100 km), and the 30–50 km ring only if nothing is within 30.
  if (!center) {
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return enriched.slice(0, limit)
  }

  const { primary, fallback } = partitionByRadius(enriched, {
    getDistance: (r) => r.distanceKm,
    getCategory: (r) => r.category,
    getWide: (r) => r.wide_visibility,
  })
  const byDistance = (a, b) => a.distanceKm - b.distanceKm
  const visible = [...primary.sort(byDistance), ...fallback.sort(byDistance)]
  return visible.slice(0, limit)
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

// --- Phase 3: owner availability toggle + engagement counter + nudge ---
export async function setListingAvailability({ actorId, listingId, isAvailable }) {
  const { data, error } = await supabase.rpc('set_listing_availability', {
    p_actor_id: actorId,
    p_listing_id: listingId,
    p_is_available: isAvailable,
  })
  if (error) throw toAppError(error)
  return data
}

// Fire-and-forget engagement counter (stores no clicker identity). Never throws to the UI.
export async function incrementContactClick(listingId) {
  if (!listingId) return
  try {
    await supabase.rpc('increment_contact_click', { p_listing_id: listingId })
  } catch { /* engagement metric is best-effort */ }
}

// Phase 11 — rate-limited view counter (one per device per listing per 24h). Best-effort.
export async function incrementListingView(listingId) {
  if (!listingId) return
  try {
    const { getDeviceId } = await import('../device')
    await supabase.rpc('increment_listing_view', { p_listing_id: listingId, p_device: getDeviceId() })
  } catch { /* best-effort */ }
}

// Phase 11 — "सबसे ज़्यादा देखा गया": most-viewed active listings (teasers).
export async function fetchTopViewed({ limit = 6 } = {}) {
  const { data, error } = await supabase
    .from('listings')
    .select('id,listing_type,category,pincode,village_town:village_name,latitude,longitude,details,created_at,listing_source,is_sponsored,view_count')
    .eq('status', 'active')
    .gt('view_count', 0)
    .order('view_count', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}

export async function getAvailabilityNudges(actorId) {
  if (!actorId) return []
  const { data, error } = await supabase.rpc('get_availability_nudges', { p_actor_id: actorId })
  if (error) return []
  return data || []
}
