// Offline, fixed data for `npm run morning -- --fixtures <name>` and for the tests. Names: normal, rainy, missing-mandi.
import { addDays } from './lib/ist.js'

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

export function loadFixture(name, date = FIXTURE_DATE) {
  if (name === 'normal') return { date, weather: weather(date), rows: makeRows(date) }
  if (name === 'rainy') return { date, weather: weather(date, { tmin: 21, tmax: 28, rainProb: 70, rainMm: 12, windMax: 30, code: 63 }, { rainProb: 60, rainMm: 8, code: 61 }), rows: makeRows(date) }
  if (name === 'missing-mandi') return { date, weather: weather(date, { tmin: 5, tmax: 24, rainProb: 5, code: 0 }), rows: [] }
  if (name === 'no-weather') return { date, weather: null, rows: makeRows(date) }
  throw new Error(`unknown fixture "${name}" (normal, rainy, missing-mandi, no-weather)`)
}
export const FIXTURE_CROP_HI = HI
