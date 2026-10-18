// Batch 10E — diff two prerender text snapshots (written by scripts/batch10e/prerender-text.mjs).
//
// Usage: node scripts/batch10e/prerender-text-diff.mjs <baseDir> <newDir>
//          [--allow <allow.json>]   data-driven text to exclude (default scripts/batch10e/prerender-text-allow.json;
//                                   pass --allow none to exclude nothing)
//          [--json <out.json>]      machine-readable result
//          [--md <out.md>]          short markdown report
//          [--strict]               also fail on ADDED text (default: additions are reported, not failed)
// Exit code: 0 = nothing removed/changed, 1 = something removed / head changed / route missing, 2 = usage.
//
// Method (per route, same idea as scripts/batch10d/seo-diff.mjs):
//   HEAD (title, description, canonical, robots, lang, every h1, every JSON-LD block verbatim) must be identical.
//   BODY: data-driven lines (filled from the staging DB at build time: mandi ticker, listings, videos,
//   sawaal, melas, articles, …) are cut out of BOTH sides by the allow-list (regions located by static
//   anchor lines, and single-line regexes). Everything else is static copy, compared as
//     words  = whitespace-token multiset (exact, punctuation kept): removed = base − new, added = new − base
//     lines  = line multiset: removed / added lines
//   Data regions are reported (equal / changed) but never fail. Allow-list "head" entries normalise
//   data-driven parts of HEAD lines (regex replace on both sides) before the HEAD comparison.
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const OPTS = ['--allow', '--json', '--md']
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const pos = args.filter((a, i) => !a.startsWith('--') && !OPTS.includes(args[i - 1]))
const [baseDir, newDir] = pos
if (!baseDir || !newDir) { console.error('usage: node scripts/batch10e/prerender-text-diff.mjs <baseDir> <newDir> [--allow file|none] [--json out] [--md out] [--strict]'); process.exit(2) }
const strict = args.includes('--strict')
const allowPath = opt('--allow', path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'prerender-text-allow.json'))
const allow = allowPath === 'none' ? { regions: [], lines: [] } : JSON.parse(fs.readFileSync(allowPath, 'utf8'))
const REGIONS = (allow.regions || []).map((r) => ({ ...r, routesRe: new RegExp(r.routes || '.*') }))
const LINES = (allow.lines || []).map((l) => ({ ...l, routesRe: new RegExp(l.routes || '.*'), reRe: new RegExp(l.re) }))
// head: { routes, re, replace } — normalise data-driven parts of HEAD lines (e.g. JSON-LD temporalCoverage) on both sides.
const HEADS = (allow.head || []).map((h) => ({ ...h, routesRe: new RegExp(h.routes || '.*'), reRe: new RegExp(h.re, 'g') }))
const normHead = (route, head) => head.map((l) => HEADS.reduce((x, h) => (h.routesRe.test(route) ? x.replace(h.reRe, h.replace) : x), l))

const listTxt = (dir) => fs.readdirSync(dir, { recursive: true }).map((f) => String(f).replace(/\\/g, '/'))
  .filter((f) => f.endsWith('.txt') && fs.statSync(path.join(dir, f)).isFile())
const routeOf = (f) => f === 'index.txt' ? '/' : f.endsWith('.html.txt') ? '/' + f.slice(0, -4) : '/' + f.slice(0, -4)
const read = (dir, f) => {
  const all = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)
  const b = all.indexOf('### BODY')
  const head = (b >= 0 ? all.slice(0, b) : all).filter((l) => l !== '')
  const body = b >= 0 ? all.slice(b + 1).filter((l) => l.trim() !== '') : []
  return { head, body }
}

function mark(route, lines) {
  const m = new Array(lines.length).fill(null)
  const found = []
  for (const r of REGIONS) {
    if (!r.routesRe.test(route)) continue
    let i = 0
    if (r.from) { i = lines.indexOf(r.from); if (i < 0) { found.push({ id: r.id, ok: false }); continue } }
    const s = lines.indexOf(r.after, i)
    const e = s < 0 ? -1 : (r.until ? lines.indexOf(r.until, s + 1) : lines.length)
    if (s < 0 || e < 0) { found.push({ id: r.id, ok: false }); continue }
    for (let k = s + 1; k < e; k++) m[k] = r.id
    found.push({ id: r.id, ok: true, lines: lines.slice(s + 1, e) })
  }
  lines.forEach((l, k) => {
    if (m[k]) return
    for (const d of LINES) {
      if (!d.routesRe.test(route) || !d.reRe.test(l)) continue
      if (d.near && lines[k - 1] !== d.near) continue
      m[k] = d.id
    }
  })
  return { m, found }
}
const multiset = (items) => { const x = new Map(); for (const i of items) x.set(i, (x.get(i) || 0) + 1); return x }
const minus = (a, b) => { const out = []; for (const [k, n] of a) { const d = n - (b.get(k) || 0); if (d > 0) out.push({ item: k, count: d }) } return out }
const words = (lines) => lines.flatMap((l) => l.split(/\s+/).filter(Boolean))

const baseFiles = new Set(listTxt(baseDir)), newFiles = new Set(listTxt(newDir))
const routes = [], missing = [], added = []
for (const f of baseFiles) (newFiles.has(f) ? routes : missing).push(f)
for (const f of newFiles) if (!baseFiles.has(f)) added.push(f)

const perRoute = []
for (const f of routes.sort()) {
  const route = routeOf(f)
  const B = read(baseDir, f), A = read(newDir, f)
  const bm = mark(route, B.body), am = mark(route, A.body)
  const bS = B.body.filter((_, k) => !bm.m[k]), aS = A.body.filter((_, k) => !am.m[k])
  const bH = normHead(route, B.head), aH = normHead(route, A.head)
  const headRemoved = minus(multiset(bH), multiset(aH)), headAdded = minus(multiset(aH), multiset(bH))
  const wRemoved = minus(multiset(words(bS)), multiset(words(aS))), wAdded = minus(multiset(words(aS)), multiset(words(bS)))
  const lRemoved = minus(multiset(bS), multiset(aS)), lAdded = minus(multiset(aS), multiset(bS))
  const data = bm.found.map((r) => { const a = am.found.find((x) => x.id === r.id); return { id: r.id, inBase: r.ok, inNew: !!a?.ok, equal: !!(r.ok && a?.ok && JSON.stringify(r.lines) === JSON.stringify(a.lines)), baseLines: r.lines?.length ?? null, newLines: a?.lines?.length ?? null } })
  const dataLines = { base: bm.m.filter(Boolean).length, new: am.m.filter(Boolean).length }
  const changed = headRemoved.length || headAdded.length || wRemoved.length || lRemoved.length || wAdded.length || lAdded.length
  perRoute.push({ route, file: f, changed: !!changed, headRemoved, headAdded, wordsRemoved: wRemoved, wordsAdded: wAdded, linesRemoved: lRemoved, linesAdded: lAdded, dataRegions: data, dataLines })
}
const sumC = (arr) => arr.reduce((a, x) => a + x.count, 0)
const removedRoutes = perRoute.filter((r) => r.headRemoved.length || r.headAdded.length || r.wordsRemoved.length || r.linesRemoved.length)
const addedOnly = perRoute.filter((r) => !removedRoutes.includes(r) && (r.wordsAdded.length || r.linesAdded.length))
const fail = missing.length > 0 || removedRoutes.length > 0 || (strict && (addedOnly.length > 0 || added.length > 0))
const result = {
  verdict: fail ? 'CHANGED' : (addedOnly.length || added.length ? 'NOTHING LOST (additions present)' : 'IDENTICAL (static text)'),
  base: baseDir, new: newDir, allow: allowPath,
  counts: { baseRoutes: baseFiles.size, newRoutes: newFiles.size, compared: routes.length, missingRoutes: missing.length, addedRoutes: added.length,
    routesWithRemovals: removedRoutes.length, routesWithOnlyAdditions: addedOnly.length,
    wordsRemoved: perRoute.reduce((a, r) => a + sumC(r.wordsRemoved), 0), wordsAdded: perRoute.reduce((a, r) => a + sumC(r.wordsAdded), 0),
    linesRemoved: perRoute.reduce((a, r) => a + sumC(r.linesRemoved), 0), linesAdded: perRoute.reduce((a, r) => a + sumC(r.linesAdded), 0),
    headLinesChanged: perRoute.reduce((a, r) => a + sumC(r.headRemoved) + sumC(r.headAdded), 0),
    dataLinesExcluded: perRoute.reduce((a, r) => a + r.dataLines.base, 0) },
  missingRoutes: missing.map(routeOf), addedRoutes: added.map(routeOf),
  routes: perRoute.filter((r) => r.changed || r.dataRegions.length),
}
const jsonOut = opt('--json', null)
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(result, null, 2) + '\n')
const c = result.counts
const summary = `${result.verdict}: routes ${c.compared}/${c.baseRoutes} compared, missing ${c.missingRoutes}, added ${c.addedRoutes}; routes with removals ${c.routesWithRemovals}, with only additions ${c.routesWithOnlyAdditions}; words −${c.wordsRemoved} +${c.wordsAdded}; lines −${c.linesRemoved} +${c.linesAdded}; head lines changed ${c.headLinesChanged}; data lines excluded (base) ${c.dataLinesExcluded}`
console.log(summary)
const show = (arr, n = 8) => arr.slice(0, n).map((x) => `${JSON.stringify(x.item)}${x.count > 1 ? ' ×' + x.count : ''}`).join(', ') + (arr.length > n ? `, … (+${arr.length - n})` : '')
for (const r of perRoute.filter((x) => x.changed)) {
  console.log(`\n${r.route}`)
  if (r.headRemoved.length || r.headAdded.length) console.log(`  HEAD −${show(r.headRemoved)}  +${show(r.headAdded)}`)
  if (r.linesRemoved.length) console.log(`  lines removed: ${show(r.linesRemoved)}`)
  if (r.linesAdded.length) console.log(`  lines added:   ${show(r.linesAdded)}`)
}
if (missing.length) console.log('\nMISSING routes:', missing.map(routeOf).join(' '))
if (added.length) console.log('\nADDED routes:', added.map(routeOf).join(' '))
const mdOut = opt('--md', null)
if (mdOut) {
  const md = [`# Prerender text diff`, '', `- base: \`${baseDir}\``, `- new: \`${newDir}\``, `- allow-list: \`${allowPath}\``, '', `**${summary}**`, '']
  for (const r of perRoute.filter((x) => x.changed)) {
    md.push(`## \`${r.route}\``)
    if (r.headRemoved.length || r.headAdded.length) md.push(`- HEAD removed: ${show(r.headRemoved, 50)}`, `- HEAD added: ${show(r.headAdded, 50)}`)
    if (r.linesRemoved.length) md.push(`- lines removed (${sumC(r.linesRemoved)}): ${show(r.linesRemoved, 50)}`)
    if (r.linesAdded.length) md.push(`- lines added (${sumC(r.linesAdded)}): ${show(r.linesAdded, 50)}`)
    md.push('')
  }
  fs.writeFileSync(mdOut, md.join('\n') + '\n')
}
process.exit(fail ? 1 : 0)
