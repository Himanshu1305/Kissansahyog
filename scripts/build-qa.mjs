#!/usr/bin/env node
// V2 Phase 12 dev tool — turn docs/research/qa_raw/*.json into:
//   1. appended source rows in docs/research/SOURCES.md (idempotent by id),
//   2. src/content/qa/<batch>.js data files (used by the citation audit + seed),
// then regenerate src/content/sources.js. Run: node scripts/build-qa.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseSources, buildFile } from './gen-sources.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const RAW = join(ROOT, 'docs/research/qa_raw')
const SRCMD = join(ROOT, 'docs/research/SOURCES.md')
const QADIR = join(ROOT, 'src/content/qa')

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()

const batches = readdirSync(RAW).filter((f) => f.endsWith('.json')).sort()
let md = readFileSync(SRCMD, 'utf8')
const existingIds = new Set([...md.matchAll(/^\|\s*(S-[A-Z]+-\d+)\s*\|/gm)].map((m) => m[1]))

let newRows = []
let totalQas = 0
for (const file of batches) {
  const data = JSON.parse(readFileSync(join(RAW, file), 'utf8'))
  // 1. source rows
  for (const s of data.sources) {
    if (existingIds.has(s.id)) continue
    existingIds.add(s.id)
    const quote = Array.isArray(s.quotes) ? s.quotes.join(' / ') : (s.quote || '')
    newRows.push(`| ${s.id} | ${esc(s.title)} | ${esc(s.publisher)} | ${esc(s.url)} | ${esc(s.date)} | ${esc(s.accessed || '2026-10-06')} | ${esc(s.type)} | ${esc(quote)} |`)
  }
  // 2. qa data file (strip the per-source quote detail; keep the Q&A records only)
  const recs = data.qas.map((q) => ({
    slug: q.slug, crop: q.crop || '', category: q.category, season: q.season || 'all',
    question_hi: q.question_hi, question_en: q.question_en,
    short_hi: q.short_hi, blocks: q.blocks, sources: q.sources,
  }))
  totalQas += recs.length
  const base = file.replace(/\.json$/, '')
  writeFileSync(join(QADIR, `${base}.js`),
    `// AUTO-GENERATED from docs/research/qa_raw/${file} by scripts/build-qa.mjs.\n` +
    `// Kisan Sawaal knowledge-base Q&As (Hindi-only pages). Every numeric block carries cites.\n` +
    `export default ${JSON.stringify(recs, null, 2)}\n`)
}

if (newRows.length) {
  if (!md.includes('## Phase 12 — Kisan Sawaal Q&A sources')) {
    md = md.trimEnd() + '\n\n## Phase 12 — Kisan Sawaal Q&A sources\n\n| id | title | publisher | url | pub_date | accessed | type | quote |\n|---|---|---|---|---|---|---|---|\n'
  }
  md = md.trimEnd() + '\n' + newRows.join('\n') + '\n'
  writeFileSync(SRCMD, md)
}

// 3. regenerate sources.js
const rows = parseSources(readFileSync(SRCMD, 'utf8'))
writeFileSync(join(ROOT, 'src/content/sources.js'), buildFile(rows))

console.log(`Appended ${newRows.length} source rows; wrote ${batches.length} qa files (${totalQas} Q&As); sources.js now has ${rows.length} sources.`)
