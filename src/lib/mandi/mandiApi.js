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

// Returns { rows, day: 'today' | 'yesterday' | 'none' }.
export async function fetchMandiPrices() {
  const today = await pricesFor(isoDay(0))
  if (today && today.length) return { rows: today, day: 'today' }
  const yesterday = await pricesFor(isoDay(-1))
  if (yesterday && yesterday.length) return { rows: yesterday, day: 'yesterday' }
  return { rows: [], day: 'none' }
}
