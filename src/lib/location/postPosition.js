// Batch 9 (1D) — "use my current location" on the Post page (website and app).
//
// Many farmers' phones have no fresh position fix, so one 10 s attempt often failed. The steps:
//   1. a position the phone already has, up to 10 minutes old (answers at once, no new fix);
//   2. otherwise a fresh LOW-accuracy fix (network / Wi-Fi based), up to 20 s;
//   3. otherwise reject, and the page shows a message and brings the village field into view
//      (the existing manual path: type the village).
// Precision is unchanged from before (low accuracy, never enableHighAccuracy): no more exact
// location is asked for or stored than until now (7L-2 privacy rule).
//
// Resolves { latitude, longitude, step: 'cached' | 'fresh' }.
// Rejects with an Error whose message is 'denied' (permission refused) or 'unavailable'.
export const CACHED_MAX_AGE_MS = 10 * 60 * 1000
export const FRESH_TIMEOUT_MS = 20000

function once(geo, options) {
  return new Promise((resolve, reject) => {
    try {
      geo.getCurrentPosition(resolve, reject, options)
    } catch (e) {
      reject(e)
    }
  })
}

export async function getPostPosition(geo = (typeof navigator !== 'undefined' ? navigator.geolocation : null)) {
  if (!geo || typeof geo.getCurrentPosition !== 'function') throw new Error('unavailable')
  const toResult = (pos, step) => ({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, step })
  try {
    // timeout 0 + maximumAge: only a position the phone already has; never waits for a new fix.
    return toResult(await once(geo, { enableHighAccuracy: false, timeout: 0, maximumAge: CACHED_MAX_AGE_MS }), 'cached')
  } catch (e) {
    if (e && e.code === 1) throw new Error('denied')
  }
  try {
    return toResult(await once(geo, { enableHighAccuracy: false, timeout: FRESH_TIMEOUT_MS, maximumAge: 0 }), 'fresh')
  } catch (e) {
    throw new Error(e && e.code === 1 ? 'denied' : 'unavailable')
  }
}
