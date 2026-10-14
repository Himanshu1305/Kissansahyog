// Batch 8B — React side of the app's offline layer (status.js). Every hook is inert on the
// website: it returns "nothing cached / not slow / key 0" when isNative() is false.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { isNative } from '../native'
import { subscribe, getRecord, getRefreshKey, isOfflineBannerShown } from './status'
import { SLOW_LOAD_MS } from './policy'

// What the screen shows for these resources: { fromCache, cachedAt, tooOld, ageMs, failed }.
// cachedAt is the OLDEST stored time among the resources served from the phone.
export function useOfflineInfo(resources) {
  const native = isNative()
  const snap = useSyncExternalStore(subscribe, () => (native ? JSON.stringify(resources.map(getRecord)) : 'null'))
  if (!native) return { fromCache: false, cachedAt: null, tooOld: false, ageMs: null, failed: false }
  const recs = JSON.parse(snap).filter(Boolean)
  const cached = recs.filter((r) => r.source === 'cache')
  const old = recs.filter((r) => r.source === 'too-old')
  return {
    fromCache: cached.length > 0,
    cachedAt: cached.length ? Math.min(...cached.map((r) => r.cachedAt)) : null,
    tooOld: old.length > 0,
    ageMs: old.length ? Math.max(...old.map((r) => r.ageMs || 0)) : null,
    failed: recs.some((r) => r.source === 'failed' || r.source === 'too-old'),
  }
}

// Changes when "try again" is pressed or the connection comes back (App remounts the page).
export function useRefreshKey() {
  return useSyncExternalStore(subscribe, getRefreshKey)
}

// Batch 9 (1B) — true while the app's offline banner is on screen (always false on the website).
export function useOfflineBannerShown() {
  return useSyncExternalStore(subscribe, isOfflineBannerShown)
}

// True once `active` has stayed true for SLOW_LOAD_MS — app only.
export function useSlowLoad(active) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active || !isNative()) { setSlow(false); return undefined }
    const id = setTimeout(() => setSlow(true), SLOW_LOAD_MS)
    return () => clearTimeout(id)
  }, [active])
  return slow
}
