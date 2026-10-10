#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { termsOfUse } from '../src/lib/i18n/legal.js'
import generated from '../src/content/qa/batch5b.js'

const raw = JSON.parse(readFileSync('docs/research/qa_raw/batch5b.json', 'utf8'))
const sourceById = new Map(raw.sources.map((s) => [s.id, s]))
const banned = ['guaranteed', '100%', 'pakka milega', 'गारंटी', 'पक्का मिलेगा', 'सबसे अच्छा बैंक']
const words = (value) => String(value || '').trim().split(/\s+/).filter(Boolean)
const walk = (blocks) => blocks.flatMap((b) => [b.text?.hi || '', ...(b.items || []).map((i) => i.text?.hi || i.hi || '')])
let failed = 0
const fail = (msg) => { failed++; console.error(`FAIL ${msg}`) }
const expected = new Set(['bis-complaint-channels','sabzi-low-cost-postharvest','sabzi-packing-chot','enam-farmer-app-register','enam-my-lots-history','enam-auction-accept-reject','enam-trader-registration-ways','enam-trader-registration-fee','enam-transparent-bidding','kcc-timely-flexible-credit','kcc-warehouse-receipt-credit','nabard-production-credit','nabard-credit-drawal-period','nabard-calamity-conversion','soil-health-card-languages','soil-health-card-recommendations','soil-health-card-workflow'])
const starts = new Set()
for (const q of raw.qas) {
  const body = [q.short_hi, ...walk(q.blocks)].join(' ')
  const count = words(body).length
  console.log(`${q.slug}: ${count} Hindi words`)
  if (count < 250) fail(`${q.slug}: fewer than 250 Hindi words`)
  if ((q.blocks || []).length < 3) fail(`${q.slug}: fewer than 3 blocks`)
  if (!(q.blocks_en || []).length || !q.short_en) fail(`${q.slug}: missing English text`)
  if (!q.last_verified || !/^\d{4}-\d{2}-\d{2}$/.test(q.last_verified)) fail(`${q.slug}: missing last-verified date`)
  if (!q.sources?.some((id) => sourceById.get(id)?.url)) fail(`${q.slug}: no source URL`)
  if (!expected.has(q.slug)) fail(`${q.slug}: changed or unexpected slug`)
  for (const phrase of banned) if (body.toLowerCase().includes(phrase.toLowerCase()) || JSON.stringify(q.blocks_en).toLowerCase().includes(phrase.toLowerCase())) fail(`${q.slug}: banned phrase ${phrase}`)
  const start = body.slice(0, 80)
  if (starts.has(start)) fail(`${q.slug}: duplicated first 80 body characters`)
  starts.add(start)
}
if (raw.qas.length !== 17 || starts.size !== 17) fail('expected exactly 17 stable Q&As')
if (generated.length !== raw.qas.length || generated.some((q, i) => JSON.stringify(q) !== JSON.stringify({
  slug: raw.qas[i].slug, crop: raw.qas[i].crop || '', category: raw.qas[i].category, season: raw.qas[i].season || 'all',
  question_hi: raw.qas[i].question_hi, question_en: raw.qas[i].question_en, short_hi: raw.qas[i].short_hi, short_en: raw.qas[i].short_en,
  blocks: raw.qas[i].blocks, blocks_en: raw.qas[i].blocks_en, sources: raw.qas[i].sources,
  ...(raw.qas[i].related?.length ? { related: raw.qas[i].related } : {}), ...(raw.qas[i].last_verified ? { last_verified: raw.qas[i].last_verified } : {}),
}))) fail('generated batch5b.js does not match the JSON source')
if (termsOfUse.length < 15 || termsOfUse.some((p) => !p.hi?.trim() || !p.en?.trim())) fail('Terms needs 15 non-empty bilingual clauses')
const termsScreen = readFileSync('src/screens/Terms.jsx', 'utf8')
if (/[\u0900-\u097F]/.test(termsScreen)) fail('Terms.jsx contains hard-coded Devanagari')
console.log(failed ? `FAIL: ${failed} issue(s)` : 'PASS: Batch 6C content checks passed')
process.exitCode = failed ? 1 : 0
