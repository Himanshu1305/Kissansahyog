// Batch 15B - the read-only data for /fasal-salah/kam-pani. Reuses the existing helpers (no second price pipeline):
// last 14 days from mandi_prices via fetchMandiHistoryRows (Sagar division rows) and the 15A monthly history.
// Never throws: a failed read gives null for that part and the page hides just that price line.
import { fetchMandiHistoryRows } from '../mandi/mandiApi'
import { fetchMonthlyHistory, harvestAverage, harvestByYear } from '../mandi/history10y'
import { sagarToday, topMandis, TODAY_DAYS } from './logic'
import { KP_CROPS } from '../../content/kamPani'

const YEARS = 5, END_YEAR = 2025 // the page text says 2021 to 2025; fixed so the claim and the numbers always match

export async function fetchCropData(crop) {
  const out = { id: crop.id, today: null, top: [], avg5: null, byYear: [] }
  try {
    const r = await fetchMandiHistoryRows(crop.mandi, TODAY_DAYS)
    out.today = sagarToday(r.rows)
    out.top = topMandis(r.rows)
  } catch { /* leave empty */ }
  try {
    const h = await fetchMonthlyHistory(crop.mandi)
    if (h.rows.length) {
      const a = harvestAverage(h.rows, crop.months, { years: YEARS, endYear: END_YEAR })
      out.avg5 = a ? a.avg : null
      out.byYear = harvestByYear(h.rows, crop.months, { years: YEARS, endYear: END_YEAR })
      out.scope = h.scope
    }
  } catch { /* leave empty */ }
  return out
}

// -> { gram: {...}, lentil: {...}, ... } ; never rejects
export async function fetchAllCropData() {
  const list = await Promise.all(KP_CROPS.map((c) => fetchCropData(c).catch(() => ({ id: c.id, today: null, top: [], avg5: null, byYear: [] }))))
  return Object.fromEntries(list.map((d) => [d.id, d]))
}
