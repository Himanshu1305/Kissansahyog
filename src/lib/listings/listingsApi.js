// Data-access layer for listings. All writes go through SECURITY DEFINER RPCs
// (ownership enforced server-side). Browse reads the anon-visible active rows
// directly, pre-filtered by a bounding box, then refined by exact Haversine.
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import { boundingBox, haversineKm, isWithinRadius, RADIUS_KM } from '../distance'

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
  })
  if (error) throw toAppError(error)
  return data
}

// --- browse (30 km nearest-first / newest) ---
// center: {latitude, longitude}. Returns rows decorated with distanceKm.
export async function fetchNearby({ category, listingType = null, center, sort = 'nearest' }) {
  const box = boundingBox(center.latitude, center.longitude, RADIUS_KM)
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

  const withDistance = (data || [])
    .map((row) => ({
      ...row,
      distanceKm: haversineKm(center.latitude, center.longitude, row.latitude, row.longitude),
    }))
    .filter((row) => isWithinRadius(row.distanceKm))

  withDistance.sort((a, b) =>
    sort === 'newest'
      ? new Date(b.created_at) - new Date(a.created_at)
      : a.distanceKm - b.distanceKm,
  )
  return withDistance
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
