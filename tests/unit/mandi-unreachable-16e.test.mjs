import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseDivisionDistricts } from '../../scripts/lib/mandi-backfill.mjs'
import { decideExit, daysBetween, redact } from '../../scripts/lib/mandi-feed.mjs'
import {
  cropsWithSource, isConnectError, createGovClient, fetchPrimaryForCrop, runWatchdogJob, freshnessCheck, MANDI_PHASE_CAP_MS, UNREACHABLE_LINE,
} from '../../scripts/lib/mandi-daily.mjs'

const districts = parseDivisionDistricts(readFileSync('src/lib/location/places.js', 'utf8'))
const KEY = 'SECRETKEY1234567890'
const refused = () => Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('connect ECONNREFUSED 164.100.61.198:443'), { code: 'ECONNREFUSED' }) })
const clock = () => { let t = 0; return { now: () => t, sleep: async (ms) => { t += ms }, advance: (ms) => { t += ms }, get t() { return t } } }

test('connect-level errors are recognised, plain HTTP errors are not', () => {
  assert.ok(isConnectError(refused()))
  assert.ok(isConnectError(Object.assign(new TypeError('fetch failed'), { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } })))
  assert.ok(isConnectError(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } })))
  assert.ok(isConnectError(Object.assign(new TypeError('fetch failed'), { cause: { errors: [{ code: 'ECONNREFUSED' }, { code: 'ENETUNREACH' }] } })))
  assert.ok(!isConnectError(new Error('HTTP 500')))
  assert.ok(!isConnectError(Object.assign(new TypeError('x'), { cause: { code: 'ECONNRESET' } })))
})

test('always ECONNREFUSED: gives up after 3 requests, skips the rest, well under the cap', async () => {
  const c = clock(); const logs = []; let calls = 0
  const gov = createGovClient({ fetchFn: async () => { calls++; throw refused() }, sleep: c.sleep, now: c.now, key: KEY, onLog: (m) => logs.push(m) })
  const crops = cropsWithSource([{ commodity_en: 'Wheat', commodity_hi: 'x' }, { commodity_en: 'Gram', commodity_hi: 'y' }, { commodity_en: 'Maize', commodity_hi: 'z' }])
  const errs = []
  for (const crop of crops) assert.deepEqual(await fetchPrimaryForCrop(gov, crop, districts, '2026-10-20', (...a) => errs.push(a)), [])
  assert.equal(calls, 3)
  assert.equal(gov.st.unreachable, true)
  assert.ok(logs.includes(UNREACHABLE_LINE))
  assert.ok(c.t < MANDI_PHASE_CAP_MS, `simulated ${c.t} ms`)
  assert.ok(c.t < 30000)
  // a later call on the same host (the 9ef84268 fallback) is refused without touching the network
  assert.throws(() => gov.assertUsable(), /unreachable/)
  assert.equal(calls, 3)
})

test('retries: at most 2 retries on a 5xx, then the request fails', async () => {
  const c = clock(); let calls = 0
  const gov = createGovClient({ fetchFn: async () => { calls++; return { status: 503, ok: false, text: async () => '' } }, sleep: c.sleep, now: c.now, key: KEY })
  await assert.rejects(gov.getPage({ limit: 1 }), /gave up/)
  assert.equal(calls, 3)
})

test('deadline: stops between requests and keeps what was collected', async () => {
  const c = clock(); const logs = []
  const ok = async () => { c.advance(100000); return { status: 200, ok: true, text: async () => JSON.stringify({ records: [{ Arrival_Date: '27/10/2026' }] }) } }
  const gov = createGovClient({ fetchFn: ok, sleep: c.sleep, now: c.now, key: KEY, onLog: (m) => logs.push(m) })
  const raw = await fetchPrimaryForCrop(gov, cropsWithSource([{ commodity_en: 'Wheat', commodity_hi: 'x' }])[0], districts, '2026-10-20')
  assert.ok(raw.length >= 1 && raw.length < districts.length, `kept ${raw.length}`)
  assert.equal(gov.st.deadlineHit, true)
  assert.ok(logs.some((m) => /cap/.test(m)))
})

test('freshness: red when the newest stored price is older than 3 days or missing', () => {
  assert.deepEqual(freshnessCheck('2026-10-27', '2026-10-29', daysBetween), { red: false, text: 'newest stored price: 2026-10-27 (2 days old)' })
  assert.equal(freshnessCheck('2026-10-25', '2026-10-29', daysBetween).red, true)
  assert.equal(freshnessCheck('2026-10-26', '2026-10-29', daysBetween).red, false)
  assert.equal(freshnessCheck(null, '2026-10-29', daysBetween).red, true)
})
