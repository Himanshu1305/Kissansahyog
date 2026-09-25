// Part A (0027) — client-side geocoding worker that drains the village_coordinates queue.
//
// The 1-request/second Nominatim rate limit is enforced SERVER-SIDE by claim_geocode_slot()
// (an atomic DB timestamp), so it holds even with several browsers draining at once. The
// /geocode Pages Function makes the actual Nominatim call (with the required User-Agent).
// Each pending village is claimed via next_pending_village() (FOR UPDATE SKIP LOCKED, so
// concurrent workers never process the same row), then resolved/failed via RPC — which
// denormalizes the coords onto the listing rows anchored to that village.
//
// This is triggered opportunistically (after posting a new-village listing, and on the
// homepage) — a listing posted with a new village name is created immediately (Phase 2e);
// this worker fills its coordinates within seconds so it enters distance-based views.
import { supabase } from '../supabaseClient'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let draining = false

export async function drainGeocodeQueue({ maxMs = 20000 } = {}) {
  if (draining) return // one drain per tab at a time
  draining = true
  const start = Date.now()
  try {
    while (Date.now() - start < maxMs) {
      const { data: v } = await supabase.rpc('next_pending_village')
      const row = Array.isArray(v) ? v[0] : v
      if (!row || !row.village_name) break
      // Wait for the global 1s slot (all callers gate on the same DB row).
      let slot = false
      for (let i = 0; i < 25 && !slot; i++) {
        const { data } = await supabase.rpc('claim_geocode_slot')
        slot = data === true
        if (!slot) await sleep(400)
      }
      if (!slot) { await supabase.rpc('fail_village', { p_village: row.village_name, p_district: row.district, p_reason: 'slot timeout' }); break }
      try {
        const res = await fetch(`/geocode?village=${encodeURIComponent(row.village_name)}&district=${encodeURIComponent(row.district)}`)
        const d = res.ok ? await res.json() : { found: false, error: `geocode ${res.status}` }
        if (d.found && d.lat != null && d.lng != null) {
          await supabase.rpc('resolve_village', { p_village: row.village_name, p_district: row.district, p_lat: d.lat, p_lng: d.lng, p_display: d.display_name || null })
        } else {
          await supabase.rpc('fail_village', { p_village: row.village_name, p_district: row.district, p_reason: d.error || 'not found' })
        }
      } catch (e) {
        await supabase.rpc('fail_village', { p_village: row.village_name, p_district: row.district, p_reason: String(e && e.message ? e.message : e).slice(0, 120) })
      }
    }
  } catch { /* best-effort */ } finally { draining = false }
}
