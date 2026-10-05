import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import { getDeviceId } from '../device'

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

// Submit a claim (anonymous allowed).
export async function submitColdStorageClaim({ dirId, name, phone, proof = null }) {
  const { error } = await supabase.rpc('submit_cs_claim', {
    p_dir_id: dirId, p_name: name, p_phone: phone, p_proof: proof, p_ip: getDeviceId(),
  })
  if (error) throw toAppError(error)
}
