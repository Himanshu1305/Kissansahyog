// Batch 20 - data access for Kissan Mitra. The public list is the only call that works without a login; every admin call
// is checked inside the database (admin + live session). Errors keep the database code (toAppError).
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'

// The sign-up form's dropdown: active Mitras (id, display_name, area). Cached for the visit; a failure answers [] and is not
// cached, so the field is simply hidden and registration is never blocked.
let listCache = null
export async function listActiveMitras({ fresh = false } = {}) {
  if (!fresh && listCache) return listCache
  try {
    const { data, error } = await supabase.rpc('list_active_mitras')
    if (error || !Array.isArray(data)) return []
    listCache = data.filter((m) => m && m.id && m.display_name)
    return listCache
  } catch {
    return []
  }
}
export const clearMitraListCache = () => { listCache = null }

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw toAppError(error)
  return data
}
export const adminListMitras = (actor) => rpc('admin_list_mitras', { p_actor: actor })
export const adminUpsertMitra = (actor, id, data) => rpc('admin_upsert_mitra', { p_actor: actor, p_id: id ?? null, p_data: data })
export const adminListMitraRegistrations = (actor, mitraId, limit = 25, offset = 0) =>
  rpc('admin_list_mitra_registrations', { p_actor: actor, p_mitra_id: mitraId, p_limit: limit, p_offset: offset })
export const adminReassignRegistration = (actor, profileId, newMitraId) =>
  rpc('admin_reassign_registration', { p_actor: actor, p_profile_id: profileId, p_new_mitra_id: newMitraId ?? null })
export const adminMarkMitraPaid = (actor, mitraId, amount, paidOn, note) =>
  rpc('admin_mark_mitra_paid', { p_actor: actor, p_mitra_id: mitraId, p_amount_rupees: amount, p_paid_on: paidOn, p_note: note || null })
export const adminListMitraPayments = (actor, mitraId) => rpc('admin_list_mitra_payments', { p_actor: actor, p_mitra_id: mitraId })
