// Phase 13 — WhatsApp groundwork (no sending). The channel URL lives in
// site_settings (admin-set). While it is empty, every "WhatsApp पर जुड़ें"
// surface renders nothing. /join?src= logs attribution then redirects.
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fetchSiteSetting } from '../pages/pagesApi'
import { getDeviceId } from '../device'

let _cache // undefined = not fetched, null/string = resolved
let _inflight

export async function getWhatsAppChannelUrl() {
  if (_cache !== undefined) return _cache
  if (!_inflight) {
    _inflight = fetchSiteSetting('whatsapp_channel_url')
      .then((v) => { _cache = (typeof v === 'string' && v.trim()) ? v.trim() : null; return _cache })
      .catch(() => { _cache = null; return null })
  }
  return _inflight
}

// React hook: returns the channel URL (or null). Everything WhatsApp-related
// gates on this being non-null.
export function useWhatsAppChannel() {
  const [url, setUrl] = useState(_cache ?? null)
  useEffect(() => {
    let alive = true
    getWhatsAppChannelUrl().then((u) => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [])
  return url
}

// Best-effort attribution log; never blocks the redirect.
export async function logJoinClick(src) {
  try { await supabase.rpc('log_join_click', { p_src: src || null, p_device: getDeviceId() }) } catch { /* best-effort */ }
}
