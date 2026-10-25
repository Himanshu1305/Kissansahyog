#!/usr/bin/env node
// Batch 10F — run the size part of the ship's "compare" gate BEFORE deploying, on the freshly built
// dist, against the read-only snapshot of the live site. A page that would fail the gate after the
// deploy (and trigger the automatic rollback) is caught here, while nothing has changed yet.
//   node scripts/batch10f/predeploy-size-check.mjs <snapshot.json> <distDir> [--max-growth root=1.4,…] [--min-ratio root=0.7,…]
// Same limits as scripts/verify-batch9-live.mjs compare(): 0.85 floor (or --min-ratio), 1.15 ceiling,
// 1.60 when the new page carries the FAQ block and the snapshot did not, 4.0 for /sawaal and /yojana,
// --max-growth per page. A page without its own prerendered file is served the homepage html
// (Cloudflare SPA fallback), e.g. /browse.
// Exit 0 = every page inside its limits; 1 = at least one outside (printed); 2 = usage.
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const [snapFile, distDir] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : '' }
if (!snapFile || !distDir) { console.error('usage: predeploy-size-check.mjs <snapshot.json> <distDir> [--max-growth …] [--min-ratio …]'); process.exit(2) }
const parseMap = (s) => Object.fromEntries(String(s).split(',').map((x) => x.trim()).filter(Boolean).map((kv) => { const i = kv.lastIndexOf('='); const k = kv.slice(0, i).replace(/^\/+/, ''); return [k === 'root' || k === '' ? '/' : '/' + k, Number(kv.slice(i + 1))] }))
const MAX = Object.fromEntries(Object.entries(parseMap(opt('--max-growth'))).filter(([, v]) => v > 1))
const MIN = Object.fromEntries(Object.entries(parseMap(opt('--min-ratio'))).filter(([, v]) => v >= 0.5 && v < 0.85))

const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'))
const fileFor = (p) => {
  const own = path.join(distDir, p.replace(/^\/+/, ''), 'index.html')
  return p !== '/' && fs.existsSync(own) ? own : path.join(distDir, 'index.html')
}
let bad = 0
for (const [p, b] of Object.entries(snap.pages || {})) {
  const f = fileFor(p)
  const html = fs.readFileSync(f, 'utf8')
  const bytes = Buffer.byteLength(html)
  const ratio = b.bytes ? bytes / b.bytes : 1
  const faqNow = /"@type"\s*:\s*"FAQPage"/.test(html)
  const dataPage = p === '/sawaal' || p === '/yojana'
  const faqAdded = faqNow && b.faq !== true
  const hi = MAX[p] ? Math.max(MAX[p], dataPage ? 4.0 : faqAdded ? 1.6 : 1.15) : dataPage ? 4.0 : faqAdded ? 1.6 : 1.15
  const lo = MIN[p] ?? 0.85
  const ok = ratio >= lo && ratio <= hi
  if (!ok) bad++
  console.log(`${ok ? 'PASS' : 'FAIL'}  [predeploy_size] ${p}: ${bytes} B vs live ${b.bytes} B = ${ratio.toFixed(3)} (allowed ${lo}–${hi}; FAQ live ${b.faq === true ? 'yes' : 'no'}, new ${faqNow ? 'yes' : 'no'}) <- ${path.relative(distDir, f)}`)
}
process.exit(bad ? 1 : 0)
