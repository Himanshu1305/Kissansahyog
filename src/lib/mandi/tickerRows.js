// Batch 12C — the home-page ticker shows a short, steady list instead of every price row of the day.
// Pure functions (no network), unit-tested in tests/unit/mandi-ticker-12c.test.mjs.
import { normMarket } from './marketNames.js'

export const TICKER_MAX = 12
export const TICKER_PX_PER_SEC = 35
export const TICKER_MIN_SECONDS = 40

// Farmer-friendly crop order (commodity_en prefix); anything else follows alphabetically.
const CROP_ORDER = ['Wheat', 'Soyabean', 'Gram', 'Mustard', 'Lentil', 'Moong', 'Urad', 'Maize', 'Paddy', 'Garlic']
const cropRank = (en) => {
  const i = CROP_ORDER.findIndex((c) => String(en || '').startsWith(c))
  return i < 0 ? CROP_ORDER.length : i
}

// Which mandi shows for a crop: a local one (is_local) first, then Sagar, then the larger arrivals
// (when the row has them), then the market name — deterministic, so the strip never reshuffles.
const better = (a, b) => {
  const k = (r) => [r.is_local ? 0 : 1, normMarket(r.market) === 'sagar' ? 0 : 1, -(Number(r.arrivals_tonnes) || 0)]
  const ka = k(a); const kb = k(b)
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i]
  return String(a.market) < String(b.market)
}

export function tickerRows(rows, max = TICKER_MAX) {
  const byCrop = new Map()
  for (const r of rows || []) {
    if (!r || r.modal_price == null) continue
    const c = byCrop.get(r.commodity_en)
    if (!c || better(r, c)) byCrop.set(r.commodity_en, r)
  }
  return [...byCrop.values()]
    .sort((a, b) => cropRank(a.commodity_en) - cropRank(b.commodity_en) || (a.commodity_en < b.commodity_en ? -1 : 1))
    .slice(0, max)
}

// Seconds for the strip's first half to scroll past at a steady reading speed; stripWidth is the width
// of the whole duplicated strip in px (two copies of the list). Never faster than TICKER_MIN_SECONDS.
export const tickerDuration = (stripWidth) => Math.max(TICKER_MIN_SECONDS, Math.round(((Number(stripWidth) || 0) / 2 / TICKER_PX_PER_SEC) * 10) / 10)
