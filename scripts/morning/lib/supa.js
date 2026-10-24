// Read-only access to Supabase through PostgREST with the PUBLIC anon key. SELECT only; the only other calls are the
// two morning_post_* functions (Part B), which also use the anon key plus the shared secret. Keys are never printed.
import { addDays } from './ist.js'

const PAGE = 1000

function headers(key) { return { apikey: key, Authorization: `Bearer ${key}` } }

async function getPage(url, key, fetchImpl, path, from) {
  const r = await fetchImpl(`${url}/rest/v1/${path}`, { headers: { ...headers(key), Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' } })
  const text = await r.text()
  let body = null
  try { body = JSON.parse(text) } catch { /* not json */ }
  return { ok: r.ok || r.status === 206, status: r.status, body }
}

// Sagar-division rows of the last ~35 days up to `endDate`. -> { rows, flag } ; throws on a hard failure.
export async function fetchMandiRows({ url, key, fetchImpl = fetch, endDate }) {
  const from = addDays(endDate, -35)
  for (const flag of ['in_sagar_division', 'is_sagar_district']) { // same fallback as the site (src/lib/mandi/mandiApi.js)
    const rows = []
    let failed = null
    for (let off = 0; off < 10 * PAGE; off += PAGE) {
      const q = `mandi_prices?select=commodity_en,market,district,modal_price,price_date&${flag}=eq.true&price_date=gte.${from}&price_date=lte.${endDate}&order=price_date.desc,market.asc,commodity_en.asc`
      const p = await getPage(url, key, fetchImpl, q, off)
      if (!p.ok || !Array.isArray(p.body)) { failed = p; break }
      rows.push(...p.body)
      if (p.body.length < PAGE) break
    }
    if (!failed) return { rows, flag }
    if (flag === 'in_sagar_division' && /in_sagar_division/.test(JSON.stringify(failed.body || ''))) continue
    throw new Error(`mandi read failed (http ${failed.status})`)
  }
  throw new Error('mandi read failed')
}

export async function rpc({ url, key, fetchImpl = fetch, name, args }) {
  const r = await fetchImpl(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { ...headers(key), 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  const text = await r.text()
  let body = null
  try { body = JSON.parse(text) } catch { /* not json */ }
  return { status: r.status, body }
}
