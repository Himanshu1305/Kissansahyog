// Batch 17B - writes the six rain fixtures (rain-f1 ... rain-f6) next to this file. Run: node scripts/morning/fixtures/make-rain-17b.mjs
// Plain JSON in the shape of one weather_cache_v2 row (hourly + daily), plus the "direct Open-Meteo" answer for the stale case.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
const pad = (n) => String(n).padStart(2, '0')
const addH = (iso, h) => { const d = new Date(Date.parse(`${iso}:00+05:30`) + h * 3600000 + 19800000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00` }
const addD = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)

function hourly(start, n, f) {
  return Array.from({ length: n }, (_, i) => ({ time: addH(start, i), temp: 24, precip_mm: 0, precip_prob: 5, wind_kmh: 6, humidity: 60, soil_moisture: 0.27, ...f(i, addH(start, i)) }))
}
function daily(date, days) {
  return days.map((o, i) => ({ date: addD(date, i), tmax: 31, tmin: 18, precip_mm: 0, precip_prob: 10, wind_max: 10, weathercode: 2, et0: 3.5, soil_moisture: 0.27, ...o }))
}
function fx(id, title, date, nowIso, fetchedAt, hours, days, extra = {}) {
  return { id, title, date, nowIso, cache: { grid_key: '23.8_78.7', fetched_at: fetchedAt, hourly: hours, daily: days }, direct: null, ...extra }
}
const out = {}

// F1 dry day: all 0 mm, daily chance 5 %, code 2. 06:00 IST on 31 Oct.
out['rain-f1-dry'] = fx('F1', 'dry day', '2026-10-31', '2026-10-31T00:30:00Z', '2026-10-30T23:30:00Z',
  hourly('2026-10-31T05:00', 48, () => ({})), daily('2026-10-31', [{ precip_prob: 5, weathercode: 2, tmax: 32, tmin: 17 }, { precip_prob: 5 }, { precip_prob: 5 }, {}, {}]))

// F2 the real 30 Oct case, 16:00 IST: day chance 80 %, day sum 1 mm, code 80, the wet hours are already past, 0 mm for the rest of the day.
out['rain-f2-real-30oct'] = fx('F2', 'the real 30 Oct case', '2026-10-30', '2026-10-30T10:30:00Z', '2026-10-30T09:30:00Z',
  hourly('2026-10-30T10:00', 48, (i) => (i < 5 ? { precip_mm: 0.2, precip_prob: 80 } : { precip_mm: 0, precip_prob: 8 })),
  daily('2026-10-30', [{ precip_mm: 1, precip_prob: 80, weathercode: 80, wind_max: 9 }, { precip_prob: 10, weathercode: 2 }, { precip_prob: 10, weathercode: 3 }, {}, {}]))

// F3 real rain: 8 mm in the next 6 hours (07:00-09:00 IST), 06:00 IST on 31 Oct.
out['rain-f3-rain-soon'] = fx('F3', 'real rain, 8 mm within 6 hours', '2026-10-31', '2026-10-31T00:30:00Z', '2026-10-30T23:30:00Z',
  hourly('2026-10-31T05:00', 48, (i) => ([2, 3].includes(i) ? { precip_mm: 3, precip_prob: 90, wind_kmh: 9 } : i === 4 ? { precip_mm: 2, precip_prob: 85, wind_kmh: 9 } : i < 12 ? { precip_prob: 30 } : {})),
  daily('2026-10-31', [{ precip_mm: 8, precip_prob: 90, weathercode: 63, tmax: 27, tmin: 20, wind_max: 12 }, { precip_mm: 3, precip_prob: 60, weathercode: 61 }, { precip_prob: 20, weathercode: 3 }, {}, {}]))

// F4 heavy rain day: 70 mm (ten hours of 7 mm), strong wind.
out['rain-f4-heavy'] = fx('F4', 'heavy rain day, 70 mm', '2026-10-31', '2026-10-31T00:30:00Z', '2026-10-30T23:30:00Z',
  hourly('2026-10-31T05:00', 48, (i) => (i >= 3 && i < 13 ? { precip_mm: 7, precip_prob: 100, wind_kmh: 20 } : i < 24 ? { precip_mm: i < 3 ? 0 : 0.6, precip_prob: 70 } : {})),
  daily('2026-10-31', [{ precip_mm: 70, precip_prob: 100, weathercode: 65, tmax: 25, tmin: 21, wind_max: 28 }, { precip_mm: 25, precip_prob: 90, weathercode: 63 }, { precip_mm: 5, precip_prob: 60, weathercode: 61 }, {}, {}]))

// F5 stale cache: fetched 12 hours ago (limit is 8) -> the generator must use the direct Open-Meteo answer (daily only) and say so.
out['rain-f5-stale-cache'] = fx('F5', 'stale cache falls back to direct Open-Meteo', '2026-10-31', '2026-10-31T00:30:00Z', '2026-10-30T12:30:00Z',
  hourly('2026-10-30T18:00', 48, () => ({ precip_mm: 4 })), daily('2026-10-30', [{}, { precip_mm: 4 }, { precip_mm: 4 }, {}, {}]), {
    direct: {
      daily: {
        time: ['2026-10-31', '2026-11-01', '2026-11-02'], temperature_2m_max: [31, 32, 32], temperature_2m_min: [17, 17, 18], precipitation_probability_max: [60, 10, 10],
        precipitation_sum: [1.2, 0, 0], wind_speed_10m_max: [11, 9, 9], weather_code: [3, 2, 1],
      },
    },
  })

// F6 daily numbers only (no hourly series): 6 mm for the day, 70 % chance.
out['rain-f6-daily-only'] = fx('F6', 'daily-only data (no hourly series)', '2026-10-31', '2026-10-31T00:30:00Z', '2026-10-30T23:30:00Z',
  [], daily('2026-10-31', [{ precip_mm: 6, precip_prob: 70, weathercode: 61, tmax: 28, tmin: 19, wind_max: 12 }, { precip_mm: 0, precip_prob: 10 }, { precip_prob: 10 }, {}, {}]))

for (const [name, v] of Object.entries(out)) writeFileSync(`${dir}${name}.json`, `${JSON.stringify(v, null, 1)}\n`, 'utf8')
console.log(`wrote ${Object.keys(out).length} fixtures`)
