#!/usr/bin/env node
// Batch 19-B - link checker for the founder. GET requests only; nothing is written anywhere.
//   node scripts/batch19/check-links.mjs https://<staging or production host>
// 1) every Pashupalan page, with and without a trailing slash, must answer 200 (BROKEN otherwise); on staging/production the HTML also holds the <h1> (prerendered) - a local preview does not, and is shown as 'OK (not prerendered)'
// 2) every official link in src/content/pashupalan/links.js is opened with a normal browser User-Agent:
//    OK = 200; blocked-by-site = 401/403/429/5xx-from-a-bot-wall/certificate/timeout on a government site (opens in a browser, not a failure);
//    BROKEN = 404/410 or a refused connection on a non-government site.
// Exit code 1 only if one of OUR pages is broken or a link is clearly dead (404/410). A government site that blocks bots never fails the run.
import { ALL_PATHS } from '../../src/content/pashupalan/registry.js'
import { LINKS } from '../../src/content/pashupalan/links.js'

const base = (process.argv[2] || '').replace(/\/$/, '')
if (!/^https?:\/\//.test(base)) { console.error('usage: node scripts/batch19/check-links.mjs https://host'); process.exit(2) }
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const GOV = /\.(gov\.in|nic\.in|res\.in|coop)$|\.gov\.in$/
const rows = []
let hardFail = false

async function get(url, ms = 20000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms)
  try { const r = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: ctl.signal }); const text = await r.text(); return { status: r.status, text, final: r.url } }
  catch (e) { return { status: 0, text: '', err: String(e.cause?.code || e.message || e).slice(0, 60) } } finally { clearTimeout(t) }
}

for (const p of ALL_PATHS) {
  for (const url of [p, p + '/']) {
    const r = await get(base + url)
    const ok = r.status === 200
    const pre = /<h1[\s>]/i.test(r.text)
    if (!ok) hardFail = true
    rows.push([ok ? (pre ? 'OK' : 'OK (no prerender)') : 'BROKEN', 'our page', url, r.status || r.err, r.final && r.final !== base + url ? `-> ${r.final.replace(base, '')}` : ''])
  }
}
for (const l of Object.values(LINKS)) {
  const r = await get(l.url)
  const gov = GOV.test(new URL(l.url).hostname)
  let verdict
  if (r.status === 200) verdict = 'OK'
  else if (r.status === 404 || r.status === 410) { verdict = 'BROKEN'; hardFail = true }
  else if (gov || !l.ok) verdict = 'blocked-by-site'
  else { verdict = 'BROKEN'; hardFail = true }
  rows.push([verdict, 'official link', l.url, r.status || r.err, l.ok ? '' : 'known: ' + l.note.slice(0, 50)])
}
const w = [18, 14, 70, 10]
console.log(`Checked against ${base} (${new Date().toISOString().slice(0, 10)})\n`)
console.log(['RESULT', 'WHAT', 'ADDRESS', 'STATUS', 'NOTE'].map((h, i) => h.padEnd(w[i] || 0)).join(' '))
for (const r of rows) console.log(r.map((c, i) => String(c).padEnd(w[i] || 0)).join(' '))
const count = (v) => rows.filter((r) => r[0].startsWith(v)).length
console.log(`\nOK ${count('OK')} · blocked-by-site ${count('blocked-by-site')} (open these in a browser) · BROKEN ${count('BROKEN')}`)
process.exit(hardFail ? 1 : 0)
