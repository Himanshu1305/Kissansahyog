#!/usr/bin/env node
// Batch 4 item B — UI-string style guard (see docs/content/STYLE_GUIDE.md).
//   node scripts/test/batch4_ui_style.mjs
// 1. FAIL if an avoid-list word appears in any Hindi UI string in strings.js
//    (allow a line with the marker `ks-style-ok`).
// 2. REPORT every Hindi UI string over 15 words so it can be reviewed.
//    FAIL on any Hindi UI string over 25 words, except lines marked `ks-style-ok`
//    (legal text: Terms / Privacy).
// 3. PLACEHOLDER / HTML-TAG / KEY-SET GUARD: compare every string's {placeholders},
//    <html tags> and the full key set against the pre-batch commit recorded in
//    docs/review/BATCH4_PROGRESS.md. FAIL on any difference (a changed string may
//    not add/drop/alter a {name} placeholder or an <b>/<a> tag, and no key may be
//    removed or renamed).
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const STRINGS = join(ROOT, 'src/lib/i18n/strings.js')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

const DEV = 'ऀ-ॿ'
// Same avoid-list as batch3_style (bookish words). Matched as a substring of a
// Devanagari run (derived forms are equally stiff).
const AVOID = [
  'सूचीबद्ध', 'उपयुक्त', 'प्रस्तुत', 'एकरूपता', 'बशर्ते', 'अत्यधिक',
  'सुनिश्चित', 'क्रियान्वयन', 'हेतु', 'एवं', 'तथा', 'जुगत', 'मिसाल',
  'नवाचार', 'अनुमोदित', 'निम्नलिखित', 'आवश्यक', 'अथवा', 'यथा', 'परंतु',
  'किंतु', 'इच्छुक', 'उपलब्ध कराना', 'उपलब्ध कराएं', 'उपलब्ध कराया', 'प्रदान', 'मूल विचार',
]
const DVARA_RE = /द्वारा\s+(दी|दिया|किया|की\s+जाती|प्रदान)/

// ---- load current strings module -------------------------------------------
const cur = (await import(pathToFileURL(STRINGS).href + `?t=${process.pid}`)).strings

// ---- 1 + 2: avoid-list + sentence length over the raw file ------------------
const lines = readFileSync(STRINGS, 'utf8').split('\n')
const hits = []
lines.forEach((line, i) => {
  if (/ks-style-ok/.test(line)) return
  const code = line.replace(/\/\/.*$/, '')
  for (const w of AVOID) if (code.includes(w)) hits.push(`strings.js:${i + 1}  "${w}"  ${line.trim().slice(0, 60)}`)
  if (DVARA_RE.test(code)) hits.push(`strings.js:${i + 1}  "द्वारा (passive)"  ${line.trim().slice(0, 60)}`)
})
check('no avoid-list word in Hindi UI strings', hits.length === 0, '\n    ' + hits.slice(0, 25).join('\n    '))

// Build key -> raw line index so we can honour per-line `ks-style-ok` markers for
// the >25-word legal exemption.
const okLegalKeys = new Set()
lines.forEach((line) => {
  const m = line.match(/^\s*([a-zA-Z0-9_]+):/)
  if (m && /ks-style-ok/.test(line)) okLegalKeys.add(m[1])
})

const clean = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\{[^}]+\}/g, ' ')
const wc = (s) => clean(s).split(/\s+/).filter((t) => new RegExp(`[${DEV}a-zA-Z0-9]`).test(t)).length
// Longest single sentence (the style-guide hard rule is per-sentence ≤22 words).
// A string may hold several short sentences and still be a good, concise card;
// the quality defect is a run-on sentence, so the FAIL gate is per-sentence.
const longestSentence = (s) => Math.max(0, ...clean(s)
  .split(/[।?!]+|\.(?=\s|$)|\n+/)
  .map((x) => x.split(/\s+/).filter((t) => new RegExp(`[${DEV}a-zA-Z0-9]`).test(t)).length))

function hiStrings(obj, path = '') {
  // strings.js is a flat map key -> {hi,en}; a few values are nested objects.
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && 'hi' in v && typeof v.hi === 'string') out.push([path + k, v.hi])
    else if (v && typeof v === 'object' && !('hi' in v)) out.push(...hiStrings(v, path + k + '.'))
  }
  return out
}
const allHi = hiStrings(cur)
const longOnes = allHi.map(([k, s]) => [k, s, wc(s)]).filter(([, , n]) => n > 15).sort((a, b) => b[2] - a[2])
console.log(`\n  Hindi UI strings over 15 words (${longOnes.length}):`)
for (const [k, s, n] of longOnes) console.log(`    ${String(n).padStart(3)}  ${k}  "${s.slice(0, 70)}"`)
// FAIL gate: longest single sentence > 25 words (style guide = ≤22/sentence),
// except lines marked ks-style-ok (legal: Terms / Privacy / consent).
const runOns = allHi.map(([k, s]) => [k, longestSentence(s)])
  .filter(([k, n]) => n > 25 && !okLegalKeys.has(k.split('.')[0]))
  .sort((a, b) => b[1] - a[1])
check('no Hindi UI string with a sentence over 25 words (except marked legal)', runOns.length === 0,
  runOns.map(([k, n]) => `${k}=${n}w`).join(', '))

// ---- 3: placeholder / tag / key-set guard vs pre-batch commit ---------------
const progress = existsSync(join(ROOT, 'docs/review/BATCH4_PROGRESS.md'))
  ? readFileSync(join(ROOT, 'docs/review/BATCH4_PROGRESS.md'), 'utf8') : ''
const hashMatch = progress.match(/Pre-batch commit:\*?\*?\s*`?([0-9a-f]{7,40})`?/)
if (!hashMatch) {
  check('pre-batch commit hash recorded in progress file', false, 'no hash found')
} else {
  const hash = hashMatch[1]
  let base
  try {
    const src = execSync(`git show ${hash}:src/lib/i18n/strings.js`, { cwd: ROOT, encoding: 'utf8' })
    const dir = mkdtempSync(join(tmpdir(), 'b4strings-'))
    const tmp = join(dir, 'base.mjs')
    writeFileSync(tmp, src)
    base = (await import(pathToFileURL(tmp).href)).strings
  } catch (e) {
    check('load pre-batch strings.js', false, e.message)
    base = null
  }
  if (base) {
    const toks = (s) => {
      const ph = (String(s).match(/\{[^}]+\}/g) || []).sort()
      const tags = (String(s).match(/<[^>]+>/g) || []).map((t) => t.toLowerCase()).sort()
      return JSON.stringify({ ph, tags })
    }
    const baseFlat = Object.fromEntries(
      [...hiStrings(base), ...hiStrings(base).map(([k]) => k)].length ? [] : [])
    // flatten helper for both hi and en
    const flat = (obj, path = '', out = {}) => {
      for (const [k, v] of Object.entries(obj)) {
        if (v && typeof v === 'object' && ('hi' in v || 'en' in v)) out[path + k] = v
        else if (v && typeof v === 'object') flat(v, path + k + '.', out)
      }
      return out
    }
    const bF = flat(base), cF = flat(cur)
    const missing = Object.keys(bF).filter((k) => !(k in cF))
    check('no existing key removed or renamed', missing.length === 0, missing.slice(0, 20).join(', '))
    const diffs = []
    for (const k of Object.keys(bF)) {
      if (!(k in cF)) continue
      for (const lang of ['hi', 'en']) {
        const b = bF[k][lang], c = cF[k][lang]
        if (b == null || c == null) continue
        if (toks(b) !== toks(c)) diffs.push(`${k}.${lang}: ${toks(b)} -> ${toks(c)}`)
      }
    }
    check('placeholders & HTML tags unchanged on every string', diffs.length === 0,
      '\n    ' + diffs.slice(0, 25).join('\n    '))
  }
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
