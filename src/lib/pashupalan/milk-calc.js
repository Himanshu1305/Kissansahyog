// Batch 19-B - pure arithmetic for the milk income calculator. No storage, no network, no imports.
// Blank or invalid input -> null (the screen then shows "fill the boxes"); zero is a valid number.
export const AID_PER_COW = 900 // illustration only: the desi cow assistance is NOT decided (FACTS F-A1, F-A6)
export const DAYS = 30

export function parseNum(v) {
  const t = String(v ?? '').trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// inputs are raw strings or numbers: animals, litres (per animal per day), price (Rs per litre), cost (Rs per animal per day)
export function milkMath({ animals, litres, price, cost, aid = false, days = DAYS }) {
  const a = parseNum(animals); const l = parseNum(litres); const p = parseNum(price); const c = parseNum(cost)
  if ([a, l, p, c].some((x) => x === null)) return null
  const income = r2(a * l * p * days)
  const spend = r2(a * c * days)
  const diff = r2(income - spend)
  const aidAmount = aid ? r2(a * AID_PER_COW) : 0
  return { income, spend, diff, aidAmount, diffWithAid: r2(diff + aidAmount) }
}
