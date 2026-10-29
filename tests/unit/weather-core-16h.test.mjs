// Batch 16H: the Edge Function's shared weather logic (supabase/functions/_shared/weather-core.js).
// scripts/refresh-data.mjs runs on import and must not change, so parity is checked against a golden file that was worked out
// from the lines of refreshCell (fixture: tests/fixtures/weather-16h/open-meteo-forecast.json, 3 days, 30 hourly entries,
// one null soil moisture, one null precipitation probability, one null precipitation_sum, one null daily probability).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import * as core from '../../supabase/functions/_shared/weather-core.js'

const fixture = JSON.parse(readFileSync('tests/fixtures/weather-16h/open-meteo-forecast.json', 'utf8'))
const golden = JSON.parse(readFileSync('tests/fixtures/weather-16h/golden-mapped.json', 'utf8'))
const NOW = Date.UTC(2026, 9, 29, 5, 0, 0) // 10:30 IST

test('(a) mapForecast equals the golden exactly', () => {
  assert.deepEqual(core.mapForecast(fixture, NOW), golden)
})

test('(a) hourly cut: starts one hour before now (09:30 IST -> first kept hour 10:00), 20 of 30 kept', () => {
  const m = core.mapForecast(fixture, NOW)
  assert.equal(m.hourly.length, 20)
  assert.equal(m.hourly[0].time, '2026-10-29T10:00')
  assert.equal(m.hourly.at(-1).time, '2026-10-30T05:00')
})

test('(a) null handling: precip_mm defaults to 0, precip_prob null stays null, missing soil mean is null, hourly null prob kept', () => {
  const m = core.mapForecast(fixture, NOW)
  assert.equal(m.daily[1].precip_mm, 0)
  assert.equal(m.daily[1].precip_prob, null)
  assert.equal(m.daily[2].soil_moisture, null) // no hourly values for 31 Oct
  assert.equal(m.daily[0].soil_moisture, 0.3)  // mean of 23 non-null values (one null skipped)
  assert.equal(m.hourly.find((h) => h.time === '2026-10-29T14:00').precip_prob, null)
})

test('(a) the site reads these field names in this order: key order of hourly/daily/current entries matches the golden', () => {
  const m = core.mapForecast(fixture, NOW)
  assert.deepEqual(Object.keys(m.current), Object.keys(golden.current))
  assert.deepEqual(Object.keys(m.current), ['temp', 'humidity', 'wind_kmh', 'weathercode', 'precipitation'])
  assert.deepEqual(Object.keys(m.hourly[0]), ['time', 'temp', 'precip_mm', 'precip_prob', 'wind_kmh', 'humidity', 'soil_moisture'])
  assert.deepEqual(Object.keys(m.daily[0]), ['date', 'tmax', 'tmin', 'precip_mm', 'precip_prob', 'wind_max', 'weathercode', 'et0', 'soil_moisture'])
  for (const h of m.hourly) assert.deepEqual(Object.keys(h), Object.keys(golden.hourly[0]))
  for (const d of m.daily) assert.deepEqual(Object.keys(d), Object.keys(golden.daily[0]))
})

test('(a) 48 hours at most', () => {
  const big = structuredClone(fixture)
  const t = []; for (let i = 0; i < 100; i++) t.push(new Date(Date.UTC(2026, 9, 29, 0, 0) + i * 3600000).toISOString().slice(0, 16))
  big.hourly = { time: t, temperature_2m: t.map(() => 1), precipitation: t.map(() => 0), precipitation_probability: t.map(() => 0), wind_speed_10m: t.map(() => 1), relative_humidity_2m: t.map(() => 1) }
  const m = core.mapForecast(big, Date.UTC(2026, 9, 28))
  assert.equal(m.hourly.length, 48)
  assert.equal(m.hourly[0].soil_moisture, null) // field absent -> null
})

test('mapForecast rejects an incomplete reply', () => {
  assert.throws(() => core.mapForecast({}, NOW), /missing/)
  assert.throws(() => core.mapForecast(null, NOW), /missing/)
})

test('(b) IST parsing is identical under TZ=America/Los_Angeles and TZ=Asia/Kolkata', () => {
  const script = `import * as c from './supabase/functions/_shared/weather-core.js';
    console.log(JSON.stringify([c.istTimeMs('2026-10-29T09:00'), c.istTimeMs('2026-10-29T09:00:30'), c.istTimeMs('2026-10-29T09:00Z'), c.istDate(Date.UTC(2026,9,29,19,0)), c.mapForecast(${JSON.stringify(fixture)}, ${NOW}).hourly.length]))`
  const run = (tz) => { const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim() }
  const la = run('America/Los_Angeles'), ist = run('Asia/Kolkata'), utc = run('UTC')
  assert.equal(la, ist); assert.equal(utc, ist)
  const [a, b, z, d, n] = JSON.parse(ist)
  assert.equal(a, Date.UTC(2026, 9, 29, 3, 30)) // 09:00 IST = 03:30Z
  assert.equal(b, a + 30000)
  assert.equal(z, Date.UTC(2026, 9, 29, 9, 0))   // an explicit zone is honoured
  assert.equal(d, '2026-10-30')                  // 19:00Z is already the next day in India
  assert.equal(n, 20)
})

test('buildForecastUrl / buildArchiveUrl carry the same parameters as refreshCell', () => {
  const u = core.buildForecastUrl(23.8, 78.7)
  assert.match(u, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=23\.8&longitude=78\.7&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m,soil_moisture_0_to_7cm&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,et0_fao_evapotranspiration&timezone=Asia%2FKolkata&forecast_days=16$/)
  const a = core.buildArchiveUrl(23.8, 78.7, Date.UTC(2026, 9, 29, 5))
  assert.equal(a, 'https://archive-api.open-meteo.com/v1/archive?latitude=23.8&longitude=78.7&start_date=2015-01-01&end_date=2026-10-27&daily=precipitation_sum&timezone=Asia%2FKolkata')
})

test('gridKey and cellCentre: 0.1 degree centres, same key as the GitHub job; Sagar town is 23.8_78.7', () => {
  assert.equal(core.gridKey(23.8388, 78.7378), '23.8_78.7')
  assert.deepEqual(core.cellCentre(23.8388, 78.7378), { lat: 23.8, lon: 78.7, key: '23.8_78.7' })
  assert.equal(core.cellCentre('24.045', '78.33').key, '24.0_78.3')
  assert.equal(core.PILOT.length, 8)
})

test('season: computeSeasonRain worked by hand (to-date 27 mm, normal 29 mm)', () => {
  // today 2026-10-29 -> rabi season from 1 Oct 2026, window 28 days (29 dates). Archive: 1 mm every day 2024-10-01..2026-10-27.
  const days = []; for (let t = Date.UTC(2024, 9, 1); t <= Date.UTC(2026, 9, 27); t += 86400000) days.push(new Date(t).toISOString().slice(0, 10))
  const s = core.computeSeasonRain(days, days.map(() => 1), '2026-10-29')
  assert.deepEqual(s, { season_start: '2026-10-01', to_date_mm: 27, normal_mm: 29, source: 'Open-Meteo archive (2015–)' })
  assert.equal(core.computeSeasonRain([], [], '2026-10-29'), null)
  const k = core.computeSeasonRain(days, days.map(() => 1), '2026-07-10') // kharif from 1 Jun: 40 days, window 39
  assert.equal(k.season_start, '2026-06-01'); assert.equal(k.to_date_mm, 40) // 1 Jun..10 Jul = 40 days of 1 mm
  assert.equal(k.normal_mm, 40)                                              // only 2025 has a full window in the archive (2024 starts in Oct)
  assert.equal(core.seasonFromArchive({ daily: { time: days, precipitation_sum: days.map(() => 1) } }, '2026-10-29').computed_on, '2026-10-29')
  assert.equal(core.seasonFromArchive({}, '2026-10-29'), null)
})

test('(d) needsSeason', () => {
  const today = '2026-10-29'
  assert.equal(core.needsSeason(undefined, today), true)
  assert.equal(core.needsSeason({ season_rain: null }, today), true)
  assert.equal(core.needsSeason({ season_rain: { to_date_mm: 5 } }, today), true)                       // computed_on missing
  assert.equal(core.needsSeason({ season_rain: { to_date_mm: 5, computed_on: '2026-10-28' } }, today), true)
  assert.equal(core.needsSeason({ season_rain: { to_date_mm: 5, computed_on: today } }, today), false)
})

const mk = (n) => Array.from({ length: n }, (_, i) => ({ key: `c${String(i).padStart(2, '0')}`, lat: 20 + i / 10, lon: 70, pilot: false }))
test('(c) orderCells: missing first, then oldest; pilot always present; limit respected', () => {
  const pilots = core.buildCellList([]); assert.equal(pilots.length, 8); assert.ok(pilots.every((p) => p.pilot))
  const cells = [...pilots, ...mk(10)]
  const rows = {}
  cells.forEach((c, i) => { if (i % 3 !== 0) rows[c.key] = { fetched_at: new Date(Date.UTC(2026, 9, 29, 1) + ((i * 7) % 11) * 600000).toISOString() } })
  const out = core.orderCells(cells, rows, 12)
  assert.equal(out.length, 12)
  for (const p of pilots) assert.ok(out.some((c) => c.key === p.key), 'pilot ' + p.key)
  const others = out.filter((c) => !c.pilot)
  assert.equal(others.length, 4)
  // the four others are the missing / oldest of the non-pilot cells
  const all = cells.filter((c) => !c.pilot).sort((a, b) => (rows[a.key] ? Date.parse(rows[a.key].fetched_at) : -1) - (rows[b.key] ? Date.parse(rows[b.key].fetched_at) : -1) || (a.key < b.key ? -1 : 1))
  assert.deepEqual(others.map((c) => c.key), all.slice(0, 4).map((c) => c.key))
  assert.ok(others.slice(0, 1).every((c) => !rows[c.key]))
  // each ordering group is oldest first
  const t = (c) => (rows[c.key] ? Date.parse(rows[c.key].fetched_at) : -Infinity)
  for (let i = 1; i < others.length; i++) assert.ok(t(others[i - 1]) <= t(others[i]))
  // a limit smaller than the pilot count still includes every pilot cell (no others)
  const tiny = core.orderCells(cells, rows, 2)
  assert.equal(tiny.length, 8); assert.ok(tiny.every((c) => c.pilot))
  // rotation: after the chosen cells get fetched now, the next run picks different non-pilot cells
  const rows2 = { ...rows }; for (const c of out) rows2[c.key] = { fetched_at: new Date(Date.UTC(2026, 9, 29, 3)).toISOString() }
  const next = core.orderCells(cells, rows2, 12).filter((c) => !c.pilot).map((c) => c.key)
  assert.equal(next.length, 4); assert.ok(next.every((k) => !others.some((o) => o.key === k)))
})

test('buildCellList dedupes by cell centre, keeps the pilot flag, drops bad rows', () => {
  const list = core.buildCellList([
    { grid_key: '23.8_78.7', latitude: 23.8388, longitude: 78.7378 }, // same as a pilot
    { grid_key: '21.1_79.0', latitude: '21.1', longitude: '79.04' },
    { grid_key: '21.1_79.0', latitude: 21.12, longitude: 79.0 },      // duplicate cell
    { grid_key: 'x', latitude: 'abc', longitude: 1 },
  ])
  assert.equal(list.length, 9)
  assert.equal(list.find((c) => c.key === '23.8_78.7').pilot, true)
  assert.deepEqual(list.find((c) => c.key === '21.1_79.0'), { key: '21.1_79.0', lat: 21.1, lon: 79, pilot: false })
})

test('orderSeasonCells: only existing rows that need it, never-computed first, capped', () => {
  const cells = mk(10); const today = '2026-10-29'
  const rows = {}
  rows.c00 = { season_rain: { computed_on: today } }        // done
  rows.c01 = { season_rain: { computed_on: '2026-10-27' } } // old
  rows.c02 = { season_rain: null }                           // never
  rows.c03 = { season_rain: { to_date_mm: 1 } }              // legacy value without computed_on
  // c04.. have no row at all -> skipped
  const out = core.orderSeasonCells(cells, rows, today, 6).map((c) => c.key)
  assert.deepEqual(out, ['c02', 'c03', 'c01'])
  assert.equal(core.orderSeasonCells(cells, rows, today, 2).length, 2)
})

test('(f) parseRequest limits', () => {
  assert.deepEqual(core.parseRequest({}), { mode: 'forecast', limit: 60 })
  assert.deepEqual(core.parseRequest(null), { mode: 'forecast', limit: 60 })
  assert.deepEqual(core.parseRequest({ mode: 'forecast', limit: 2 }), { mode: 'forecast', limit: 2 })
  assert.deepEqual(core.parseRequest({ mode: 'forecast', limit: 500 }), { mode: 'forecast', limit: 60 })
  assert.deepEqual(core.parseRequest({ mode: 'season' }), { mode: 'season', limit: 6 })
  assert.deepEqual(core.parseRequest({ mode: 'season', limit: 60 }), { mode: 'season', limit: 6 })
  for (const bad of [{ mode: 'nope' }, { limit: 0 }, { limit: -3 }, { limit: 1.5 }, { limit: 'ten' }]) assert.ok(core.parseRequest(bad).error, JSON.stringify(bad))
})

test('(e) the forecast write never contains season_rain', () => {
  const cell = { key: '23.8_78.7', lat: 23.8, lon: 78.7, pilot: true }
  const row = core.buildForecastRow(cell, core.mapForecast(fixture, NOW), '2026-10-29T05:00:00.000Z')
  assert.deepEqual(Object.keys(row), ['grid_key', 'latitude', 'longitude', 'current', 'hourly', 'daily', 'fetched_at'])
  assert.ok(!('season_rain' in row))
  // and the function source writes the forecast only through buildForecastRow
  const src = readFileSync('supabase/functions/weather-refresh/index.ts', 'utf8')
  const upserts = src.match(/\.upsert\([^)]*\)/g) || []
  assert.equal(upserts.length, 1); assert.match(upserts[0], /buildForecastRow\(/)
  assert.match(src, /\.update\(\{ season_rain: season \}\)/)
})

// ---- a fake network, clock and sleep for getJson / runPool ----
const reply = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })
const base = (fetchFn, over = {}) => ({ fetchFn, timeoutMs: 1000, retries: 2, deadlineAt: Infinity, now: () => 0, sleep: async () => {}, stats: { requests: 0, rateLimited: 0 }, ...over })

test('getJson: 429 and 5xx are retried (2 retries) and 429 is counted; success returns the body', async () => {
  const seq = [reply(429), reply(503), reply(200, { a: 1 })]; let i = 0
  const o = base(async () => seq[i++])
  assert.deepEqual(await core.getJson('u', o), { a: 1 })
  assert.equal(o.stats.requests, 3); assert.equal(o.stats.rateLimited, 1)
  const o2 = base(async () => reply(429))
  await assert.rejects(core.getJson('u', o2), /HTTP 429/)
  assert.equal(o2.stats.requests, 3); assert.equal(o2.stats.rateLimited, 3)
})

test('getJson: backoff 1 s then 2 s; a 4xx other than 429 stops at once; a network error is retried', async () => {
  const waits = []; const o = base(async () => reply(500), { sleep: async (ms) => { waits.push(ms) } })
  await assert.rejects(core.getJson('u', o), /HTTP 500/); assert.deepEqual(waits, [1000, 2000])
  const o2 = base(async () => reply(404)); await assert.rejects(core.getJson('u', o2), /HTTP 404/); assert.equal(o2.stats.requests, 1)
  let n = 0; const o3 = base(async () => { if (n++ === 0) throw new TypeError('fetch failed'); return reply(200, { ok: 1 }) })
  assert.deepEqual(await core.getJson('u', o3), { ok: 1 })
})

test('(h) deadline: getJson throws {deadline}, runPool starts nothing new, and the summary is ok:false', async () => {
  let t = 0; const now = () => t
  const o = base(async () => reply(200, {}), { deadlineAt: 100, now })
  t = 100
  await assert.rejects(core.getJson('u', o), (e) => e.deadline === true)
  t = 0
  const done = []
  const items = Array.from({ length: 10 }, (_, i) => i)
  const r = await core.runPool(items, async (x) => { done.push(x); t += 30 }, { concurrency: 2, deadlineAt: 100, now })
  assert.ok(r.notStarted > 0 && r.started === done.length)
  const keys = core.PILOT.map((p) => core.cellCentre(p.lat, p.lon).key)
  const s = core.buildSummary({ mode: 'forecast', cellsTotal: 8, writtenKeys: keys, failedKeys: [], pilotKeys: keys, rateLimited: 0, fetchedByKey: {}, nowMs: 0, deadlineHit: true, ms: 1, errors: [], requests: 8 })
  assert.equal(s.ok, false); assert.equal(s.deadline_hit, true)
})

test('buildSummary: ok only when every pilot cell was written; counts; leftover older than 4 h; errors capped at 10', () => {
  const keys = core.PILOT.map((p) => core.cellCentre(p.lat, p.lon).key)
  const now = Date.UTC(2026, 9, 29, 10)
  const f = { [keys[0]]: now, 'x': now - 5 * 3600000, 'y': null, 'z': now - 3600000 }
  const good = core.buildSummary({ mode: 'forecast', cellsTotal: 11, writtenKeys: keys, failedKeys: ['x'], pilotKeys: keys, rateLimited: 2, fetchedByKey: f, nowMs: now, deadlineHit: false, ms: 5, errors: Array.from({ length: 15 }, (_, i) => 'e' + i), requests: 20 })
  assert.equal(good.ok, true); assert.equal(good.cells_written, 8); assert.equal(good.failed_cells, 1); assert.equal(good.rate_limited, 2)
  assert.equal(good.cells_left_over_4h, 2); assert.equal(good.newest_fetched_at, new Date(now).toISOString()); assert.equal(good.errors.length, 10)
  const bad = core.buildSummary({ mode: 'forecast', cellsTotal: 8, writtenKeys: keys.slice(1), failedKeys: [keys[0]], pilotKeys: keys, rateLimited: 0, fetchedByKey: {}, nowMs: now, deadlineHit: false, ms: 5, errors: [], requests: 8 })
  assert.equal(bad.ok, false); assert.deepEqual(bad.pilot_failed, [keys[0]]); assert.equal(bad.newest_fetched_at, null)
  const season = core.buildSummary({ mode: 'season', cellsTotal: 8, writtenKeys: [], failedKeys: [], pilotKeys: keys, rateLimited: 0, fetchedByKey: {}, nowMs: now, deadlineHit: false, ms: 5, errors: [], requests: 0 })
  assert.equal(season.ok, true); assert.deepEqual(season.pilot_failed, [])
  assert.equal(core.buildSummary({ mode: 'season', cellsTotal: 8, writtenKeys: [], failedKeys: ['a'], pilotKeys: keys, rateLimited: 0, fetchedByKey: {}, nowMs: now, deadlineHit: false, ms: 5, errors: [], requests: 1 }).ok, false)
})

test('(g) no secret appears in an error line, the summary or what is logged', async () => {
  const SECRET = 'sekret-cron-value-123456', KEY = 'service-role-key-abcdefghij'
  const e = new TypeError(`fetch failed for https://api.open-meteo.com/v1/forecast?x=${SECRET} using ${KEY}`, { cause: { code: 'ECONNRESET' } })
  const line = core.describeError(e, [SECRET, KEY])
  assert.ok(!line.includes(SECRET) && !line.includes(KEY) && !line.includes('https://'))
  assert.match(line, /ECONNRESET/)
  const line2 = core.describeError(new Error(`bad ${SECRET}`), [SECRET, '', 'abc']) // empty and very short secrets are ignored safely
  assert.ok(!line2.includes(SECRET))
  const s = core.buildSummary({ mode: 'forecast', cellsTotal: 1, writtenKeys: [], failedKeys: ['k'], pilotKeys: ['k'], rateLimited: 0, fetchedByKey: {}, nowMs: 0, deadlineHit: false, ms: 1, errors: ['k: ' + line], requests: 1 })
  assert.ok(!JSON.stringify(s).includes(SECRET) && !JSON.stringify(s).includes(KEY))
  // the function only logs the summary object and never reads or prints a secret value
  const src = readFileSync('supabase/functions/weather-refresh/index.ts', 'utf8')
  const logs = src.match(/console\.(log|error|warn)\([^\n]*\)/g) || []
  assert.deepEqual(logs, ['console.log(JSON.stringify(summary))'])
})

test('the function keeps the 16E guards: constant-time secret, project-ref guard, 400 on bad body, service role client', () => {
  const src = readFileSync('supabase/functions/weather-refresh/index.ts', 'utf8')
  assert.match(src, /sameSecret\(req\.headers\.get\('x-cron-secret'\)/)
  assert.match(src, /'forbidden' \}, 403/)
  assert.match(src, /EXPECT_PROJECT_REF/); assert.match(src, /, 500\)/)
  assert.match(src, /body is not valid JSON' \}, 400/)
  assert.match(src, /createClient\(supabaseUrl, serviceKey/)
  assert.match(src, /summary\.ok \? 200 : 502/)
})
