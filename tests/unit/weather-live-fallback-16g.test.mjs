// Batch 16G follow-up - an expired cached cell tries a live forecast first; the live hourly cut reads times as India time.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { register } from 'node:module'

register('./fixtures/loader-16g.mjs', import.meta.url)
const { fetchWeatherCell } = await import('../../src/lib/weather/weatherApiV2.js')

const H = 3600000
const hoursAgo = (h) => new Date(Date.now() - h * H).toISOString()
const cacheRow = (fetched_at) => ({ grid_key: '23.8_78.7', latitude: 23.8, longitude: 78.7, fetched_at, current: { temp: 29, humidity: 40, wind_kmh: 16, weathercode: 1, precipitation: 0 }, hourly: [], daily: [], season_rain: null })

// Stand-ins: weather_cache_v2 returns `row` (or nothing); fetch is Open-Meteo and counts its calls.
function setup(row, { liveOk = true } = {}) {
  const calls = { live: 0 }
  globalThis.__sb = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }), then: (r) => r({ data: [] }) }), upsert: async () => ({}) }),
    rpc: () => Promise.resolve({}),
  }
  const t = Array.from({ length: 48 }, (_, i) => `${new Date(Date.now() + i * H + 19800000).toISOString().slice(0, 13)}:00`)
  const a = (v) => t.map(() => v)
  globalThis.fetch = async () => {
    calls.live++
    if (!liveOk) throw new Error('network down')
    return { ok: true, json: async () => ({
      current: { temperature_2m: 33, relative_humidity_2m: 40, wind_speed_10m: 8, weather_code: 1, precipitation: 0 },
      hourly: { time: t, temperature_2m: a(25), precipitation: a(0), precipitation_probability: a(0), wind_speed_10m: a(5), relative_humidity_2m: a(50) },
      daily: { time: [t[0].slice(0, 10)], temperature_2m_max: [31], temperature_2m_min: [16], precipitation_sum: [0], precipitation_probability_max: [0], weather_code: [1], wind_speed_10m_max: [10], et0_fao_evapotranspiration: [3] },
    }) }
  }
  return calls
}

test('expired cache + live ok -> returns the live forecast', async () => {
  const calls = setup(cacheRow(hoursAgo(30)))
  const cell = await fetchWeatherCell(23.84, 78.74)
  assert.equal(calls.live, 1)
  assert.equal(cell.current_temp, 33) // from the live reply, not the cached 29
  assert.equal(cell.fresh, 'fresh')
})

test('expired cache + live fails -> returns the cached cell (the page shows the expired notice)', async () => {
  const calls = setup(cacheRow(hoursAgo(30)), { liveOk: false })
  const cell = await fetchWeatherCell(23.84, 78.74)
  assert.equal(calls.live, 1)
  assert.equal(cell.current_temp, 29)
  assert.equal(cell.fresh, 'expired')
})

test('cache without fetched_at counts as expired and tries live', async () => {
  const calls = setup(cacheRow(null))
  const cell = await fetchWeatherCell(23.84, 78.74)
  assert.equal(calls.live, 1)
  assert.equal(cell.current_temp, 33)
})

test('fresh (2 h), aging (8 h) and stale (18 h) caches never call live', async () => {
  for (const [h, level] of [[2, 'fresh'], [8, 'aging'], [18, 'stale']]) {
    const calls = setup(cacheRow(hoursAgo(h)))
    const cell = await fetchWeatherCell(23.84, 78.74)
    assert.equal(calls.live, 0, `${h} h`)
    assert.equal(cell.fresh, level)
    assert.equal(cell.current_temp !== 33, true)
  }
})

test('no cache -> the existing live path still works', async () => {
  const calls = setup(null)
  const cell = await fetchWeatherCell(23.84, 78.74)
  assert.equal(calls.live, 1)
  assert.equal(cell.current_temp, 33)
})

test('the live hourly cut is the same in America/Los_Angeles and Asia/Kolkata', () => {
  const run = (TZ) => {
    const r = spawnSync(process.execPath, ['tests/unit/fixtures/live-cut-16g.mjs'], { env: { ...process.env, TZ }, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    return JSON.parse(r.stdout.trim().split('\n').pop())
  }
  const la = run('America/Los_Angeles'), ist = run('Asia/Kolkata')
  assert.deepEqual(la, ist)
  assert.equal(ist.saved[0], '2026-10-29T12:00') // viewed 12:17 IST: one hour of grace keeps 12:00, drops 11:00
  assert.equal(ist.saved.length, 48)
  assert.equal(ist.firstDaily, '2026-10-29')
})
