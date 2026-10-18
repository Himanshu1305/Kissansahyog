// Batch 10D — homepage performance measurement (baseline in Task A, gate in Task E).
//
// Usage:
//   node scripts/batch10d/perf.mjs <baseURL> <outJson> [--runs N] [--label X] [--dist DIR] [--path /]
//   node scripts/batch10d/perf.mjs <baseURL> <outJson> --photo-check [--label X]
//
// Default mode (slow phone), per run in a FRESH browser context:
//   360x640, isMobile + hasTouch, deviceScaleFactor 2, service workers blocked, HTTP cache disabled,
//   CPU throttling 4x (CDP Emulation.setCPUThrottlingRate) and the Lighthouse mobile "Slow 4G"
//   profile via CDP Network.emulateNetworkConditions (values in NET below and in the JSON),
//   language Hindi (localStorage ks_lang_v1 = 'hi' via addInitScript), logged out.
//   Measures on <path> (default '/'):
//     LCP  — last 'largest-contentful-paint' entry (buffered observer), read after load + 5 s settle
//            (and never before 10 s after navigation start); element tag/id/class/text snippet.
//     CLS  — sum of 'layout-shift' values without hadRecentInput, up to the read time (~10 s+);
//            cls10s = the same sum limited to shifts starting within the first 10 s.
//     FCP  — 'first-contentful-paint' paint entry.
//     TBT  — sum over long tasks of (part of the task inside [FCP, 10 s]) − 50 ms, if positive
//            (Lighthouse-style clipping, but window ends at 10 s instead of TTI).
//     Long tasks list (start, duration), request log (url, status, encoded bytes, failed),
//     requests + bytes for /images/home/hero-farmer.jpg.
//   With --dist DIR, every /assets/*.js the run requested is gzip -9 sized from DIR (Node zlib).
//   Median of every metric over the runs is reported (default 5 runs).
//
// --photo-check mode: no throttling; one context at 360x640 (mobile) and one at 1280x720 (desktop);
//   counts requests for /images/home/hero-farmer.jpg after load + 3 s, and again after scrolling
//   to the bottom of the page and back (lazy content).
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const args = process.argv.slice(2)
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--runs', '--label', '--dist', '--path'].includes(args[i - 1])))
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const BASE = (pos[0] || 'http://localhost:4173').replace(/\/$/, '')
const OUT = pos[1] || 'perf.json'
const RUNS = Number(opt('--runs', 5))
const LABEL = opt('--label', '')
const DIST = opt('--dist', '')
const PAGE_PATH = opt('--path', '/')
const PHOTO_CHECK = args.includes('--photo-check')
const PHOTO = '/images/home/hero-farmer.jpg'

// Lighthouse mobile "Slow 4G" (simulated: 150 ms RTT, 1.6 Mbps down, 750 Kbps up), devtools-throttling
// variant: RTT x 3.75 and throughput x 0.9. Byte values as fixed by the 10D orchestrator
// (1.6 Mbps x 0.9 = 1.44 Mbps ~ 180000 B/s; 750 Kbps x 0.9 = 675 Kbps = 84375 B/s).
const NET = { offline: false, latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 }
const CPU_RATE = 4
const SETTLE_MS = 5000
const WINDOW_MS = 10000

function initScript() {
  try { localStorage.setItem('ks_lang_v1', 'hi') } catch { /* ignore */ }
  const w = window
  w.__perf = { lcp: null, cls: 0, shifts: [], lt: [] }
  const snip = (el) => {
    if (!el) return null
    const cls = typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class')) || ''
    return {
      tag: el.tagName, id: el.id || null, class: cls.slice(0, 160) || null,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) || null,
      src: el.currentSrc || el.src || null,
    }
  }
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        w.__perf.lcp = { startTime: Math.round(e.startTime), renderTime: Math.round(e.renderTime || 0), loadTime: Math.round(e.loadTime || 0), size: e.size, url: e.url || null, element: snip(e.element) }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch { /* unsupported */ }
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue
        w.__perf.cls += e.value
        w.__perf.shifts.push({ t: Math.round(e.startTime), v: Number(e.value.toFixed(5)), nodes: (e.sources || []).map((s) => snip(s.node)?.tag + (s.node?.className && typeof s.node.className === 'string' ? '.' + s.node.className.split(' ')[0] : '')) })
      }
    }).observe({ type: 'layout-shift', buffered: true })
  } catch { /* unsupported */ }
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__perf.lt.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) })
    }).observe({ type: 'longtask', buffered: true })
  } catch { /* unsupported */ }
}

const median = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}
const gz = (file) => zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length

async function newCtx(browser, { width, height, mobile }) {
  return browser.newContext({
    viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
    serviceWorkers: 'block',
  })
}

function trackNetwork(cdp) {
  const reqs = new Map()
  cdp.on('Network.requestWillBeSent', (e) => { reqs.set(e.requestId, { url: e.request.url, type: e.type, t: e.timestamp }) })
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.fromCache = e.response.fromDiskCache || e.response.fromServiceWorker } })
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength })
  cdp.on('Network.loadingFailed', (e) => { const r = reqs.get(e.requestId); if (r) { r.failed = e.errorText; r.canceled = !!e.canceled } })
  return reqs
}
const photoStats = (reqs) => {
  const p = [...reqs.values()].filter((r) => r.url.includes(PHOTO))
  return { requests: p.length, bytes: p.reduce((s, r) => s + (r.bytes || 0), 0), statuses: p.map((r) => r.status ?? r.failed ?? null) }
}

async function slowRun(browser, i) {
  const ctx = await newCtx(browser, { width: 360, height: 640, mobile: true })
  await ctx.addInitScript(initScript)
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', NET)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE })
  const reqs = trackNetwork(cdp)

  const t0 = Date.now()
  await page.goto(BASE + PAGE_PATH, { waitUntil: 'load', timeout: 120_000 })
  const loadWallMs = Date.now() - t0
  // Settle: load + 5 s, and at least 10 s after navigation start (page clock).
  const nowMs = await page.evaluate(() => performance.now())
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? { loadEventEnd: Math.round(n.loadEventEnd), domContentLoaded: Math.round(n.domContentLoadedEventEnd), responseEnd: Math.round(n.responseEnd) } : null })
  const waitMs = Math.max(SETTLE_MS, WINDOW_MS + 200 - nowMs)
  await page.waitForTimeout(waitMs)
  const m = await page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]
    return { ...window.__perf, fcp: fcp ? Math.round(fcp.startTime) : null, readAt: Math.round(performance.now()) }
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await ctx.close()

  const fcp = m.fcp ?? 0
  let tbt = 0
  for (const t of m.lt) {
    const s = Math.max(t.start, fcp)
    const e = Math.min(t.start + t.dur, WINDOW_MS)
    if (e <= s) continue
    // Lighthouse clips the task to the window and counts (clipped duration − 50).
    tbt += Math.max(0, (e - s) - 50)
  }
  const list = [...reqs.values()]
  const assetJs = list.filter((r) => /\/assets\/[^?]+\.js(\?|$)/.test(r.url))
  const chunks = assetJs.map((r) => {
    const name = new URL(r.url).pathname.replace(/^\//, '')
    const c = { url: r.url, transferBytes: r.bytes ?? null, status: r.status ?? null, failed: r.failed || null }
    if (DIST) { const f = path.join(DIST, name); if (fs.existsSync(f)) { c.rawBytes = fs.statSync(f).size; c.gzip9Bytes = gz(f) } }
    return c
  })
  return {
    run: i + 1,
    lcpMs: m.lcp?.startTime ?? null, lcp: m.lcp, cls: Number(m.cls.toFixed(5)),
    cls10s: Number(m.shifts.filter((x) => x.t <= WINDOW_MS).reduce((a, x) => a + x.v, 0).toFixed(5)), shifts: m.shifts,
    fcpMs: m.fcp, tbtMs: Math.round(tbt), longTasks: m.lt, maxLongTaskMs: m.lt.reduce((x, t) => Math.max(x, t.dur), 0),
    loadWallMs, nav, readAtMs: m.readAt,
    heroFarmerJpg: photoStats(reqs),
    requests: list.length, transferBytes: list.reduce((s, r) => s + (r.bytes || 0), 0),
    failedRequests: list.filter((r) => r.failed).map((r) => ({ url: r.url, error: r.failed })),
    jsChunks: chunks,
    jsChunksGzip9Total: DIST ? chunks.filter((c) => !c.failed).reduce((s, c) => s + (c.gzip9Bytes || 0), 0) : null,
    consoleErrors,
    requestLog: list.map((r) => ({ url: r.url, type: r.type, status: r.status ?? null, bytes: r.bytes ?? null, failed: r.failed || null })),
  }
}

async function photoRun(browser, vp) {
  const ctx = await newCtx(browser, vp)
  await ctx.addInitScript(() => { try { localStorage.setItem('ks_lang_v1', 'hi') } catch { /* ignore */ } })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  const reqs = trackNetwork(cdp)
  await page.goto(BASE + PAGE_PATH, { waitUntil: 'load', timeout: 60_000 })
  await page.waitForTimeout(3000)
  const afterLoad = photoStats(reqs)
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight
    for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(1500)
  const afterScroll = photoStats(reqs)
  await ctx.close()
  return { viewport: `${vp.width}x${vp.height}`, mobile: vp.mobile, afterLoad, afterScroll }
}

const browser = await chromium.launch()
let out
try {
  if (PHOTO_CHECK) {
    const results = []
    for (const vp of [{ width: 360, height: 640, mobile: true }, { width: 1280, height: 720, mobile: false }]) results.push(await photoRun(browser, vp))
    out = { label: LABEL, mode: 'photo-check', baseURL: BASE, path: PAGE_PATH, photo: PHOTO, throttling: 'none', date: new Date().toISOString(), results }
  } else {
    const runs = []
    for (let i = 0; i < RUNS; i++) {
      const r = await slowRun(browser, i)
      runs.push(r)
      console.log(`run ${i + 1}: LCP ${r.lcpMs} ms (${r.lcp?.element?.tag}) CLS ${r.cls} (10s ${r.cls10s}) TBT ${r.tbtMs} ms FCP ${r.fcpMs} ms longTasks ${r.longTasks.length} (max ${r.maxLongTaskMs}) photo ${r.heroFarmerJpg.requests}x/${r.heroFarmerJpg.bytes}B`)
    }
    out = {
      label: LABEL, mode: 'slow-phone', baseURL: BASE, path: PAGE_PATH, date: new Date().toISOString(),
      profile: {
        viewport: '360x640', deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', cacheDisabled: true,
        cpuThrottlingRate: CPU_RATE,
        network: { name: 'Lighthouse mobile Slow 4G (devtools throttling: 150 ms RTT x 3.75, 1.6 Mbps x 0.9, 750 Kbps x 0.9)', ...NET, latencyUnit: 'ms', throughputUnit: 'bytes/s' },
        language: 'hi (localStorage ks_lang_v1)', loggedIn: false,
        settle: `read at max(load + ${SETTLE_MS} ms, ${WINDOW_MS} ms after navigation)`, tbtWindow: `[FCP, ${WINDOW_MS} ms]`,
      },
      runs: RUNS,
      median: {
        lcpMs: median(runs.map((r) => r.lcpMs)), cls: median(runs.map((r) => r.cls)), cls10s: median(runs.map((r) => r.cls10s)), tbtMs: median(runs.map((r) => r.tbtMs)),
        fcpMs: median(runs.map((r) => r.fcpMs)), maxLongTaskMs: median(runs.map((r) => r.maxLongTaskMs)),
        loadWallMs: median(runs.map((r) => r.loadWallMs)), requests: median(runs.map((r) => r.requests)),
        transferBytes: median(runs.map((r) => r.transferBytes)), heroFarmerJpgRequests: median(runs.map((r) => r.heroFarmerJpg.requests)),
        jsChunksGzip9Total: DIST ? median(runs.map((r) => r.jsChunksGzip9Total)) : null,
      },
      all: runs,
    }
    console.log('median', JSON.stringify(out.median))
  }
} finally {
  await browser.close()
}
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
console.log('wrote', OUT)
