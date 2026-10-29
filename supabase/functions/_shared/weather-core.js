// Batch 16H - pure weather logic shared by the Edge Function weather-refresh (supabase/functions/weather-refresh).
// Ported line by line from scripts/refresh-data.mjs (refreshCell, computeSeasonRain, PILOT, gridKey). No Deno APIs.
// Network and clock are passed in (fetchFn, sleep, now) so the whole thing is unit-tested in Node.
// scripts/refresh-data.mjs is NOT changed (the GitHub job stays as second writer + watchdog).

export const IST_MS = 19800000 // +05:30
export const HOUR_MS = 3600000
export const MAX_LIMIT = 60
export const SEASON_MAX_LIMIT = 6
export const REQUEST_WINDOW_DAYS = 30
export const LEFT_OVER_H = 4

// Pilot cells (always refreshed) - Sagar district towns. Same list as scripts/refresh-data.mjs.
export const PILOT = Object.freeze([
  { lat: 24.045, lon: 78.33 }, { lat: 23.8388, lon: 78.7378 }, { lat: 24.1817, lon: 78.1975 },
  { lat: 23.6372, lon: 79.0628 }, { lat: 23.39, lon: 79.017 }, { lat: 24.04, lon: 78.96 },
  { lat: 23.7833, lon: 78.3667 }, { lat: 24.205, lon: 78.364 },
])

export const gridKey = (lat, lon) => `${(Math.round(lat * 10) / 10).toFixed(1)}_${(Math.round(lon * 10) / 10).toFixed(1)}`

// A requested cell may carry an exact position saved by an older app build: always work with (and save) the cell centre.
export function cellCentre(rawLat, rawLon) {
  const lat = Math.round(Number(rawLat) * 10) / 10, lon = Math.round(Number(rawLon) * 10) / 10
  return { lat, lon, key: gridKey(lat, lon) }
}

// YYYY-MM-DD in India Standard Time, whatever zone the runtime is set to.
export const istDate = (nowMs = Date.now()) => new Date(nowMs + IST_MS).toISOString().slice(0, 10)

// Open-Meteo hourly times are IST wall-clock text with no zone ("2026-10-29T09:00"): read them as +05:30
// (same as src/lib/weather/freshness.js istTimeMs).
export const istTimeMs = (text) => {
  const s = String(text || '')
  if (/(Z|[+-]\d\d:?\d\d)$/.test(s)) return Date.parse(s)
  const full = /T\d\d:\d\d$/.test(s) ? `${s}:00` : s
  return Date.parse(`${full}+05:30`)
}

// ---------- URLs (same parameters as refreshCell) ----------
export const buildForecastUrl = (lat, lon) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation' +
  '&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m,soil_moisture_0_to_7cm' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,et0_fao_evapotranspiration' +
  '&timezone=Asia%2FKolkata&forecast_days=16'

// archive lags ~1-2 days: end = now minus 2 days (UTC date, as in refreshCell)
export const buildArchiveUrl = (lat, lon, nowMs = Date.now()) =>
  `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2015-01-01` +
  `&end_date=${new Date(nowMs - 2 * 86400000).toISOString().slice(0, 10)}&daily=precipitation_sum&timezone=Asia%2FKolkata`

// ---------- forecast mapping (current / next 48 h hourly / daily) ----------
const dayMean = (arr) => { const v = arr.filter((x) => x != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000 : null }

export function mapForecast(d, nowMs = Date.now()) {
  if (!d || !d.current || !d.hourly?.time || !d.daily?.time) throw new Error('Open-Meteo reply is missing current/hourly/daily')
  const cur = d.current
  const current = { temp: cur.temperature_2m, humidity: cur.relative_humidity_2m, wind_kmh: cur.wind_speed_10m, weathercode: cur.weather_code, precipitation: cur.precipitation }

  // next 48h hourly, starting one hour before now (IST wall-clock text read as +05:30)
  const H = d.hourly
  const hourly = []
  for (let i = 0; i < H.time.length && hourly.length < 48; i++) {
    if (istTimeMs(H.time[i]) < nowMs - HOUR_MS) continue
    hourly.push({ time: H.time[i], temp: H.temperature_2m[i], precip_mm: H.precipitation[i], precip_prob: H.precipitation_probability[i], wind_kmh: H.wind_speed_10m[i], humidity: H.relative_humidity_2m[i], soil_moisture: H.soil_moisture_0_to_7cm?.[i] ?? null })
  }
  // daily soil moisture = mean of that date's hourly values
  const smByDate = {}
  H.time.forEach((t, i) => { const day = t.slice(0, 10); (smByDate[day] ||= []).push(H.soil_moisture_0_to_7cm?.[i]) })
  const D = d.daily
  const daily = D.time.map((date, i) => ({
    date, tmax: D.temperature_2m_max[i], tmin: D.temperature_2m_min[i], precip_mm: D.precipitation_sum[i] || 0,
    precip_prob: D.precipitation_probability_max[i] ?? null, wind_max: D.wind_speed_10m_max[i], weathercode: D.weather_code[i],
    et0: D.et0_fao_evapotranspiration?.[i] ?? null, soil_moisture: dayMean(smByDate[date] || []),
  }))
  return { current, hourly, daily }
}

// The forecast write. It NEVER carries season_rain, so an existing season value is kept (a brand-new row gets null).
export function buildForecastRow(cell, mapped, fetchedAtIso) {
  return { grid_key: cell.key, latitude: cell.lat, longitude: cell.lon, current: mapped.current, hourly: mapped.hourly, daily: mapped.daily, fetched_at: fetchedAtIso }
}

// ---------- season rainfall (archive) ----------
// todayIst is passed in (the original read it from todayIST()).
export function computeSeasonRain(dailyTime, dailyPrecip, todayIst) {
  if (!dailyTime?.length) return null
  const precipByDate = Object.fromEntries(dailyTime.map((d, i) => [d, dailyPrecip[i] || 0]))
  const [ty, tm, td] = todayIst.split('-').map(Number) // IST calendar, not the runtime's UTC
  const today = { getFullYear: () => ty, getMonth: () => tm - 1, getDate: () => td }
  const m = today.getMonth()
  const kharif = m >= 5 && m <= 8 // Jun-Sep
  const startY = kharif ? today.getFullYear() : (m >= 9 ? today.getFullYear() : today.getFullYear() - 1)
  const startMonth = kharif ? 5 : 9 // Jun=5 / Oct=9
  const seasonStart = new Date(Date.UTC(startY, startMonth, 1))
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const windowDays = Math.round((end - seasonStart) / 86400000)
  const sumWindow = (from, days) => {
    let s = 0
    for (let i = 0; i <= days; i++) { const d = new Date(from.getTime() + i * 86400000).toISOString().slice(0, 10); s += precipByDate[d] || 0 }
    return s
  }
  const to_date_mm = Math.round(sumWindow(seasonStart, windowDays))
  const normals = []
  for (let y = 2015; y < startY; y++) {
    const ps = new Date(Date.UTC(y, startMonth, 1))
    if (dailyTime[0] && ps.toISOString().slice(0, 10) < dailyTime[0]) continue
    normals.push(sumWindow(ps, windowDays))
  }
  const normal_mm = normals.length ? Math.round(normals.reduce((a, b) => a + b, 0) / normals.length) : null
  return { season_start: seasonStart.toISOString().slice(0, 10), to_date_mm, normal_mm, source: 'Open-Meteo archive (2015–)' }
}

// The stored value gets one extra key, computed_on (IST date). The site reads only to_date_mm and normal_mm.
export function seasonFromArchive(a, todayIst) {
  const s = computeSeasonRain(a?.daily?.time, a?.daily?.precipitation_sum, todayIst)
  return s ? { ...s, computed_on: todayIst } : null
}

export const needsSeason = (row, todayIst) => !row || !row.season_rain || row.season_rain.computed_on !== todayIst

// ---------- request and cell list ----------
export function parseRequest(body) {
  const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {}
  const mode = b.mode ?? 'forecast'
  if (mode !== 'forecast' && mode !== 'season') return { error: 'mode must be "forecast" or "season"' }
  const cap = mode === 'season' ? SEASON_MAX_LIMIT : MAX_LIMIT
  let limit = cap
  if (b.limit !== undefined && b.limit !== null) {
    if (!Number.isInteger(b.limit) || b.limit < 1) return { error: 'limit must be a whole number of 1 or more' }
    limit = Math.min(b.limit, cap)
  }
  return { mode, limit }
}

// PILOT first, then every requested cell (deduplicated by cell centre). Each: { key, lat, lon, pilot }.
export function buildCellList(requests) {
  const cells = new Map()
  for (const p of PILOT) { const c = cellCentre(p.lat, p.lon); cells.set(c.key, { ...c, pilot: true }) }
  for (const r of requests || []) {
    const c = cellCentre(r.latitude, r.longitude)
    if (Number.isNaN(c.lat) || Number.isNaN(c.lon)) continue
    if (!cells.has(c.key)) cells.set(c.key, { ...c, pilot: false })
  }
  return [...cells.values()]
}

const fetchedMs = (row) => { const t = Date.parse(row?.fetched_at || ''); return Number.isNaN(t) ? null : t }
// missing first, then oldest first, then key (stable)
const byOldest = (rowsByKey) => (a, b) => {
  const ta = fetchedMs(rowsByKey[a.key]), tb = fetchedMs(rowsByKey[b.key])
  if (ta === null && tb !== null) return -1
  if (tb === null && ta !== null) return 1
  if (ta !== tb && ta !== null) return ta - tb
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
}

// Oldest fetched_at first (missing first). Pilot cells are always in the run (they come first), so limit never goes
// below the pilot count; the rest of the limit rotates fairly through the other cells.
export function orderCells(cells, rowsByKey, limit = MAX_LIMIT) {
  const cmp = byOldest(rowsByKey || {})
  const pilots = cells.filter((c) => c.pilot).sort(cmp)
  const others = cells.filter((c) => !c.pilot).sort(cmp)
  return [...pilots, ...others.slice(0, Math.max(0, limit - pilots.length))]
}

// Season mode: only cells that already have a row and need the season value; never-computed first, then oldest computed_on.
export function orderSeasonCells(cells, rowsByKey, todayIst, limit = SEASON_MAX_LIMIT) {
  const have = cells.filter((c) => rowsByKey[c.key] && needsSeason(rowsByKey[c.key], todayIst))
  const when = (c) => rowsByKey[c.key].season_rain?.computed_on || ''
  have.sort((a, b) => (when(a) < when(b) ? -1 : when(a) > when(b) ? 1 : (a.key < b.key ? -1 : 1)))
  return have.slice(0, limit)
}

// ---------- fetching with retries ----------
// 429 and 5xx are retried like a network error (backoff 1 s, 2 s); other 4xx stop at once. Throws { deadline: true } past deadlineAt.
export async function getJson(url, o) {
  const { fetchFn, timeoutMs, retries = 2, deadlineAt, now = Date.now, sleep, takeSlot, stats } = o
  let last
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt) await sleep(1000 * 2 ** (attempt - 1))
    if (now() >= deadlineAt) throw Object.assign(new Error('deadline'), { deadline: true })
    if (takeSlot) await takeSlot()
    stats.requests++
    try {
      const res = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (res.status === 429) { stats.rateLimited++; last = new Error('HTTP 429'); continue }
      if (res.status >= 500) { last = new Error(`HTTP ${res.status}`); continue }
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true })
      return await res.json()
    } catch (e) {
      if (e?.fatal) throw e
      last = e
    }
  }
  throw last
}

// A fixed number of workers walk the list; none starts a new item once the deadline has passed.
export async function runPool(items, work, { concurrency, deadlineAt, now = Date.now }) {
  let cursor = 0
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length && now() < deadlineAt) await work(items[cursor++])
  }))
  return { started: cursor, notStarted: items.length - cursor }
}

// ---------- safe error text and the summary ----------
// One short line: name, message, cause code. URLs are cut out, and any secret passed in is replaced.
export function describeError(e, secrets = []) {
  const err = e || {}
  let out = [err.name, err.message, err.cause ? `cause=${err.cause.code ?? err.cause.name ?? ''}` : ''].filter(Boolean).join(' | ')
  out = out.replace(/https?:\/\/\S+/gi, '<url>')
  for (const s of secrets) if (s && String(s).length >= 6) out = out.split(String(s)).join('***')
  return out.slice(0, 300)
}

// fetchedByKey: { grid_key: ms | null } for every cell, AFTER the run (written cells carry their new time).
export function buildSummary(o) {
  const { mode, cellsTotal, writtenKeys, failedKeys, pilotKeys, rateLimited, fetchedByKey, nowMs, deadlineHit, ms, errors, requests } = o
  const written = new Set(writtenKeys)
  const pilotFailed = mode === 'forecast' ? pilotKeys.filter((k) => !written.has(k)) : []
  const vals = Object.values(fetchedByKey)
  const leftOver = vals.filter((t) => t === null || nowMs - t > LEFT_OVER_H * HOUR_MS).length
  const times = vals.filter((t) => t !== null)
  const newest = times.length ? new Date(Math.max(...times)).toISOString() : null
  const ok = pilotFailed.length === 0 && !deadlineHit && (mode === 'forecast' || failedKeys.length === 0)
  return {
    ok, mode, cells_total: cellsTotal, cells_written: written.size, failed_cells: failedKeys.length, pilot_failed: pilotFailed,
    rate_limited: rateLimited, cells_left_over_4h: leftOver, deadline_hit: !!deadlineHit, newest_fetched_at: newest,
    requests, ms, errors: errors.slice(0, 10),
  }
}
