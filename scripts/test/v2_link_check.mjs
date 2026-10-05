#!/usr/bin/env node
// V2 Phase 1 — source link check. Requests every URL in sources.js and reports
// its status. Transient/network errors and bot-blocks (401/403/429) are
// REPORTED, not failed — only hard 404/410 are flagged "dead". Always exits 0
// (informational); the final report lists whatever it finds.
//   node scripts/test/v2_link_check.mjs
import { sources } from '../../src/content/sources.js'

const TIMEOUT = 12000
const CONCURRENCY = 8
const UA = 'Mozilla/5.0 (KissanSahyog link-check; +https://kissansahyog.com)'

async function head(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } })
    // some servers reject HEAD — retry GET
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } })
    }
    return { status: res.status }
  } catch (e) {
    return { status: 0, err: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message) }
  } finally {
    clearTimeout(t)
  }
}

function classify(status) {
  if (status >= 200 && status < 400) return 'ok'
  if (status === 404 || status === 410) return 'dead'
  if (status === 0) return 'transient'
  return 'review' // 401/403/429/5xx etc — bot-block or server hiccup
}

const entries = Object.entries(sources)
const results = []
let i = 0
async function worker() {
  while (i < entries.length) {
    const idx = i++
    const [id, s] = entries[idx]
    if (!/^https?:\/\//.test(s.url)) { results.push({ id, url: s.url, status: -1, cls: 'skip' }); continue }
    const { status, err } = await head(s.url)
    results.push({ id, url: s.url, status, err, cls: classify(status) })
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

const by = (c) => results.filter((r) => r.cls === c)
const dead = by('dead'), review = by('review'), transient = by('transient'), ok = by('ok'), skip = by('skip')

console.log(`\nLink check: ${results.length} sources`)
console.log(`  ok=${ok.length}  dead=${dead.length}  needs-review(block/5xx)=${review.length}  transient=${transient.length}  skip(non-http)=${skip.length}`)
if (dead.length) {
  console.log('\nDEAD (404/410):')
  for (const r of dead) console.log(`  ${r.id}  ${r.url}`)
}
if (review.length) {
  console.log('\nNEEDS REVIEW (401/403/429/5xx — often bot-block, verify manually):')
  for (const r of review) console.log(`  ${r.id}  [${r.status}]  ${r.url}`)
}
if (transient.length) {
  console.log('\nTRANSIENT (network/timeout — re-run):')
  for (const r of transient) console.log(`  ${r.id}  (${r.err})  ${r.url}`)
}
console.log(`\n${ok.length} reachable, ${dead.length} dead (see above). Informational — exit 0.`)
process.exit(0)
