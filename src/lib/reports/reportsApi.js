import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import { getDeviceId } from '../device'

// Submit a complaint ("शिकायत करें"). Works logged-in or anonymous. The device
// id is a soft per-device rate-limit key (the server has no reliable client IP
// for a browser RPC).
export async function submitListingReport({ targetType = 'listing', targetId, listingId = null, reason, note = null, phone = null }) {
  const { error } = await supabase.rpc('submit_listing_report', {
    p_target_type: targetType,
    p_target_id: String(targetId),
    p_listing_id: listingId,
    p_reason: reason,
    p_note: note,
    p_phone: phone,
    p_ip: getDeviceId(),
  })
  if (error) throw toAppError(error)
}
