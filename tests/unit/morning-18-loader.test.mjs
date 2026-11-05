// Batch 18 Part 2 - loadDistrictsWeather: one cache request, stale/missing -> direct (batched, else one by one), failure -> unavailable, never throws.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadDistrictsWeather } from '../../scripts/morning/lib/weather.js'
import { DISTRICTS } from '../../scripts/morning/lib/districts.js'
import { districtScenario } from '../../scripts/morning/fixtures.js'

const base = (sc, o = {}) => ({ districts: DISTRICTS, url: 'https://x.invalid', key: 'k', date: sc.date, nowMs: sc.nowMs, fetchImpl: sc.fetchImpl, pauseMs: 0, sleep: async () => {}, ...o })
const run = async (name, o = {}) => {
  const sc = districtScenario(name, o)
  return { r: await loadDistrictsWeather(base(sc)), calls: sc.calls }
}
const src = (r) => r.map((x) => x.source).join(',')

test('all cached: ONE request in total, six cache results in district order', async () => {
  const { r, calls } = await run('all-dry')
  assert.deepEqual(calls, ['cache'])
  assert.deepEqual(r.map((x) => x.id), DISTRICTS.map((d) => d.id))
  assert.equal(src(r), 'cache,cache,cache,cache,cache,cache')
  assert.ok(r.every((x) => x.weather.days.length === 3 && Array.isArray(x.weather.hourly)))
})
test('two stale cells -> ONE batched direct request for just those two', async () => {
  const { r, calls } = await run('stale-two')
  assert.deepEqual(calls, ['cache', 'direct:2'])
  assert.equal(src(r), 'cache,open-meteo-direct,open-meteo-direct,cache,cache,cache')
  assert.match(r[1].reason, /older than 8 h/)
})
test('one missing cell -> single direct request, daily numbers only', async () => {
  const { r, calls } = await run('daily-only')
  assert.deepEqual(calls, ['cache', 'direct:1'])
  assert.equal(r[5].source, 'open-meteo-direct'); assert.equal(r[5].weather.hourly, undefined)
})
test('one direct fails -> falls back to one call per district; that one is unavailable', async () => {
  const { r, calls } = await run('one-unavailable')
  assert.equal(r[5].source, 'unavailable'); assert.match(r[5].reason, /failed/); assert.equal(r[5].weather, null)
  assert.ok(r.slice(0, 5).every((x) => x.source === 'cache'))
  assert.equal(calls.filter((c) => c === 'cache').length, 1)
})
test('all fail -> all unavailable, pauses between the single calls, no throw', async () => {
  const sc = districtScenario('all-unavailable')
  const pauses = []
  const r = await loadDistrictsWeather(base(sc, { pauseMs: 700, sleep: async (ms) => { pauses.push(ms) } }))
  assert.ok(r.every((x) => x.source === 'unavailable'))
  assert.equal(pauses.length, 5); assert.ok(pauses.every((p) => p === 700))
})
test('batched call not accepted but singles work: fetched one by one with a pause', async () => {
  const sc = districtScenario('stale-two', { batched: false })
  const pauses = []
  const r = await loadDistrictsWeather(base(sc, { pauseMs: 5, sleep: async (ms) => { pauses.push(ms) } }))
  assert.equal(src(r), 'cache,open-meteo-direct,open-meteo-direct,cache,cache,cache')
  assert.equal(pauses.length, 1)
})
test('malformed rows and replies never throw', async () => {
  const bad = [null, 'x', [null, { grid_key: '23.8_78.7' }, { grid_key: '23.8_79.4', fetched_at: 'zzz', daily: [], hourly: [] }], { not: 'a list' }]
  for (const body of bad) {
    const f = async (u) => (String(u).includes('weather_cache_v2') ? { ok: true, json: async () => body } : { ok: true, json: async () => ({ daily: { time: ['2026-10-31'] } }) })
    const r = await loadDistrictsWeather({ districts: DISTRICTS, url: 'https://x.invalid', key: 'k', date: '2026-10-31', nowMs: Date.parse('2026-10-31T00:30:00Z'), fetchImpl: f, pauseMs: 0, sleep: async () => {} })
    assert.equal(r.length, 6); assert.ok(r.every((x) => x.source === 'unavailable'))
  }
})
test('a throwing fetch, and missing url/key, give unavailable and not an exception', async () => {
  const boom = async () => { throw new Error('boom') }
  const r1 = await loadDistrictsWeather({ districts: DISTRICTS, url: 'https://x.invalid', key: 'k', date: '2026-10-31', fetchImpl: boom, pauseMs: 0, sleep: async () => {} })
  assert.ok(r1.every((x) => x.source === 'unavailable'))
  const r2 = await loadDistrictsWeather({ districts: DISTRICTS, date: '2026-10-31', fetchImpl: boom, pauseMs: 0, sleep: async () => {} })
  assert.equal(r2.length, 6)
})
