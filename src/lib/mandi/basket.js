// Batch 10F — the /msp trend line measures PRICE CHANGE, not "which mandis reported that day".
// Pure: no React, no network (tests/unit/mandi-basket.test.mjs).
//
// Before 10F the daily point was the median of whichever mandis happened to report that day, so a
// day with only a few (cheaper or dearer) mandis jumped up or down although no price moved.
// Rule now (docs/review/batch10f/DECISIONS.md, evidence/trend-investigation.md):
//   1. Window days = the dates inside the window that have at least one price.
//   2. Stable basket = the mandis that reported on at least BASKET_SHARE (60 %) of those days.
//   3. Each day: median of the basket mandis that reported that day. A day where fewer than two
//      thirds (DAY_SHARE) of the basket reported is skipped (the line bridges it; no value is ever
//      made up). The founder brief said "half"; the staging data showed half still lets a short
//      Saturday through (wheat 17 Oct: 13 of 25 basket mandis, -₹44 vs a like-for-like -₹5),
//      so 2/3 is used (DECISIONS.md, evidence/trend-investigation.md).
//   4. Fewer than MIN_BASKET (3) stable mandis: fall back to the plain daily median of every
//      mandi, flagged `few` so the page says "कम मंडियों का भाव".
// Every point keeps `n` = how many mandis its price is based on (the tooltip shows it).

export const BASKET_SHARE = 0.6
export const MIN_BASKET = 3
export const DAY_SHARE = 2 / 3

const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/** rows [{market, price_date, modal_price}] of ONE crop and ONE window, any order.
 *  → { series: [{date, price, n}] ascending, basket: [market], few: bool, skipped: [date], days: number } */
export function basketSeries(rows) {
  // One price per (day, mandi): the median of that mandi's rows of the day (normally exactly one).
  const byDay = new Map()
  for (const r of rows || []) {
    const p = Number(r.modal_price)
    if (r.price_date == null || r.modal_price == null || !Number.isFinite(p) || p <= 0) continue
    const day = byDay.get(r.price_date) || new Map()
    const key = r.market || '?'
    ;(day.get(key) || day.set(key, []).get(key)).push(p)
    byDay.set(r.price_date, day)
  }
  const dates = [...byDay.keys()].sort()
  const perDay = dates.map((date) => ({ date, prices: new Map([...byDay.get(date)].map(([m, ps]) => [m, median(ps)])) }))

  const seen = new Map()
  for (const { prices } of perDay) for (const m of prices.keys()) seen.set(m, (seen.get(m) || 0) + 1)
  const need = BASKET_SHARE * dates.length
  const basket = [...seen].filter(([, c]) => c >= need).map(([m]) => m).sort()

  if (basket.length < MIN_BASKET) {
    return {
      series: perDay.map(({ date, prices }) => ({ date, price: median([...prices.values()]), n: prices.size })),
      basket,
      few: true,
      skipped: [],
      days: dates.length,
    }
  }

  const inBasket = new Set(basket)
  const minPerDay = Math.ceil(DAY_SHARE * basket.length - 1e-9)
  const series = []
  const skipped = []
  for (const { date, prices } of perDay) {
    const vals = [...prices].filter(([m]) => inBasket.has(m)).map(([, p]) => p)
    if (vals.length < minPerDay) skipped.push(date)
    else series.push({ date, price: median(vals), n: vals.length })
  }
  return { series, basket, few: false, skipped, days: dates.length }
}
