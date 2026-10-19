#!/usr/bin/env node
// Batch 11A — prerendered-text snapshot and diff (SEO guard).
//   node scripts/batch11a/text-snapshot.mjs snap <distDir> <outDir>     one <route>.txt per prerendered page
//   node scripts/batch11a/text-snapshot.mjs diff <baseDir> <newDir>     lists every page whose text changed
// Text = visible text of the HTML (scripts/styles removed, whitespace collapsed), one file per route.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { htmlToText } from '../lib/page-text.mjs'

const [mode, a, b] = process.argv.slice(2)
const routeName = (rel) => (rel.split(sep).join('/').replace(/\/?index\.html$/, '') || 'home').split('/').join('__')

if (mode === 'snap') {
  mkdirSync(b, { recursive: true })
  const pages = []
  const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p); else if (n === 'index.html') pages.push(p) } }
  walk(a)
  const index = {}
  for (const p of pages) {
    const name = routeName(relative(a, p))
    const text = htmlToText(readFileSync(p, 'utf8'))
    writeFileSync(join(b, `${name}.txt`), text + '\n')
    index[name] = text.length
  }
  writeFileSync(join(b, '_index.json'), JSON.stringify(index, null, 1) + '\n')
  console.log(`snapshot: ${pages.length} pages -> ${b}`)
} else if (mode === 'diff') {
  const names = (d) => readdirSync(d).filter((n) => n.endsWith('.txt'))
  const A = new Set(names(a))
  const B = new Set(names(b))
  const added = [...B].filter((n) => !A.has(n))
  const removed = [...A].filter((n) => !B.has(n))
  const changed = []
  const count = (ws) => { const m = new Map(); for (const w of ws) m.set(w, (m.get(w) || 0) + 1); return m }
  for (const n of A) {
    if (!B.has(n)) continue
    const x = readFileSync(join(a, n), 'utf8')
    const y = readFileSync(join(b, n), 'utf8')
    if (x === y) continue
    const cx = count(x.split(' '))
    const cy = count(y.split(' '))
    const lost = []
    const gained = []
    for (const [w, c] of cx) if ((cy.get(w) || 0) < c) lost.push(w)
    for (const [w, c] of cy) if ((cx.get(w) || 0) < c) gained.push(w)
    changed.push({ page: n, lost: lost.slice(0, 40), gained: gained.slice(0, 40) })
  }
  console.log(JSON.stringify({ pages_base: A.size, pages_new: B.size, added, removed, changed_count: changed.length, changed }, null, 1))
} else {
  console.error('usage: text-snapshot.mjs snap <dist> <out> | diff <base> <new>')
  process.exit(2)
}
