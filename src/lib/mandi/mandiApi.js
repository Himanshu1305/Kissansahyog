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
