// Batch 26 - the weather refresh retries Open-Meteo network errors / 429 / 5xx (3 tries) so a few dropped connections no longer turn the run red.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fetchWithRetry, describeFetchError, retryable, RETRY_WAITS_MS } from '../../scripts/lib/open-meteo-retry.mjs'

const resp = (status) => ({ status, ok: status >= 200 && status < 300 })
const run = (answers, extra = {}) => {
  const calls = [], waits = [], logs = []
  const fetchFn = async () => { const a = answers[calls.length]; calls.push(1); if (a instanceof Error) throw a; return a }
  return { calls, waits, logs, p: fetchWithRetry('https://x/y', { fetchFn, sleep: async (ms) => { waits.push(ms) }, log: (m) => logs.push(m), label: 'forecast 23.8_78.7', ...extra }) }
}

test('a good answer is returned at once, no pause', async () => {
  const r = run([resp(200)]); assert.equal((await r.p).status, 200); assert.equal(r.calls.length, 1); assert.deepEqual(r.waits, [])
})
test('"fetch failed" twice then success: 3 calls, pauses 4 s and 10 s, logged with the real cause', async () => {
  const boom = Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }) })
  const r = run([boom, boom, resp(200)]); assert.equal((await r.p).status, 200)
  assert.equal(r.calls.length, 3); assert.deepEqual(r.waits, [4000, 10000]); assert.equal(r.logs.length, 2)
  assert.match(r.logs[0], /forecast 23\.8_78\.7: fetch failed \[ECONNRESET read ECONNRESET\]; retry 1 of 2 in 4s/)
})
test('429 and 5xx are retried; 400/404 are not', async () => {
  const a = run([resp(429), resp(503), resp(200)]); assert.equal((await a.p).status, 200); assert.equal(a.calls.length, 3)
  const b = run([resp(404)]); assert.equal((await b.p).status, 404); assert.equal(b.calls.length, 1)
  assert.deepEqual([400, 404, 200, 429, 500, 503].map(retryable), [false, false, false, true, true, true])
})
test('still failing after 3 tries: throws the last error (so the cell counts as failed and a pilot cell still turns the job red)', async () => {
  const r = run([resp(500), resp(502), resp(503)]); await assert.rejects(r.p, /Open-Meteo HTTP 503/); assert.equal(r.calls.length, 3)
  const n = run([new Error('a'), new Error('b'), new Error('c')]); await assert.rejects(n.p, /^Error: c$/)
})
test('describeFetchError and the wait list', () => {
  assert.equal(describeFetchError(new Error('plain')), 'plain'); assert.equal(describeFetchError(null), 'unknown error')
  assert.deepEqual(RETRY_WAITS_MS, [4000, 10000])
})
test('the script uses it for BOTH Open-Meteo calls, still has the pilot-failure RED rule and no other plain fetch', () => {
  const src = readFileSync('scripts/refresh-data.mjs', 'utf8')
  assert.equal((src.match(/fetchWithRetry\(/g) || []).length, 2)
  assert.doesNotMatch(src, /await fetch\(/)
  assert.match(src, /pilotFailed\.length\) throw/)
})
