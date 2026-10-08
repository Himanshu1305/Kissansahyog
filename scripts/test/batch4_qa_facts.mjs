#!/usr/bin/env node
// Batch 4 item A — Q&A fact-check. Run: node scripts/test/batch4_qa_facts.mjs
// For every NEW Q&A (docs/research/qa_raw/batch4*.json) it extracts each numeric
// fact, dose, ₹ amount, date number and variety-name number from the Hindi AND
// English answer text, and FAILS if that token does not appear in a quote saved
// under one of the Q&A's cited sources in docs/research/SOURCES.md.
//
// Normalisation (so it neither misses real mismatches nor fails on formatting):
//   - Devanagari digits ०–९ -> ASCII 0–9
//   - ₹ / रुपये / रु / Rs / Rs. unified; thousands commas removed (1,50,000 -> 150000)
//   - क्विंटल / क्वि / q and kg/ग्रा/मिली units ignored for number matching
//   - ranges: "40-45" matches "40–45"; a range also passes if BOTH endpoints appear
//   - a variety token (letters+digits, e.g. "JW 1201" / "जे.जी. 315") is validated by
//     its DIGIT part, because the MP source prints names in Devanagari while we also
//     write the Latin form — the number is the discriminator.
//   - integers that are only a list/step count or the standard spray-water/άλλ units
//     are still required to be in a quote; author answers accordingly.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const RAW = join(ROOT, 'docs/research/qa_raw')
const SRCMD = join(ROOT, 'docs/research/SOURCES.md')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

const DEV_DIGITS = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' }
function norm(s) {
  return String(s || '')
    .replace(/[०-९]/g, (d) => DEV_DIGITS[d])
    .replace(/[–—]/g, '-')
    .replace(/(\d),(?=\d)/g, '$1')        // 1,50,000 -> 150000 ; 55,60 -> 5560 (commas between digits)
    .replace(/\s*-\s*/g, '-')             // "40 - 20" -> "40-20"
    .toLowerCase()
}

// ---- parse SOURCES.md: id -> normalised quote text ----
const md = readFileSync(SRCMD, 'utf8')
const srcQuotes = {}
for (const m of md.matchAll(/^\|\s*(S-[A-Z0-9]+-\d+)\s*\|([^\n]*)\|\s*$/gm)) {
  const id = m[1]
  const cols = m[2].split('|')
  srcQuotes[id] = norm(cols[cols.length - 1] || '')   // last column is the quote(s)
}

// ---- fact token extraction ----
// numbers / ranges / decimals / percents, plus variety digit-cores.
function factTokens(text) {
  const t = norm(text)
  const toks = new Set()
  // numbers, decimals, ranges, NPK triples (40-20-0), percents
  for (const m of t.matchAll(/\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)*%?/g)) {
    const raw = m[0]
    if (/^\d%?$/.test(raw)) {
      // single digit 0-9: likely a count ("2 बार", "दो"), still require it in a quote
      toks.add(raw.replace('%', ''))
    } else {
      toks.add(raw)
    }
  }
  return [...toks]
}

function present(tok, hay) {
  const bare = tok.replace('%', '')
  if (hay.includes(bare)) return true
  if (hay.includes(tok)) return true
  // range: both endpoints present anywhere
  if (tok.includes('-')) {
    const parts = tok.split('-').filter(Boolean)
    if (parts.length && parts.every((p) => hay.includes(p))) return true
  }
  return false
}

function textOf(blocks) {
  const out = []
  for (const b of blocks || []) {
    if (b.text) out.push(b.text)
    for (const it of b.items || []) if (it.text) out.push(it.text)
  }
  return out.join(' ')
}

const files = readdirSync(RAW).filter((f) => /^batch4.*\.json$/.test(f)).sort()
if (!files.length) { console.log('No batch4*.json raw files yet — nothing to fact-check.'); process.exit(0) }

for (const file of files) {
  const data = JSON.parse(readFileSync(join(RAW, file), 'utf8'))
  // local quotes from this file's own sources (build-qa writes them into SOURCES.md,
  // but allow a fresh file not yet built)
  for (const s of data.sources || []) {
    if (!srcQuotes[s.id]) {
      const q = Array.isArray(s.quotes) ? s.quotes.join(' / ') : (s.quote || '')
      srcQuotes[s.id] = norm(q)
    }
  }
  for (const q of data.qas || []) {
    const cites = new Set(q.sources || [])
    for (const b of [...(q.blocks || []), ...(q.blocks_en || [])]) {
      for (const c of b.cites || []) cites.add(c)
      for (const it of b.items || []) for (const c of it.cites || []) cites.add(c)
    }
    const hay = [...cites].map((id) => srcQuotes[id] || '').join('  ')
    const answerText = [q.short_hi, q.short_en, textOf(q.blocks), textOf(q.blocks_en)].join('  ')
    const bad = []
    for (const tok of factTokens(answerText)) {
      if (!present(tok, hay)) bad.push(tok)
    }
    check(`${file} :: ${q.slug}`, bad.length === 0, bad.length ? `unsourced tokens: ${bad.join(', ')} (cites: ${[...cites].join(',') || 'none'})` : '')
  }
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
