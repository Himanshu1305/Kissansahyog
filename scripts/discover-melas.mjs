#!/usr/bin/env node
// Kisan Mela — daily AI-assisted discovery runner (Phase 2). Runs UNATTENDED in GitHub
// Actions once per day. Uses the Anthropic Messages API with the web_search server tool to
// find upcoming Indian Kisan/Krishi Melas, enforces the sourcing discipline (see
// scripts/mela/pipeline.mjs SYSTEM_PROMPT), geocodes venues via the shared Nominatim path,
// dedups/merges against existing rows, writes verified entries with the service role, and
// deactivates entries whose date (or expected window) has passed.
//
//   node --env-file=.env scripts/discover-melas.mjs
//
// REQUIRED: ANTHROPIC_API_KEY (production key, separate from any Claude Code session creds) +
// VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Missing ANTHROPIC_API_KEY → fail fast (2c).
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import {
  SYSTEM_PROMPT, SEARCH_ANGLES, AGGREGATOR_GAP_CHECK, MAX_SEARCHES,
  validateMela, findDuplicate, mergeMela, lifecycleDecision,
} from './mela/pipeline.mjs'
import { geocodeRows } from './mela/geocode.mjs'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'
const today = () => new Date().toISOString().slice(0, 10)

function failFast(msg) {
  console.error(`\n✗ discover-melas: ${msg}`)
  process.exit(1)
}

function parseJsonArray(text) {
  if (!text) return []
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const i = t.indexOf('[')
  const j = t.lastIndexOf(']')
  if (i === -1 || j === -1 || j < i) return []
  try { const v = JSON.parse(t.slice(i, j + 1)); return Array.isArray(v) ? v : [] } catch { return [] }
}

async function research(client) {
  const userPrompt = `Find UPCOMING Kisan/Krishi Melas in INDIA. Work through these distinct search angles (do not exceed your search budget of ${MAX_SEARCHES} total searches):\n` +
    SEARCH_ANGLES.map((a, i) => `${i + 1}. ${a}`).join('\n') +
    `\n\nFinally, as a GAP-CHECK ONLY, you may look at these aggregators to catch events your own search missed — but DO NOT copy their listings; for anything new there, verify it against the event's own primary source before including it:\n` +
    AGGREGATOR_GAP_CHECK.join('\n') +
    `\n\nReturn ONLY the JSON array described in your instructions.`

  let messages = [{ role: 'user', content: userPrompt }]
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: MAX_SEARCHES }]
  const usage = { input_tokens: 0, output_tokens: 0, server_tool_use: 0 }
  let finalText = ''

  // Server-tool loop: web_search runs server-side; stop_reason 'pause_turn' means resume.
  for (let i = 0; i < 6; i += 1) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })
    usage.input_tokens += resp.usage?.input_tokens || 0
    usage.output_tokens += resp.usage?.output_tokens || 0
    usage.server_tool_use += resp.usage?.server_tool_use?.web_search_requests || 0
    finalText = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')
    if (resp.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: resp.content }]
      continue
    }
    break
  }
  return { raw: parseJsonArray(finalText), usage }
}

async function main() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    failFast('ANTHROPIC_API_KEY is not set. The owner must add it as a GitHub Actions repository secret for the discovery pipeline to run. Exiting cleanly without touching the database.')
  }
  const supaUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !supaKey) failFast('Supabase service credentials missing (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).')

  const db = createClient(supaUrl, supaKey, { auth: { persistSession: false } })
  const client = new Anthropic({ apiKey: anthropicKey })

  // 1. Research.
  console.log(`discover-melas: researching with ${MODEL} (search cap ${MAX_SEARCHES})…`)
  const { raw, usage } = await research(client)
  console.log(`discover-melas: model returned ${raw.length} candidate(s); web_search_requests=${usage.server_tool_use}`)

  // 2. Validate + normalize (enforces: source URL present, India-scoped, honest dates, contact sourcing).
  const stamp = today()
  const valid = []
  const rejected = {}
  for (const r of raw) {
    const v = validateMela(r)
    if (v.ok) { v.row.last_checked_date = stamp; valid.push(v.row) }
    else rejected[v.reason] = (rejected[v.reason] || 0) + 1
  }
  console.log(`discover-melas: ${valid.length} valid, rejected: ${JSON.stringify(rejected)}`)

  // 3. Dedup/merge against existing AI-discovered rows (venue+state+date window, 2e).
  const { data: existing } = await db.from('kisan_mela').select('*').eq('submitted_by_user', false)
  const existingRows = existing || []
  const toInsert = []
  const toUpdate = []
  for (const row of valid) {
    const dup = findDuplicate(existingRows, row)
    if (dup) toUpdate.push({ id: dup.id, row: mergeMela(dup, row) })
    else toInsert.push(row)
  }

  // 4. Geocode only the genuinely-new rows (reuses the Nominatim path; 1 req/sec).
  await geocodeRows(toInsert)

  // 5. Write.
  let inserted = 0; let updated = 0
  for (const row of toInsert) {
    const { error } = await db.from('kisan_mela').insert(row)
    if (error) console.error(`insert failed (${row.venue}): ${error.message}`); else inserted += 1
  }
  for (const u of toUpdate) {
    const { id, ...rest } = u.row
    const { error } = await db.from('kisan_mela').update({ ...rest, last_checked_date: stamp }).eq('id', u.id)
    if (error) console.error(`update failed (${u.id}): ${error.message}`); else updated += 1
  }

  // 6. Lifecycle: deactivate entries whose confirmed date (or expected window) has passed (2e / rule 5).
  const { data: live } = await db.from('kisan_mela').select('*').eq('is_active', true).eq('submitted_by_user', false)
  let dropped = 0
  for (const row of live || []) {
    const d = lifecycleDecision(row, stamp)
    if (d.deactivate) {
      const { error } = await db.from('kisan_mela').update({ is_active: false }).eq('id', row.id)
      if (!error) { dropped += 1; console.log(`deactivated ${row.id} (${d.reason})`) }
    }
  }

  console.log(`\ndiscover-melas: inserted=${inserted} updated=${updated} deactivated=${dropped}`)
  console.log(`cost signal → input_tokens=${usage.input_tokens} output_tokens=${usage.output_tokens} web_search_requests=${usage.server_tool_use}`)
  console.log('(record the observed per-run cost in docs/review/KISAN_MELA_REVIEW.md after the first real runs — 2f.)')
}

main().catch((e) => { console.error('discover-melas ERROR:', e?.message || e); process.exit(1) })
