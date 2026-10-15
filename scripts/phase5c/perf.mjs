// Batch 9 Phase 5C.7 (partial) — WEB numbers (staging website, headless Chromium), NOT the app.
//   node scripts/phase5c/perf.mjs --part load|heap
// load : cold load (new context = empty cache, service workers blocked) of / and /mausam in a 412x915 phone
//        viewport with 4x CPU throttling (CDP Emulation.setCPUThrottlingRate), real network; 3 runs each, median.
//        Times from navigation start: first contentful paint (the prerendered HTML), and "live content" =
//        the hydrated app showing its own live data (/: place banner or nearby counts from the granted Sagar
//        position; /mausam: a temperature read from the weather service).
// heap : one context, ~3 minutes of in-app navigation over 12 screens (SPA navigations), JS heap via CDP
//        (Performance.getMetrics JSHeapUsedSize) at start, every lap, and after a forced GC at the end.
import { chromium } from 'playwright'
import * as C from './lib5c.mjs'

const part = C.arg('part', 'load')
const R = C.loadResults('perf')
const median = (a) => { const s = [...a].filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null }
const GEO = { latitude: 23.8388, longitude: 78.7378 }

async function ctxFor(b) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: C.UA, locale: 'hi-IN', serviceWorkers: 'block', permissions: ['geolocation'], geolocation: GEO })
  // no request interception here (it would distort timings); prod is never touched: only staging URLs are opened
  return ctx
}

C.memoryGuard()
C.heartbeat(`5C.7 perf ${part}`)
const b = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions'] })
try {
  if (part === 'load') {
    const targets = {
      '/': { live: () => !!document.querySelector('[data-testid="location-banner"], [data-testid="home-nearby-counts"]') },
      '/mausam': { live: () => /-?\d{1,2}(\.\d)?\s?°/.test(document.querySelector('main')?.innerText || '') },
    }
    for (const [path, tg] of Object.entries(targets)) {
      const runs = []
      for (let i = 0; i < 3; i++) {
        const ctx = await ctxFor(b); const page = await ctx.newPage()
        const cdp = await ctx.newCDPSession(page)
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
        const t0 = Date.now()
        await page.goto(C.BASE + path, { waitUntil: 'commit', timeout: 60000 })
        let live = null
        while (Date.now() - t0 < 60000) { if (await page.evaluate(tg.live).catch(() => false)) { live = Date.now() - t0; break } await page.waitForTimeout(100) }
        const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { fcp: fcp ? Math.round(fcp.startTime) : null, dcl: n ? Math.round(n.domContentLoadedEventEnd) : null, load: n ? Math.round(n.loadEventEnd) : null, transferKB: Math.round(performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024) } })
        runs.push({ run: i + 1, liveContentMs: live, ...nav })
        C.log(path, JSON.stringify(runs[runs.length - 1]))
        await ctx.close()
      }
      C.record(R, { id: `load:${path}`, title: `web cold load of ${path}, phone viewport, 4x CPU throttle, real network (3 runs, median)`, status: runs.every((r) => r.liveContentMs != null) ? 'RAN-PASSED' : 'RAN-FAILED', detail: { medianLiveContentMs: median(runs.map((r) => r.liveContentMs)), medianFcpMs: median(runs.map((r) => r.fcp)), medianDclMs: median(runs.map((r) => r.dcl)), runs, flag: median(runs.map((r) => r.liveContentMs)) > 5000 ? 'above 5 s' : null } })
      C.saveResults(R)
    }
  }
  if (part === 'heap') {
    const ctx = await ctxFor(b); const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Performance.enable')
    const heap = async () => { const m = await cdp.send('Performance.getMetrics'); const g = (n) => m.metrics.find((x) => x.name === n)?.value; return { usedMB: +(g('JSHeapUsedSize') / 1048576).toFixed(1), totalMB: +(g('JSHeapTotalSize') / 1048576).toFixed(1), nodes: g('Nodes'), listeners: g('JSEventListeners') } }
    await page.goto(C.BASE + '/', { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(3000)
    const start = await heap()
    const ROUTES = ['/mausam', '/msp', '/browse', '/listing/76e13f41-f2eb-4565-998a-5244640329b7', '/yojana', '/sawaal', '/cold-storage', '/bazaar', '/kisan-mela', '/search?q=gehu', '/about', '/']
    const laps = []
    const t0 = Date.now(); let n = 0
    while (Date.now() - t0 < 180000) {
      for (const r of ROUTES) {
        await page.evaluate((r) => { window.history.pushState({}, '', r); window.dispatchEvent(new PopStateEvent('popstate')) }, r)
        await page.waitForTimeout(1200); n++
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)).catch(() => {})
        await page.waitForTimeout(300)
      }
      laps.push({ atS: Math.round((Date.now() - t0) / 1000), ...(await heap()) })
    }
    const end = await heap()
    await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage')
    await page.waitForTimeout(1500)
    const afterGc = await heap()
    const st = await C.pageState(page)
    await ctx.close()
    C.record(R, { id: 'heap:3min', title: 'web JS heap after ~3 minutes of in-app navigation (12 screens per lap)', status: st.errorBoundary ? 'RAN-FAILED' : 'RAN-PASSED', detail: { navigations: n, start, end, afterForcedGc: afterGc, laps, growthAfterGcMB: +(afterGc.usedMB - start.usedMB).toFixed(1), note: 'no pass/fail threshold invented; a steady climb across laps after GC would suggest a leak' } })
    C.saveResults(R)
  }
} finally {
  C.saveResults(R)
  await b.close()
}
