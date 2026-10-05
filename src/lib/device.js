// A stable per-device id, stored once in localStorage. Used as a soft
// rate-limit / one-per-device key for anonymous actions (reports, poll votes,
// search-miss logging) where the server has no reliable client IP. Not PII.
const KEY = 'ks_device_id'

export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = (crypto?.randomUUID?.() || `d_${Date.now()}_${Math.random().toString(36).slice(2)}`)
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}
