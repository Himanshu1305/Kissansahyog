// Public read of cached mandi prices (RLS: read-only). Tries today's rows first,
// then yesterday's; Sagar-district rows are preferred. Degrades gracefully to an
// empty result if the table/data is missing (the ticker then shows "coming soon").
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

// Returns { rows, day: 'today' | 'yesterday' | 'none' }. Each row carries `delta`.
export async function fetchMandiPrices() {
  const today = await pricesFor(isoDay(0))
  if (today && today.length) return { rows: await withTrend(today, isoDay(0)), day: 'today' }
  const yesterday = await pricesFor(isoDay(-1))
  if (yesterday && yesterday.length) return { rows: await withTrend(yesterday, isoDay(-1)), day: 'yesterday' }
  return { rows: [], day: 'none' }
}

// ---- /msp page: per-crop today prices + trend history ----------------------

// Today's (or latest available) modal price at every Sagar mandi for a commodity.
// Returns { rows: [{market, modal_price, min_price, max_price, arrivals_tonnes}], date }.
export async function fetchMandiForCrop(commodityEn) {
  const { data, error } = await supabase
    .from('mandi_prices')
    .select('market,modal_price,min_price,max_price,arrivals_tonnes,price_date,is_sagar_district')
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
