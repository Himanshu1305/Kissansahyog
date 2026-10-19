// Batch 8B — node tests of the app's offline layer (src/lib/offline/*), used by run-tests.mjs
// (O1, O1b, O8a). No device and no real network: fetch is faked.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, Checks } from './lib.mjs'

const mod = (p) => import(pathToFileURL(path.join(ROOT, p)).href)
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
const SB = 'https://unit.supabase.co'

// ---------------------------------------------------------------- O1
export async function runO1() {
  const c = new Checks()
  const { cachedFetch, cacheKey, resetNetworkMemo } = await mod('src/lib/offline/cachedFetch.js')
  const store = await mod('src/lib/offline/store.js')
  const status = await mod('src/lib/offline/status.js')
  const policy = await mod('src/lib/offline/policy.js')
  const DAY = 86400000
  let clock = Date.parse('2026-10-10T08:00:00Z')
  const now = () => clock
  const fresh = () => { const b = store.memoryBackend(); store.setBackend(b); status.resetStatus(); resetNetworkMemo(); return b }
  const up = (body, statusCode = 200) => async () => json(body, statusCode)
  const down = async () => { throw new TypeError('Failed to fetch') }

  // put / get
  let b = fresh()
  const urlM = `${SB}/rest/v1/mandi_prices?select=*&price_date=eq.2026-10-10`
  const rows = [{ commodity_en: 'Wheat', modal_price: 2500, price_date: '2026-10-10' }]
  const r1 = await cachedFetch(urlM, { method: 'GET', headers: { Accept: 'application/json' } }, { fetchImpl: up(rows), now })
  c.check('online 200: the page gets the network answer', (await r1.json())[0].modal_price === 2500)
  const stored = await b.all()
  c.check('online 200 on the allowlist: one entry stored', stored.length === 1 && stored[0].resource === 'mandi_prices' && stored[0].cachedAt === clock, stored.map((e) => e.resource))
  c.check('the entry carries the data\'s own time (price_date)', stored[0]?.dataTime === Date.parse('2026-10-10'))
  clock += 2 * 3600000
  const r2 = await cachedFetch(urlM, { method: 'GET', headers: { Accept: 'application/json' } }, { fetchImpl: down, now })
  c.check('offline: the same request is answered from the cache', (await r2.json())[0].modal_price === 2500)
  const rec = status.getRecord('mandi_prices')
  c.check('offline answer is announced with its cachedAt', rec?.source === 'cache' && rec.cachedAt === stored[0].cachedAt, rec)

  // network-down memo: after one failure the next request goes straight to the cache (no wait)
  resetNetworkMemo() // the offline read above set it
  let calls = 0
  const counting = async () => { calls++; throw new TypeError('Failed to fetch') }
  await cachedFetch(urlM, { method: 'GET', headers: { Accept: 'application/json' } }, { fetchImpl: counting, now })
  await cachedFetch(urlM, { method: 'GET', headers: { Accept: 'application/json' } }, { fetchImpl: counting, now })
  c.check('after a failed request, the next one within 20 s is served from the cache without touching the network', calls === 1, calls)
  clock += 21000
  await cachedFetch(urlM, { method: 'GET', headers: { Accept: 'application/json' } }, { fetchImpl: counting, now }).catch(() => {})
  c.check('after 20 s the network is tried again', calls === 2, calls)
  resetNetworkMemo()
  // expiry by policy (mandi 7 days on price_date; weather 24 h on fetched_at; listings 3 days on cachedAt)
  clock = Date.parse('2026-10-10') + 8 * DAY
  const oldM = await cachedFetch(urlM, { method: 'GET', headers: { Accept: 'application/json' } }, { fetchImpl: down, now })
  c.check('mandi older than 7 days (by price_date) is not served offline: a 504 "offline" answer (not retried by supabase-js)', oldM.status === 504 && status.getRecord('mandi_prices')?.source === 'too-old', { status: oldM.status, record: status.getRecord('mandi_prices') })
  const noCopy = await cachedFetch(`${urlM}&never=1`, { method: 'GET' }, { fetchImpl: down, now })
  c.check('a read with nothing saved answers 504 at once instead of throwing', noCopy.status === 504 && (await noCopy.json()).code === 'KS_OFFLINE')
  const writeOffline = await cachedFetch(`${SB}/rest/v1/rpc/increment_listing_view`, { method: 'POST', body: '{}' }, { fetchImpl: down, now }).then(() => 'resolved', () => 'threw')
  c.check('a write that fails offline still throws (as before)', writeOffline === 'threw')
  fresh(); clock = Date.parse('2026-10-10T08:00:00Z')
  const urlW = `${SB}/rest/v1/weather_cache_v2?select=*&grid_key=eq.23.8_78.7`
  await cachedFetch(urlW, { method: 'GET' }, { fetchImpl: up([{ grid_key: '23.8_78.7', fetched_at: '2026-10-10T06:00:00Z' }]), now })
  clock = Date.parse('2026-10-11T05:00:00Z') // 23 h after fetched_at
  const okW = await cachedFetch(urlW, { method: 'GET' }, { fetchImpl: down, now }).then((r) => r.status === 200, () => false)
  clock = Date.parse('2026-10-11T07:00:00Z') // 25 h
  const oldW = await cachedFetch(urlW, { method: 'GET' }, { fetchImpl: down, now }).then((r) => r.status === 200, () => false)
  c.check('weather: 23 h old (fetched_at) is served, 25 h old is refused', okW && !oldW && status.getRecord('weather_cache_v2')?.source === 'too-old', { okW, oldW })
  fresh(); clock = Date.parse('2026-10-10T08:00:00Z')
  const urlL = `${SB}/rest/v1/listings?select=*&id=eq.abc`
  await cachedFetch(urlL, { method: 'GET' }, { fetchImpl: up([{ id: 'abc', created_at: '2025-01-01T00:00:00Z' }]), now })
  clock += 2.9 * DAY
  const okL = await cachedFetch(urlL, { method: 'GET' }, { fetchImpl: down, now }).then((r) => r.status === 200, () => false)
  clock += 0.2 * DAY
  const oldL = await cachedFetch(urlL, { method: 'GET' }, { fetchImpl: down, now }).then((r) => r.status === 200, () => false)
  c.check('listings: measured on cachedAt — 2.9 days served, 3.1 days refused', okL && !oldL, { okL, oldL })
  c.check('policy numbers are the documented ones', policy.FRESHNESS.weather_cache_v2.maxAgeMs === DAY && policy.FRESHNESS.mandi_prices.maxAgeMs === 7 * DAY && policy.FRESHNESS.listings.maxAgeMs === 3 * DAY && policy.CACHE_CAP_BYTES === 5 * 1024 * 1024)

  // eviction at the cap (oldest first)
  b = fresh()
  for (let i = 0; i < 5; i++) await store.writeEntry({ key: `k${i}`, resource: 'x', body: 'x'.repeat(100), cachedAt: 1000 + i, bytes: 200 }, 700)
  const keys = (await b.all()).map((e) => e.key).sort()
  c.check('cap 700 bytes, five 200-byte entries → the three newest remain', JSON.stringify(keys) === JSON.stringify(['k2', 'k3', 'k4']), keys)
  c.check('an entry larger than the cap is not stored', (await store.writeEntry({ key: 'big', bytes: 800, cachedAt: 1 }, 700)) === false)

  // quota error swallowed
  store.setBackend(store.memoryBackend({ failPut: () => Object.assign(new Error('QuotaExceededError'), { name: 'QuotaExceededError' }) }))
  let quotaRes = null, quotaErr = null
  try { quotaRes = await cachedFetch(urlM, { method: 'GET' }, { fetchImpl: up(rows), now }) } catch (e) { quotaErr = e }
  c.check('storage quota error is swallowed — the page still gets the network answer', !quotaErr && quotaRes?.status === 200, String(quotaErr || ''))

  // PRIVATE list and non-allowlisted never stored
  b = fresh()
  const privateCalls = [
    ['POST', `${SB}/rest/v1/rpc/get_listing_contact`, '{"p_listing_id":"1"}'],
    ['POST', `${SB}/rest/v1/rpc/get_my_listings`, '{"p_actor_id":"u"}'],
    ['POST', `${SB}/rest/v1/rpc/app_login`, '{"p_phone":"9000000001"}'],
    ['GET', `${SB}/rest/v1/profiles?select=*`, undefined],
    ['GET', `${SB}/rest/v1/experts?select=*`, undefined],
    ['POST', `${SB}/auth/v1/token?grant_type=password`, '{}'],
    ['GET', `${SB}/storage/v1/object/public/listing-photos/a.jpg`, undefined],
    ['POST', `${SB}/rest/v1/listings`, '{}'],
    ['PATCH', `${SB}/rest/v1/mandi_prices?id=eq.1`, '{}'],
    ['GET', `${SB}/rest/v1/some_new_table?select=*`, undefined],
  ]
  for (const [method, url, body] of privateCalls) await cachedFetch(url, { method, body }, { fetchImpl: up([{ phone: '9000000001' }]), now })
  c.check(`${privateCalls.length} private / write / unknown requests: nothing stored`, (await b.all()).length === 0, (await b.all()).map((e) => e.url))
  c.check('classification: get_listing_contact and profiles are private, search_listings cacheable', policy.classify('POST', `${SB}/rest/v1/rpc/get_listing_contact`).private && policy.classify('GET', `${SB}/rest/v1/profiles`).private && policy.classify('POST', `${SB}/rest/v1/rpc/search_listings`).cacheable)

  // non-200 never stored
  b = fresh()
  for (const code of [206, 304, 400, 401, 404, 406, 500, 503]) await cachedFetch(`${urlM}&n=${code}`, { method: 'GET' }, { fetchImpl: up({ message: 'x' }, code), now }).catch(() => {})
  c.check('non-200 answers (206 304 400 401 404 406 500 503) are never stored', (await b.all()).length === 0)

  // key includes Accept / Prefer / Range; key stable
  b = fresh()
  await cachedFetch(urlW, { method: 'GET', headers: { Accept: 'application/json' } }, { fetchImpl: up([{ a: 1 }]), now })
  await cachedFetch(urlW, { method: 'GET', headers: { Accept: 'application/vnd.pgrst.object+json' } }, { fetchImpl: up({ a: 1 }), now })
  await cachedFetch(urlW, { method: 'GET', headers: { Accept: 'application/json', Prefer: 'count=exact' } }, { fetchImpl: up([{ a: 1 }]), now })
  await cachedFetch(urlW, { method: 'GET', headers: { Accept: 'application/json', Range: '0-9' } }, { fetchImpl: up([{ a: 1 }]), now })
  c.check('same URL, different Accept / Prefer / Range → 4 separate entries', (await b.all()).length === 4, (await b.all()).length)
  const objAnswer = await cachedFetch(urlW, { method: 'GET', headers: { Accept: 'application/vnd.pgrst.object+json' } }, { fetchImpl: down, now })
  c.check('offline, the object-Accept request gets the object answer (not the array)', !Array.isArray(await objAnswer.json()))
  const k1 = cacheKey('get', urlW, undefined, { Accept: 'application/json', 'X-Other': '1' })
  const k2 = cacheKey('GET', urlW, undefined, new Headers({ accept: 'application/json' }))
  c.check('key is stable (method case, header object vs Headers, unrelated headers ignored)', k1 === k2)
  c.check('key includes the body (RPC arguments)', cacheKey('POST', `${SB}/rest/v1/rpc/search_listings`, '{"p_query":"a"}') !== cacheKey('POST', `${SB}/rest/v1/rpc/search_listings`, '{"p_query":"b"}'))
  store.setBackend(null); status.resetStatus()
  return c
}

// ---------------------------------------------------------------- O1b
// The real fetchMandiPrices() / fetchWeatherCell() through the real supabase-js client and the
// app's cachedFetch (loaded by Vite, app mode), with a fake clock and a fake PostgREST.
export async function runO1b() {
  const c = new Checks()
  const { createServer } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href)
  // Restored in finally: later steps of the same run (builds, guards) must not inherit these.
  const savedEnv = { url: process.env.VITE_SUPABASE_URL, key: process.env.VITE_SUPABASE_ANON_KEY }
  process.env.VITE_SUPABASE_URL = SB
  process.env.VITE_SUPABASE_ANON_KEY = 'unit-test-anon-key'
  const realDate = Date, realFetch = globalThis.fetch
  let fakeNow = realDate.parse('2026-10-10T09:00:00+05:30')
  class FakeDate extends realDate {
    constructor(...a) { super(...(a.length ? a : [fakeNow])) }
    static now() { return fakeNow }
  }
  const storage = new Map()
  globalThis.window = { Capacitor: { isNativePlatform: () => true }, location: { origin: 'https://localhost', href: 'https://localhost/' } }
  globalThis.localStorage = { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) }
  let online = true
  const calls = []
  const day = (offset) => new FakeDate(fakeNow + offset * 86400000).toISOString().slice(0, 10)
  const FILL_DAY = '2026-10-10'
  const mandiRows = [{ commodity_hi: 'गेहूं', commodity_en: 'Wheat', market: 'Sagar', district: 'Sagar', modal_price: 2450, price_date: FILL_DAY, is_local: true }]
  const cell = { grid_key: '23.8_78.7', latitude: 23.8, longitude: 78.7, current: { temperature_2m: 29, relative_humidity_2m: 50, wind_speed_10m: 5, weather_code: 1 }, hourly: {}, daily: {}, season_rain: null, fetched_at: '2026-10-10T03:00:00Z' }
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url)
    calls.push(`${init.method || 'GET'} ${url.pathname}${url.search}`)
    if (!online) throw new TypeError('Failed to fetch')
    const accept = new Headers(init.headers || {}).get('accept') || ''
    const q = url.searchParams
    if (url.pathname === '/rest/v1/mandi_prices') {
      if (q.get('price_date')?.startsWith('eq.')) { const d = q.get('price_date').slice(3); return json(d === FILL_DAY ? mandiRows : []) }
      if (q.get('select') === 'price_date') return json([{ price_date: FILL_DAY }])
      return json([])
    }
    if (url.pathname === '/rest/v1/weather_cache_v2') {
      if (q.get('grid_key') === 'eq.23.8_78.7') return accept.includes('pgrst.object') ? json(cell) : json([cell])
      return json([{ grid_key: cell.grid_key, latitude: 23.8, longitude: 78.7 }])
    }
    if (url.host === 'api.open-meteo.com') return json({}, 500)
    return json([])
  }
  const server = await createServer({ root: ROOT, mode: 'staging', logLevel: 'silent', server: { middlewareMode: true, hmr: false }, appType: 'custom', configFile: false, plugins: [] })
  try {
    globalThis.Date = FakeDate
    const store = await server.ssrLoadModule('/src/lib/offline/store.js')
    const status = await server.ssrLoadModule('/src/lib/offline/status.js')
    store.setBackend(store.memoryBackend())
    const mandi = await server.ssrLoadModule('/src/lib/mandi/mandiApi.js')
    const weather = await server.ssrLoadModule('/src/lib/weather/weatherApiV2.js')
    // Day 1, online: one ordinary visit (home ticker + weather for Sagar).
    const m1 = await mandi.fetchMandiPrices()
    const w1 = await weather.fetchWeatherCell(23.84, 78.74)
    c.check('day 1 online: today\'s mandi rows', m1.day === 'today' && m1.rows.length === 1 && m1.date === FILL_DAY, { day: m1.day, date: m1.date })
    c.check('day 1 online: the weather cell', !!w1)
    const entries = await store.getBackend().all()
    c.check('the visit filled the cache (mandi + weather entries)', entries.some((e) => e.resource === 'mandi_prices') && entries.some((e) => e.resource === 'weather_cache_v2'), entries.map((e) => e.resource))
    const beforeCalls = calls.length
    // Next morning (+1 day), offline.
    fakeNow += 24 * 3600000
    online = false
    status.resetStatus()
    const m2 = await mandi.fetchMandiPrices()
    c.check(`day 2 offline: fetchMandiPrices() returns the cached ${FILL_DAY} rows (not empty)`, m2.rows.length === 1 && m2.date === FILL_DAY, { rows: m2.rows.length, date: m2.date })
    c.check(`…labelled 'yesterday' or 'older' (got '${m2.day}')`, m2.day === 'yesterday' || m2.day === 'older')
    c.check('…announced as cached data', status.getRecord('mandi_prices')?.source === 'cache', status.getRecord('mandi_prices'))
    const w2 = await weather.fetchWeatherCell(23.84, 78.74)
    const wrec = status.getRecord('weather_cache_v2')
    c.check('day 2 offline: weather is either the cached cell (≤ 24 h) or refused with the "too old" state', (!!w2 && wrec?.source === 'cache') || (!w2 && wrec?.source === 'too-old'), { cell: !!w2, record: wrec })
    c.check(`fetched_at is ${((fakeNow - realDate.parse(cell.fetched_at)) / 3600000).toFixed(1)} h old → policy says ${fakeNow - realDate.parse(cell.fetched_at) > 86400000 ? 'refuse' : 'serve'}`, (fakeNow - realDate.parse(cell.fetched_at) > 86400000) === (wrec?.source === 'too-old'))
    c.check('no prefetch: day 2 made no extra successful requests (all failed offline)', calls.slice(beforeCalls).length > 0, calls.slice(beforeCalls))
    c.check('only the last-shown price DATE was kept in localStorage', [...storage.keys()].join(',') === 'ks_mandi_latest_date' && storage.get('ks_mandi_latest_date') === FILL_DAY, [...storage.entries()])
  } finally {
    globalThis.Date = realDate; globalThis.fetch = realFetch
    for (const [k, v] of [['VITE_SUPABASE_URL', savedEnv.url], ['VITE_SUPABASE_ANON_KEY', savedEnv.key]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v }
    delete globalThis.window; delete globalThis.localStorage
    await server.close()
  }
  return c
}

// ---------------------------------------------------------------- O8 (a)
// Without window.Capacitor the offline layer is inert: no fetch wrapper, no records, hooks off.
export async function runO8a() {
  const c = new Checks()
  const native = await mod('src/lib/native.js')
  const status = await mod('src/lib/offline/status.js')
  c.check('isNative() is false in a browser without window.Capacitor', (() => { globalThis.window = { location: {} }; const v = native.isNative(); delete globalThis.window; return v === false })())
  const fs = await import('node:fs')
  const sc = fs.readFileSync(path.join(ROOT, 'src/lib/supabaseClient.js'), 'utf8')
  c.check('supabaseClient installs the caching fetch only when isNative() (website keeps the default fetch)', /const nativeFetch = isNative\(\)/.test(sc) && /global: \{ fetch: withSessionHeader\(nativeFetch \|\| \(\(input, init\) => fetch\(input, init\)\)\) \}/.test(sc)) // Batch 11A: both paths get the session-header wrapper; the caching fetch still only when native
  c.check('the caching module is only imported dynamically (not in the website bundle path)', !/^import .*offline\/cachedFetch/m.test(sc))
  const uo = fs.readFileSync(path.join(ROOT, 'src/lib/offline/useOffline.js'), 'utf8')
  c.check('hooks return "nothing cached / not slow" on the website', /if \(!native\) return \{ fromCache: false/.test(uo) && /!active \|\| !isNative\(\)/.test(uo))
  c.check('refresh key never changes unless the app requests it', status.getRefreshKey() === 0)
  return c
}
