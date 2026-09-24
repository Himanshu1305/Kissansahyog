// Phase 3c — live per-category counts of active listings near a pincode, via the
// nearby_counts(p_pincode, p_km) RPC (migration 0022). Returns a map keyed by the
// six homepage categories so callers can render every chip (0 included, never
// hidden). Degrades to all-zero on any error.
import { supabase } from '../supabaseClient'

export const DEFAULT_PINCODE = '470117' // Khurai, Sagar (MP) — pilot default.

// The six chips, in display order, mapped to the RPC's category values.
export const NEARBY_CATEGORIES = ['equipment', 'labor', 'bhusa', 'drone_didi', 'warehouse', 'land']

export async function fetchNearbyCounts(pincode = DEFAULT_PINCODE, km = 30) {
  const zero = Object.fromEntries(NEARBY_CATEGORIES.map((c) => [c, 0]))
  try {
    const { data, error } = await supabase.rpc('nearby_counts', { p_pincode: String(pincode || DEFAULT_PINCODE), p_km: km })
    if (error) return zero
    const out = { ...zero }
    for (const row of data || []) {
      if (row?.category in out) out[row.category] = Number(row.count) || 0
    }
    return out
  } catch {
    return zero
  }
}

// Resolve the active pincode: explicit profile pincode → localStorage → default.
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
