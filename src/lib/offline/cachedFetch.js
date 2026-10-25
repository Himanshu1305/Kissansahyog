// Batch 8B — the app's offline data layer. Installed as the Supabase data client's fetch in the
// Android app only (src/lib/supabaseClient.js) and used for the direct Open-Meteo call; the
// website never loads this file.
//
// Network first, with a short timeout. A successful (HTTP 200) answer to a request on the
// PUBLIC-CACHEABLE allowlist (policy.js) is stored. When the network fails, times out or the
// phone is offline, the stored copy is returned instead — if it is still fresh enough for its
// kind of data — and status.js records that the screen is showing cached data (with its time).
// Writes, auth, private data, error answers and anything not on the allowlist go straight to
// the network and are never stored; offline they fail exactly as before.
import { classify, freshnessFor, NETWORK_TIMEOUT_MS } from './policy.js'
import { readEntry, writeEntry } from './store.js'
import { report, getOfflineHint, isOfflineHintKnown, setOfflineHint } from './status.js'

const KEY_HEADERS = ['accept', 'prefer', 'range']

function headerValue(headers, name) {
  if (!headers) return ''
  if (typeof headers.get === 'function') return headers.get(name) || ''
  if (Array.isArray(headers)) { const h = headers.find(([k]) => String(k).toLowerCase() === name); return h ? String(h[1]) : '' }
  const k = Object.keys(headers).find((x) => x.toLowerCase() === name)
  return k ? String(headers[k]) : ''
}

// Method + full URL + body + the headers that change what PostgREST returns (Accept selects
// object vs array for single()/maybeSingle(), Prefer the count / representation, Range the page).
export function cacheKey(method, url, body, headers) {
  const parts = [String(method || 'GET').toUpperCase(), String(url), typeof body === 'string' ? body : '']
  for (const h of KEY_HEADERS) parts.push(`${h}=${headerValue(headers, h)}`)
  return parts.join('\n')
}

// The data's own time, when the payload carries one (newest value in the response).
export function dataTimeOf(text, field) {
  if (!field) return null
  try {
    const json = JSON.parse(text)
    const rows = Array.isArray(json) ? json : [json]
    let best = null
    for (const r of rows) {
      const v = r && r[field]
      const t = v ? Date.parse(v) : NaN
      if (Number.isFinite(t) && (best === null || t > best)) best = t
    }
    return best
  } catch { return null }
}

// In airplane mode some WebView requests hang until the timeout instead of failing. After one
// cacheable request has failed, the next ones go straight to the saved copy for a short while, so
// a page that asks several questions does not wait the timeout for each of them.
const NETWORK_DOWN_MS = 20000
let downUntil = 0
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('online', () => { downUntil = 0 })
export function resetNetworkMemo() { downUntil = 0 }

// Right after the app starts the offline banner has not asked the system yet, and the WebView's
// navigator.onLine can say "online" in airplane mode — so the first request asks the system
// (@capacitor/network) itself, once per page load. App only.
let statusOnce = null
function systemStatusOnce() {
  if (isOfflineHintKnown() || !(typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.())) return Promise.resolve()
  if (!statusOnce) {
    statusOnce = import('@capacitor/network')
      .then(({ Network }) => Promise.race([Network.getStatus(), new Promise((r) => setTimeout(() => r(null), 1500))]))
      .then((s) => { if (s && !isOfflineHintKnown()) setOfflineHint(!s.connected) })
      .catch(() => {})
  }
  return statusOnce
}

let lastHint = false
function isOffline(t) {
  const hint = getOfflineHint()
  if (lastHint && !hint) downUntil = 0 // the system says the connection is back: try the network again
  lastHint = hint
  return (typeof navigator !== 'undefined' && navigator.onLine === false) || hint || t < downUntil
}

function withTimeout(signal, ms) {
  const timer = AbortSignal.timeout(ms)
  return signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timer]) : timer
}

// "No data and no usable copy" for a READ is answered with a plain 504, not a network error:
// supabase-js (postgrest-js) retries a GET that throws three times with 1 s + 2 s + 4 s backoff, so
// every offline read would cost 7 s (and /mausam, which asks twice, 14 s). It does not retry a 504,
// and callers see the same { data: null, error } as for a network failure. Writes still throw.
function offlineAnswer(reason) {
  return new Response(JSON.stringify({ message: `offline: ${reason}`, code: 'KS_OFFLINE', details: null, hint: null }), { status: 504, headers: { 'content-type': 'application/json' } })
}
const isRead = (method) => method === 'GET' || method === 'HEAD'

export async function cachedFetch(input, init = {}, { fetchImpl = globalThis.fetch.bind(globalThis), now = () => Date.now(), timeoutMs = NETWORK_TIMEOUT_MS } = {}) {
  const url = typeof input === 'string' ? input : input.url
  const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase()
  const { resource, cacheable } = classify(method, url)
  if (!cacheable) {
    // Writes and private reads are never stored. Offline they fail exactly as before — but at once:
    // in airplane mode the WebView needs ~7 s to fail a request, and while it waits the page's other
    // loading stalls too (seen on /mausam, whose weather-grid upsert held the forecast back).
    await systemStatusOnce()
    if ((typeof navigator !== 'undefined' && navigator.onLine === false) || getOfflineHint()) {
      if (isRead(method)) return offlineAnswer('no connection')
      throw new TypeError('Failed to fetch (offline)')
    }
    return fetchImpl(input, init)
  }

  const key = cacheKey(method, url, init.body, init.headers)
  const policy = freshnessFor(resource)
  let networkError = null
  await systemStatusOnce()
  if (!isOffline(now())) {
    try {
      const res = await fetchImpl(input, { ...init, signal: withTimeout(init.signal, timeoutMs) })
      if (res.status !== 200) { report(resource, { source: 'network' }); return res }
      const text = await res.text()
      const t = now()
      const headers = {}
      for (const h of ['content-type', 'content-range']) { const v = res.headers.get(h); if (v) headers[h] = v }
      await writeEntry({ key, resource, url, status: 200, headers, body: text, cachedAt: t, dataTime: dataTimeOf(text, policy.dataTimeField), bytes: text.length * 2 + key.length * 2 })
      downUntil = 0
      report(resource, { source: 'network', cachedAt: t })
      return new Response(text, { status: 200, statusText: res.statusText, headers: res.headers })
    } catch (e) {
      if (init.signal && init.signal.aborted) throw e // the page itself cancelled the request
      networkError = e
      downUntil = now() + NETWORK_DOWN_MS
    }
  }

  const entry = await readEntry(key)
  if (!entry) {
    report(resource, { source: 'failed' })
    if (isRead(method)) return offlineAnswer('nothing saved on this phone')
    throw networkError || new TypeError('Failed to fetch (offline, nothing cached)')
  }
  const age = now() - (entry.dataTime ?? entry.cachedAt)
  if (age > policy.maxAgeMs) {
    report(resource, { source: 'too-old', cachedAt: entry.cachedAt, dataTime: entry.dataTime ?? null, ageMs: age })
    if (isRead(method)) return offlineAnswer('saved copy too old')
    throw new TypeError('Failed to fetch (offline, cached copy too old)')
  }
  report(resource, { source: 'cache', cachedAt: entry.cachedAt, dataTime: entry.dataTime ?? null, ageMs: age })
  return new Response(entry.body, { status: 200, headers: entry.headers })
}
