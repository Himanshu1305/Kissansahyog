// Batch 10E (Phase 2B) — pure helpers for scripts/backfill-mandi-history.mjs.
// No network, no database, no environment: everything here is unit-tested in
// tests/unit/mandi-backfill.test.mjs.
//
// Source: data.gov.in resource 35985678-0d79-46b4-9ed6-6f13308a1d24 "Variety-wise Daily Market
// Prices Data of Commodity" (DMI / Agmarknet), Government Open Data License – India.
// Source fields: Arrival_Date (dd/MM/yyyy), State, District, Market, Commodity, Commodity_Code,
// Variety, Grade, Min_Price, Max_Price, Modal_Price. There is no arrivals field.

export const RESOURCE_ID = '35985678-0d79-46b4-9ed6-6f13308a1d24'
export const RESOURCE_TITLE = 'Variety-wise Daily Market Prices Data of Commodity'
export const RESOURCE_URL = 'https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity'
export const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`
export const LICENCE = 'Government Open Data License – India (GODL)'
export const ATTRIBUTION = 'Source: Agmarknet, Directorate of Marketing & Inspection, Ministry of Agriculture & Farmers Welfare, '
  + `via data.gov.in (${LICENCE}), ${RESOURCE_URL}`
export const STATE = 'Madhya Pradesh'

// EXACT map: our mandi_prices.commodity_en (= CROPS[].mandi_en in src/content/crops.js) → the
// source's Commodity name. Used as an exact `filters[Commodity]=` value AND re-checked on every
// returned row. Never token/fuzzy matching (token matching turned Arhar into Gram, see 2A).
export const SOURCE_COMMODITY = Object.freeze({
  Wheat: 'Wheat',
  Soyabean: 'Soyabean',
  Gram: 'Bengal Gram(Gram)(Whole)',
  Lentil: 'Lentil(Masur)(Whole)',
  Moong: 'Green Gram(Moong)(Whole)',
  Urad: 'Black Gram(Urd Beans)(Whole)',
  'Paddy(Dhan)(Common)': 'Paddy(Common)',
  Maize: 'Maize',
  Mustard: 'Mustard',
  Garlic: 'Garlic',
})

// CROPS (src/content/crops.js) → [{ commodity_en, commodity_hi, source }]. A crop with no exact
// source name is an error, never a guess.
export function cropsToBackfill(crops) {
  return crops.map((c) => {
    const source = SOURCE_COMMODITY[c.mandi_en]
    if (!source) throw new Error(`no exact source commodity name for ${c.mandi_en}`)
    return { commodity_en: c.mandi_en, commodity_hi: c.hi, source }
  })
}

// The DIVISION_DISTRICTS list from src/lib/location/places.js, read as text (that module imports
// the browser Supabase client, so it cannot be imported in Node).
export function parseDivisionDistricts(placesSource) {
  const block = placesSource.match(/export const DIVISION_DISTRICTS = \[([\s\S]*?)\]/)
  if (!block) throw new Error('DIVISION_DISTRICTS not found in places.js')
  const names = [...block[1].matchAll(/en:\s*'([^']+)'/g)].map((m) => m[1])
  if (!names.length) throw new Error('DIVISION_DISTRICTS is empty')
  return names
}

// ---------- dates ----------
const ISO = /^\d{4}-\d{2}-\d{2}$/
export const isIsoDate = (s) => {
  if (!ISO.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}
export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}
// Today's date in India (the source's and the site's calendar).
export const todayIST = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
// dd/MM/yyyy (also dd-MM-yyyy) → yyyy-MM-dd; null when not a real calendar date.
export function parseArrivalDate(s) {
  const m = String(s ?? '').trim().match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (!m) return null
  const iso = `${m[3]}-${m[2]}-${m[1]}`
  return isIsoDate(iso) ? iso : null
}
// The window [from, until], both inclusive: `days` calendar days ending at `until`.
export function windowFor(until, days) {
  if (!isIsoDate(until)) throw new Error(`bad --until ${until}`)
  if (!Number.isInteger(days) || days < 1 || days > 3660) throw new Error(`bad --days ${days}`)
  return { from: addDays(until, -(days - 1)), until }
}

// ---------- row mapping + validation ----------
const num = (v) => {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return NaN
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : NaN
}
const text = (v) => (v === null || v === undefined ? '' : String(v)).trim()
// Text that is safe to carry into a SQL literal: no control characters, sane length.
const okText = (s) => s.length > 0 && s.length <= 200 && !/[\u0000-\u001f\u007f]/.test(s)

// One source row → { ok: true, row, variety, grade } or { ok: false, reason }.
// `crop` = { commodity_en, commodity_hi, source }; `ctx` = { districts, from, until, today, fetchedAt }.
export function mapSourceRow(raw, crop, ctx) {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'not_an_object' }
  if (text(raw.Commodity) !== crop.source) return { ok: false, reason: 'commodity_mismatch' }
  if (text(raw.State) !== STATE) return { ok: false, reason: 'state_mismatch' }
  const district = text(raw.District)
  if (!ctx.districts.includes(district)) return { ok: false, reason: 'district_not_in_division' }
  const market = text(raw.Market)
  if (!okText(market)) return { ok: false, reason: 'bad_market' }
  const date = parseArrivalDate(raw.Arrival_Date)
  if (!date) return { ok: false, reason: 'bad_date' }
  if (date > ctx.today) return { ok: false, reason: 'future_date' }
  if (date < ctx.from || date > ctx.until) return { ok: false, reason: 'outside_window' }
  const min = num(raw.Min_Price), max = num(raw.Max_Price), modal = num(raw.Modal_Price)
  if (!(min > 0) || !(max > 0) || !(modal > 0)) return { ok: false, reason: 'price_not_positive' }
  if (!(min <= modal && modal <= max)) return { ok: false, reason: 'min_modal_max_order' }
  return {
    ok: true,
    variety: text(raw.Variety),
    grade: text(raw.Grade),
    row: {
      commodity_en: crop.commodity_en,
      commodity_hi: crop.commodity_hi,
      market,
      district,
      state: STATE,
      min_price: min,
      max_price: max,
      modal_price: modal,
      price_date: date,
      is_sagar_district: district === 'Sagar',
      in_sagar_division: true,
      arrivals_tonnes: null,
      fetched_at: ctx.fetchedAt,
    },
  }
}

// ---------- one real row per (commodity_en, market, price_date) ----------
export const rowKey = (r) => `${r.commodity_en}\u0001${r.market}\u0001${r.price_date}`
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
// Deterministic pick, never an average: Grade "FAQ" first; then the lexicographically smallest
// Variety (plain code-unit order); then the lowest modal, min, max price (only for rows identical
// in grade and variety, e.g. two "Mill Quality" FAQ rows on the same day).
export function compareCandidates(a, b) {
  const fa = a.grade === 'FAQ' ? 0 : 1, fb = b.grade === 'FAQ' ? 0 : 1
  return (fa - fb) || cmp(a.variety, b.variety) || (a.row.modal_price - b.row.modal_price)
    || (a.row.min_price - b.row.min_price) || (a.row.max_price - b.row.max_price)
}
// candidates: [{ row, variety, grade }] → { picked: [row], duplicateKeys, droppedRows, examples }
export function pickOnePerKey(candidates) {
  const groups = new Map()
  for (const c of candidates) { const k = rowKey(c.row); (groups.get(k) || groups.set(k, []).get(k)).push(c) }
  const picked = []
  let duplicateKeys = 0, droppedRows = 0
  const examples = []
  for (const list of groups.values()) {
    const sorted = [...list].sort(compareCandidates)
    picked.push(sorted[0].row)
    if (list.length > 1) {
      duplicateKeys++; droppedRows += list.length - 1
      if (examples.length < 12) examples.push({ key: { ...pickKey(sorted[0].row) }, kept: label(sorted[0]), dropped: sorted.slice(1).map(label) })
    }
  }
  return { picked, duplicateKeys, droppedRows, examples }
}
const pickKey = (r) => ({ commodity_en: r.commodity_en, market: r.market, price_date: r.price_date })
const label = (c) => `${c.grade || '-'} / ${c.variety || '-'} / modal ${c.row.modal_price}`

// ---------- outliers ----------
export function median(values) {
  const s = [...values].sort((a, b) => a - b); const m = Math.floor(s.length / 2)
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN
}
// Splits rows into kept / outliers: modal > 5× or < 1/5 of that crop's median modal in the batch.
export function splitOutliers(rows, factor = 5) {
  const byCrop = new Map()
  for (const r of rows) (byCrop.get(r.commodity_en) || byCrop.set(r.commodity_en, []).get(r.commodity_en)).push(r.modal_price)
  const med = new Map([...byCrop].map(([k, v]) => [k, median(v)]))
  const kept = [], outliers = []
  for (const r of rows) {
    const m = med.get(r.commodity_en)
    if (r.modal_price > factor * m || r.modal_price < m / factor) outliers.push({ ...r, crop_median: m })
    else kept.push(r)
  }
  return { kept, outliers, medians: Object.fromEntries(med) }
}

// ---------- SQL ----------
export const TABLE_COLUMNS = ['commodity_en', 'commodity_hi', 'market', 'district', 'state', 'min_price', 'max_price',
  'modal_price', 'price_date', 'is_sagar_district', 'in_sagar_division', 'arrivals_tonnes', 'fetched_at']
export const CONFLICT_TARGET = '(commodity_en, market, price_date)'

// A text value as a standard SQL string literal ('' doubles a quote; backslashes are literal with
// standard_conforming_strings = on, the PostgreSQL default). Control characters are refused.
export function sqlText(v) {
  const s = String(v)
  if (/[\u0000-\u001f\u007f]/.test(s)) throw new Error('control character in SQL text value')
  return `'${s.replace(/'/g, "''")}'`
}
export function sqlNumber(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`not a finite number: ${v}`)
  return String(v)
}
export function sqlDate(v) { if (!isIsoDate(v)) throw new Error(`bad date ${v}`); return `'${v}'::date` }
export function sqlTimestamp(v) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(String(v))) throw new Error(`bad timestamp ${v}`)
  return `'${v}'::timestamptz`
}
export const sqlBool = (v) => { if (typeof v !== 'boolean') throw new Error('not a boolean'); return v ? 'true' : 'false' }

export function valuesTuple(r) {
  return `(${[sqlText(r.commodity_en), sqlText(r.commodity_hi), sqlText(r.market), sqlText(r.district), sqlText(r.state),
    sqlNumber(r.min_price), sqlNumber(r.max_price), sqlNumber(r.modal_price), sqlDate(r.price_date),
    sqlBool(r.is_sagar_district), sqlBool(r.in_sagar_division), sqlNumber(r.arrivals_tonnes), sqlTimestamp(r.fetched_at)].join(', ')})`
}
// The one INSERT statement both targets use (production files and the staging apply).
export function insertStatement(rows) {
  if (!rows.length) throw new Error('no rows')
  return `insert into public.mandi_prices (${TABLE_COLUMNS.join(', ')}) values\n${rows.map(valuesTuple).join(',\n')}\non conflict ${CONFLICT_TARGET} do nothing`
}
// Production file body: one statement wrapped in begin/commit.
export const transactionSql = (rows) => `begin;\n${insertStatement(rows)};\ncommit;\n`
// Staging apply: the same statement, counting the rows actually inserted.
export const countingSql = (rows) => `with ins as (\n${insertStatement(rows)}\nreturning 1\n) select count(*)::int as inserted from ins;`

export const sortForLoad = (rows) => [...rows].sort((a, b) => cmp(a.price_date, b.price_date)
  || cmp(a.commodity_en, b.commodity_en) || cmp(a.district, b.district) || cmp(a.market, b.market))
export function chunk(arr, size) { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out }

// The key from a URL safe to print: api-key value masked.
export const maskKey = (s) => String(s).replace(/(api-key=)[^&\s"]+/gi, '$1<masked>')
