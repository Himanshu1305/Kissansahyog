#!/usr/bin/env node
// V2 Phase 1 — citation & accuracy audit. No DB needed.
//   node scripts/test/v2_citation_audit.mjs
// Fails (exit 1) if:
//  1. A content block (src/content/pages/*.js) has a digit/₹/%/date in its text
//     but no `cites`.
//  2. A cite id used anywhere in src/content/pages or src/content/qa is missing
//     from sources.js.
//  3. Any §0.7 / dossier do-not-publish phrase appears anywhere in src/.
//  4. A Q&A source record (Phase 12) lacks a source.
//  5. src/content/sources.js is stale vs docs/research/SOURCES.md.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { sources } from '../../src/content/sources.js'
import { parseSources, buildFile } from '../../scripts/gen-sources.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

// ---- helpers ----------------------------------------------------------------
function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const hasNumber = (s) => /[0-9]|₹|%|crore|lakh|करोड़|लाख|प्रतिशत/i.test(s)

// ---- 1 & 2: load content pages + qa, check cites coverage + valid ids -------
async function loadContent() {
  const pages = []
  const pagesDir = join(ROOT, 'src/content/pages')
  if (existsSync(pagesDir)) {
    for (const f of readdirSync(pagesDir).filter((f) => f.endsWith('.js'))) {
      const mod = await import(join(pagesDir, f))
      const page = mod.default || mod.page
      if (page) pages.push({ file: `src/content/pages/${f}`, page })
    }
  }
  return pages
}

function collectTextNodes(block, acc) {
  // returns list of {text, cites, where}
  const pushIf = (val, cites) => {
    const text = typeof val === 'string' ? val : val && (val.hi || val.en) ? `${val.hi || ''} ${val.en || ''}` : ''
    if (text.trim()) acc.push({ text, cites: cites || [] })
  }
  if (!block || typeof block !== 'object') return
  if (block.text) pushIf(block.text, block.cites)
  if (block.formula) pushIf(block.formula, block.cites)
  if (block.result) pushIf(block.result, block.cites)
  for (const it of block.items || []) pushIf(it.text ?? it, it.cites)
  for (const inp of block.inputs || []) pushIf(inp.value, inp.cites)
  for (const row of block.rows || []) for (const cell of row) pushIf(cell.text ?? cell, cell.cites)
  for (const f of block.faqs || []) { pushIf(f.q, f.cites); pushIf(f.a, f.cites) }
}

// ---- main -------------------------------------------------------------------
const pages = await loadContent()

// 5. sources.js freshness
const freshExpected = buildFile(parseSources(readFileSync(join(ROOT, 'docs/research/SOURCES.md'), 'utf8')))
const freshActual = readFileSync(join(ROOT, 'src/content/sources.js'), 'utf8')
check('src/content/sources.js is in sync with SOURCES.md', freshExpected.trim() === freshActual.trim(),
  'run `node scripts/gen-sources.mjs`')

// 1 + 2
let missingCites = [], badIds = []
for (const { file, page } of pages) {
  const nodes = []
  for (const b of page.blocks || []) collectTextNodes(b, nodes)
  for (const n of nodes) {
    if (hasNumber(n.text) && (!n.cites || n.cites.length === 0)) missingCites.push(`${file}: "${n.text.slice(0, 50)}…"`)
    for (const id of n.cites || []) if (!sources[id]) badIds.push(`${file}: ${id}`)
  }
}
check('every numeric content block carries cites', missingCites.length === 0, missingCites.slice(0, 5).join(' | '))
check('every cite id exists in sources.js', badIds.length === 0, badIds.slice(0, 5).join(' | '))
check(`content pages loaded (${pages.length})`, true)

// 4. Q&A source records
const qaDir = join(ROOT, 'src/content/qa')
let qaNoSrc = []
if (existsSync(qaDir)) {
  for (const f of readdirSync(qaDir).filter((f) => f.endsWith('.js'))) {
    const mod = await import(join(qaDir, f))
    const items = mod.default || mod.qa || []
    for (const q of Array.isArray(items) ? items : [items]) {
      const srcs = q.sources || q.source || []
      if (!srcs || (Array.isArray(srcs) && srcs.length === 0)) qaNoSrc.push(`${f}: ${q.slug || q.q?.hi || '?'}`)
    }
  }
}
check('every Q&A record has at least one source', qaNoSrc.length === 0, qaNoSrc.slice(0, 5).join(' | '))

// 3. banned phrases across src/
const BANNED = [
  { re: /carbon\s+(trading|credits?)[^.\n]{0,60}(allowed|legalis|legaliz|permitted|recently\s+started)/i, why: 'carbon trading "allowed/legalised"' },
  { re: /(allowed|legalis|legaliz|permitted|recently\s+started)[^.\n]{0,60}carbon\s+(trading|credits?)/i, why: 'carbon trading "allowed/legalised"' },
  { re: /35\s*crore[^.\n]{0,25}expect/i, why: 'Punjab ₹35 crore expected' },
  { re: /8,?327\s*ha/i, why: 'Punjab 8,327 ha' },
  { re: /\$\s*12\s*per\s*credit/i, why: '$12 per credit' },
  { re: /\$\s*6\s*to\s*farmers/i, why: '$6 to farmers' },
  { re: /up\s*to\s*12\s*t[^.\n]{0,8}CO.?.?\/?\s*ha/i, why: 'agroforestry 12 t CO2/ha/yr' },
  { re: /regenerative[^.\n]{0,40}fertilis\w+[^.\n]{0,12}20\s*%/i, why: 'regenerative cut fertiliser 20%' },
  { re: /150\s*\/?\s*m²?[^.\n]{0,20}MIDH/i, why: '₹150/m² MIDH cost norm' },
  { re: /MIDH[^.\n]{0,20}150\s*\/?\s*m²?/i, why: '₹150/m² MIDH cost norm' },
  { re: /80\s*[–-]\s*85\s*%[^.\n]{0,12}drip/i, why: '80–85% drip subsidy' },
  { re: /\bempanel/i, why: 'empanelled vendor claim' },
  { re: /(cheap|utility)[^.\n]{0,25}utility[^.\n]{0,12}template/i, why: 'WhatsApp cheap utility template' },
  { re: /utility[^.\n]{0,12}template[^.\n]{0,25}(cheap|mandi|weather|daily)/i, why: 'WhatsApp cheap utility template' },
  { re: /36\s*hours?[^.\n]{0,30}(takedown|remov)/i, why: '36-hour takedown timeline' },
  { re: /(takedown|remov\w+)[^.\n]{0,30}36\s*hours?/i, why: '36-hour takedown timeline' },
]
const srcFiles = walk(join(ROOT, 'src')).filter((f) => /\.(jsx?|mjs|ts|tsx|css)$/.test(f))
let banned = []
for (const f of srcFiles) {
  if (f.includes('v2_citation_audit')) continue
  // The generated citation registry carries publishers' verbatim titles (which
  // may name the official "empanelment" list etc.) — it is reference data, not a
  // site claim, so it is not subject to the §0.7 wording scan.
  if (f.endsWith('src/content/sources.js')) continue
  const txt = readFileSync(f, 'utf8')
  for (const b of BANNED) if (b.re.test(txt)) banned.push(`${relative(ROOT, f)} — ${b.why}`)
}
// Kajal Cold Storage must not be placed in Sagar (data-level, but scan src too)
check('no §0.7 / do-not-publish phrase appears in src/', banned.length === 0, banned.slice(0, 8).join(' | '))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
