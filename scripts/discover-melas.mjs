#!/usr/bin/env node
// Kisan Mela discovery — ONE script, ONE GitHub Actions job, three steps in sequence (Phase 7b):
//   1. FREE aggregator scrape (no AI)         → pending leads in kisan_mela_candidates
//   2. SCOPED AI broad search (hyper-local)   → pending leads in kisan_mela_candidates
//   3. NARROW per-candidate AI verification   → promote verified → public kisan_mela; record the rest
// The kisan_mela_candidates table is the hand-off point BETWEEN steps within this single run (not
// between separate workflow jobs) and doubles as the permanent, queryable audit log.
//
//   node --env-file=.env scripts/discover-melas.mjs
//
// REQUIRED: ANTHROPIC_API_KEY (production key) + VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Missing ANTHROPIC_API_KEY → fail fast (the whole pipeline's steps 2-3 need it).
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { scrapeAggregators } from './mela/scraper.mjs'
import { runBroadSearch, insertBroadLeads } from './mela/broadsearch.mjs'
import { runVerification } from './mela/verify.mjs'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8'
// Opus 4.8 pricing per 1M tokens — for the per-run cost estimate logged below.
const PRICE_IN = 5.0, PRICE_OUT = 25.0, PRICE_SEARCH_PER_1K = 10.0 // web_search ≈ $10 / 1000 searches

function failFast(msg) { console.error(`\n✗ discover-melas: ${msg}`); process.exit(1) }

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) failFast('ANTHROPIC_API_KEY is not set. Add it as a GitHub Actions repository secret for the discovery pipeline to run. Exiting without touching the database.')
  const supaUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supaUrl || !supaKey) failFast('Supabase service credentials missing (VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).')

  const db = createClient(supaUrl, supaKey, { auth: { persistSession: false } })
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const totals = { input_tokens: 0, output_tokens: 0, web_search_requests: 0 }

  // ---- Step 1: free aggregator scrape (no AI, no cost) ----
  console.log('discover-melas: [1/3] scraping aggregators (free, no AI)…')
  const scrape = await scrapeAggregators({ db })
  console.log(`discover-melas: scrape → inserted ${scrape.inserted}, reopened ${scrape.reopened}, refreshed ${scrape.updated}` + (scrape.failures.length ? `, FAILURES: ${scrape.failures.join('; ')}` : ''))

  // ---- Step 2: scoped AI broad search (hyper-local gaps only) ----
  console.log(`discover-melas: [2/3] scoped AI broad search with ${MODEL}…`)
  const bs = await runBroadSearch({ client, model: MODEL })
  totals.input_tokens += bs.usage.input_tokens; totals.output_tokens += bs.usage.output_tokens; totals.web_search_requests += bs.usage.web_search_requests
  await insertBroadLeads({ db, leads: bs.leads })

  // ---- Step 3: narrow per-candidate verification + promotion + lifecycle ----
  console.log(`discover-melas: [3/3] verifying pending candidates with ${MODEL}…`)
  const v = await runVerification({ db, client, model: MODEL })
  totals.input_tokens += v.usage.input_tokens; totals.output_tokens += v.usage.output_tokens; totals.web_search_requests += v.usage.web_search_requests

  const cost = (totals.input_tokens / 1e6) * PRICE_IN + (totals.output_tokens / 1e6) * PRICE_OUT + (totals.web_search_requests / 1000) * PRICE_SEARCH_PER_1K
  console.log('\n===== discover-melas summary =====')
  console.log(`verification: ${v.verified} verified, ${v.rejected} rejected, ${v.unverifiable} unverifiable, ${v.corroborated_existing} corroborated-existing across ${v.groups} candidate group(s); ${v.deactivated} deactivated`)
  console.log('outcomes:', JSON.stringify(v.outcomes))
  console.log(`cost signal → input_tokens=${totals.input_tokens} output_tokens=${totals.output_tokens} web_search_requests=${totals.web_search_requests}`)
  console.log(`estimated run cost ≈ $${cost.toFixed(4)} (Opus 4.8 tokens + web_search). Record in docs/review/KISAN_MELA_REARCHITECTURE_REVIEW.md.`)
}

main().catch((e) => { console.error('discover-melas ERROR:', e?.message || e); process.exit(1) })
