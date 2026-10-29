// Batch 16H - refresh the weather cache (weather_cache_v2) from a Supabase Edge Function in Mumbai (ap-south-1), on a pg_cron timer,
// so the forecast no longer depends on GitHub's best-effort scheduler. The GitHub job stays as second writer + watchdog.
// Called by pg_cron (migration 0072) with x-region: ap-south-1 and x-cron-secret. Not callable with the public key alone.
// Open-Meteo needs no key. The pure logic is the shared copy in ../_shared/weather-core.js.
//   body {"mode":"forecast","limit":60}  forecast for the oldest cells (pilot cells always); never touches season_rain
//   body {"mode":"season","limit":6}     archive-based season rainfall for cells not yet computed today; touches only season_rain
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  REQUEST_WINDOW_DAYS, buildArchiveUrl, buildCellList, buildForecastRow, buildForecastUrl, buildSummary, describeError, getJson,
  istDate, mapForecast, orderCells, orderSeasonCells, parseRequest, PILOT, cellCentre, runPool, seasonFromArchive,
} from '../_shared/weather-core.js'

const CONCURRENCY = 4
const SPACING_MS = 150
const FORECAST_TIMEOUT_MS = 15000
const ARCHIVE_TIMEOUT_MS = 30000
const RETRIES = 2
const DEADLINE_MS = 100000 // the whole call must finish inside the 120 s pg_net timeout

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b)
  let d = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return d === 0
}

const refOf = (url: string) => { try { return new URL(url).host.split('.')[0] } catch { return '' } }

type Cell = { key: string; lat: number; lon: number; pilot: boolean }

Deno.serve(async (req) => {
  const started = Date.now()
  const expected = Deno.env.get('CRON_SECRET') ?? ''
  if (!expected || !sameSecret(req.headers.get('x-cron-secret') ?? '', expected)) return json({ ok: false, error: 'forbidden' }, 403)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const expectRef = Deno.env.get('EXPECT_PROJECT_REF') ?? ''
  const secrets = [serviceKey, expected]
  // Staging code can never write to production, and the reverse.
  if (!expectRef || refOf(supabaseUrl) !== expectRef) return json({ ok: false, error: 'project ref guard failed: SUPABASE_URL does not match EXPECT_PROJECT_REF' }, 500)

  let body: unknown = {}
  try { const t = await req.text(); body = t.trim() ? JSON.parse(t) : {} } catch { return json({ ok: false, error: 'body is not valid JSON' }, 400) }
  const parsed = parseRequest(body)
  if ('error' in parsed && parsed.error) return json({ ok: false, error: parsed.error }, 400)
  const { mode, limit } = parsed as { mode: 'forecast' | 'season'; limit: number }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const deadlineAt = started + DEADLINE_MS
  const stats = { requests: 0, rateLimited: 0 }
  const errors: string[] = []
  const writtenKeys: string[] = []
  const failedKeys: string[] = []
  let deadlineHit = false

  // Request starts are spaced SPACING_MS apart across all workers.
  let nextSlot = Date.now()
  const takeSlot = async () => { const at = Math.max(nextSlot, Date.now()); nextSlot = at + SPACING_MS; const w = at - Date.now(); if (w > 0) await sleep(w) }
  const fetchOpts = (timeoutMs: number) => ({ fetchFn: fetch, timeoutMs, retries: RETRIES, deadlineAt, sleep, takeSlot, stats })
  const fail = (cell: Cell, e: unknown) => {
    failedKeys.push(cell.key)
    if ((e as { deadline?: boolean })?.deadline) deadlineHit = true
    if (errors.length < 10) errors.push(`${cell.key}: ${describeError(e, secrets)}`)
  }

  // Cells: PILOT + every cell requested in the last 30 days.
  const since = new Date(Date.now() - REQUEST_WINDOW_DAYS * 86400000).toISOString()
  const requests: Array<{ grid_key: string; latitude: number; longitude: number }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('weather_grid_requests').select('grid_key,latitude,longitude').gte('last_requested_at', since).order('grid_key').range(from, from + 999)
    if (error) return json({ ok: false, error: `reading weather_grid_requests: ${describeError(new Error(error.message), secrets)}` }, 502)
    requests.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const cells: Cell[] = buildCellList(requests)
  const keys = cells.map((c) => c.key)

  // What is stored now: fetched_at, and season_rain (only needed to decide the season work).
  const rows: Record<string, { fetched_at: string | null; season_rain?: { computed_on?: string } | null }> = {}
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await db.from('weather_cache_v2').select(mode === 'season' ? 'grid_key,fetched_at,season_rain' : 'grid_key,fetched_at').in('grid_key', keys.slice(i, i + 200))
    if (error) return json({ ok: false, error: `reading weather_cache_v2: ${describeError(new Error(error.message), secrets)}` }, 502)
    for (const r of data ?? []) rows[r.grid_key] = r
  }
  const fetchedByKey: Record<string, number | null> = {}
  for (const k of keys) { const t = Date.parse(rows[k]?.fetched_at ?? ''); fetchedByKey[k] = Number.isNaN(t) ? null : t }

  if (mode === 'forecast') {
    const todo = orderCells(cells, rows, limit)
    await runPool(todo, async (cell: Cell) => {
      try {
        const d = await getJson(buildForecastUrl(cell.lat, cell.lon), fetchOpts(FORECAST_TIMEOUT_MS))
        const mapped = mapForecast(d, Date.now())
        const fetchedAt = new Date().toISOString()
        // No season_rain in this write: an existing season value stays, a brand-new row gets null.
        const { error } = await db.from('weather_cache_v2').upsert(buildForecastRow(cell, mapped, fetchedAt), { onConflict: 'grid_key' })
        if (error) throw new Error(error.message)
        writtenKeys.push(cell.key)
        fetchedByKey[cell.key] = Date.parse(fetchedAt)
      } catch (e) { fail(cell, e) }
    }, { concurrency: CONCURRENCY, deadlineAt })
    if (writtenKeys.length + failedKeys.length < todo.length) deadlineHit = true
  } else {
    const today = istDate(Date.now())
    const todo = orderSeasonCells(cells, rows, today, limit)
    await runPool(todo, async (cell: Cell) => {
      try {
        const a = await getJson(buildArchiveUrl(cell.lat, cell.lon, Date.now()), fetchOpts(ARCHIVE_TIMEOUT_MS))
        const season = seasonFromArchive(a, today)
        if (!season) throw new Error('archive reply has no daily data')
        // Only season_rain: fetched_at and the forecast are left alone.
        const { error } = await db.from('weather_cache_v2').update({ season_rain: season }).eq('grid_key', cell.key)
        if (error) throw new Error(error.message)
        writtenKeys.push(cell.key)
      } catch (e) { fail(cell, e) }
    }, { concurrency: 2, deadlineAt })
    if (writtenKeys.length + failedKeys.length < todo.length) deadlineHit = true
  }

  const summary = buildSummary({
    mode, cellsTotal: cells.length, writtenKeys, failedKeys, pilotKeys: PILOT.map((p) => cellCentre(p.lat, p.lon).key),
    rateLimited: stats.rateLimited, fetchedByKey, nowMs: Date.now(), deadlineHit, ms: Date.now() - started, errors, requests: stats.requests,
  })
  console.log(JSON.stringify(summary))
  return json(summary, summary.ok ? 200 : 502)
})
