// Batch 26 - GitHub's runners sometimes lose the connection to Open-Meteo ("fetch failed") or get a 429 / 5xx for some cells while other cells work,
// which turned the whole price-check run red even though prices were fine. A request is tried 3 times (pause 4 s, then 10 s) before it counts as failed.
// Only network errors, timeouts, HTTP 429 and HTTP 5xx are retried; any other answer (200, 400, 404 ...) is returned at once. Pure: fetch and sleep are injected.
export const RETRY_WAITS_MS = [4000, 10000]

// "fetch failed [ECONNRESET read ECONNRESET]": the plain message plus the real cause that Node hides under error.cause.
export function describeFetchError(e) {
  if (!e) return 'unknown error'
  const c = e.cause
  const extra = c ? [c.code, c.message].filter(Boolean).join(' ') : ''
  return extra ? `${e.message || e.name} [${extra}]` : (e.message || String(e))
}

export const retryable = (status) => status === 429 || status >= 500

export async function fetchWithRetry(url, { fetchFn = fetch, timeoutMs = 20000, waitsMs = RETRY_WAITS_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {}, label = 'request' } = {}) {
  let lastErr
  for (let i = 0; i <= waitsMs.length; i++) {
    try {
      const res = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (!retryable(res.status)) return res
      lastErr = new Error(`Open-Meteo HTTP ${res.status}`)
    } catch (e) { lastErr = new Error(describeFetchError(e)) }
    if (i < waitsMs.length) { log(`${label}: ${lastErr.message}; retry ${i + 1} of ${waitsMs.length} in ${waitsMs[i] / 1000}s`); await sleep(waitsMs[i]) }
  }
  throw lastErr
}
