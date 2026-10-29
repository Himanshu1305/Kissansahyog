// Batch 16D - pure logic for the daily mandi feed (scripts/refresh-data.mjs). No network, no environment, no database.
// Primary source: data.gov.in resource 35985678 (variety-wise daily prices; the one Batch 10E proved has Sagar-division rows).
// Row mapping, one-per-key pick and outlier split are the Batch 10E helpers, reused unchanged.

import { SOURCE_COMMODITY, STATE, API_BASE, mapSourceRow, pickOnePerKey, splitOutliers, addDays, maskKey } from './mandi-backfill.mjs'

export const PRIMARY_NAME = '35985678 (variety-wise daily prices)'
export const SECONDARY_NAME = '9ef84268 (daily snapshot)'
export const WRAPPER_NAME = 'wrapper (fallback)'
export const PAGE = 1000
export const DEFAULT_DAYS = 7
export const MAX_DAYS = 30
// Rows for the last RECENT_DAYS days may be corrected by the government, so they are upserted; older ones are insert-if-absent.
export const RECENT_DAYS = 2

// --days N on the command line wins, then the MANDI_DAYS env value, then 7. Clamped to 1..30; junk falls back to 7.
export function parseDays(argv = [], env = {}) {
  const i = argv.indexOf('--days')
  const raw = i > -1 ? argv[i + 1] : env.MANDI_DAYS
  if (raw === undefined || raw === null || String(raw).trim() === '') return DEFAULT_DAYS
  const n = Number(String(raw).trim())
  if (!Number.isInteger(n) || n < 1) return DEFAULT_DAYS
  return Math.min(n, MAX_DAYS)
}

export const windowForDays = (today, days) => ({ from: addDays(today, -(days - 1)), until: today })

// crops: [{ commodity_en, commodity_hi }] -> [{ commodity_en, commodity_hi, source }]. No exact source name = error, never a guess.
export function cropsWithSource(commodities) {
  return commodities.map((c) => {
    const source = SOURCE_COMMODITY[c.commodity_en]
    if (!source) throw new Error(`no exact source commodity name for ${c.commodity_en}`)
    return { ...c, source }
  })
}

// One request per (crop, district): the shape Batch 10E proved. Newest first, so paging can stop at the window edge.
export function buildRequestPlan(crops, districts) {
  const plan = []
  for (const crop of crops) {
    for (const district of districts) {
      plan.push({ crop: crop.commodity_en, district, params: { 'filters[State]': STATE, 'filters[District]': district, 'filters[Commodity]': crop.source, 'sort[Arrival_Date]': 'desc', limit: PAGE } })
    }
  }
  return plan
}

// The URL of one page, key included. Callers must never log it unmasked; use maskKey().
export function requestUrl(params, key, offset = 0) {
  const url = new URL(API_BASE)
  url.searchParams.set('api-key', key)
  url.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  if (offset) url.searchParams.set('offset', String(offset))
  return url
}

// Whether another page is needed: the page was full and its oldest row is not yet before the window start.
export function needsNextPage(records, from) {
  if (records.length < PAGE) return false
  let oldest = null
  for (const r of records) {
    const d = String(r.Arrival_Date || '').split(/[/-]/).reverse().join('-')
    if (!oldest || d < oldest) oldest = d
  }
  return !(oldest && oldest < from)
}

// Raw primary records ([{ _crop, ...sourceRow }]) -> rows ready for mandi_prices, plus what was rejected.
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

// Tries each source in order and stops at the first that gives rows. A source that throws is recorded, not fatal.
// sources: [{ name, get: async () => rows[] }]
export async function firstWithRows(sources) {
  const errors = []
  for (const s of sources) {
    try {
      const rows = await s.get()
      if (rows && rows.length) return { source: s.name, rows, errors }
      errors.push({ source: s.name, error: 'no rows' })
    } catch (e) { errors.push({ source: s.name, error: describeError(e) }) }
  }
  return { source: null, rows: [], errors }
}

// Write policy (Batch 16D): rows from the last RECENT_DAYS days are upserted (the government may correct them);
// older rows are insert-if-absent so a stored price is never overwritten.
export function splitWritePolicy(rows, today, recentDays = RECENT_DAYS) {
  const cutoff = addDays(today, -recentDays)
  const upsert = [], insertIfAbsent = []
  for (const r of rows) (r.price_date >= cutoff ? upsert : insertIfAbsent).push(r)
  return { upsert, insertIfAbsent, cutoff }
}

// A network error as one safe line: name, message, the underlying cause code (fetch hides it in e.cause), HTTP status.
// The key is masked in the URL form and removed if it appears literally.
export function describeError(e, secrets = []) {
  let parts = []
  if (e?.name) parts.push(e.name)
  if (e?.message) parts.push(e.message)
  const c = e?.cause
  if (c) parts.push(`cause=${c.code || c.name || ''}${c.message && c.message !== e?.message ? ` ${c.message}` : ''}`.trim())
  if (e?.status) parts.push(`status=${e.status}`)
  let out = maskKey(parts.join(' | '))
  for (const s of secrets) if (s && String(s).length >= 6) out = out.split(String(s)).join('***')
  return out
}

// How to read the run in the job summary: a quiet run is normal, a missing or old feed is red.
export function lagNote(newest, today, daysBetween, maxStale = 3) {
  if (!newest) return 'RED: no price rows came from any source.'
  const lag = daysBetween(newest, today)
  if (lag > maxStale) return `RED: the newest price is ${lag} days old (limit ${maxStale}).`
  if (lag === 0) return 'Normal: newest prices are from today.'
  return `Normal: the government feed publishes once a day with a lag; newest prices are ${lag} day(s) old. Running again with nothing new is expected.`
}

// ---------- Batch 16E: stop the job stalling when data.gov.in cannot be reached ----------
// The government server refuses connections from foreign cloud addresses (GitHub runners). Failing fast keeps weather
// and the watchdog check alive; prices then come from the Edge Function in India.
export const CONNECT_ERROR_CODES = new Set(['ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT', 'ENETUNREACH', 'ENOTFOUND', 'EAI_AGAIN'])
export const UNREACHABLE_AFTER = 3          // this many primary requests failing at connect level, none succeeding
export const MAX_RETRIES = 2                // per request
export const MANDI_PHASE_CAP_MS = 4 * 60 * 1000
export const UNREACHABLE_LINE = 'data.gov.in unreachable from this machine (expected on GitHub; prices come from the Edge Function)'

export function isConnectError(e) {
  const c = e?.cause || e
  if (!c) return false
  if (CONNECT_ERROR_CODES.has(c.code) || CONNECT_ERROR_CODES.has(e?.code)) return true
  return Array.isArray(c.errors) && c.errors.length > 0 && c.errors.every(isConnectError)
}

export class GovApiStopped extends Error {
  constructor(reason) { super(reason); this.name = 'GovApiStopped'; this.reason = reason }
}

// One shared client for every request to api.data.gov.in. fetchFn/sleep/now are injected so tests run on a fake clock.
export function createGovClient({ fetchFn, sleep, now = Date.now, key, spacingMs = 1500, capMs = MANDI_PHASE_CAP_MS, maxRetries = MAX_RETRIES, timeoutMs = 60000, onLog = () => {} }) {
  const startedAt = now()
  const st = { requests: 0, failed: 0, connectFailed: 0, succeeded: 0, unreachable: false, deadlineHit: false }
  const assertUsable = () => {
    if (st.unreachable) throw new GovApiStopped('unreachable')
    if (now() - startedAt >= capMs) {
      if (!st.deadlineHit) { st.deadlineHit = true; onLog(`mandi phase reached its ${Math.round(capMs / 60000)} minute cap; stopping and keeping what was collected`) }
      throw new GovApiStopped('deadline')
    }
  }
  const noteFailure = (e) => {
    if (isConnectError(e) && !st.succeeded && ++st.connectFailed >= UNREACHABLE_AFTER && !st.unreachable) {
      st.unreachable = true; onLog(UNREACHABLE_LINE)
    }
  }
  // Returns records, or throws (GovApiStopped when the client has given up on the host).
  async function getPage(params, offset = 0) {
    assertUsable()
    let lastErr
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt) { await sleep(2000 * 2 ** (attempt - 1)); assertUsable() }
      let res
      try { res = await fetchFn(requestUrl(params, key, offset), { signal: AbortSignal.timeout(timeoutMs) }) } catch (e) { lastErr = e; if (isConnectError(e)) break; continue }
      if (res.status >= 500 || res.status === 429) { lastErr = new Error(`HTTP ${res.status}`); continue }
      const body = await res.text()
      if (!res.ok) { st.failed++; throw new Error(`HTTP ${res.status}: ${maskKey(body.slice(0, 160))}`) }
      let j
      try { j = JSON.parse(body) } catch { lastErr = new Error('non-JSON body'); continue }
      if (!Array.isArray(j.records)) { lastErr = new Error('no records array'); continue }
      st.succeeded++
      return j.records
    }
    st.failed++
    noteFailure(lastErr)
    throw new Error(`gave up: ${describeError(lastErr, [key])}`)
  }
  // Any other call to the same host (the 9ef84268 fallback) goes through these two.
  return { st, getPage, assertUsable, noteFailure, spacingMs, sleep }
}

// All pages of one crop across the division districts. A GovApiStopped ends the whole loop; other errors skip the district.
export async function fetchPrimaryForCrop(client, crop, districts, from, onError = () => {}) {
  const raw = []
  for (const step of buildRequestPlan([crop], districts)) {
    let offset = 0
    try {
      for (let pages = 0; pages < 40; pages++) {
        client.assertUsable()
        if (client.st.requests++) await client.sleep(client.spacingMs)
        const recs = await client.getPage(step.params, offset)
        for (const r of recs) raw.push({ _crop: crop.commodity_en, ...r })
        if (!needsNextPage(recs, from)) break
        offset += PAGE
      }
    } catch (e) {
      if (e instanceof GovApiStopped) return raw
      onError(crop.commodity_en, step.district, e)
    }
  }
  return raw
}

// The GitHub job (Batch 16E patch). It never fetches or writes prices. Order: weather first, then (production only) the
// read-only freshness check. Steps are injected: weather() -> void, freshness() -> { red, text }.
// Exit code 1 when weather crashes, or (production) the newest stored price is older than 3 days / missing / unreadable.
export async function runWatchdogJob({ target, dryRun = false, weather, freshness, log = () => {} }) {
  const order = []
  let code = 0, fresh = null
  if (dryRun) return { order, code, freshness: null }
  order.push('weather')
  try { await weather() } catch (e) { code = 1; log(`weather refresh failed: ${describeError(e)}`) }
  if (target === 'production') {
    order.push('freshness')
    try { fresh = await freshness() } catch (e) { fresh = { red: true, text: `newest stored price: unknown (RED: freshness check failed: ${describeError(e)})` }; log(fresh.text) }
    if (fresh.red) code = 1
  }
  return { order, code, freshness: fresh }
}

// Read-only watchdog: the newest stored Sagar-division price, from the database, no data.gov.in needed.
export function freshnessCheck(newest, today, daysBetween, maxStale = 3) {
  if (!newest) return { red: true, text: 'newest stored price: none (RED: no division price rows are stored)' }
  const n = daysBetween(newest, today)
  const red = n > maxStale
  return { red, text: `newest stored price: ${newest} (${n} days old)${red ? ` - RED: older than ${maxStale} days` : ''}` }
}
