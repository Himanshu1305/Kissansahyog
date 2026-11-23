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
import { istToday, addDays, resolvePrices, pickMandi, LOOKBACK_DAYS, dayKind } from './pickRule.js'

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

// ─── Batch 23 — ONE rule for the date and the mandi (src/lib/mandi/pickRule.js) ───
// The homepage strip, the homepage price tile and the /msp tables all read the SAME recent rows through loadWindow() and
// choose with the SAME pure functions: the date is the newest day (India time) with at least 3 mandis and 5 of the 10 crops
// (a thin Sunday is skipped); the mandi per crop is Sagar division first, then larger arrivals, then the lowest name.
// Every read has an explicit sort, so nothing depends on the order Postgres happens to return rows in.
const WINDOW_DAYS = LOOKBACK_DAYS + 1 // one extra day so the trend arrow has a previous price

let windowCache = null // { at, today, promise }
function loadWindow() {
  const today = istToday()
  const now = Date.now()
  if (windowCache && windowCache.today === today && now - windowCache.at < 60000) return windowCache.promise
  const from = addDays(today, -WINDOW_DAYS)
  const promise = withLocalFlag((col) => fetchAllPages((a, b) => supabase
    .from('mandi_prices')
    .select(`commodity_hi,commodity_en,market,district,modal_price,min_price,max_price,price_date,is_local:${col}`)
    .gte('price_date', from)
    .order('price_date', { ascending: false })
    .order('commodity_en', { ascending: true })
    .order('market', { ascending: true })
    .range(a, b))).then((r) => {
    if (r.error || !r.data) { windowCache = null; return null }
    return { today, rows: r.data }
  })
  windowCache = { at: now, today, promise }
  return promise
}

// A tracked crop with no price in the window: its own latest price ever, with its own date (never the other crops' date).
async function latestFor(commodityEn) {
  const { data, error } = await withLocalFlag((col) => supabase
    .from('mandi_prices')
    .select(`commodity_hi,commodity_en,market,district,modal_price,min_price,max_price,price_date,is_local:${col}`)
    .eq('commodity_en', commodityEn)
    .order('price_date', { ascending: false })
    .order('market', { ascending: true })
    .limit(60))
  if (error || !data || !data.length) return null
  const newest = data.find((r) => r.modal_price != null)?.price_date
  return pickMandi(data.filter((r) => r.price_date === newest))
}

// Rows of one earlier day for the same crop + mandi: the trend arrow (price now minus the price at that mandi on its previous day).
function withDelta(row, rows) {
  let prev = null
  for (const r of rows) {
    if (r.commodity_en !== row.commodity_en || r.market !== row.market || r.modal_price == null || r.price_date >= row.price_date) continue
    if (!prev || r.price_date > prev.price_date) prev = r
  }
  return { ...row, delta: prev ? Math.round(Number(row.modal_price) - Number(prev.modal_price)) : null }
}

// Everything the pages need, from ONE decision: { rows (one chosen row per crop, each with its own price_date), date, day, stale,
// byCrop } where day = 'today' | 'yesterday' | 'older' | 'none' (India calendar), date = the chosen date.
async function resolveShown() {
  let win = await loadWindow()
  let all = win ? win.rows : []
  if (!all.length) {
    // Android app offline on a later day: the date last shown still points at rows the offline cache holds.
    const last = lastShownDate()
    const rows = last ? await pricesFor(last) : null
    if (rows && rows.length) all = rows
  }
  const today = istToday()
  const res = resolvePrices(all, today)
  const items = [...res.items]
  // Crops with nothing in the window: their own last price ever (own date).
  const extra = await Promise.all(res.missing.filter(() => res.date).map(async (crop) => ({ crop, row: await latestFor(crop) })))
  for (const e of extra) if (e.row) items.push({ crop: e.crop, row: e.row, date: e.row.price_date, fallback: true })
  const rows = items.filter((i) => i.row).map((i) => withDelta(i.row, all))
  const byCrop = {}
  for (const r of rows) byCrop[r.commodity_en] = r
  return { rows, byCrop, date: res.date, stale: res.stale, day: res.date ? dayKind(res.date, today) : 'none', all, today }
}

// Returns { rows, day: 'today' | 'yesterday' | 'older' | 'none', date, stale }. rows = one chosen row per crop, each with `delta` and
// its own `price_date` (a crop with no price on `date` keeps its own older date). `date` is the real date shown on the label
// ("आज का भाव" / "कल का भाव (dd/mm)" / "पिछला भाव (dd/mm)").
export async function fetchMandiPrices() {
  const r = await resolveShown()
  if (!r.date) return { rows: [], day: 'none', date: null, stale: true }
  rememberShownDate(r.date)
  return { rows: r.rows, day: r.day, date: r.date, stale: r.stale }
}

// ---- /msp page: per-crop today prices + trend history ----------------------

// The prices at every mandi for one crop on the date the shared rule chose for that crop (the same date the all-crops
// table shows). Falls back to the crop's newest stored day when the recent window has none for it.
// Returns { rows: [{market, modal_price, min_price, max_price, arrivals_tonnes, price_date}], date }.
export async function fetchMandiForCrop(commodityEn) {
  const r = await resolveShown()
  const chosen = r.byCrop[commodityEn]
  let pool = chosen ? r.all.filter((x) => x.commodity_en === commodityEn && x.price_date === chosen.price_date) : []
  let date = chosen ? chosen.price_date : null
  if (!pool.length) {
    const { data, error } = await withLocalFlag((col) => supabase
      .from('mandi_prices')
      .select(`market,district,modal_price,min_price,max_price,arrivals_tonnes,price_date,is_local:${col}`)
      .eq('commodity_en', commodityEn)
      .order('price_date', { ascending: false })
      .order('market', { ascending: true })
      .limit(300))
    if (error || !data || !data.length) return { rows: [], date: null }
    const local = data.filter((x) => x.is_local)
    const base = local.length ? local : data
    date = base[0].price_date
    pool = base.filter((x) => x.price_date === date)
  }
  const seen = new Set()
  return { rows: pool.filter((x) => x.modal_price != null).filter((x) => (seen.has(x.market) ? false : seen.add(x.market))), date }
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

// Batch 10F — the raw rows behind the /msp trend (one per mandi and day), so the page can build the
// stable-basket series per window (src/lib/mandi/basket.js) instead of a median of whoever reported.
// Same scope rule as fetchMandiHistoryScoped: Sagar division first, every row only as a fallback.
export async function fetchMandiHistoryRows(commodityEn, days = 90) {
  const from = isoDay(-days)
  const read = (col) => fetchAllPages((a, b) => {
    let q = supabase
      .from('mandi_prices')
      .select('market,modal_price,price_date')
      .eq('commodity_en', commodityEn)
      .gte('price_date', from)
    if (col) q = q.eq(col, true)
    return q.order('price_date', { ascending: false }).order('market', { ascending: true }).range(a, b)
  })
  const local = await withLocalFlag((col) => read(col))
  if (local.error) return { rows: [], scope: 'division' }
  if (local.data.length) return { rows: local.data, scope: 'division' }
  const all = await read(null)
  if (all.error || !all.data.length) return { rows: [], scope: 'division' }
  return { rows: all.data, scope: 'all' }
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

// /msp all-crops table: ONE row per crop, chosen by the same rule as the homepage strip (same date, same mandi), so the same
// crop on the same date shows the same number on both. Returns a map keyed by commodity_en -> {modal_price, price_date, market, district}.
export async function fetchMandiSnapshot() {
  const r = await resolveShown()
  return r.byCrop
}
