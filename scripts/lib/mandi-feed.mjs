// Pure logic for scripts/refresh-data.mjs (Batch 16C) so it can be unit-tested without network or database.
// Rule: a row's price_date is the feed record's OWN arrival date, never the day the script ran.

export const MAX_AGE_DAYS = 7      // records older than this are skipped
export const MAX_STALE_DAYS = 3    // the run fails if the newest row written is older than this
export const PROD_REF = 'eltmcznjcqiahqhjvpjg'
export const STAGING_REF = 'wzxtqbqlahyahsnoqqva'

export const DIVISION_ALIASES = { sagar: 'sagar', saugor: 'sagar', damoh: 'damoh', panna: 'panna', tikamgarh: 'tikamgarh', chhatarpur: 'chhatarpur', chatarpur: 'chhatarpur', chattarpur: 'chhatarpur', niwari: 'niwari' }
export const divisionDistrict = (name) => DIVISION_ALIASES[String(name || '').trim().toLowerCase()] || null

const isIso = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}
// The calendar date in India (the feed's and the site's calendar), not UTC.
export const todayIST = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
export const daysBetween = (fromIso, toIso) => Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000)

// dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, or an ISO datetime -> yyyy-mm-dd; null when not a real calendar date.
export function parseFeedDate(v) {
  const s = String(v ?? '').trim()
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) { const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return isIso(iso) ? iso : null }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/)
  if (m) { const iso = `${m[1]}-${m[2]}-${m[3]}`; return isIso(iso) ? iso : null }
  return null
}
export const recordDate = (r) => parseFeedDate(r.arrival_date ?? r.Arrival_Date ?? r.date ?? r.price_date)

// Splits records into usable ones (with their ISO date) and counts of what was skipped.
export function filterFresh(records, today, maxAge = MAX_AGE_DAYS) {
  const fresh = []; let undated = 0, stale = 0, future = 0
  for (const r of records) {
    const date = recordDate(r)
    if (!date) { undated++; continue }
    if (date > today) { future++; continue }
    if (daysBetween(date, today) > maxAge) { stale++; continue }
    fresh.push({ ...r, __date: date })
  }
  return { fresh, undated, stale, future }
}

// Which records to write for one commodity (all already dated and fresh):
//   - every Sagar Division mandi that reports it (its newest record per market) -> in_sagar_division = true;
//   - none in the division -> the single best MP record (market priority, then newest), flags false.
export function pickRecords(records, marketPriority = ['Khurai', 'Sagar', 'Rehli', 'Banda', 'Deori']) {
  const mk = (r) => String(r.market || r.Market || '').toLowerCase()
  const newestFirst = [...records].sort((a, b) => (a.__date < b.__date ? 1 : a.__date > b.__date ? -1 : 0))
  const division = newestFirst.filter((r) => divisionDistrict(r.district || r.District))
  if (division.length) {
    const seen = new Set()
    return division
      .filter((r) => { const m = mk(r); return m && !seen.has(m) && seen.add(m) })
      .map((r) => ({ record: r, inDivision: true, isSagar: divisionDistrict(r.district || r.District) === 'sagar' }))
  }
  for (const m of marketPriority) {
    const hit = newestFirst.find((r) => mk(r) === m.toLowerCase())
    if (hit) return [{ record: hit, inDivision: false, isSagar: false }]
  }
  return newestFirst.length ? [{ record: newestFirst[0], inDivision: false, isSagar: false }] : []
}

export function normalizeRecord(raw) {
  return {
    market: raw.market || raw.Market || 'Unknown', district: raw.district || raw.District || 'Unknown',
    min_price: parseFloat(raw.min_price || raw.Min_Price || 0) || null,
    max_price: parseFloat(raw.max_price || raw.Max_Price || 0) || null,
    modal_price: parseFloat(raw.modal_price || raw.Modal_Price || 0),
    arrivals: parseFloat(raw.arrivals || raw.Arrivals || raw.arrival_tonnes || 0) || null,
  }
}

export function buildRows(api, hi, picks, fetchedAt = new Date().toISOString()) {
  const rows = []
  for (const p of picks) {
    const n = normalizeRecord(p.record); if (!n.modal_price) continue
    rows.push({ commodity_en: api, commodity_hi: hi, market: n.market, district: n.district, state: 'Madhya Pradesh', min_price: n.min_price, max_price: n.max_price, modal_price: n.modal_price, arrivals_tonnes: n.arrivals, price_date: p.record.__date, is_sagar_district: p.isSagar, in_sagar_division: p.inDivision, fetched_at: fetchedAt })
  }
  return rows
}

// Project-ref guard: the URL must contain the expected ref. Dry runs ignore it.
export function checkProjectRef(url, expectedRef, dryRun = false) {
  if (dryRun || !expectedRef) return { ok: true }
  if (!url) return { ok: false, message: `VITE_SUPABASE_URL is empty; expected a URL containing project ref ${expectedRef}. The secret for this target is missing.` }
  if (!String(url).includes(expectedRef)) return { ok: false, message: `Refusing to run: VITE_SUPABASE_URL does not contain the expected project ref ${expectedRef}. A staging secret may be in the production slot, or the reverse.` }
  return { ok: true }
}

// Exit-code rules. Fails when the ref guard failed, zero rows were written, or the newest row written is too old.
export function decideExit({ refOk = true, totalRows, newestDate, today, maxStale = MAX_STALE_DAYS }) {
  const reasons = []
  if (!refOk) reasons.push('project-ref guard failed')
  if (!totalRows) reasons.push('zero mandi rows were written')
  else if (!newestDate || daysBetween(newestDate, today) > maxStale) reasons.push(`newest price_date written (${newestDate || 'none'}) is more than ${maxStale} days old`)
  return { code: reasons.length ? 1 : 0, reasons }
}

export function summarize({ perCommodity, today, source, target }) {
  const rows = perCommodity.reduce((a, c) => a + c.rows, 0)
  const division = perCommodity.reduce((a, c) => a + c.division, 0)
  const dates = perCommodity.map((c) => c.newest).filter(Boolean).sort()
  const newest = dates.length ? dates[dates.length - 1] : null
  const lines = [`### Mandi refresh${target ? ` (${target})` : ''}`, `- today (IST): ${today}`, `- source used: ${source}`, `- rows written: ${rows} (Sagar-division rows: ${division})`, `- newest price_date: ${newest || 'none'}`]
  for (const c of perCommodity) lines.push(`- ${c.api}: ${c.rows} row(s), newest ${c.newest || '-'}${c.skipped ? `, skipped ${c.skipped}` : ''}`)
  return { rows, division, newest, text: lines.join('\n') }
}

// Removes every given secret from a log line.
export function redact(text, secrets) {
  let out = String(text)
  for (const s of secrets) if (s && String(s).length >= 6) out = out.split(String(s)).join('***')
  return out
}
