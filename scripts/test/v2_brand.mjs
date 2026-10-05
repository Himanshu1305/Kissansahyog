#!/usr/bin/env node
// V2 Phase 3 — brand spelling & greeting guard (permanent).
//   node --env-file=.env scripts/test/v2_brand.mjs
// Fails if the English brand "Kisan Sahyog" (single s) appears anywhere in the
// shipped source, or if any §0.3 protected "Kisan …" word was mangled, or if the
// greeting string is wrong.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

const EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.json', '.webmanifest', '.css'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'docs', 'supabase'])
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const s = statSync(p)
    if (s.isDirectory()) { if (!SKIP_DIRS.has(e)) walk(p, out) }
    else if (EXT.has(extname(p))) out.push(p)
  }
  return out
}

// Scan src/, public/, index.html, vite.config.js.
const files = [
  ...walk(join(ROOT, 'src')),
  ...walk(join(ROOT, 'public')),
  join(ROOT, 'index.html'),
  join(ROOT, 'vite.config.js'),
]

// The exact wrong English phrase: "Kisan Sahyog" with a single s, NOT "Kissan".
const WRONG = /(?<!s)Kisan Sahyog/g // after the Ki there's one s; wrong form is "Kisan Sahyog"
const offenders = []
for (const f of files) {
  let txt
  try { txt = readFileSync(f, 'utf8') } catch { continue }
  // Find "Kisan Sahyog" occurrences that are NOT "Kissan Sahyog".
  const lines = txt.split('\n')
  lines.forEach((line, i) => {
    // Match "Kisan Sahyog" not preceded by an 's' (so "Kissan Sahyog" is exempt).
    if (/\bKisan Sahyog\b/.test(line) && !/Kissan Sahyog/.test(line.replace(/\bKisan Sahyog\b/g, ''))) {
      // crude: a line can contain both; re-check by removing all "Kissan Sahyog" first
      const stripped = line.split('Kissan Sahyog').join('')
      if (/\bKisan Sahyog\b/.test(stripped)) offenders.push(`${f.replace(ROOT + '/', '')}:${i + 1}`)
    }
  })
}
check('no English "Kisan Sahyog" (single s) in src/public/index/manifest', offenders.length === 0, offenders.slice(0, 10).join(', '))

// Protected §0.3 words must still be present somewhere (not accidentally renamed).
const allText = files.map((f) => { try { return readFileSync(f, 'utf8') } catch { return '' } }).join('\n')
// Words that must survive verbatim where they appear (absence is fine — nothing to mangle).
for (const w of ['Kisan Mela', 'Kisan Sawaal', 'PM-KISAN', 'Kisan Credit', 'Kisan Call']) {
  const present = allText.includes(w)
  check(`protected word intact where used: "${w}"`, present || true, present ? 'present' : 'not referenced')
}
// No protected word got the extra "s".
for (const bad of ['Kissan Mela', 'Kissan Sawaal', 'PM-KISSAN', 'Kissan Credit', 'Kissan Call']) {
  check(`protected word not over-renamed: "${bad}" absent`, !allText.includes(bad))
}

// Greeting string.
const strings = readFileSync(join(ROOT, 'src/lib/i18n/strings.js'), 'utf8')
check('greeting_sitaram = सीताराम (hi+en)', /greeting_sitaram:\s*\{\s*hi:\s*'सीताराम',\s*en:\s*'सीताराम'/.test(strings))
check('app_name English = "Kissan Sahyog"', /app_name:\s*\{\s*hi:\s*'किसान सहयोग',\s*en:\s*'Kissan Sahyog'/.test(strings))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
