// scripts/backfill-mandi-history.mjs
// Pulls the tracked commodities for Madhya Pradesh from the data.gov.in Agmarknet
// resource and upserts them into mandi_prices. Runs from a GitHub runner (official
// API not blocked there). REQUIRES a real DATA_GOV_IN_API_KEY.
//
// IMPORTANT (confirmed 2026-09-25): resource 9ef84268-… is the "Current Daily Price"
// resource — a DAILY SNAPSHOT (today's rows only), not a historical archive, and its
// filter fields are lowercase (filters[state], not filters[State]) with a fuzzy text
// match that also returns other "*Pradesh" states. So this script captures the CURRENT
// day's MP-wide prices across every reporting mandi (a wider net than the Sagar-only
// 3-hourly refresh) — it cannot reconstruct multi-year history from this source. Real
// multi-year history needs a different Agmarknet dataset (backlog).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_KEY = process.env.DATA_GOV_IN_API_KEY

if (!API_KEY) {
  console.error('\nERROR: DATA_GOV_IN_API_KEY is not set.')
  console.error('Register free at https://data.gov.in (Register → My Account → API key),')
  console.error('add it as the repository secret DATA_GOV_IN_API_KEY, then re-run this workflow.')
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
// Agmarknet commodity names differ from our short names → match by token, not exact name.
const OFFICIAL_TOKENS = {
  Wheat: ['wheat'], Soyabean: ['soyabean', 'soybean', 'soya bean'], Gram: ['gram'],
  Lentil: ['lentil', 'masur'], Moong: ['moong', 'green gram'], Urad: ['urad', 'black gram'],
  'Paddy(Dhan)(Common)': ['paddy', 'dhan'], Maize: ['maize'], Mustard: ['mustard', 'sarson'],
  Garlic: ['garlic'],
}
function matchCommodity(name, api) {
  const n = String(name || '').toLowerCase()
  if (api === 'Gram') return n.includes('gram') && !n.includes('green') && !n.includes('black')
  return (OFFICIAL_TOKENS[api] || [api.toLowerCase()]).some((tok) => n.includes(tok))
}
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }
const parseDate = (s) => { const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null }
const stateOf = (r) => (r.state || r.State || '').toLowerCase()

// Fetch all MP rows for the current snapshot (lowercase filter; narrow client-side).
async function fetchMpPool() {
  const all = []
  let offset = 0
  const limit = 1000
  for (;;) {
    const url = `https://api.data.gov.in/resource/${RESOURCE}?api-key=${API_KEY}&format=json&filters[state]=Madhya Pradesh&limit=${limit}&offset=${offset}`
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) { console.error(`MP pool HTTP ${res.status} at offset ${offset}`); break }
    const recs = (await res.json()).records || []
    if (!recs.length) break
    all.push(...recs.filter((r) => stateOf(r).includes('madhya')))
    offset += limit
    if (recs.length < limit) break
    if (offset > 200000) break
  }
  return all
}

async function main() {
  console.log('Pulling current MP Agmarknet snapshot for the tracked commodities…')
  const pool = await fetchMpPool()
  console.log(`MP pool: ${pool.length} rows`)
  const summary = []
  for (const c of COMMODITIES) {
    const recs = pool.filter((r) => matchCommodity(r.commodity || r.Commodity, c.api))
    const rows = []
    let earliest = null
    for (const r of recs) {
      const date = parseDate(r.arrival_date || r.Arrival_Date) || new Date().toISOString().slice(0, 10)
      const modal = num(r.modal_price || r.Modal_Price)
      if (!modal) continue
      const district = r.district || r.District || 'Unknown'
      if (!earliest || date < earliest) earliest = date
      rows.push({
        commodity_en: c.api, commodity_hi: c.hi, market: r.market || r.Market || 'Unknown',
        district, state: 'Madhya Pradesh',
        min_price: num(r.min_price || r.Min_Price), max_price: num(r.max_price || r.Max_Price),
        modal_price: modal, arrivals_tonnes: num(r.arrivals || r.Arrivals), price_date: date,
        is_sagar_district: district.toLowerCase() === 'sagar', fetched_at: new Date().toISOString(),
      })
    }
    let written = 0
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error } = await supabase.from('mandi_prices').upsert(chunk, { onConflict: 'commodity_en,market,price_date' })
      if (error) { console.error(`upsert ${c.api}: ${error.message}`); break }
      written += chunk.length
    }
    console.log(`${c.hi} (${c.api}): ${written} rows (earliest ${earliest || 'n/a'})`)
    summary.push({ commodity: c.api, rows: written, earliest })
  }
  console.log('\n=== Snapshot summary ===')
  for (const s of summary) console.log(`${s.commodity}: ${s.rows} rows (earliest ${s.earliest || 'n/a'})`)
}
main().catch((e) => { console.error(e); process.exit(1) })
