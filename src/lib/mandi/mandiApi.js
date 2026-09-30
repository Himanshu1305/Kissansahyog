// Public read of cached mandi prices (RLS: read-only). Tries today's rows first,
// then yesterday's; Sagar-district rows are preferred. Degrades gracefully to an
// empty result if the table/data is missing (the ticker then shows "coming soon").
//
// ─── Phase 3c — DISTANCE IS INFORMATIONAL ONLY HERE, NEVER A FILTER ─────────────
// Mandi price comparison is a farmer's own selling decision, not a person-to-person
// trust interaction — distance is informational only here, never a filter. Do NOT
// apply the 30/50 km listing-visibility rule (src/lib/distance.js partitionByRadius /
// RADIUS_KM) to this feature. This module deliberately does not import that logic;
// a farmer must be able to compare a mandi's price however far away it is.
// ───────────────────────────────────────────────────────────────────────────────
import { supabase } from '../supabaseClient'

const isoDay = (offsetDays = 0) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

async function pricesFor(dateStr) {
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('commodity_hi,commodity_en,market,modal_price,price_date,is_sagar_district')
    .eq('price_date', dateStr)
    .order('is_sagar_district', { ascending: false })
    .order('modal_price', { ascending: true })
  if (error) return null // table missing or transient — treated as no data
  return data || []
}

// Phase 3a — attach a trend `delta` to each row: the row's modal_price minus the
// most recent EARLIER price_date for the same commodity+market. null when there
// is no prior row. Looks back up to 7 days; per key, uses the latest earlier date.
const keyOf = (r) => `${r.commodity_en}||${r.market}`
async function withTrend(rows, currentDay) {
  if (!rows.length) return rows
  const { data } = await supabase
    .from('mandi_prices')
    .select('commodity_en,market,modal_price,price_date')
    .lt('price_date', currentDay)
    .gte('price_date', isoDay(-8))
    .order('price_date', { ascending: false })
  const prevByKey = {}
  for (const p of data || []) {
    const k = `${p.commodity_en}||${p.market}`
    if (prevByKey[k] === undefined && p.modal_price != null) prevByKey[k] = Number(p.modal_price)
  }
  return rows.map((r) => {
    const prev = prevByKey[keyOf(r)]
    return { ...r, delta: prev == null || r.modal_price == null ? null : Math.round(Number(r.modal_price) - prev) }
  })
}

// The single most recent price_date that has any rows (used when today has none, so the
// ticker shows the latest real prices with an HONEST date rather than "coming soon").
async function latestMandiDate() {
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('price_date')
    .order('price_date', { ascending: false })
    .limit(1)
  if (error || !data || !data.length) return null
  return data[0].price_date
}

// Returns { rows, day: 'today' | 'yesterday' | 'older' | 'none', date }. Each row carries
// `delta`. `date` is the actual price_date shown so the UI can label a non-today price with
// its exact date ("कल का भाव (dd/mm)" / "पिछला भाव (dd/mm)") — Phase 4c honest labeling.
export async function fetchMandiPrices() {
  const t0 = isoDay(0)
  const today = await pricesFor(t0)
  if (today && today.length) return { rows: await withTrend(today, t0), day: 'today', date: t0 }
  // No rows for today — fall back to the most recent available date (yesterday OR older),
  // labeled honestly by how old it actually is, instead of showing "coming soon".
  const latest = await latestMandiDate()
  if (!latest) return { rows: [], day: 'none', date: null }
  const rows = await pricesFor(latest)
  if (!rows || !rows.length) return { rows: [], day: 'none', date: null }
  const day = latest === isoDay(-1) ? 'yesterday' : 'older'
  return { rows: await withTrend(rows, latest), day, date: latest }
}

// ---- /msp page: per-crop today prices + trend history ----------------------

// Today's (or latest available) modal price at every Sagar mandi for a commodity.
// Returns { rows: [{market, modal_price, min_price, max_price, arrivals_tonnes}], date }.
export async function fetchMandiForCrop(commodityEn) {
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('market,district,modal_price,min_price,max_price,arrivals_tonnes,price_date,is_sagar_district')
    .eq('commodity_en', commodityEn)
    .order('price_date', { ascending: false })
    .limit(300)
  if (error || !data || !data.length) return { rows: [], date: null }
  const sagar = data.filter((r) => r.is_sagar_district)
  const pool = sagar.length ? sagar : data
  const date = pool[0].price_date
  const rows = pool.filter((r) => r.price_date === date && r.modal_price != null)
  // de-dup by market (keep first)
  const seen = new Set()
  return { rows: rows.filter((r) => (seen.has(r.market) ? false : seen.add(r.market))), date }
}

// Daily district modal price (median across mandis per date) over the last N days,
// for the trend chart. Returns [{date, price}] ascending; may be short if history is thin.
export async function fetchMandiHistory(commodityEn, days = 90) {
  const from = isoDay(-days)
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('modal_price,price_date')
    .eq('commodity_en', commodityEn)
    .gte('price_date', from)
    .order('price_date', { ascending: true })
    .limit(5000)
  if (error || !data) return []
  const byDate = {}
  for (const r of data) { if (r.modal_price == null) continue; (byDate[r.price_date] ||= []).push(Number(r.modal_price)) }
  const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2) }
  return Object.entries(byDate).map(([date, arr]) => ({ date, price: median(arr) })).sort((a, b) => (a.date < b.date ? -1 : 1))
}

// Full available history for the "past years by month" chart (up to ~3 years).
export async function fetchMandiMonthly(commodityEn) {
  const rows = await fetchMandiHistory(commodityEn, 365 * 3 + 5)
  return rows
}

// Phase 3b — the list of valid mandi names, sourced from the DISTINCT markets that
// actually have price rows (not a gazetteer, not a hardcoded list). Cached per session.
let marketsCache = null
export async function fetchMandiMarkets() {
  if (marketsCache) return marketsCache
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('market')
    .order('market', { ascending: true })
    .limit(5000)
  if (error || !data) return []
  marketsCache = [...new Set(data.map((r) => r.market).filter(Boolean))]
  return marketsCache
}

// Phase 2 (0026) — DISTINCT markets with their district, for the comparison picker +
// distance ranking (district feeds the mandiCoords gazetteer fallback). Cached.
let marketsDistCache = null
export async function fetchMandiMarketsWithDistrict() {
  if (marketsDistCache) return marketsDistCache
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('market,district')
    .order('market', { ascending: true })
    .limit(5000)
  if (error || !data) return []
  const seen = new Map()
  for (const r of data) if (r.market && !seen.has(r.market)) seen.set(r.market, r.district || null)
  marketsDistCache = [...seen.entries()].map(([market, district]) => ({ market, district }))
  return marketsDistCache
}

// Phase 2 (0026) — for a set of markets, the latest price per (commodity, market).
// Returns a map keyed `commodity_en||market` → { modal_price, price_date }. Distance is
// NOT a factor here (see the 3c note above — comparison is deliberately unrestricted).
export async function fetchMandiForMarkets(markets) {
  const list = (markets || []).filter(Boolean)
  if (!list.length) return {}
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('commodity_en,market,modal_price,price_date')
    .in('market', list)
    .order('price_date', { ascending: false })
    .limit(5000)
  if (error || !data) return {}
  const by = {}
  for (const r of data) {
    if (r.modal_price == null) continue
    const k = `${r.commodity_en}||${r.market}`
    if (by[k] === undefined) by[k] = { modal_price: Number(r.modal_price), price_date: r.price_date }
  }
  return by
}

// Phase 3b — the latest price for one commodity at one specific market, HOWEVER far
// away it is (no distance filter — see the 3c note at the top of this file). Returns
// { market, modal_price, price_date, min_price, max_price } or null when that mandi
// has no price for this crop (honest empty state — never a stale/fabricated value).
export async function fetchMandiForMarket(commodityEn, market) {
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('market,modal_price,min_price,max_price,price_date')
    .eq('commodity_en', commodityEn)
    .eq('market', market)
    .order('price_date', { ascending: false })
    .limit(1)
  if (error || !data || !data.length || data[0].modal_price == null) return null
  return data[0]
}

// /msp landing snapshot: latest modal price per commodity (prefer Sagar on the
// latest date). Returns a map keyed by commodity_en → {modal_price, price_date, market}.
export async function fetchMandiSnapshot() {
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('commodity_en,modal_price,price_date,market,is_sagar_district')
    .order('price_date', { ascending: false })
    .limit(3000)
  if (error || !data) return {}
  const by = {}
  for (const r of data) {
    if (r.modal_price == null) continue
    const c = by[r.commodity_en]
    if (!c) { by[r.commodity_en] = r; continue }
    if (r.price_date > c.price_date) by[r.commodity_en] = r
    else if (r.price_date === c.price_date && r.is_sagar_district && !c.is_sagar_district) by[r.commodity_en] = r
  }
  return by
}
