// scripts/backfill-mandi-history.mjs
// Backfills up to 3 years of Agmarknet mandi records for MP / Sagar district for the
// 10 tracked commodities into mandi_prices. Runs from a GitHub runner (official API
// not blocked there). REQUIRES a real DATA_GOV_IN_API_KEY (the public demo key only
// returns ~10 rows/request). Fails fast with a clear message if the secret is absent.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.DATA_GOV_IN_API_KEY

if (!API_KEY) {
  console.error('\nERROR: DATA_GOV_IN_API_KEY is not set.')
  console.error('The public demo key returns only ~10 records/request, so a multi-year backfill is impossible.')
  console.error('Fix: register free at https://data.gov.in (Register → My Account → API key),')
  console.error('add it as the repository secret DATA_GOV_IN_API_KEY, then re-run the "Backfill mandi history" workflow.')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('Missing Supabase env'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070'
const COMMODITIES = [
  { api: 'Wheat', hi: 'गेहूं' }, { api: 'Soyabean', hi: 'सोयाबीन' }, { api: 'Gram', hi: 'चना' },
  { api: 'Lentil', hi: 'मसूर' }, { api: 'Moong', hi: 'मूंग' }, { api: 'Urad', hi: 'उड़द' },
  { api: 'Paddy(Dhan)(Common)', hi: 'धान' }, { api: 'Maize', hi: 'मक्का' },
  { api: 'Mustard', hi: 'सरसों' }, { api: 'Garlic', hi: 'लहसुन' },
]
const THREE_YEARS_AGO = new Date(Date.now() - 3 * 365 * 86400000)

// Agmarknet arrival dates are DD/MM/YYYY.
function parseDate(s) {
  const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }

async function backfillCommodity(c) {
  let offset = 0, limit = 1000, total = 0, earliest = null
  const rows = []
  for (;;) {
    const url = `https://api.data.gov.in/resource/${RESOURCE}?api-key=${API_KEY}&format=json&filters[State]=Madhya Pradesh&filters[District]=Sagar&filters[Commodity]=${encodeURIComponent(c.api)}&limit=${limit}&offset=${offset}`
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) { console.error(`${c.api} HTTP ${res.status} at offset ${offset}`); break }
    const data = await res.json()
    const recs = data.records || []
    if (!recs.length) break
    for (const r of recs) {
      const date = parseDate(r.arrival_date || r.Arrival_Date)
      const modal = num(r.modal_price || r.Modal_Price)
      if (!date || !modal) continue
      if (new Date(date) < THREE_YEARS_AGO) continue
      if (!earliest || date < earliest) earliest = date
      rows.push({
        commodity_en: c.api, commodity_hi: c.hi, market: r.market || r.Market || 'Unknown',
        district: r.district || r.District || 'Sagar', state: 'Madhya Pradesh',
        min_price: num(r.min_price || r.Min_Price), max_price: num(r.max_price || r.Max_Price),
        modal_price: modal, arrivals_tonnes: num(r.arrivals || r.Arrivals), price_date: date,
        is_sagar_district: true, fetched_at: new Date().toISOString(),
      })
    }
    offset += limit
    if (recs.length < limit) break
    if (offset > 100000) break // safety
  }
  // upsert in chunks
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { error } = await supabase.from('mandi_prices').upsert(chunk, { onConflict: 'commodity_en,market,price_date' })
    if (error) { console.error(`upsert ${c.api}: ${error.message}`); break }
    total += chunk.length
  }
  console.log(`${c.hi} (${c.api}): ${total} rows, earliest ${earliest || 'n/a'}`)
  return { commodity: c.api, rows: total, earliest }
}

async function main() {
  console.log('Backfilling 3 years of Agmarknet history for MP/Sagar…')
  const summary = []
  for (const c of COMMODITIES) { try { summary.push(await backfillCommodity(c)) } catch (e) { console.error(`${c.api} failed: ${e.message}`) } }
  console.log('\n=== Backfill summary ===')
  for (const s of summary) console.log(`${s.commodity}: ${s.rows} rows (earliest ${s.earliest || 'n/a'})`)
}
main().catch((e) => { console.error(e); process.exit(1) })
