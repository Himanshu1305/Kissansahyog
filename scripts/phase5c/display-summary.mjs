// Batch 9 Phase 5C.3 — summarise display results: what is NEW under a setting vs the default baseline.
//   node scripts/phase5c/display-summary.mjs   (prints JSON; used to write CONDITIONS.md)
import { readFileSync } from 'node:fs'
const r = JSON.parse(readFileSync('docs/review/batch9/evidence/phase5c/results-display.json', 'utf8')).results
const key = (s) => s.replace(/ \d+x\d+.*$/, '').replace(/ top=.*$/, '').replace(/ right=.*$/, '')
const base = Object.fromEntries(r.filter((x) => x.variant === 'base').map((x) => [x.page, x.detail]))
const out = []
for (const x of r) {
  const d = x.detail, b = base[x.page] || { small: [], clipped: [], behind: [], wide: [] }
  const bs = new Set((b.small || []).map(key)), bc = new Set((b.clipped || []).map(key))
  out.push({
    id: x.id, status: x.status, error: d.error || null, hScroll: d.hScroll, docW: d.docW, W: d.W, wide: d.wide,
    smallTotal: (d.small || []).length, smallNew: (d.small || []).filter((s) => !bs.has(key(s))),
    clippedNew: (d.clipped || []).filter((s) => !bc.has(key(s))), clippedAll: d.clipped, behind: d.behind,
    primaryBad: (d.primary || []).filter((p) => !p.found || !p.onTop || !p.inView), darkBlocks: d.darkBlocks, bodyBg: d.bodyBg, evidence: x.evidence,
  })
}
console.log(JSON.stringify(out, null, 1))
