#!/usr/bin/env node
// Batch 9 Phase 2 — prove the Workbox navigateFallbackDenylist with a REAL service worker.
//
//   node scripts/verify-batch9-sw.mjs --dist <built dist dir> --label NEW|OLD --out <evidence dir> [--port 4818]
//
// Serves <dist> with a tiny static server (real files with real content types; prerendered
// <route>/index.html; SPA fallback to /index.html for everything else — like Cloudflare Pages),
// opens it in Playwright Chromium, waits until the SW controls the page, then navigates to
// /sitemap.xml, /robots.txt, /sitemap-pages.xml and asserts the body is the real XML/text,
// not the app shell. Also checks deep links (/mausam, /browse, unknown path → app 404) and
// validates the sitemap XML files + robots.txt on disk. Writes results-<label>.json and
// screenshots into <out>. Exit code 0 = every assertion passed.
import http from 'node:http'
import { readFile, stat, mkdir, writeFile, readdir } from 'node:fs/promises'
import { join, extname, resolve } from 'node:path'
import { chromium } from 'playwright'
import { DOMParser } from '@xmldom/xmldom'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const DIST = resolve(arg('--dist', 'dist'))
const LABEL = arg('--label', 'NEW')
const OUT = resolve(arg('--out', 'docs/review/batch9/evidence/phase2'))
const PORT = Number(arg('--port', '4818'))
const ORIGIN = `http://localhost:${PORT}`

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' }
const isFile = async (p) => { try { return (await stat(p)).isFile() } catch { return false } }

const serverLog = []
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, ORIGIN).pathname)
  let file = join(DIST, path)
  let how = 'file'
  if (!(await isFile(file))) {
    if (await isFile(join(file, 'index.html'))) { file = join(file, 'index.html'); how = 'prerendered' }
    else { file = join(DIST, 'index.html'); how = 'spa-fallback' }
  }
  serverLog.push(`${req.method} ${path} -> ${how}`)
  const body = await readFile(file)
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' })
  res.end(body)
})

const results = { label: LABEL, dist: DIST, origin: ORIGIN, startedAt: new Date().toISOString(), files: {}, sw: {}, realFiles: [], deepLinks: [], consoleErrors: [], failedRequests: [], pass: false }
const checks = []
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`) }

// ---- 1. files on disk ---------------------------------------------------------------
const swText = await readFile(join(DIST, 'sw.js'), 'utf8')
const deny = swText.match(/denylist:\[[^\]]*\]/)
results.files.swDenylist = deny ? deny[0] : null
check('sw.js contains navigateFallback denylist', !!deny, deny ? deny[0] : 'not found')
const sitemaps = (await readdir(DIST)).filter((f) => /^sitemap.*\.xml$/.test(f))
results.files.sitemaps = {}
for (const f of ['sitemap.xml', 'sitemap-pages.xml', 'sitemap-sawaal.xml', 'sitemap-cold-storage.xml', 'sitemap-schemes.xml']) {
  if (!sitemaps.includes(f)) { check(`${f} exists`, false); continue }
  const txt = await readFile(join(DIST, f), 'utf8')
  const errs = []
  const doc = new DOMParser({ onError: (lvl, msg) => { if (lvl !== 'warning') errs.push(`${lvl}: ${msg}`) } }).parseFromString(txt, 'application/xml')
  const root = doc.documentElement?.nodeName
  const locs = [...txt.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  const badLoc = locs.filter((l) => !l.startsWith('https://kissansahyog.com/'))
  results.files.sitemaps[f] = { bytes: txt.length, root, locs: locs.length, parseErrors: errs, nonProdLocs: badLoc.slice(0, 5) }
  check(`${f} is valid XML`, errs.length === 0 && (f === 'sitemap.xml' ? root === 'sitemapindex' : root === 'urlset') && locs.length > 0 && badLoc.length === 0, `root=${root}, ${locs.length} <loc>, ${errs.length} parse errors, ${badLoc.length} non-prod locs`)
}
const robots = await readFile(join(DIST, 'robots.txt'), 'utf8')
results.files.robots = robots
check('robots.txt points to https://kissansahyog.com/sitemap.xml', /^Sitemap:\s*https:\/\/kissansahyog\.com\/sitemap\.xml\s*$/m.test(robots))

// ---- 2. real service worker in a browser ----------------------------------------------
await mkdir(OUT, { recursive: true })
await new Promise((r) => server.listen(PORT, r))
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, serviceWorkers: 'allow' })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push({ url: page.url(), text: m.text().slice(0, 300) }) })
page.on('pageerror', (e) => results.consoleErrors.push({ url: page.url(), text: 'pageerror: ' + String(e).slice(0, 300) }))
page.on('requestfailed', (r) => results.failedRequests.push({ url: r.url().slice(0, 200), error: r.failure()?.errorText }))
page.on('response', (r) => { if (r.status() >= 400) results.failedRequests.push({ url: r.url().slice(0, 200), status: r.status() }) })

try {
  await page.goto(ORIGIN + '/', { waitUntil: 'load' })
  const t0 = Date.now()
  let controlled = false
  for (let i = 0; i < 60 && !controlled; i++) {
    controlled = await page.evaluate(() => !!navigator.serviceWorker?.controller)
    if (!controlled) await page.waitForTimeout(500)
  }
  if (!controlled) { await page.reload({ waitUntil: 'load' }); controlled = await page.evaluate(() => !!navigator.serviceWorker?.controller) }
  results.sw.controlled = controlled
  results.sw.secondsToControl = (Date.now() - t0) / 1000
  results.sw.scriptURL = await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL || null)
  check('service worker controls the page', controlled, results.sw.scriptURL)

  const real = [
    { path: '/sitemap.xml', expect: (b) => b.trimStart().startsWith('<?xml') && b.includes('<sitemapindex') },
    { path: '/robots.txt', expect: (b) => /^User-agent:/m.test(b) && b.includes('Sitemap: https://kissansahyog.com/sitemap.xml') },
    { path: '/sitemap-pages.xml', expect: (b) => b.trimStart().startsWith('<?xml') && b.includes('<urlset') },
  ]
  for (const r of real) {
    const resp = await page.goto(ORIGIN + r.path, { waitUntil: 'load' })
    const body = (await resp.text()) || ''
    const isAppShell = /<div id="root"/i.test(body) || /^<!doctype html/i.test(body.trimStart())
    const row = { path: r.path, status: resp.status(), contentType: resp.headers()['content-type'], fromServiceWorker: resp.fromServiceWorker(), isAppShell, bodyStart: body.slice(0, 120) }
    await page.waitForTimeout(800)
    const shot = `${LABEL.toLowerCase()}-${r.path.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}.png`
    await page.screenshot({ path: join(OUT, shot) })
    row.screenshot = shot
    results.realFiles.push(row)
    check(`${r.path} served as the real file under the SW`, !isAppShell && r.expect(body), `status ${row.status}, ${row.contentType}, fromSW=${row.fromServiceWorker}, starts: ${JSON.stringify(body.slice(0, 40))}`)
  }

  const deep = [
    { path: '/mausam', is404: false },
    { path: '/browse', is404: false },
    { path: '/yeh-page-nahi-hai-batch9', is404: true },
  ]
  for (const d of deep) {
    const resp = await page.goto(ORIGIN + d.path, { waitUntil: 'load' })
    await page.waitForSelector('#root *', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const text = await page.evaluate(() => document.body.innerText || '')
    const has404 = /यह पेज नहीं मिला \(404\)|This page wasn't found \(404\)/.test(text)
    const shot = `${LABEL.toLowerCase()}-deep-${d.path.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}.png`
    await page.screenshot({ path: join(OUT, shot) })
    const row = { path: d.path, status: resp?.status(), fromServiceWorker: resp?.fromServiceWorker(), swControlled: await page.evaluate(() => !!navigator.serviceWorker?.controller), showsApp404: has404, textStart: text.slice(0, 100).replace(/\s+/g, ' '), screenshot: shot }
    results.deepLinks.push(row)
    check(`deep link ${d.path} ${d.is404 ? 'shows the app 404' : 'renders the app screen (not 404)'}`, row.swControlled && row.fromServiceWorker && text.length > 20 && has404 === d.is404, `fromSW=${row.fromServiceWorker}, 404=${has404}`)
  }
} catch (e) {
  check('browser run completed', false, String(e).slice(0, 300))
} finally {
  await browser.close()
  server.close()
}

results.checks = checks
results.serverLog = serverLog.filter((l) => !l.includes('/assets/')).slice(0, 80)
results.pass = checks.every((c) => c.ok)
results.finishedAt = new Date().toISOString()
await writeFile(join(OUT, `results-${LABEL.toLowerCase()}.json`), JSON.stringify(results, null, 2))
console.log(`\n${LABEL}: ${checks.filter((c) => c.ok).length} passed, ${checks.filter((c) => !c.ok).length} failed → ${results.pass ? 'ALL PASS' : 'FAILURES'}`)
process.exit(results.pass ? 0 : 1)
