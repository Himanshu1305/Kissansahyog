#!/usr/bin/env node
// V2 Phase 2 — SEO audit of prerendered HTML. Run AFTER `npm run build:full`.
//   node --env-file=.env scripts/test/v2_seo_audit.mjs
// Fails if any prerendered page is missing: a title, a meta description, exactly
// one <h1>, a canonical, hreflang, OG tags, or valid JSON-LD; or if a title /
// description duplicates another page's.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getRoutes } from '../lib/prerender-routes.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(ROOT, 'dist')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

function fileFor(route) {
  const p = route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html')
  return existsSync(p) ? p : null
}

const count = (re, s) => (s.match(re) || []).length
const first = (re, s) => { const m = s.match(re); return m ? (m[1] || m[0]) : null }

const routes = (await getRoutes()).filter((r) => fileFor(r))
check(`prerendered pages found (${routes.length})`, routes.length > 0)

const titles = new Map(), descs = new Map()
const problems = []

for (const route of routes) {
  const html = readFileSync(fileFor(route), 'utf8')
  const issues = []

  const title = first(/<title[^>]*>([^<]*)<\/title>/i, html)
  if (!title || !title.trim()) issues.push('no <title>')
  else {
    if (titles.has(title)) issues.push(`duplicate title (also ${titles.get(title)})`)
    else titles.set(title, route)
  }

  const desc = first(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i, html)
  if (!desc || !desc.trim()) issues.push('no meta description')
  else {
    if (descs.has(desc)) issues.push(`duplicate description (also ${descs.get(desc)})`)
    else descs.set(desc, route)
  }

  const h1 = count(/<h1[\s>]/i, html)
  if (h1 === 0) issues.push('no <h1>')
  else if (h1 > 1) issues.push(`${h1} <h1> (expected exactly 1)`)

  if (!/rel=["']canonical["']/i.test(html)) issues.push('no canonical')
  if (!/hreflang=/i.test(html)) issues.push('no hreflang')
  if (!/property=["']og:title["']/i.test(html)) issues.push('no og:title')
  if (!/property=["']og:image["']/i.test(html)) issues.push('no og:image')
  if (!/name=["']twitter:card["']/i.test(html)) issues.push('no twitter:card')

  // JSON-LD must parse
  const lds = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []
  for (const block of lds) {
    const json = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '')
    try { JSON.parse(json) } catch { issues.push('invalid JSON-LD') }
  }

  if (issues.length) problems.push(`${route}: ${issues.join('; ')}`)
}

check('every prerendered page passes SEO structure checks', problems.length === 0, problems.slice(0, 20).join('  |  '))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
