#!/usr/bin/env node
// Batch 9 (1C) — /cold-storage on the WEBSITE, in desktop + mobile Chromium (Playwright).
//   node scripts/test/batch9_coldstorage_web.mjs [--dist dist] [--out <dir for evidence>]
// Serves an existing web build with `vite preview` (build first: npm run build or build:full).
// Read-only: the only database call is the public cold_storage_public view.
//   A. success path: the list renders (cards / district links), no "could not load" notice.
//   B. failed load (the cold_storage_public request aborted): the offline notice with "try again"
//      shows, no uncaught page error, no empty list left without a message.
//   C. "try again" with the network back: the list renders.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const DIST = path.resolve(ROOT, arg('--dist', 'dist'))
const OUT = arg('--out', null) ? path.resolve(ROOT, arg('--out')) : null
if (OUT) fs.mkdirSync(OUT, { recursive: true })
const PORT = 4181
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let pass = 0, fail = 0
const results = []
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); results.push({ name: n, pass: !!ok, detail: d || undefined }); ok ? pass++ : fail++ }

if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.log(`FAIL  no web build at ${DIST} (run npm run build:full first)`); process.exit(1) }
const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
const preview = spawn(process.execPath, [vite, 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' })
let browser
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break } catch { /* not yet */ } await sleep(500) }
  browser = await chromium.launch()
  for (const vp of [{ name: 'desktop', viewport: { width: 1280, height: 900 } }, { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true }]) {
    // Service workers off: a cached response would hide the blocked request.
    const ctx = await browser.newContext({ viewport: vp.viewport, isMobile: !!vp.isMobile, serviceWorkers: 'block' })
    const page = await ctx.newPage()
    const pageErrors = []
    const consoleErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e.message || e)))
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    const visible = () => page.evaluate(() => ({
      notice: !!document.querySelector('[data-testid="offline-notice"]'),
      retry: !!document.querySelector('[data-testid="offline-notice"] [data-testid="offline-retry"]'),
      noticeText: document.querySelector('[data-testid="offline-notice"]')?.innerText.trim() || null,
      districtLinks: document.querySelectorAll('a[href^="/cold-storage/"]').length,
      h1: document.querySelector('h1')?.innerText || null,
      spinners: document.querySelectorAll('.animate-spin').length,
    }))

    // A. success
    await page.goto(`http://127.0.0.1:${PORT}/cold-storage`, { waitUntil: 'load' })
    let a = null
    for (let i = 0; i < 40; i++) { a = await visible(); if (a.districtLinks > 0 || a.notice) break; await sleep(500) }
    check(`${vp.name} A: success path lists the cold storages (district links) and shows no failure notice`, a.districtLinks > 0 && !a.notice, JSON.stringify(a))
    if (OUT) await page.screenshot({ path: path.join(OUT, `web-${vp.name}-A-success.jpg`), type: 'jpeg', quality: 55 })
    const errA = pageErrors.length

    // B. failed load: block the directory request (page load itself is fine)
    let blocked = 0
    await page.route(/cold_storage_public/, (r) => { blocked++; return r.abort('internetdisconnected') })
    await page.goto(`http://127.0.0.1:${PORT}/cold-storage`, { waitUntil: 'load' })
    let b = null
    for (let i = 0; i < 40; i++) { b = await visible(); if (b.notice) break; await sleep(500) }
    await sleep(800)
    b = await visible()
    check(`${vp.name} B: the directory request was really blocked`, blocked > 0, `${blocked} request(s)`)
    check(`${vp.name} B: failed load shows the "could not load" notice with "try again"`, b.notice && b.retry, JSON.stringify(b))
    check(`${vp.name} B: no uncaught page error`, pageErrors.length === errA, JSON.stringify(pageErrors.slice(errA)))
    check(`${vp.name} B: no spinner left, page heading still there`, b.spinners === 0 && !!b.h1, JSON.stringify({ spinners: b.spinners, h1: b.h1 }))
    if (OUT) await page.screenshot({ path: path.join(OUT, `web-${vp.name}-B-failed.jpg`), type: 'jpeg', quality: 55 })

    // C. network back, "try again"
    await page.unroute(/cold_storage_public/)
    await page.click('[data-testid="offline-retry"]')
    let c = null
    for (let i = 0; i < 40; i++) { c = await visible(); if (c.districtLinks > 0 && !c.notice) break; await sleep(500) }
    check(`${vp.name} C: "try again" with the network back loads the list`, c.districtLinks > 0 && !c.notice, JSON.stringify(c))
    if (OUT) await page.screenshot({ path: path.join(OUT, `web-${vp.name}-C-retry.jpg`), type: 'jpeg', quality: 55 })
    results.push({ viewport: vp.name, consoleErrors: consoleErrors.slice(0, 10) })
    await ctx.close()
  }
} catch (e) {
  check('test ran without throwing', false, String(e.message || e).split('\n')[0])
} finally {
  await browser?.close().catch(() => {})
  preview.kill()
}
if (OUT) fs.writeFileSync(path.join(OUT, 'web-coldstorage.json'), JSON.stringify({ at: new Date().toISOString(), pass, fail, results }, null, 2) + '\n')
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
