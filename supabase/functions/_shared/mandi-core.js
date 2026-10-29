// Batch 16E - Deno-compatible COPY of the pure mandi logic used by the Edge Function (supabase/functions/mandi-refresh).
// The Node originals are scripts/lib/mandi-backfill.mjs and scripts/lib/mandi-daily.mjs. tests/unit/mandi-edge-parity-16e.test.mjs
// loads both and asserts identical output on a fixed fixture, so the two cannot drift. Pure: no network, no environment, no database.

export const RESOURCE_ID = '35985678-0d79-46b4-9ed6-6f13308a1d24'
export const API_BASE = `https://api.data.gov.in/resource/${RESOURCE_ID}`
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

export const maskKey = (s) => String(s).replace(/(api-key=)[^&\s"]+/gi, '$1<masked>')

export const PAGE = 1000
export const DEFAULT_DAYS = 7
export const MAX_DAYS = 30
export const RECENT_DAYS = 2

export const windowForDays = (today, days) => ({ from: addDays(today, -(days - 1)), until: today })

export function buildRequestPlan(crops, districts) {
  const plan = []
  for (const crop of crops) {
    for (const district of districts) {
      plan.push({ crop: crop.commodity_en, district, params: { 'filters[State]': STATE, 'filters[District]': district, 'filters[Commodity]': crop.source, 'sort[Arrival_Date]': 'desc', limit: PAGE } })
    }
  }
  return plan
}

export function needsNextPage(records, from) {
  if (records.length < PAGE) return false
  let oldest = null
  for (const r of records) {
    const d = String(r.Arrival_Date || '').split(/[/-]/).reverse().join('-')
    if (!oldest || d < oldest) oldest = d
  }
  return !(oldest && oldest < from)
}

export function splitWritePolicy(rows, today, recentDays = RECENT_DAYS) {
  const cutoff = addDays(today, -recentDays)
  const upsert = [], insertIfAbsent = []
  for (const r of rows) (r.price_date >= cutoff ? upsert : insertIfAbsent).push(r)
  return { upsert, insertIfAbsent, cutoff }
}

export function mapPrimaryRecords(records, crops, { districts, today, days = DEFAULT_DAYS, fetchedAt }) {
  const { from, until } = windowForDays(today, days)
  const byCrop = new Map(crops.map((c) => [c.commodity_en, c]))
  const ctx = { districts, from, until, today, fetchedAt }
  const rejects = {}
  const candidates = []
  for (const raw of records) {
    const crop = byCrop.get(raw._crop)
    if (!crop) { rejects.unknown_crop = (rejects.unknown_crop || 0) + 1; continue }
    const m = mapSourceRow(raw, crop, ctx)
    if (m.ok) candidates.push(m)
    else rejects[m.reason] = (rejects[m.reason] || 0) + 1
  }
  const { picked, duplicateKeys, droppedRows } = pickOnePerKey(candidates)
  const { kept, outliers } = splitOutliers(picked)
  return { rows: kept, outliers, rejects, duplicateKeys, droppedRows }
}

// The ten crops (src/content/crops.js mandi_en / hi), in the order the scheduler splits them: batch a = first five, batch b = last five.
export const CROP_LIST = [
  { commodity_en: 'Wheat', commodity_hi: 'गेहूं' },
  { commodity_en: 'Soyabean', commodity_hi: 'सोयाबीन' },
  { commodity_en: 'Gram', commodity_hi: 'चना' },
  { commodity_en: 'Lentil', commodity_hi: 'मसूर' },
  { commodity_en: 'Moong', commodity_hi: 'मूंग' },
  { commodity_en: 'Urad', commodity_hi: 'उड़द' },
  { commodity_en: 'Paddy(Dhan)(Common)', commodity_hi: 'धान' },
  { commodity_en: 'Maize', commodity_hi: 'मक्का' },
  { commodity_en: 'Mustard', commodity_hi: 'सरसों' },
  { commodity_en: 'Garlic', commodity_hi: 'लहसुन' },
]
export const DIVISION_DISTRICTS = ['Sagar', 'Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari']

// Request body -> { crops: [{commodity_en, commodity_hi, source}], days } or { error }. Unknown crop names are refused, never guessed.
export function parseRequest(body) {
  const b = body && typeof body === 'object' ? body : {}
  let days = DEFAULT_DAYS
  if (b.days !== undefined) {
    const n = Number(b.days)
    if (!Number.isInteger(n) || n < 1 || n > MAX_DAYS) return { error: `days must be a whole number 1..${MAX_DAYS}` }
    days = n
  }
  let list = CROP_LIST
  if (b.crops !== undefined) {
    if (!Array.isArray(b.crops) || !b.crops.length) return { error: 'crops must be a non-empty list' }
    const picked = []
    for (const name of b.crops) {
      const c = CROP_LIST.find((x) => x.commodity_en === name)
      if (!c) return { error: `unknown crop: ${String(name).slice(0, 40)}` }
      if (!picked.includes(c)) picked.push(c)
    }
    list = picked
  }
  return { crops: list.map((c) => ({ ...c, source: SOURCE_COMMODITY[c.commodity_en] })), days }
}
