// Batch 10C Task F.10 — slow-phone check of the Guide against a local production build.
// Needs `vite build --mode staging` in dist/ and `npx vite preview --port 4173` running.
// Usage: node scripts/batch10c/slow-phone.mjs [baseURL]  (default http://localhost:4173)
// Per page, in a fresh (cold-cache) context, 360x640, CPU throttled 4x, network ~1.6 Mbps down /
// ~750 Kbps up / 150 ms latency (CDP):
//   - time from navigation start until the first demo screen (hub: the four cards) is visible
//   - a full play-through at NORMAL speed (no __KS_GUIDE_SPEED): every step in order, ends finished
//   - long tasks (PerformanceObserver 'longtask') during play: count > 200 ms, max duration
// Plus the gzip -9 size of the guide route chunks in dist/assets.
// Writes docs/review/batch10c/evidence/slow-phone.json and slow-phone.md.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = 'docs/review/batch10c/evidence'
const PAGES = ['/guide', '/guide/register', '/guide/post', '/guide/find', '/guide/tour']
const STEPS = { register: 9, post: 14, find: 8 } // checked against the demo modules below
const TARGETS = { hubMs: 4000, longTaskMs: 300, chunkKb: 40 }

const { DEMOS } = await import('../../src/features/guide/demos/index.js')
for (const id of Object.keys(STEPS)) STEPS[id] = DEMOS[id].steps.length

function initScript() {
  window.__lt = []
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }) })
      .observe({ type: 'longtask', buffered: true })
  } catch { /* no longtask support */ }
  window.__seen = {}
  window.__steps = []
  window.__tabs = []
  const sel = { hub: '[data-testid="guide-card-register"]', screen: '[data-testid="demo-screen"]' }
  const tick = () => {
    for (const [k, s] of Object.entries(sel)) {
      if (window.__seen[k]) continue
      const el = document.querySelector(s)
      if (el) { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) window.__seen[k] = Math.round(performance.now()) }
    }
    const p = document.querySelector('[data-testid="demo-player"]')
    if (p) {
      const v = `${p.getAttribute('data-step')}:${p.getAttribute('data-state')}`
      if (window.__steps.at(-1)?.v !== v) window.__steps.push({ v, t: Math.round(performance.now()) })
    }
    const tour = document.querySelector('[data-testid="tour-explorer"]')
    if (tour) {
      const v = tour.getAttribute('data-tab')
      if (window.__tabs.at(-1)?.v !== v) window.__tabs.push({ v, t: Math.round(performance.now()) })
      if (!window.__tourFin && document.querySelector('[data-testid="demo-finish"]')) window.__tourFin = Math.round(performance.now())
    }
  }
  const go = () => new MutationObserver(tick).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-step', 'data-state', 'data-tab'] })
  if (document.documentElement) go(); else document.addEventListener('DOMContentLoaded', go)
  try { localStorage.setItem('ks_lang_v1', 'hi') } catch { /* ignore */ }
}

const browser = await chromium.launch()
const results = []
for (const p of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  await ctx.addInitScript(initScript)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  let bytes = 0
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength || 0 })

  const r = { page: p }
  const wall0 = Date.now()
  await page.goto(BASE + p, { waitUntil: 'commit', timeout: 60_000 })
  const key = p === '/guide' ? 'hub' : 'screen'
  await page.waitForFunction((k) => window.__seen?.[k], key, { timeout: 60_000, polling: 50 })
  r.visibleMs = await page.evaluate((k) => window.__seen[k], key)
  r.fcpMs = await page.evaluate(() => Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0))
  r.wallVisibleMs = Date.now() - wall0
  await page.waitForLoadState('load', { timeout: 60_000 }).catch(() => {})
  r.loadLongTasks = await page.evaluate(() => window.__lt.filter((e) => e.dur > 200))

  if (p === '/guide') {
    // hub "usable": a tap on a card navigates. Measure the first long task-free moment too.
    r.cardsVisible = await page.locator('[data-testid^="guide-card-"]').count()
    r.loadAllLongTasks = await page.evaluate(() => window.__lt)
  } else if (p === '/guide/tour') {
    await page.waitForFunction(() => window.__tourFin, null, { timeout: 120_000, polling: 250 })
    const tabs = await page.evaluate(() => window.__tabs)
    const playStart = tabs[0]?.t || 0
    const lt = await page.evaluate((s) => window.__lt.filter((e) => e.start >= s), playStart)
    r.sequence = tabs.map((x) => x.v)
    r.noSkip = JSON.stringify(r.sequence) === JSON.stringify(['mandi', 'weather', 'schemes', 'questions', 'market'])
    r.finished = true
    r.playMs = (await page.evaluate(() => window.__tourFin)) - playStart
    r.playLongTasksOver200 = lt.filter((e) => e.dur > 200).length
    r.playMaxLongTask = lt.reduce((m, e) => Math.max(m, e.dur), 0)
    r.playLongTasks = lt
  } else {
    const id = p.split('/').pop()
    await page.waitForFunction(() => document.querySelector('[data-testid="demo-player"]')?.getAttribute('data-state') === 'finished', null, { timeout: 240_000, polling: 250 })
    const steps = await page.evaluate(() => window.__steps)
    const playing = steps.filter((s) => !s.v.endsWith(':idle'))
    const playStart = playing[0]?.t || 0
    const seq = [...new Set(playing.filter((s) => s.v.endsWith(':playing')).map((s) => Number(s.v.split(':')[0])))]
    r.sequence = seq
    r.noSkip = JSON.stringify(seq) === JSON.stringify(Array.from({ length: STEPS[id] }, (_, i) => i))
    r.finished = playing.at(-1)?.v.endsWith(':finished') || false
    r.playMs = (playing.at(-1)?.t || 0) - playStart
    const lt = await page.evaluate((s) => window.__lt.filter((e) => e.start >= s), playStart)
    r.playLongTasksOver200 = lt.filter((e) => e.dur > 200).length
    r.playMaxLongTask = lt.reduce((m, e) => Math.max(m, e.dur), 0)
    r.playLongTasks = lt
  }
  r.transferKB = Math.round(bytes / 1024)
  r.errors = errors
  results.push(r)
  console.log(JSON.stringify({ page: p, visibleMs: r.visibleMs, fcpMs: r.fcpMs, playMs: r.playMs, noSkip: r.noSkip, finished: r.finished, lt200: r.playLongTasksOver200, maxLt: r.playMaxLongTask, loadLt: r.loadLongTasks?.map((e) => e.dur), kb: r.transferKB, errors: errors.length }))
  await ctx.close()
}
await browser.close()

// chunk sizes (gzip -9)
const dir = 'dist/assets'
const files = fs.readdirSync(dir).filter((f) => /^(DemoPlayer|GuideDemoPage|GuideHub|GuideSheet|GuideHelpButton|useLoopActive|guide|catalog|disclaimers)-[\w-]+\.(js|css)$/.test(f))
const chunks = files.map((f) => {
  const buf = fs.readFileSync(path.join(dir, f))
  return { file: f, raw: buf.length, gz9: zlib.gzipSync(buf, { level: 9 }).length }
})
const routeSet = (re) => chunks.filter((c) => re.test(c.file)).reduce((a, c) => ({ raw: a.raw + c.raw, gz9: a.gz9 + c.gz9 }), { raw: 0, gz9: 0 })
const routes = {
  '/guide/:id (GuideDemoPage + DemoPlayer + useLoopActive + guide js + guide css)': routeSet(/^(GuideDemoPage|DemoPlayer|useLoopActive|guide)-/),
  '/guide/:id JS only': routeSet(/^(GuideDemoPage|DemoPlayer|useLoopActive|guide)-.*\.js$/),
  '/guide/:id + the shared app chunks it also needs (catalog, disclaimers)': routeSet(/^(GuideDemoPage|DemoPlayer|useLoopActive|guide|catalog|disclaimers)-/),
  '/guide hub (GuideHub + useLoopActive + guide js + guide css)': routeSet(/^(GuideHub|useLoopActive|guide)-/),
  'help sheet (GuideSheet + DemoPlayer + guide js + css)': routeSet(/^(GuideSheet|DemoPlayer|guide)-/),
  'all guide-only chunks (no catalog / disclaimers)': routeSet(/^(?!catalog|disclaimers)/),
}

const hub = results.find((r) => r.page === '/guide')
const demos = results.filter((r) => r.page !== '/guide')
const maxPlayLt = Math.max(...demos.map((r) => r.playMaxLongTask))
const routeGz = routes['/guide/:id (GuideDemoPage + DemoPlayer + useLoopActive + guide js + guide css)'].gz9
const verdict = {
  hubUsable: { value: hub.visibleMs, target: TARGETS.hubMs, pass: hub.visibleMs <= TARGETS.hubMs },
  longTaskDuringPlay: { value: maxPlayLt, target: TARGETS.longTaskMs, pass: maxPlayLt <= TARGETS.longTaskMs },
  allFinishNoSkip: { pass: demos.every((r) => r.finished && r.noSkip) },
  chunkGz: { value: routeGz, target: TARGETS.chunkKb * 1024, pass: routeGz <= TARGETS.chunkKb * 1024 },
}
const json = { when: new Date().toISOString(), base: BASE, conditions: { viewport: '360x640', cpu: '4x', down: '200,000 B/s (~1.6 Mbps)', up: '93,750 B/s (~750 Kbps)', latency: '150 ms', cache: 'cold (new context, cache disabled)', serviceWorker: 'blocked', lang: 'hi', speed: 'normal (no __KS_GUIDE_SPEED)' }, results, chunks, routes, verdict }
fs.writeFileSync(`${OUT}/slow-phone.json`, JSON.stringify(json, null, 2))

const kb = (b) => (b / 1024).toFixed(1)
const md = [
  '# Batch 10C — slow-phone check (F.10)',
  '',
  `Run ${json.when} by \`node scripts/batch10c/slow-phone.mjs\` against \`vite preview\` (production build, staging mode).`,
  'Conditions: 360x640 touch, CPU 4x slower, ~1.6 Mbps down / ~750 Kbps up / 150 ms latency (CDP), cold cache, service worker blocked, Hindi, NORMAL demo speed.',
  '',
  '| Page | First screen visible (from navigation start) | FCP | Play-through | Steps in order / finished | Long tasks > 200 ms during play | Longest task during play | Long tasks > 200 ms during load | Transferred |',
  '|---|---|---|---|---|---|---|---|---|',
  ...results.map((r) => `| \`${r.page}\` | ${r.visibleMs} ms | ${r.fcpMs} ms | ${r.playMs ? (r.playMs / 1000).toFixed(1) + ' s' : '—'} | ${r.page === '/guide' ? `${r.cardsVisible} cards` : `${r.noSkip ? 'yes' : 'NO'} (${r.sequence.join(',')}) / ${r.finished ? 'yes' : 'NO'}`} | ${r.page === '/guide' ? '—' : r.playLongTasksOver200} | ${r.page === '/guide' ? '—' : r.playMaxLongTask + ' ms'} | ${r.loadLongTasks.length ? r.loadLongTasks.map((e) => e.dur + ' ms').join(', ') : 'none'} | ${r.transferKB} KB |`),
  '',
  '## Guide chunks (dist/assets, gzip -9)',
  '',
  '| File | Raw | gzip -9 |',
  '|---|---|---|',
  ...chunks.map((c) => `| ${c.file} | ${kb(c.raw)} KB | ${kb(c.gz9)} KB |`),
  '',
  '| Route set | Raw | gzip -9 |',
  '|---|---|---|',
  ...Object.entries(routes).map(([k, v]) => `| ${k} | ${kb(v.raw)} KB | ${kb(v.gz9)} KB |`),
  '',
  '## Targets',
  '',
  `- Hub usable within 4 s: **${hub.visibleMs} ms** — ${verdict.hubUsable.pass ? 'PASS' : 'MISS'}`,
  `- No long task over 300 ms during play: longest **${maxPlayLt} ms** — ${verdict.longTaskDuringPlay.pass ? 'PASS' : 'MISS'}`,
  `- Every demo plays to the finish, no skipped step: ${verdict.allFinishNoSkip.pass ? 'PASS' : 'MISS'}`,
  `- Guide route chunk under 40 KB gzipped: **${kb(routeGz)} KB** — ${verdict.chunkGz.pass ? 'PASS' : 'MISS'}`,
  '',
  'Notes: "first screen visible" = the first moment the element (hub: the first card; demo: the phone screen) is rendered with a size (it may be below the fold), measured in the page with performance.now() (navigation start = 0). The shared LanguageProvider / react-vendor / index chunks are part of every page and are not counted as "guide chunk".',
  '',
]
fs.writeFileSync(`${OUT}/slow-phone.md`, md.join('\n'))
console.log(JSON.stringify(verdict))
