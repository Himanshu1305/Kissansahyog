// Batch 8B — what the screen is showing: fresh from the network, from the phone's cache, or
// nothing (offline with no usable copy). Written by cachedFetch.js, read by the OfflineStamp /
// OfflineNotice components through useOffline.js. No React and no storage here, so it can be
// imported anywhere (and in node tests). The website never writes to it.
//
// One record per resource (table, RPC or host), last request wins:
//   { source: 'network' | 'cache' | 'failed' | 'too-old', cachedAt, dataTime, ageMs, at }

const records = new Map()
const listeners = new Set()
let refreshKey = 0

function emit() { for (const fn of listeners) { try { fn() } catch { /* a listener's problem */ } } }

// A page often asks for the same resource several times (exact weather cell, then nearby
// cells). A plain "failed" right after a cached or too-old answer must not hide what was
// actually decided for the screen, so it does not overwrite it for 30 s.
const KEEP_MS = 30000
export function report(resource, info) {
  if (!resource) return
  const prev = records.get(resource)
  if (info.source === 'failed' && prev && (prev.source === 'cache' || prev.source === 'too-old') && Date.now() - prev.at < KEEP_MS) return
  records.set(resource, { ...info, at: Date.now() })
  emit()
}

export function getRecord(resource) { return records.get(resource) || null }
export function allRecords() { return [...records.entries()].map(([resource, r]) => ({ resource, ...r })) }
export function resetStatus() { records.clear(); emit() }

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// True when something on screen is not live: shown from cache, too old, or missing.
export function hasStaleData() {
  for (const r of records.values()) if (r.source !== 'network') return true
  return false
}

// The system's view of connectivity (@capacitor/network, reported by PwaPrompts). In the app's
// WebView navigator.onLine can stay true in airplane mode, so this is the more reliable signal.
let offlineHint = false
let hintKnown = false
export function setOfflineHint(v) { offlineHint = !!v; hintKnown = true }
export function getOfflineHint() { return offlineHint }
export function isOfflineHintKnown() { return hintKnown }

// Remount the current page so it fetches again ("try again", or the connection came back).
export function requestRefresh() { refreshKey += 1; emit() }

// Batch 9 (1B) — is the app's orange offline banner (which already shows the last-updated time)
// on screen? Set by PwaPrompts (NativePrompts); the website never sets it.
let offlineBannerShown = false
export function setOfflineBannerShown(v) {
  if (offlineBannerShown === !!v) return
  offlineBannerShown = !!v
  emit()
}
export function isOfflineBannerShown() { return offlineBannerShown }
export function getRefreshKey() { return refreshKey }
