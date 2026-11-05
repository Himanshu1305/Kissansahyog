#!/usr/bin/env node
// Batch 17F - browser proof (Playwright Chromium). Serves dist/ itself (run `vite build` first).
//   node scripts/batch17f/proof.mjs
// It stubs the browser's install event and the user agent. It proves the WIRING and the LAYOUT;
// Playwright cannot truly install an app - the founder's phones prove that.
// Screenshots + proof.json go to docs/review/batch17f/evidence/. No database writes: every
// non-GET request to Supabase is blocked, and GETs to other hosts are stubbed empty.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { UA } from '../../tests/unit/helpers/install-user-agents.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch17f/evidence')
const PORT = 4187
const BASE = `http://localhost:${PORT}`
mkdirSync(OUT, { recursive: true })

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' }
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  const direct = join(DIST, url)
  const page = join(DIST, url, 'index.html')
  const hit = extname(direct) && existsSync(direct) ? direct : existsSync(page) ? page : join(DIST, 'index.html')
  res.writeHead(200, { 'Content-Type': MIME[extname(hit)] || 'application/octet-stream' })
  res.end(await readFile(hit))
})
await new Promise((r) => server.listen(PORT, r))

const results = []
let failures = 0
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail })
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`)
}

const browser = await chromium.launch()

async function newPage({ width, height = 800, ua, lang = 'hi', standalone = false, visits, mobile = true, noShare = false, stubEvent = null }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    userAgent: ua,
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 2,
    serviceWorkers: 'block',
  })
  await ctx.route('**/*', (route) => {
    const u = route.request().url()
    if (u.startsWith(BASE)) return route.continue()
    if (/supabase\.co/.test(u) && route.request().method() !== 'GET') return route.abort()
    if (/supabase\.co|open-meteo|onrender\.com|data\.gov\.in|fonts\.g/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    return route.abort()
  })
  const page = await ctx.newPage()
  await page.addInitScript(({ lang, standalone, visits, noShare, stubEvent }) => {
    try { localStorage.setItem('ks_lang_v1', lang) } catch { /* ignore */ }
    if (visits != null) { try { localStorage.setItem('ks_visit_count', String(visits - 1)) } catch { /* ignore */ } }
    if (noShare) { try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }) } catch { /* ignore */ } }
    window.__promptCalls = 0
    window.__userChoice = 'dismissed'
    window.__fireInstallEvent = (outcome) => {
      window.__userChoice = outcome || window.__userChoice
      const e = new Event('beforeinstallprompt', { cancelable: true })
      e.prompt = () => { window.__promptCalls += 1; return Promise.resolve() }
      Object.defineProperty(e, 'userChoice', { get: () => Promise.resolve({ outcome: window.__userChoice }) })
      window.dispatchEvent(e)
    }
    if (standalone) {
      const orig = window.matchMedia.bind(window)
      window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null } : orig(q))
    }
    if (stubEvent) { window.addEventListener('DOMContentLoaded', () => setTimeout(() => window.__fireInstallEvent(stubEvent), 50)) }
  }, { lang, standalone, visits, noShare, stubEvent })
  return { ctx, page }
}

const shot = (page, name) => page.screenshot({ path: join(OUT, name) })
const noScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

// ---- A. Part 2: the strip is ONE row at 320/360/390/412, Hindi and English ----
const rowStats = []
for (const lang of ['hi', 'en']) {
  for (const width of [320, 360, 390, 412]) {
    const { ctx, page } = await newPage({ width, ua: UA.pixelChrome, lang })
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    const strip = page.locator('[data-testid="pwa-install-strip"]')
    await strip.waitFor({ state: 'visible', timeout: 20000 })
    const m = await page.evaluate(() => {
      const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, cy: (r.top + r.bottom) / 2, h: r.height } }
      const text = box('[data-testid="pwa-install-text"]')
      const btn = box('[data-testid="pwa-install-cta"]')
      const x = box('[data-testid="pwa-install-dismiss"]')
      const strip = box('[data-testid="pwa-install-strip"]')
      return { text, btn, x, strip, w: window.innerWidth, scrollW: document.documentElement.scrollWidth, label: document.querySelector('[data-testid="pwa-install-text"]').innerText, btnLabel: document.querySelector('[data-testid="pwa-install-cta"]').innerText }
    })
    const dy = Math.abs(m.text.cy - m.btn.cy)
    const dyX = Math.abs(m.x.cy - m.btn.cy)
    const visible = m.btn.x >= 0 && m.btn.r <= m.w && m.x.r <= m.w + 0.5 && m.x.x >= 0
    const noOverlap = m.text.r <= m.btn.x + 0.5 && m.btn.r <= m.x.x + 0.5
    const closeBig = m.x.h >= 43.5 && (m.x.r - m.x.x) >= 43.5
    check(`${width}px ${lang}: text and Install button on one row (centres differ ${dy.toFixed(1)} px < 8)`, dy < 8 && dyX < 8, `text "${m.label.trim()}" btn "${m.btnLabel}" strip height ${m.strip.h.toFixed(0)}`)
    check(`${width}px ${lang}: Install button fully visible, nothing overlaps, close is 44x44`, visible && noOverlap && closeBig, JSON.stringify({ btn: [m.btn.x | 0, m.btn.r | 0], x: [m.x.x | 0, m.x.r | 0], text: [m.text.x | 0, m.text.r | 0] }))
    check(`${width}px ${lang}: no horizontal scroll (scrollWidth ${m.scrollW} <= ${m.w})`, m.scrollW <= m.w)
    rowStats.push({ lang, width, dy: +dy.toFixed(2), stripHeight: +m.strip.h.toFixed(1), text: m.label.trim(), btn: m.btnLabel })
    await page.locator('[data-testid="pwa-install-strip"]').screenshot({ path: join(OUT, `strip-${lang}-${width}.png`) })
    await ctx.close()
  }
}

// ---- B. Part 3: the guided sheet per environment (360 px, Hindi) ----
const envCases = [
  ['android-chrome-no-prompt', UA.pixelChrome, 'menu', 3, false],
  ['android-other-browser', UA.samsung, 'menu', 3, true],
  ['ios-safari', UA.iphoneSafari, 'ios', 3, false],
  ['ios-other-browser', UA.iosChrome, 'ios-open-safari', 3, true],
  ['in-app-browser', UA.fbAndroid, 'in-app', 3, true],
]
for (const [env, ua, kind, steps, copy] of envCases) {
  const { ctx, page } = await newPage({ width: 360, ua })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="pwa-install-cta"]').waitFor({ state: 'visible', timeout: 20000 })
  check(`${env}: strip knows the environment`, (await page.locator('[data-testid="pwa-install-strip"]').getAttribute('data-env')) === env)
  await page.locator('[data-testid="pwa-install-cta"]').click()
  const sheet = page.locator('[data-testid="install-sheet"]')
  await sheet.waitFor({ state: 'visible' })
  check(`${env}: sheet is a modal dialog`, (await sheet.getAttribute('role')) === 'dialog' && (await sheet.getAttribute('aria-modal')) === 'true' && !!(await sheet.getAttribute('aria-labelledby')))
  check(`${env}: help kind "${kind}", ${steps} numbered steps`, (await page.locator('[data-testid="install-help"]').getAttribute('data-kind')) === kind && (await page.locator('[data-testid="install-steps"] > li').count()) === steps)
  check(`${env}: Copy-link button ${copy ? 'present' : 'absent'}`, (await page.locator('[data-testid="install-sheet"] [data-testid="install-copy-link"]').count()) === (copy ? 1 : 0))
  const focusInside = await page.evaluate(() => document.querySelector('[data-testid="install-sheet"]').contains(document.activeElement))
  check(`${env}: focus moved into the sheet`, focusInside)
  const heights = await page.evaluate(() => [...document.querySelectorAll('[data-testid="install-sheet"] button')].map((b) => Math.round(b.getBoundingClientRect().height)))
  check(`${env}: every button in the sheet is >= 56 px high`, heights.length > 0 && heights.every((h) => h >= 56), heights.join(','))
  check(`${env}: sheet fits 360 px, no horizontal scroll`, await noScroll(page))
  if (copy) {
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {})
    await page.locator('[data-testid="install-sheet"] [data-testid="install-copy-link"]').click()
    await page.waitForTimeout(150)
    const label = await page.locator('[data-testid="install-sheet"] [data-testid="install-copy-link"]').innerText()
    check(`${env}: Copy link says it worked`, /✓/.test(label), label)
  }
  await shot(page, `sheet-${env}.png`)
  await page.keyboard.press('Escape')
  await page.locator('[data-testid="install-sheet"]').waitFor({ state: 'detached' })
  const back = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
  check(`${env}: Escape closes the sheet and focus returns to the Install button`, back === 'pwa-install-cta', String(back))
  await ctx.close()
}

// ---- C. Part 3: android with the browser's own install box ----
{
  const { ctx, page } = await newPage({ width: 360, ua: UA.pixelChrome, stubEvent: 'dismissed' })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('[data-testid="pwa-install-strip"]')?.getAttribute('data-env') === 'android-chrome-can-prompt', null, { timeout: 20000 })
  await shot(page, 'strip-can-prompt.png')
  await page.locator('[data-testid="pwa-install-cta"]').click()
  const calls = await page.evaluate(() => window.__promptCalls)
  check('can-prompt: ONE tap calls the native prompt() at once (same click)', calls === 1, `prompt calls ${calls}`)
  check('can-prompt: no steps sheet opens before the answer', (await page.locator('[data-testid="install-help"]').count()) === 0)
  await page.locator('[data-testid="install-later"]').waitFor({ state: 'visible' })
  check('can-prompt: user dismisses the box -> "no problem, install later" line', /बाद में कभी भी/.test(await page.locator('[data-testid="install-later"]').innerText()))
  await shot(page, 'sheet-later.png')
  await page.locator('[data-testid="install-later-ok"]').click()
  await ctx.close()
}

// ---- D. Part 4: accepted -> appinstalled -> success sheet; strip gone; flag stored ----
{
  const { ctx, page } = await newPage({ width: 360, ua: UA.pixelChrome, stubEvent: 'accepted' })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('[data-testid="pwa-install-strip"]')?.getAttribute('data-env') === 'android-chrome-can-prompt', null, { timeout: 20000 })
  await page.locator('[data-testid="pwa-install-cta"]').click()
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  const ok = page.locator('[data-testid="install-success"]')
  await ok.waitFor({ state: 'visible' })
  const txt = await ok.innerText()
  check('success sheet: green tick, "ऐप इंस्टॉल हो गया", look for the icon on the home screen or in the app list', /ऐप इंस्टॉल हो गया/.test(txt) && /ढूँढें/.test(txt) && /दबाकर रखें/.test(txt), txt.replace(/\n/g, ' | ').slice(0, 160))
  check('success sheet: does not claim the icon has been added as a fact', !/जोड़ दिया|जुड़ गया|has been added/.test(txt))
  check('success sheet: one button "ठीक है"', (await page.locator('[data-testid="install-success-ok"]').innerText()).trim() === 'ठीक है')
  await shot(page, 'sheet-success.png')
  const stored = await page.evaluate(() => localStorage.getItem('ks_installed_at'))
  check('appinstalled stored ks_installed_at', /^\d{4}-\d{2}-\d{2}T/.test(stored || ''), String(stored))
  await page.locator('[data-testid="install-success-ok"]').click()
  check('after install, in the same visit: the strip is gone', (await page.locator('[data-testid="pwa-install-strip"]').count()) === 0)
  check('after install: the homepage install block is gone too', (await page.locator('[data-testid="home-install-block"]').count()) === 0)
  await ctx.close()
}

// ---- E. Part 4: first launch from the icon (standalone): one-time welcome; strip hidden ----
{
  const { ctx, page } = await newPage({ width: 360, ua: UA.pixelChrome, standalone: true })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  const w = page.locator('[data-testid="install-welcome"]')
  await w.waitFor({ state: 'visible', timeout: 20000 })
  check('standalone first launch: "आप किसान सहयोग ऐप में हैं"', /आप किसान सहयोग ऐप में हैं/.test(await w.innerText()))
  await shot(page, 'sheet-welcome.png')
  check('standalone: no install strip', (await page.locator('[data-testid="pwa-install-strip"]').count()) === 0)
  await page.locator('[data-testid="install-welcome-ok"]').click()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  check('standalone second launch: no welcome again', (await page.locator('[data-testid="install-welcome"]').count()) === 0)
  await ctx.close()
}

// ---- F. The strip and the returning-visitor bar never show together ----
{
  const { ctx, page } = await newPage({ width: 360, ua: UA.pixelChrome, visits: 5, stubEvent: 'dismissed' })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('[data-testid="pwa-install-strip"]')?.getAttribute('data-env') === 'android-chrome-can-prompt', null, { timeout: 20000 })
  check('homepage (returning visitor, can prompt): the strip shows, the bar does not', (await page.locator('[data-testid="pwa-install-strip"]').count()) === 1 && (await page.locator('[data-testid="pwa-install-banner"]').count()) === 0)
  await page.evaluate(() => { window.history.pushState({}, '', '/msp'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await page.locator('[data-testid="pwa-install-banner"]').waitFor({ state: 'visible', timeout: 10000 })
  check('other page (/msp): the bar shows, the strip does not', (await page.locator('[data-testid="pwa-install-strip"]').count()) === 0)
  await shot(page, 'bar-other-page.png')
  await page.evaluate(() => { window.history.pushState({}, '', '/install'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await page.locator('h1').first().waitFor()
  await page.waitForTimeout(300)
  check('/install: neither the bar nor the strip', (await page.locator('[data-testid="pwa-install-banner"]').count()) === 0 && (await page.locator('[data-testid="pwa-install-strip"]').count()) === 0)
  await ctx.close()
}

// ---- G. Part 5: /install page at 360 (phone) and 1280 (desktop) ----
for (const [label, width, ua, mobile] of [['android-360', 360, UA.pixelChrome, true], ['ios-390', 390, UA.iphoneSafari, true], ['inapp-360', 360, UA.fbAndroid, true], ['desktop-1280', 1280, UA.winChrome, false]]) {
  const { ctx, page } = await newPage({ width, ua, mobile })
  await page.goto(BASE + '/install?s=qr', { waitUntil: 'domcontentloaded' })
  await page.locator('h1').first().waitFor({ timeout: 20000 })
  await page.waitForTimeout(400)
  check(`/install ${label}: one h1 "किसान सहयोग ऐप इंस्टॉल करें"`, (await page.locator('h1').count()) === 1 && /किसान सहयोग ऐप इंस्टॉल करें/.test(await page.locator('h1').innerText()))
  check(`/install ${label}: own steps first, QR + copy link + share present`, (await page.locator('[data-testid="install-mine"]').count()) === 1 && (await page.locator('[data-testid="install-qr"]').count()) >= 1 && (await page.locator('[data-testid="install-copy-link"]').count()) >= 1 && (await page.locator('[data-testid="install-share-link"]').count()) === 1)
  check(`/install ${label}: no horizontal scroll`, await noScroll(page))
  const qrOk = await page.evaluate(() => { const i = document.querySelector('[data-testid="install-qr"]'); return i.complete && i.naturalWidth > 0 })
  check(`/install ${label}: the QR image loads`, qrOk)
  const sections = await page.locator('[data-testid^="install-sec-"]').count()
  check(`/install ${label}: other kinds in plain sections (own kind not repeated)`, sections === 4, `${sections} sections`)
  const faq = await page.locator('[data-testid="install-faq"] dt').allInnerTexts()
  check(`/install ${label}: FAQ has 3 questions`, faq.length === 3)
  const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).filter((t) => t.includes('FAQPage')))
  check(`/install ${label}: FAQPage JSON-LD in the page`, ld.length >= 1 && ld.some((t) => t.includes('/install')))
  check(`/install ${label}: title, canonical`, /इंस्टॉल/.test(await page.title()) && (await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.href)) === 'https://kissansahyog.com/install')
  await page.screenshot({ path: join(OUT, `install-page-${label}.png`), fullPage: true })
  await ctx.close()
}

// ---- H. Part 5: the homepage block: QR only >= 768 px; phones get Install + share ----
for (const [label, width, ua, mobile] of [['desktop-1280', 1280, UA.winChrome, false], ['tablet-768', 768, UA.winChrome, false], ['phone-390', 390, UA.pixelChrome, true], ['phone-320', 320, UA.pixelChrome, true]]) {
  const { ctx, page } = await newPage({ width, ua, mobile, noShare: true })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  const block = page.locator('[data-testid="home-install-block"]')
  await block.waitFor({ state: 'attached', timeout: 20000 })
  await block.scrollIntoViewIfNeeded()
  const qrVisible = await page.locator('[data-testid="home-install-qr-wrap"]').isVisible()
  const installBtn = await page.locator('[data-testid="home-install-btn"]').isVisible().catch(() => false)
  const shareBtn = await page.locator('[data-testid="home-install-share"]').isVisible()
  const wide = width >= 768
  check(`home block ${label}: QR ${wide ? 'shown' : 'hidden'}`, qrVisible === wide)
  check(`home block ${label}: ${wide ? 'no phone buttons' : 'Install button + share-link button'}`, wide ? (!installBtn && !shareBtn) : (installBtn && shareBtn))
  check(`home block ${label}: no horizontal scroll`, await noScroll(page))
  if (!wide) {
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {})
    await page.locator('[data-testid="home-install-share"]').click()
    await page.waitForTimeout(200)
    check(`home block ${label}: share falls back to copying the link`, /✓/.test(await page.locator('[data-testid="home-install-share"]').innerText()))
  }
  await block.screenshot({ path: join(OUT, `home-block-${label}.png`) })
  await ctx.close()
}

// ---- I. desktop sheet: QR + address-bar hint ----
{
  const { ctx, page } = await newPage({ width: 1280, ua: UA.winChrome, mobile: false })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="pwa-install-cta"]').waitFor({ state: 'visible', timeout: 20000 })
  await page.locator('[data-testid="pwa-install-cta"]').click()
  await page.locator('[data-testid="install-sheet"]').waitFor({ state: 'visible' })
  check('desktop sheet: QR and the address-bar install hint', (await page.locator('[data-testid="install-sheet"] [data-testid="install-qr"]').count()) === 1 && /एड्रेस बार/.test(await page.locator('[data-testid="install-sheet"]').innerText()))
  await shot(page, 'sheet-desktop-chrome-edge.png')
  await ctx.close()
}

// ---- J. English labels in the sheet ----
{
  const { ctx, page } = await newPage({ width: 360, ua: UA.iphoneSafari, lang: 'en' })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-testid="pwa-install-cta"]').click()
  await page.locator('[data-testid="install-sheet"]').waitFor({ state: 'visible' })
  check('English sheet text', /Add to Home Screen/.test(await page.locator('[data-testid="install-sheet"]').innerText()))
  await shot(page, 'sheet-ios-safari-en.png')
  await ctx.close()
}

await browser.close()
server.close()
writeFileSync(join(OUT, 'proof.json'), JSON.stringify({ at: new Date().toISOString(), failures, rowStats, results }, null, 2))
console.log(`\n${results.length - failures}/${results.length} checks passed`)
process.exit(failures ? 1 : 0)
