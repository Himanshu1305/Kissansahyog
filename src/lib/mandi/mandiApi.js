// Public read of cached mandi prices (RLS: read-only). Tries today's rows first,
// then yesterday's; Sagar Division rows (the "local mandis") are preferred. Degrades gracefully to an
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
import { isNative } from '../native'
import { fetchAllPages, medianByDate } from './history'

// Batch 8B (app only) — the price date last shown, kept on the phone. Offline on a later day the
// "today" and "latest date" questions cannot be answered, but this date points at rows the
// offline cache already holds (same query as when they were shown). No extra network request.
const LATEST_SHOWN_KEY = 'ks_mandi_latest_date'
function rememberShownDate(d) {
  if (!isNative() || !d) return
  try { localStorage.setItem(LATEST_SHOWN_KEY, d) } catch { /* storage unavailable */ }
}
function lastShownDate() {
  if (!isNative()) return null
  try { return localStorage.getItem(LATEST_SHOWN_KEY) } catch { return null }
}

// "Local mandi" flag (Batch 7L-1): mandi_prices.in_sagar_division — true for the six districts
// of Sagar Division (migration 0058; the ingestion sets it). Until that migration is applied the
// column does not exist, so the first query that fails on it switches this session back to the
// older is_sagar_district column and prices keep showing. Rows always expose it as `is_local`.
let localCol = 'in_sagar_division'
async function withLocalFlag(build) {
  let res = await build(localCol)
  if (res.error && localCol === 'in_sagar_division' && /in_sagar_division/.test(String(res.error.message || '') + String(res.error.details || ''))) {
    localCol = 'is_sagar_district'
    res = await build(localCol)
  }
  return res
}

const isoDay = (offsetDays = 0) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

async function pricesFor(dateStr) {
  const { data, error } = await withLocalFlag((col) => supabase
    .from('mandi_prices')
    .select(`commodity_hi,commodity_en,market,district,modal_price,price_date,is_local:${col}`)
    .eq('price_date', dateStr)
    .order(col, { ascending: false })
    .order('modal_price', { ascending: true }))
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
  if (today && today.length) { rememberShownDate(t0); return { rows: await withTrend(today, t0), day: 'today', date: t0 } }
  // No rows for today — fall back to the most recent available date (yesterday OR older),
  // labeled honestly by how old it actually is, instead of showing "coming soon".
  const latest = (await latestMandiDate()) || lastShownDate()
  if (!latest) return { rows: [], day: 'none', date: null }
  const rows = await pricesFor(latest)
  if (!rows || !rows.length) return { rows: [], day: 'none', date: null }
  rememberShownDate(latest)
  const day = latest === isoDay(-1) ? 'yesterday' : 'older'
  return { rows: await withTrend(rows, latest), day, date: latest }
}

// ---- /msp page: per-crop today prices + trend history ----------------------

// Today's (or latest available) modal price at every Sagar Division mandi for a commodity.
// Returns { rows: [{market, modal_price, min_price, max_price, arrivals_tonnes}], date }.
export async function fetchMandiForCrop(commodityEn) {
  const { data, error } = await withLocalFlag((col) => supabase
    .from('mandi_prices')
    .select(`market,district,modal_price,min_price,max_price,arrivals_tonnes,price_date,is_local:${col}`)
    .eq('commodity_en', commodityEn)
    .order('price_date', { ascending: false })
    .limit(300))
  if (error || !data || !data.length) return { rows: [], date: null }
  const local = data.filter((r) => r.is_local)
  const pool = local.length ? local : data
  const date = pool[0].price_date
  const rows = pool.filter((r) => r.price_date === date && r.modal_price != null)
  // de-dup by market (keep first)
  const seen = new Set()
  return { rows: rows.filter((r) => (seen.has(r.market) ? false : seen.add(r.market))), date }
}

// Daily modal price (median across mandis per date) over the last N days, for the trend chart.
// Returns { series: [{date, price}] ascending (may be short if history is thin), scope }.
// Batch 10E: (1) paged newest-first (src/lib/mandi/history.js) — PostgREST returns at most
// max_rows (1,000) per request, which used to cut the 90-day window to its oldest 1,000 rows;
// (2) Sagar Division mandis only, like the page says ("सागर संभाग") and like today's table.
// Only when the window has NO division row at all does it fall back to all stored rows,
// and then scope = 'all' so the page can say so (the refresh writes MP rows as a fallback).
export async function fetchMandiHistoryScoped(commodityEn, days = 90) {
  const from = isoDay(-days)
  const read = (col) => fetchAllPages((a, b) => {
    let q = supabase
      .from('mandi_prices')
      .select('modal_price,price_date')
      .eq('commodity_en', commodityEn)
      .gte('price_date', from)
    if (col) q = q.eq(col, true)
    return q.order('price_date', { ascending: false }).order('market', { ascending: true }).range(a, b)
  })
  const local = await withLocalFlag((col) => read(col))
  if (local.error) return { series: [], scope: 'division' }
  if (local.data.length) return { series: medianByDate(local.data), scope: 'division' }
  const all = await read(null)
  if (all.error || !all.data.length) return { series: [], scope: 'division' }
  return { series: medianByDate(all.data), scope: 'all' }
}

export async function fetchMandiHistory(commodityEn, days = 90) {
  return (await fetchMandiHistoryScoped(commodityEn, days)).series
}

// Full available history for the "past years by month" chart (up to ~3 years).
export async function fetchMandiMonthly(commodityEn) {
  const rows = await fetchMandiHistory(commodityEn, 365 * 3 + 5)
  return rows
}

// Phase 3b — the list of valid mandi names, sourced from the DISTINCT markets that
// actually have price rows (not a gazetteer, not a hardcoded list). Cached per session.
// Batch 10E: one read shared by both lists below, paged (src/lib/mandi/history.js). A single
// request stops at PostgREST max_rows (1,000): after the backfill that was 7 of 57 markets,
// alphabetically. Newest rows first and only the last MARKET_DAYS days, so the page cap can
// only ever drop old rows, never a market that still reports.
const MARKET_DAYS = 120
let marketRowsPromise = null
function marketRows() {
  if (!marketRowsPromise) {
    const from = isoDay(-MARKET_DAYS)
    marketRowsPromise = fetchAllPages((a, b) => supabase
      .from('mandi_prices')
      .select('market,district')
      .gte('price_date', from)
      .order('price_date', { ascending: false })
      .order('market', { ascending: true })
      .order('commodity_en', { ascending: true })
      .range(a, b)).then((r) => {
      if (r.error || !r.data) { marketRowsPromise = null; return [] }
      return r.data
    })
  }
  return marketRowsPromise
}

let marketsCache = null
export async function fetchMandiMarkets() {
  if (marketsCache) return marketsCache
  const data = await marketRows()
  if (!data.length) return []
  marketsCache = [...new Set(data.map((r) => r.market).filter(Boolean))].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))
  return marketsCache
}

// Phase 2 (0026) — DISTINCT markets with their district, for the comparison picker +
// distance ranking (district feeds the mandiCoords gazetteer fallback). Cached.
let marketsDistCache = null
export async function fetchMandiMarketsWithDistrict() {
  if (marketsDistCache) return marketsDistCache
  const data = await marketRows()
  if (!data.length) return []
  const seen = new Map()
  for (const r of data) if (r.market && !seen.has(r.market)) seen.set(r.market, r.district || null)
  marketsDistCache = [...seen.entries()].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).map(([market, district]) => ({ market, district }))
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

// /msp landing snapshot: latest modal price per commodity (prefer a Sagar Division
// mandi on the latest date). Returns a map keyed by commodity_en → {modal_price, price_date, market}.
export async function fetchMandiSnapshot() {
  const { data, error } = await withLocalFlag((col) => supabase
    .from('mandi_prices')
    .select(`commodity_en,modal_price,price_date,market,is_local:${col}`)
    .order('price_date', { ascending: false })
    .limit(3000))
  if (error || !data) return {}
  const by = {}
  for (const r of data) {
    if (r.modal_price == null) continue
    const c = by[r.commodity_en]
    if (!c) { by[r.commodity_en] = r; continue }
    if (r.price_date > c.price_date) by[r.commodity_en] = r
    else if (r.price_date === c.price_date && r.is_local && !c.is_local) by[r.commodity_en] = r
  }
  return by
}
