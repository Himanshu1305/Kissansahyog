// Batch 12C — the home-page ticker shows a short, steady list instead of every price row of the day.
// Pure functions (no network), unit-tested in tests/unit/mandi-ticker-12c.test.mjs.
import { pickMandi } from './pickRule.js'

export const TICKER_MAX = 12
export const TICKER_PX_PER_SEC = 35
export const TICKER_MIN_SECONDS = 40

// Farmer-friendly crop order (commodity_en prefix); anything else follows alphabetically.
const CROP_ORDER = ['Wheat', 'Soyabean', 'Gram', 'Mustard', 'Lentil', 'Moong', 'Urad', 'Maize', 'Paddy', 'Garlic']
const cropRank = (en) => {
  const i = CROP_ORDER.findIndex((c) => String(en || '').startsWith(c))
  return i < 0 ? CROP_ORDER.length : i
}

// Which mandi shows for a crop: the ONE shared rule (Batch 23, src/lib/mandi/pickRule.js): Sagar-division mandi first, then the
// larger arrivals, then the lowest mandi name. Deterministic, so the strip never reshuffles and matches /msp.
export function tickerRows(rows, max = TICKER_MAX) {
  const byCrop = new Map()
  for (const r of rows || []) {
    if (!r || r.modal_price == null) continue
    if (!byCrop.has(r.commodity_en)) byCrop.set(r.commodity_en, [])
    byCrop.get(r.commodity_en).push(r)
  }
  return [...byCrop.values()]
    .map((list) => pickMandi(list))
    .filter(Boolean)
    .sort((a, b) => cropRank(a.commodity_en) - cropRank(b.commodity_en) || (a.commodity_en < b.commodity_en ? -1 : 1))
    .slice(0, max)
}

// Seconds for the strip's first half to scroll past at a steady reading speed; stripWidth is the width
// of the whole duplicated strip in px (two copies of the list). Never faster than TICKER_MIN_SECONDS.
export const tickerDuration = (stripWidth) => Math.max(TICKER_MIN_SECONDS, Math.round(((Number(stripWidth) || 0) / 2 / TICKER_PX_PER_SEC) * 10) / 10)
