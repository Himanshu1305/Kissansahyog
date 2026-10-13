// Live per-category counts of active listings near a POINT (Batch 7L-1: the shared location
// object, not a pincode). Counted in the browser from a bounding-box read of the public
// listings table + an exact Haversine pass — the same rule the old nearby_counts RPC used
// (active, not expired, within `km`). Returns a map keyed by the homepage categories so every
// chip renders (0 included). Degrades to all-zero on any error.
import { supabase } from '../supabaseClient'
import { boundingBox, haversineKm } from '../distance'

// The chips, in display order.
export const NEARBY_CATEGORIES = ['equipment', 'labor', 'bhusa', 'agri_inputs', 'building_materials', 'drone_didi', 'warehouse', 'land']

// center = { latitude, longitude } (see toCenter() in lib/location/userLocation.js).
export async function fetchNearbyCounts(center, km = 30) {
  const zero = Object.fromEntries(NEARBY_CATEGORIES.map((c) => [c, 0]))
  // No location → honest zeros. There is no default place to fall back to.
  if (!center || center.latitude == null || center.longitude == null) return zero
  try {
    const box = boundingBox(center.latitude, center.longitude, km)
    const { data, error } = await supabase
      .from('listings')
      .select('category,latitude,longitude')
      .eq('status', 'active')
      .eq('is_available', true)
      .gt('expires_at', new Date().toISOString())
      .in('category', NEARBY_CATEGORIES)
      .gte('latitude', box.minLat).lte('latitude', box.maxLat)
      .gte('longitude', box.minLon).lte('longitude', box.maxLon)
      .limit(2000)
    if (error) return zero
    const out = { ...zero }
    for (const r of data || []) {
      if (r.latitude == null || r.longitude == null || !(r.category in out)) continue
      if (haversineKm(center.latitude, center.longitude, Number(r.latitude), Number(r.longitude)) <= km) out[r.category] += 1
    }
    return out
  } catch {
    return zero
  }
}
