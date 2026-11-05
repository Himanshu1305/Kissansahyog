// Batch 18 - turns the raw per-district forecasts into what the message, card and voice show. No Hindi here (strings.hi.js has it).
// The rain level comes from the SAME code as the Sagar sentence (src/lib/weather/rainVerdict.js, read-only), so a district shows what /mausam shows.
import * as RV from '../../../src/lib/weather/rainVerdict.js'
import { S } from '../strings.hi.js'
import { DISTRICTS } from './districts.js'

export const districtsOff = (env = process.env) => String(env.MORNING_DISTRICTS ?? '').trim().toLowerCase() === 'off'

// raw: [{ id, key, source, weather, reason }]; sagar: { weather, verdict } of the main Sagar sentence (the Sagar row reuses it, no second number).
// -> [{ id, key, nameHi, nameEn, source, reason, available, today: { tmin, tmax, level }, next2 }]
export function buildDistrictSummaries(raw, { nowIso, sagar = null } = {}) {
  return DISTRICTS.map((d) => {
    const r = (raw || []).find((x) => x && x.id === d.id) || { source: 'unavailable', weather: null, reason: 'not loaded' }
    const base = { id: d.id, key: d.key, nameHi: S.districtNames[d.id], nameEn: d.id, source: r.source, reason: r.reason || '' }
    let weather = r.weather, verdict = null
    if (d.id === 'Sagar' && sagar && sagar.weather && sagar.verdict) { weather = sagar.weather; verdict = sagar.verdict; base.source = sagar.weather.source === 'cache' ? 'cache' : 'open-meteo-direct' }
    try {
      if (!weather) throw new Error('no weather')
      verdict ||= RV.rainVerdict({ hourly: weather.hourly, daily: weather.daily || RV.toDailyShape(weather.days), nowIso, source: weather.source || 'cache' })
      const d0 = weather.days[0]
      const next2 = [verdict.days[1], verdict.days[2]].reduce((best, x) => (x && RV.levelIndex(x.level) > RV.levelIndex(best) ? x.level : best), 'dry')
      return { ...base, available: true, today: { tmin: Math.round(d0.tmin), tmax: Math.round(d0.tmax), level: verdict.windows.today.level }, tomorrow: verdict.days[1] ? verdict.days[1].level : 'dry', next2 }
    } catch {
      return { ...base, source: 'unavailable', available: false, reason: base.reason || 'forecast unusable', today: null, next2: 'dry' }
    }
  })
}

// one report line per district: source and age, or unavailable with the reason
export function districtReportLines(items, raw, nowMs) {
  return items.map((it) => {
    const w = (raw || []).find((x) => x && x.id === it.id)?.weather
    if (!it.available) return `  ${it.nameEn} (${it.key}): unavailable - ${it.reason}`
    const age = w && w.fetchedAt && !Number.isNaN(Date.parse(w.fetchedAt)) ? `, saved forecast ${((nowMs - Date.parse(w.fetchedAt)) / 3600000).toFixed(1)} h old` : ''
    return `  ${it.nameEn} (${it.key}): ${it.source}${age}${it.reason && it.source !== 'cache' ? ` (${it.reason})` : ''}`
  })
}
