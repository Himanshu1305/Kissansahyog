#!/usr/bin/env node
// Batch 3 — content style guard (see docs/content/STYLE_GUIDE.md).
//   node scripts/test/batch3_style.mjs
// 1. FAIL if an avoid-list word appears in Hindi text in src/content/**,
//    src/lib/i18n/strings.js, or the Q&A seed files. Allow a line with the
//    marker comment `ks-style-ok` (optionally `ks-style-ok: <word>`).
// 2. Report average + maximum Hindi sentence length per content page.
//    FAIL if any page AVERAGES more than 18 words per sentence.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

// Avoid-list: the stiff/bookish word → why. Matched as a whole Devanagari token.
const AVOID = [
  'सूचीबद्ध', 'उपयुक्त', 'प्रस्तुत', 'एकरूपता', 'बशर्ते', 'अत्यधिक',
  'सुनिश्चित', 'क्रियान्वयन', 'हेतु', 'एवं', 'तथा', 'जुगत', 'मिसाल',
  'नवाचार', 'अनुमोदित', 'निम्नलिखित', 'आवश्यक', 'अथवा', 'यथा', 'परंतु',
  'किंतु', 'इच्छुक', 'उपलब्ध कराना', 'उपलब्ध कराएं', 'उपलब्ध कराया',
  'प्रदान', 'मूल विचार',
]
// `द्वारा` is on the avoid-list but appears in many fixed legal/proper phrases
// ("भारत द्वारा", scheme names). We flag the bare passive "X द्वारा दी/किया" only.
const DVARA_RE = /द्वारा\s+(दी|दिया|किया|की\s+जाती|प्रदान)/

// A Devanagari "word boundary": the token must not be glued to another Devanagari
// letter (so उपयुक्तता, आवश्यकता etc. that are different words don't false-match
// only when we want whole-word — but most avoid words are flagged as substrings
// because their derived forms are equally stiff). We match as substring but require
// the match not be inside an English/latin run.
const DEV = 'ऀ-ॿ'

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

// ---- 1. avoid-list scan -----------------------------------------------------
const targets = [
  ...walk(join(ROOT, 'src/content')),
  join(ROOT, 'src/lib/i18n/strings.js'),
].filter((f) => /\.js$/.test(f) && existsSync(f))

const hits = []
for (const f of targets) {
  const rel = relative(ROOT, f)
  const lines = readFileSync(f, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (/ks-style-ok/.test(line)) return
    // strip line comments so advice in code comments isn't flagged
    const code = line.replace(/\/\/.*$/, '')
    for (const w of AVOID) {
      if (code.includes(w)) hits.push(`${rel}:${i + 1}  "${w}"  ${line.trim().slice(0, 70)}`)
    }
    if (DVARA_RE.test(code)) hits.push(`${rel}:${i + 1}  "द्वारा (passive)"  ${line.trim().slice(0, 70)}`)
  })
}
check('no avoid-list word in Hindi content', hits.length === 0, '\n    ' + hits.slice(0, 20).join('\n    '))

// ---- 2. sentence length per content page ------------------------------------
// Pull every Hindi string literal `hi: '...'` / `hi: "..."` and every bare Q&A
// block `text: '...'` (Hindi) from each content page file, split into sentences,
// and measure words/sentence. Latin-only strings are skipped.
function hindiStrings(src) {
  const out = []
  // hi: '...'  or  hi: "..."  (handles escaped quotes)
  const reHi = /\bhi:\s*(['"])((?:\\.|(?!\1).)*)\1/g
  let m
  while ((m = reHi.exec(src))) out.push(m[2])
  return out
}
function textStrings(src) {
  // block `text: '...'` where the value contains Devanagari (Q&A seed files)
  const out = []
  const re = /\btext:\s*(['"])((?:\\.|(?!\1).)*)\1/g
  let m
  while ((m = re.exec(src))) if (new RegExp(`[${DEV}]`).test(m[2])) out.push(m[2])
  return out
}
const splitSentences = (s) => s
  .replace(/\\n/g, ' ')
  .split(/[।?!]+|\.(?=\s|$)/)
  .map((x) => x.trim())
  .filter((x) => new RegExp(`[${DEV}]`).test(x) && x.split(/\s+/).length >= 2)
const words = (s) => s.split(/\s+/).filter(Boolean).length

const pageFiles = [
  ...walk(join(ROOT, 'src/content/pages')),
  ...walk(join(ROOT, 'src/content/qa')),
].filter((f) => /\.js$/.test(f))

let worstPages = []
console.log('\n  Hindi sentence length per page (avg / max words):')
for (const f of pageFiles) {
  const src = readFileSync(f, 'utf8')
  const strs = [...hindiStrings(src), ...textStrings(src)]
  const sentences = strs.flatMap(splitSentences)
  if (!sentences.length) continue
  const lens = sentences.map(words)
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length
  const max = Math.max(...lens)
  const rel = relative(ROOT, f)
  console.log(`    ${avg.toFixed(1).padStart(5)} / ${String(max).padStart(3)}   ${rel}  (${sentences.length} sentences)`)
  if (avg > 18) worstPages.push(`${rel} avg ${avg.toFixed(1)}`)
}
check('no content page averages > 18 words/sentence', worstPages.length === 0, worstPages.join(' | '))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
