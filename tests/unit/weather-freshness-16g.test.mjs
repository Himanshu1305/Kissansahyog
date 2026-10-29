// Batch 16G - weather never shows stale data as today. Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { strings } from '../../src/lib/i18n/strings.js'
import { weatherAge, freshnessLevel, istDate, istTimeMs, trimToNow, updatedLine, periodKey } from '../../src/lib/weather/freshness.js'
import { nextRain, actionWindows } from '../../src/lib/weather/weatherRules.js'
import { weatherFreshnessCheck, SAGAR_CELL } from '../../scripts/lib/weather-fresh.mjs'
import { runWatchdogJob } from '../../scripts/lib/mandi-daily.mjs'

const H = 3600000
const T = (iso) => Date.parse(iso)
const dateOffset = (base, n) => new Date(Date.parse(`${base}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)

// The REAL stale case: fetched 28 Oct 14:35 IST (09:05Z), viewed 29 Oct 12:17 IST (06:47Z).
const FETCHED = '2026-10-28T09:05:00Z'
const VIEW = T('2026-10-29T06:47:00Z')
const hourlyFrom = (startMs, n, extra = {}) => Array.from({ length: n }, (_, i) => {
  const ist = new Date(startMs + i * H + 19800000)
  const time = `${ist.toISOString().slice(0, 13)}:00`
  return { time, temp: 20 + i, precip_mm: 0, precip_prob: 0, wind_kmh: 5 + i, humidity: 50 + i, soil_moisture: 0.25, ...extra }
})
const mkCell = (hourly, dailyStart, fetched_at) => {
  const daily = Array.from({ length: 16 }, (_, i) => ({ date: dateOffset(dailyStart, i), tmax: 30, tmin: 15, precip_mm: i === 0 ? 0 : 1, precip_prob: 10, wind_max: 12, weathercode: 3 + i, et0: 3, soil_moisture: 0.25 }))
  return {
    grid_key: '23.8_78.7', fetched_at, current_temp: 29, current_humidity: 40, current_weathercode: 1, current_wind: 16, current_precip: 0,
    current: { temp: 29, humidity: 40, weathercode: 1, wind_kmh: 16, precipitation: 0 }, hourly, daily,
    forecast: daily.map((d) => ({ date: d.date, precipitation_sum: d.precip_mm })), season_rain: null,
  }
}
// 28 Oct 14:00 IST = 08:30Z
const STALE = mkCell(hourlyFrom(T('2026-10-28T08:30:00Z'), 48, { wind_kmh: 16 }), '2026-10-28', FETCHED)

test('freshness levels at 3 h / 5 h / 13 h / 25 h (and the edges)', () => {
  assert.equal(freshnessLevel(3 * H), 'fresh'); assert.equal(freshnessLevel(4 * H), 'fresh')
  assert.equal(freshnessLevel(5 * H), 'aging'); assert.equal(freshnessLevel(12 * H), 'aging')
  assert.equal(freshnessLevel(13 * H), 'stale'); assert.equal(freshnessLevel(24 * H), 'stale')
  assert.equal(freshnessLevel(25 * H), 'expired')
  assert.equal(freshnessLevel(null), 'expired'); assert.equal(weatherAge(undefined, 1), null); assert.equal(weatherAge('nonsense', 1), null)
  assert.equal(weatherAge(FETCHED, VIEW), VIEW - T(FETCHED))
  assert.equal(freshnessLevel(weatherAge(FETCHED, VIEW)), 'stale') // about 21.7 h
})

test('IST day boundary: 2026-10-28T19:00Z is already 29 Oct (00:30 IST)', () => {
  assert.equal(istDate(T('2026-10-28T19:00:00Z')), '2026-10-29')
  assert.equal(istDate(T('2026-10-28T18:29:00Z')), '2026-10-28')
  const c = trimToNow(STALE, T('2026-10-28T19:00:00Z'))
  assert.equal(c.daily[0].date, '2026-10-29')
  assert.equal(c.hourly[0].time, '2026-10-29T00:00') // 00:30 IST -> keep the 00:00 hour
})

test('hourly time text is read as IST, not the phone zone', () => {
  assert.equal(istTimeMs('2026-10-29T09:00'), T('2026-10-29T03:30:00Z'))
  assert.equal(istTimeMs('2026-10-29T09:00:00Z'), T('2026-10-29T09:00:00Z'))
})

test('the real stale Sagar case is trimmed to now', () => {
  const before = JSON.stringify(STALE)
  const c = trimToNow(STALE, VIEW)
  assert.equal(JSON.stringify(STALE), before, 'input not mutated')
  assert.equal(c.daily[0].date, '2026-10-29')
  assert.equal(c.forecast[0].date, '2026-10-29')
  assert.equal(c.hourly[0].time, '2026-10-29T12:00') // the current IST hour
  assert.equal(c.hourly.length, 48 - 22)
  for (const h of c.hourly) assert.ok(istTimeMs(h.time) >= T('2026-10-29T06:30:00Z'))
  // "now" values come from the nearest hour (12:00 IST, 17 min away) and the cell says so
  assert.equal(c.current_estimated, true)
  assert.equal(c.current_temp, STALE.hourly.find((h) => h.time === '2026-10-29T12:00').temp)
  assert.notEqual(c.current_temp, 29)
  assert.equal(c.current_weathercode, c.daily[0].weathercode)
})

test('a fresh cell passes through unchanged', () => {
  const now = T('2026-10-29T06:47:00Z')
  const fresh = mkCell(hourlyFrom(T('2026-10-29T06:30:00Z'), 48), '2026-10-29', '2026-10-29T06:40:00Z')
  const c = trimToNow(fresh, now)
  assert.deepEqual(c, fresh)
  assert.equal(c.current_estimated, undefined)
})

test('empty and odd inputs never throw and never invent values', () => {
  assert.equal(trimToNow(null, VIEW), null)
  const e = trimToNow({ fetched_at: FETCHED, hourly: null, daily: undefined }, VIEW)
  assert.deepEqual(e.hourly, []); assert.deepEqual(e.daily, [])
  assert.equal(e.current_estimated, undefined)
  const odd = trimToNow({ fetched_at: FETCHED, hourly: [{ time: 'junk' }, null], daily: [null, { date: 5 }], forecast: [] }, VIEW)
  assert.deepEqual(odd.hourly, []); assert.deepEqual(odd.daily, [])
  // everything is in the past: nothing is invented
  const old = trimToNow(STALE, T('2026-11-05T06:00:00Z'))
  assert.deepEqual(old.hourly, [])
  assert.ok(old.daily.every((d) => d.date >= '2026-11-05'))
})

test('nextRain and actionWindows use the trimmed data (no yesterday afternoon rain, no yesterday wind)', () => {
  const rainy = mkCell(hourlyFrom(T('2026-10-28T08:30:00Z'), 48).map((h, i) => ({ ...h, precip_mm: i < 4 ? 3 : 0, wind_kmh: i < 4 ? 20 : 4 })), '2026-10-28', FETCHED)
  assert.ok(nextRain(rainy.hourly), 'untrimmed data claims rain (yesterday afternoon)')
  const c = trimToNow(rainy, VIEW)
  assert.equal(nextRain(c.hourly), null)
  assert.equal(actionWindows(c.hourly, c.daily).spray.status, 'ok')
  assert.equal(actionWindows(rainy.hourly, rainy.daily).spray.status, 'stop')
})

test('the Updated line (English and Hindi), IST clock', () => {
  const en = (k) => strings[k].en; const hi = (k) => strings[k].hi
  const now = T('2026-10-29T06:51:00Z') // 12:21 IST
  assert.equal(updatedLine('2026-10-29T06:51:00Z', now, en, 'en'), 'Updated today 12:21 pm')
  assert.equal(updatedLine('2026-10-29T06:51:00Z', now, hi, 'hi'), 'आज दोपहर 12:21 बजे अपडेट')
  assert.equal(updatedLine(FETCHED, now, en, 'en'), 'Updated yesterday 2:35 pm')
  assert.equal(updatedLine(FETCHED, now, hi, 'hi'), 'कल दोपहर 2:35 बजे अपडेट')
  assert.equal(updatedLine('2026-10-27T09:05:00Z', now, en, 'en'), 'Updated 27/10 2:35 pm')
  assert.equal(updatedLine('2026-10-28T18:40:00Z', T('2026-10-29T06:00:00Z'), en, 'en'), 'Updated today 12:10 am')
  assert.equal(updatedLine('junk', now, en, 'en'), '')
  assert.equal(periodKey(3), 'wx_per_night_am'); assert.equal(periodKey(21), 'wx_per_night_pm')
})

test('weatherFreshnessCheck: green, too old, missing, unreadable', () => {
  const now = T('2026-10-29T06:47:00Z')
  const rows = (iso) => [{ grid_key: SAGAR_CELL, fetched_at: iso }, { grid_key: '24.0_78.3', fetched_at: '2026-10-29T06:40:00Z' }]
  assert.equal(SAGAR_CELL, '23.8_78.7')
  assert.equal(weatherFreshnessCheck(rows('2026-10-29T06:30:00Z'), now).ok, true)
  assert.equal(weatherFreshnessCheck(rows('2026-10-29T04:46:00Z'), now).ok, false) // 2 h 1 min
  const old = weatherFreshnessCheck(rows('2026-10-28T09:05:00Z'), now)
  assert.equal(old.ok, false); assert.match(old.text, /RED/)
  assert.equal(weatherFreshnessCheck([{ grid_key: '24.0_78.3', fetched_at: '2026-10-29T06:40:00Z' }], now).ok, false)
  assert.equal(weatherFreshnessCheck(null, now).ok, false)
  assert.equal(weatherFreshnessCheck([{ grid_key: SAGAR_CELL, fetched_at: 'junk' }], now).ok, false)
})

test('the job is RED when Sagar weather is old, when a pilot cell failed, and when the weather step stalls (inside the cap)', async () => {
  const okCheck = async () => ({ ok: true, text: 'fine' })
  const badCheck = async () => ({ ok: false, text: 'old' })
  const fresh = async () => ({ red: false, text: 'prices fine' })
  for (const target of ['production', 'staging']) {
    assert.equal((await runWatchdogJob({ target, weather: async () => {}, weatherCheck: okCheck, freshness: fresh })).code, 0)
    assert.equal((await runWatchdogJob({ target, weather: async () => {}, weatherCheck: badCheck, freshness: fresh })).code, 1)
    // a failing pilot cell makes refreshWeather throw at the end; the job is RED but the later checks still run
    const r = await runWatchdogJob({ target, weather: async () => { throw new Error('pilot weather cell(s) failed: 23.8_78.7') }, weatherCheck: okCheck, freshness: fresh })
    assert.equal(r.code, 1); assert.deepEqual(r.order.slice(0, 2), ['weather', 'weatherCheck'])
    // a weather step that never finishes is cut off, the check still runs, and the job ends RED
    const t0 = Date.now()
    const s = await runWatchdogJob({ target, weather: () => new Promise(() => {}), weatherTimeoutMs: 60, weatherCheck: badCheck, freshness: fresh })
    assert.equal(s.code, 1); assert.ok(Date.now() - t0 < 2000); assert.ok(s.order.includes('weatherCheck'))
  }
  // unchanged behaviour without the new options, and a dry run does nothing
  assert.equal((await runWatchdogJob({ target: 'staging', weather: async () => {}, freshness: fresh })).code, 0)
  assert.equal((await runWatchdogJob({ target: 'production', dryRun: true, weather: async () => { throw new Error('no') }, weatherCheck: badCheck, freshness: fresh })).code, 0)
})

test('the script wires it: pilot failure throws, caps are set, workflow cap is 20 min', () => {
  const src = readFileSync(new URL('../../scripts/refresh-data.mjs', import.meta.url), 'utf8')
  assert.match(src, /pilotFailed\.length\) throw/)
  assert.match(src, /weatherTimeoutMs: WEATHER_TIMEOUT_MS/)
  assert.match(src, /HARD_STOP_MS = 17 \* 60000/)
  const wf = readFileSync(new URL('../../.github/workflows/refresh-mandi-prices.yml', import.meta.url), 'utf8')
  assert.match(wf, /timeout-minutes: 20/)
})

test('every new i18n key has Hindi and English', () => {
  const keys = ['wx_upd_today', 'wx_upd_yesterday', 'wx_upd_on', 'wx_upd_suffix', 'wx_per_night_am', 'wx_per_morning', 'wx_per_afternoon', 'wx_per_evening', 'wx_per_night_pm', 'wx_old_notice', 'wx_expired_notice', 'wx_approx', 'wx_h_plus_old']
  for (const k of keys) assert.ok(strings[k]?.hi && strings[k]?.en, k)
  assert.ok(!/under review|समीक्षा/.test(JSON.stringify(keys.map((k) => strings[k]))))
})
