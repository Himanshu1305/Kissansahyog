// Batch 16E - fetch daily mandi prices from data.gov.in INSIDE India (Mumbai, ap-south-1) and write them to mandi_prices.
// GitHub runners cannot reach the government server; this function can (proved by the staging probe).
// Called by pg_cron (migration 0071) with x-region: ap-south-1 and x-cron-secret. Not callable with the public key alone.
// The pure logic is the shared copy in ../_shared/mandi-core.js (parity-tested against scripts/lib/mandi-*.mjs).
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  API_BASE, DIVISION_DISTRICTS, PAGE, buildRequestPlan, mapPrimaryRecords, maskKey, needsNextPage, parseRequest, splitWritePolicy,
  todayIST, windowForDays,
} from '../_shared/mandi-core.js'

const CONCURRENCY = 3
const SPACING_MS = 400
const MAX_RETRIES = 3
const REQUEST_TIMEOUT_MS = 15000
const DEADLINE_MS = 95000 // the whole call must finish in under 100 s

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b)
  let d = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return d === 0
}

const refOf = (url: string) => { try { return new URL(url).host.split('.')[0] } catch { return '' } }

// One safe line for an error: name, cause code, HTTP status. Never the URL (it holds the key).
function describe(e: unknown, secrets: string[]): string {
  const err = e as { name?: string; message?: string; cause?: { code?: string; name?: string } }
  let out = maskKey([err?.name, err?.message, err?.cause ? `cause=${err.cause.code ?? err.cause.name ?? ''}` : ''].filter(Boolean).join(' | '))
  for (const s of secrets) if (s && s.length >= 6) out = out.split(s).join('***')
  return out
}

Deno.serve(async (req) => {
  const started = Date.now()
  const expected = Deno.env.get('CRON_SECRET') ?? ''
  if (!expected || !sameSecret(req.headers.get('x-cron-secret') ?? '', expected)) return json({ ok: false, error: 'forbidden' }, 403)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const key = Deno.env.get('DATA_GOV_IN_API_KEY') ?? ''
  const expectRef = Deno.env.get('EXPECT_PROJECT_REF') ?? ''
  const secrets = [key, serviceKey, expected]
  // Staging code can never write to production, and the reverse.
  if (!expectRef || refOf(supabaseUrl) !== expectRef) return json({ ok: false, error: 'project ref guard failed: SUPABASE_URL does not match EXPECT_PROJECT_REF' }, 500)
  if (!key) return json({ ok: false, error: 'DATA_GOV_IN_API_KEY is not set' }, 500)

  let body: unknown = {}
  try { const t = await req.text(); body = t.trim() ? JSON.parse(t) : {} } catch { return json({ ok: false, error: 'body is not valid JSON' }, 400) }
  const parsed = parseRequest(body)
  if ('error' in parsed && parsed.error) return json({ ok: false, error: parsed.error }, 400)
  const { crops, days } = parsed as { crops: Array<{ commodity_en: string; commodity_hi: string; source: string }>; days: number }

  const today = todayIST()
  const { from } = windowForDays(today, days)
  const fetchedAt = new Date().toISOString()
  const deadline = started + DEADLINE_MS
  const errors: string[] = []
  let requests = 0, failed = 0, deadlineHit = false

  // Request starts are spaced SPACING_MS apart across all workers.
  let nextSlot = Date.now()
  const takeSlot = async () => { const at = Math.max(nextSlot, Date.now()); nextSlot = at + SPACING_MS; const w = at - Date.now(); if (w > 0) await sleep(w) }

  async function getPage(params: Record<string, string | number>, offset: number): Promise<Array<Record<string, unknown>>> {
    const url = new URL(API_BASE)
    url.searchParams.set('api-key', key)
    url.searchParams.set('format', 'json')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
    if (offset) url.searchParams.set('offset', String(offset))
    let last: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt) await sleep(1000 * 2 ** (attempt - 1))
      if (Date.now() >= deadline) { deadlineHit = true; throw new Error('deadline') }
      await takeSlot()
      requests++
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
        if (res.status === 429 || res.status >= 500) { last = new Error(`HTTP ${res.status}`); continue }
        const text = await res.text()
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { fatal: true })
        const j = JSON.parse(text)
        if (!Array.isArray(j.records)) { last = new Error('no records array'); continue }
        return j.records
      } catch (e) {
        if ((e as { fatal?: boolean })?.fatal) throw e
        last = e
      }
    }
    throw last
  }

  // One (crop, district) step: all pages, newest first.
  async function runStep(step: ReturnType<typeof buildRequestPlan>[number]) {
    const out: Array<Record<string, unknown>> = []
    let offset = 0
    try {
      for (let pages = 0; pages < 40; pages++) {
        const recs = await getPage(step.params, offset)
        for (const r of recs) out.push({ _crop: step.crop, ...r })
        if (!needsNextPage(recs as Array<{ Arrival_Date?: string }>, from)) break
        offset += PAGE
      }
    } catch (e) {
      failed++
      if (errors.length < 10) errors.push(`${step.crop}/${step.district}: ${describe(e, secrets)}`)
    }
    return out
  }

  const plan = buildRequestPlan(crops, DIVISION_DISTRICTS)
  const raw: Array<Record<string, unknown>> = []
  let cursor = 0
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < plan.length && Date.now() < deadline) {
      const step = plan[cursor++]
      raw.push(...(await runStep(step)))
    }
  }))
  if (cursor < plan.length) deadlineHit = true

  const mapped = mapPrimaryRecords(raw, crops, { districts: DIVISION_DISTRICTS, today, days, fetchedAt })
  const { upsert, insertIfAbsent } = splitWritePolicy(mapped.rows, today)

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  let writeError: string | null = null
  const write = async (list: typeof mapped.rows, ignoreDuplicates: boolean) => {
    for (let i = 0; i < list.length; i += 500) {
      const { error } = await db.from('mandi_prices').upsert(list.slice(i, i + 500), { onConflict: 'commodity_en,market,price_date', ignoreDuplicates })
      if (error) { writeError = describe(new Error(error.message), secrets); return }
    }
  }
  await write(upsert, false)
  if (!writeError) await write(insertIfAbsent, true)

  const perCrop: Record<string, number> = {}
  let newest: string | null = null
  for (const r of mapped.rows) { perCrop[r.commodity_en] = (perCrop[r.commodity_en] ?? 0) + 1; if (!newest || r.price_date > newest) newest = r.price_date }
  const summary = {
    ok: !writeError && mapped.rows.length > 0 && !deadlineHit,
    source: '35985678 (variety-wise daily prices)',
    days, window_from: from, today,
    rows_by_crop: perCrop, rows_total: mapped.rows.length, rows_upserted: upsert.length, rows_insert_if_absent: insertIfAbsent.length,
    outliers_not_written: mapped.outliers.length, rejects: mapped.rejects,
    newest_price_date: newest,
    requests, failed_steps: failed, deadline_hit: deadlineHit,
    errors: writeError ? [...errors, `write: ${writeError}`] : errors,
    ms: Date.now() - started,
  }
  console.log(JSON.stringify(summary))
  return json(summary, summary.ok ? 200 : 502)
})
