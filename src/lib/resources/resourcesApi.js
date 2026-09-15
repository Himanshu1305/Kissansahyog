// Public data access for the Useful Resources directory. Anon may read ACTIVE
// rows only (RLS). These are public government contacts, so phone/email are in the
// row directly. Admin writes go through the admin RPCs (src/lib/admin/adminApi.js).
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'

export async function fetchResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('is_active', true)
    .order('resource_type', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) throw toAppError(error)
  return data || []
}

export const resName = (r, lang) => (lang === 'hi' ? r.name_hi : r.name_en) || r.name_en || r.name_hi
export const resDesc = (r, lang) => (lang === 'hi' ? r.description_hi : r.description_en) || ''
export const resAddress = (r, lang) => (lang === 'hi' ? r.address_hi : r.address_en) || ''
export const resTimings = (r, lang) => (lang === 'hi' ? r.timings_hi : r.timings_en) || ''
