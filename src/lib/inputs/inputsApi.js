// Phase 6 — agricultural input price tracker. Public read of active rows (RLS);
// admin writes via is_admin-checked SECURITY DEFINER RPCs (same pattern as MSP).
// Degrades to [] if the table is missing so the page never crashes.
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw toAppError(error)
  return data
}

export async function fetchInputPrices() {
  const { data, error } = await supabase
    .from('input_prices')
    .select('*')
    .eq('is_active', true)
    .order('item_hi', { ascending: true })
    .order('shop_name', { ascending: true })
  if (error) return []
  return data || []
}

export const inputItemName = (row, lang) => (lang === 'en' && row.item_en ? row.item_en : row.item_hi)

// --- admin ---
export const getAdminInputPrices = (actorId) => rpc('get_admin_input_prices', { p_actor_id: actorId })
export const adminSetInputPriceActive = (actorId, id, active) =>
  rpc('admin_set_input_price_active', { p_actor_id: actorId, p_id: id, p_active: active })
export const adminUpsertInputPrice = (actorId, m) =>
  rpc('admin_upsert_input_price', {
    p_actor_id: actorId, p_id: m.id || null,
    p_item_hi: m.item_hi, p_item_en: m.item_en || null, p_shop_name: m.shop_name,
    p_location: m.location || null, p_price: Number(m.price) || 0, p_unit: m.unit || 'बोरी',
    p_updated_date: m.updated_date || null, p_is_active: m.is_active !== false,
  })
