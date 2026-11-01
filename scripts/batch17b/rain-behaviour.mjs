// Batch 17B follow-up - the same fixed inputs through the OLD rain logic (release-17a) and the NEW logic (release-17b).
//   node scripts/batch17b/rain-behaviour.mjs --root <repo-or-worktree> --label before|after --out <file.json>
// Only pure modules are imported (weatherRules.js, rainAlert.js and, for "after", rainVerdict.js / rainBanner.js / strings.js), so no npm install is needed in a worktree.
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const root = resolve(arg('--root', '.'))
const label = arg('--label', 'after')
const out = arg('--out', `rain-behaviour-${label}.json`)
const imp = (rel) => import(pathToFileURL(join(root, rel)).href)

const pad = (n) => String(n).padStart(2, '0')
const hourText = (i) => { const d = new Date(Date.UTC(2026, 9, 31, 0, 30) + (i - 1) * 3600000 + 19800000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00` }
// 48 hours starting at the "now" hour (06:00 IST on 31 Oct 2026)
const hours = (f = () => ({})) => Array.from({ length: 48 }, (_, i) => ({ time: hourText(i + 1), temp: 26, precip_mm: 0, precip_prob: 5, wind_kmh: 5, humidity: 60, soil_moisture: 0.28, ...f(i) }))
const dayList = (list) => list.map((o, i) => { const d = new Date(Date.UTC(2026, 9, 31 + i)); return { date: d.toISOString().slice(0, 10), tmax: 31, tmin: 18, precip_mm: 0, precip_prob: 10, wind_max: 10, weathercode: 2, et0: 3.5, soil_moisture: 0.28, ...o } })

const INPUTS = [
  { id: 'dry', note: 'no rain, calm', hourly: hours(), daily: dayList([{}, {}, {}]) },
  { id: 'trace-0.3mm', note: '0.3 mm in one hour', hourly: hours((i) => (i === 3 ? { precip_mm: 0.3 } : {})), daily: dayList([{ precip_mm: 0.3 }, {}, {}]) },
  { id: 'trace-spread-2.4mm', note: '0.1 mm every hour for 24 hours (2.4 mm)', hourly: hours((i) => (i < 24 ? { precip_mm: 0.1 } : {})), daily: dayList([{ precip_mm: 2.4 }, {}, {}]) },
  { id: 'drizzle-1.5mm', note: '1.5 mm in one hour', hourly: hours((i) => (i === 4 ? { precip_mm: 1.5, precip_prob: 60 } : {})), daily: dayList([{ precip_mm: 1.5, precip_prob: 60 }, {}, {}]) },
  { id: 'light-8mm-in-6h', note: '8 mm in hours 3-5', hourly: hours((i) => ([2, 3].includes(i) ? { precip_mm: 3, precip_prob: 90 } : i === 4 ? { precip_mm: 2, precip_prob: 85 } : {})), daily: dayList([{ precip_mm: 8, precip_prob: 90, weathercode: 63 }, {}, {}]) },
  { id: 'moderate-20mm', note: '20 mm in 4 hours', hourly: hours((i) => (i >= 3 && i < 7 ? { precip_mm: 5, precip_prob: 95 } : {})), daily: dayList([{ precip_mm: 20, precip_prob: 95, weathercode: 63 }, {}, {}]) },
  { id: 'heavy-70mm', note: '70 mm in ten hours', hourly: hours((i) => (i >= 3 && i < 13 ? { precip_mm: 7, precip_prob: 100, wind_kmh: 20 } : {})), daily: dayList([{ precip_mm: 70, precip_prob: 100, weathercode: 65, wind_max: 28 }, { precip_mm: 25 }, {}]) },
  { id: 'wind-8', note: 'dry, wind 8 km/h', hourly: hours(() => ({ wind_kmh: 8 })), daily: dayList([{ wind_max: 8 }, {}, {}]) },
  { id: 'wind-12', note: 'dry, wind 12 km/h', hourly: hours(() => ({ wind_kmh: 12 })), daily: dayList([{ wind_max: 12 }, {}, {}]) },
  { id: 'wind-20', note: 'dry, wind 20 km/h', hourly: hours(() => ({ wind_kmh: 20 })), daily: dayList([{ wind_max: 20 }, {}, {}]) },
  { id: 'soil-low', note: 'dry, soil 0.15, moderate evaporation', hourly: hours(() => ({ soil_moisture: 0.15 })), daily: dayList([{ soil_moisture: 0.15 }, {}, {}]) },
  { id: 'soil-adequate', note: 'dry, soil 0.28', hourly: hours(), daily: dayList([{}, {}, {}]) },
  { id: 'soil-high', note: 'dry, soil 0.40', hourly: hours(() => ({ soil_moisture: 0.4 })), daily: dayList([{ soil_moisture: 0.4 }, {}, {}]) },
  { id: 'hot-and-dry', note: 'dry, 37 C, evaporation 6 mm, soil 0.15', hourly: hours(() => ({ temp: 37, soil_moisture: 0.15 })), daily: dayList([{ tmax: 37, et0: 6, soil_moisture: 0.15 }, { tmax: 37, et0: 6 }, {}]) },
  { id: 'light-8mm-no-hourly', note: 'day total 8 mm, 70% chance, no hourly series', hourly: [], daily: dayList([{ precip_mm: 8, precip_prob: 70, weathercode: 61 }, {}, {}]) },
  { id: 'dry-no-hourly', note: 'dry day, no hourly series', hourly: [], daily: dayList([{ precip_prob: 5 }, {}, {}]) },
  { id: 'real-30oct', note: 'day total 1 mm, daily chance 80%, code 80, 0 mm for the rest of the day', hourly: hours(() => ({ precip_prob: 8 })), daily: dayList([{ precip_mm: 1, precip_prob: 80, weathercode: 80, wind_max: 9 }, { precip_prob: 10 }, { precip_prob: 10 }]) },
  { id: 'harvest-trace-day3', note: '0.4 mm on day 3 only', hourly: hours(), daily: dayList([{}, {}, { precip_mm: 0.4 }]) },
]

const rules = await imp('src/lib/weather/weatherRules.js')
const alertMod = await imp('src/lib/weather/rainAlert.js')
const { strings } = await imp('src/lib/i18n/strings.js')
const en = (k) => strings[k].en
let after = null
if (label === 'after') {
  const RV = await imp('src/lib/weather/rainVerdict.js')
  const { bannerText, todayTotalText } = await imp('src/lib/weather/rainBanner.js')
  after = { RV, bannerText, todayTotalText, en }
}

const results = {}
for (const inp of INPUTS) {
  const { hourly, daily } = inp
  const w = rules.actionWindows(hourly, daily)
  const row = {}
  for (const k of ['spray', 'irrigation', 'harvest', 'sowing']) row[k] = `${w[k].status} / ${w[k].reasonKey}`
  const nr = rules.nextRain(hourly)
  const forecast = daily.map((d) => ({ precipitation_sum: d.precip_mm }))
  const strip = alertMod.getRainAlert(forecast)
  row.rain_strip = strip ? `${strip.level} (${strip.total} mm)` : 'none'
  const imd = rules.imdClass(daily[0].precip_mm)
  if (!after) {
    // the OLD /mausam banner and badge, as src/screens/Mausam.jsx decided them in 17A
    row.banner = nr ? `${en('mausam_rain_next')}: ${nr.inHours === 0 ? en('mausam_rain_now') : `${nr.inHours} ${en('hours_short')} ${en('mausam_rain_after')}`} ~${nr.mm} ${en('mm_unit')}` : en('mausam_no_rain_48')
    row.badge = imd ? `badge shown: ${en(`imd_${imd.level}`)}` : 'no badge'
  } else {
    const v = after.RV.rainVerdict({ hourly, daily })
    const b = after.bannerText(v, after.en)
    row.banner = b.text
    const t = after.todayTotalText(v, after.en)
    row.badge = t ? `badge shown: ${t}` : 'no badge'
    row.verdict_level = v.level
  }
  results[inp.id] = { note: inp.note, ...row }
}
writeFileSync(out, `${JSON.stringify({ label, root: label === 'before' ? 'release-17a' : 'release-17b', inputs: INPUTS.length, results }, null, 1)}\n`, 'utf8')
console.log(`${label}: ${INPUTS.length} inputs -> ${out}`)
