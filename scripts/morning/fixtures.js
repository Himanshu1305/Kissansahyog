// Offline, fixed data for `npm run morning -- --fixtures <name>` and for the tests. Names: normal, rainy, missing-mandi.
import { readFileSync, readdirSync } from 'node:fs'
import { addDays } from './lib/ist.js'
import { loadWeather } from './lib/weather.js'

export const FIXTURE_DATE = '2026-10-25' // a Sunday
const MARKETS = [['Sagar APMC', 'Sagar'], ['Khurai APMC', 'Sagar'], ['Bina APMC', 'Sagar'], ['Rehli APMC', 'Sagar'], ['Damoh APMC', 'Damoh'], ['Chhatarpur APMC', 'Chhatarpur']]
const BASE = { Gram: 5600, Wheat: 2650, Lentil: 6700, Mustard: 6100, Soyabean: 5400, Maize: 2200 }
const HI = { Gram: 'चना', Wheat: 'गेहूं', Lentil: 'मसूर', Mustard: 'सरसों', Soyabean: 'सोयाबीन', Maize: 'मक्का' }

// 30 days of rows ending the day before `date`; a gentle rise on Gram, a gentle fall on Lentil, small noise elsewhere.
export function makeRows(date, { skipLast = false } = {}) {
  const rows = []
  const end = addDays(date, -1)
  for (let i = 0; i < 30; i++) {
    const d = addDays(end, -i)
    if (skipLast && i === 0) continue
    for (const [crop, base] of Object.entries(BASE)) {
      MARKETS.forEach(([market, district], mi) => {
        const drift = crop === 'Gram' ? -i * 6 : crop === 'Lentil' ? i * 5 : 0
        const noise = ((i * 7 + mi * 13 + crop.length) % 9) - 4
        rows.push({ commodity_en: crop, market, district, modal_price: Math.round(base + drift + noise * 5 + mi * 8), price_date: d })
      })
    }
  }
  return rows
}

const day = (date, o) => ({ date, tmin: 18, tmax: 31, rainProb: 10, rainMm: 0, windMax: 12, code: 1, ...o })
const weather = (date, o = {}, o2 = {}) => ({ provider: 'fixture', days: [day(date, o), day(addDays(date, 1), o2), day(addDays(date, 2), { rainProb: 20, code: 3 })] })

// ---- Batch 17B: the six rain fixtures (F1-F6, scripts/morning/fixtures/rain-*.json). `name` is "rain-f1" ... "rain-f6" (a prefix is enough).
// The weather goes through the REAL loader (cache first, direct Open-Meteo second) with a stub fetch, so the stale-cache fallback is exercised.
const RAIN_DIR = new URL('./fixtures/', import.meta.url)
export const rainFixtureNames = () => readdirSync(RAIN_DIR).filter((f) => /^rain-f\d.*\.json$/.test(f)).map((f) => f.replace(/\.json$/, ''))
function loadRainFixture(name) {
  const file = rainFixtureNames().find((n) => n === name || n.startsWith(`${name}-`))
  if (!file) throw new Error(`unknown rain fixture "${name}" (${rainFixtureNames().join(', ')})`)
  const j = JSON.parse(readFileSync(new URL(`${file}.json`, RAIN_DIR), 'utf8'))
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(String(url).includes('weather_cache_v2') ? 'cache' : 'direct')
    const body = String(url).includes('weather_cache_v2') ? (j.cache ? [j.cache] : []) : j.direct
    if (body == null) return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => body }
  }
  const nowMs = Date.parse(j.nowIso)
  return {
    date: j.date, nowIso: j.nowIso, rows: makeRows(j.date), json: j, calls,
    weatherLoader: () => loadWeather({ url: 'https://fixture.invalid', key: 'fixture-key', lat: 23.84, lon: 78.74, date: j.date, nowMs, fetchImpl }),
  }
}

export function loadFixture(name, date = FIXTURE_DATE) {
  if (/^rain-f\d/.test(name)) return loadRainFixture(name)
  if (name === 'normal') return { date, weather: weather(date), rows: makeRows(date) }
  if (name === 'rainy') return { date, weather: weather(date, { tmin: 21, tmax: 28, rainProb: 70, rainMm: 12, windMax: 30, code: 63 }, { rainProb: 60, rainMm: 8, code: 61 }), rows: makeRows(date) }
  if (name === 'missing-mandi') return { date, weather: weather(date, { tmin: 5, tmax: 24, rainProb: 5, code: 0 }), rows: [] }
  if (name === 'no-weather') return { date, weather: null, rows: makeRows(date) }
  throw new Error(`unknown fixture "${name}" (normal, rainy, missing-mandi, no-weather)`)
}
export const FIXTURE_CROP_HI = HI

// ---- Batch 18: district scenarios built from the SAME rain fixtures (F1-F6), nothing invented. -----------------------------------
// A scenario says, per district, which fixture's saved cell sits in the cache ('f1'...'f6', or 'stale' = F5's old cell, or null = no cell) and what a direct
// Open-Meteo call gives for it ('f5' = F5's daily numbers, 'fail' = error). fetchImpl answers the ONE cache request and the direct calls (batched or single).
const rainJson = (code) => JSON.parse(readFileSync(new URL(`${rainFixtureNames().find((n) => n.startsWith(`rain-${code}-`))}.json`, RAIN_DIR), 'utf8'))
const ALL = ['Sagar', 'Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari']
const same = (cache, direct = 'f5') => Object.fromEntries(ALL.map((id) => [id, { cache, direct }]))
export const DISTRICT_SCENARIOS = {
  'all-dry': same('f1'),
  'rain-two': { ...same('f1'), Panna: { cache: 'f3', direct: 'f5' }, Chhatarpur: { cache: 'f3', direct: 'f5' } },
  heavy: { ...same('f1'), Tikamgarh: { cache: 'f4', direct: 'f5' } },
  'daily-only': { ...same('f1'), Niwari: { cache: null, direct: 'f5' } },
  'one-unavailable': { ...same('f1'), Niwari: { cache: null, direct: 'fail' } },
  'all-unavailable': Object.fromEntries(ALL.map((id) => [id, { cache: null, direct: 'fail' }])),
  'stale-two': { ...same('f1'), Damoh: { cache: 'stale', direct: 'f5' }, Panna: { cache: 'stale', direct: 'f5' } },
}
export function districtScenario(name, { batched = true } = {}) {
  const sc = DISTRICT_SCENARIOS[name]
  if (!sc) throw new Error(`unknown district scenario "${name}" (${Object.keys(DISTRICT_SCENARIOS).join(', ')})`)
  const base = rainJson('f1'), f5 = rainJson('f5')
  const cells = { f1: base.cache, f3: rainJson('f3').cache, f4: rainJson('f4').cache, f6: rainJson('f6').cache, stale: f5.cache }
  const keyOf = { Sagar: '23.8_78.7', Damoh: '23.8_79.4', Panna: '24.7_80.2', Tikamgarh: '24.7_78.8', Chhatarpur: '24.9_79.6', Niwari: '25.4_78.8' }
  const latOf = { Sagar: 23.84178, Damoh: 23.83957, Panna: 24.7196, Tikamgarh: 24.74286, Chhatarpur: 24.92047, Niwari: 25.35124 }
  const calls = []
  const rows = ALL.filter((id) => sc[id].cache).map((id) => ({ ...cells[sc[id].cache], grid_key: keyOf[id] }))
  const idOfLat = (s) => ALL.find((id) => String(latOf[id]) === s)
  const fetchImpl = async (url) => {
    const u = String(url)
    if (u.includes('weather_cache_v2')) { calls.push('cache'); return { ok: true, status: 200, json: async () => rows } }
    const lats = new URL(u).searchParams.get('latitude').split(',')
    calls.push(`direct:${lats.length}`)
    const bodies = lats.map((l) => sc[idOfLat(l)].direct)
    const fail = { ok: false, status: 500, json: async () => ({}) }
    if (lats.length > 1 && (!batched || bodies.includes('fail'))) return fail
    if (lats.length === 1 && bodies[0] === 'fail') return fail
    return { ok: true, status: 200, json: async () => (lats.length > 1 ? bodies.map(() => f5.direct) : f5.direct) }
  }
  return { date: base.date, nowIso: base.nowIso, nowMs: Date.parse(base.nowIso), fetchImpl, calls, scenario: sc }
}
