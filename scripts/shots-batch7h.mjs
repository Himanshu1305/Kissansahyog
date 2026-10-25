#!/usr/bin/env node
// Batch 7H browser check — the desktop header is ONE row. Measures the header at
// 1920/1440/1280/1279/1100/1024 (desktop) and 768/390 (mobile header, unchanged), in
// Hindi and English, on '/' (no header search) and '/about' (header search — the
// tighter case). Also drives the और / More menu and the compact search with the
// keyboard. Serves dist/ itself (run `npm run build` first).
//   node scripts/shots-batch7h.mjs
// Screenshots + header-check.json go to docs/review/batch7h/. Exits non-zero if the
// header has more than one row, anything wraps, overlaps or leaves the viewport.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch7h')
const PORT = 4187
const BASE = `http://localhost:${PORT}`
const WIDTHS = [1920, 1440, 1280, 1279, 1100, 1024, 768, 390]
const DESKTOP = 1024 // Tailwind lg: the nav joins the top row
const FULL = 1280 // Tailwind xl: all ten items are in the row (below it: six + More)
const ALL_TEN = ['nav_bazaar', 'nav_mandi', 'nav_weather', 'nav_schemes', 'nav_agroforestry', 'sawaal_nav', 'nav_videos', 'resources_nav', 'nav_how_to_use', 'nav_about']
const SIX = ['nav_bazaar', 'nav_mandi', 'nav_weather', 'nav_schemes', 'sawaal_nav', 'resources_nav']
const MORE_LINKS = ['/agro-forestry', '/videos', '/how-to-use', '/about', '/founder']
mkdirSync(OUT, { recursive: true })

const { strings } = await import(new URL('../src/lib/i18n/strings.js', import.meta.url).href)

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' }
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  const file = join(DIST, url)
  const hit = extname(file) && existsSync(file) ? file : join(DIST, 'index.html')
  res.writeHead(200, { 'Content-Type': MIME[extname(hit)] || 'application/octet-stream' })
  res.end(await readFile(hit))
})
await new Promise((r) => server.listen(PORT, r))

const results = []
let failures = 0
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`)
}

// Every visible header item with its box; then rows, overlaps, wrapped labels.
const measureHeader = () => {
  const header = document.querySelector('header')
  const bar = header.firstElementChild
  const items = []
  const add = (label, el) => {
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return
    // A label that wraps is drawn as more than one line box.
    const range = document.createRange()
    range.selectNodeContents(el)
    const lines = new Set([...range.getClientRects()].filter((c) => c.width > 0).map((c) => Math.round(c.top / 6)))
    items.push({ label, x: r.left, y: r.top, r: r.right, b: r.bottom, wrapped: label.startsWith('nav-') && lines.size > 1 })
  }
  add('logo', bar.querySelector('[data-testid="brand-logo"] img'))
  add('site-name', bar.querySelector('[data-testid="nav-site-name"]'))
  header.querySelectorAll('[data-testid="nav-desktop"] > *').forEach((el, i) => add(`nav-${i}:${el.textContent.trim().slice(0, 14)}`, el.matches('div') ? el.querySelector('button') : el))
  bar.querySelectorAll(':scope > div:last-child > *').forEach((el, i) => add(
    el.matches('[role="group"]') ? 'language-switch' : el.matches('[data-testid="nav-hamburger"]') ? 'hamburger' : el.matches('[data-testid="nav-search"]') ? 'search' : `right-${i}:${el.textContent.trim().slice(0, 12) || el.tagName.toLowerCase()}`, el))
  const overlaps = []
  for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
    const a = items[i], b = items[j]
    if (a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5) overlaps.push(`${a.label} × ${b.label}`)
  }
  // Rows: an item starts a new row when it sits wholly below every item so far.
  const sorted = [...items].sort((a, b) => a.y - b.y)
  let rows = 0
  let bottom = -Infinity
  for (const it of sorted) { if (it.y >= bottom - 0.5) rows += 1; bottom = Math.max(bottom, it.b) }
  const hr = header.getBoundingClientRect()
  const br = bar.getBoundingClientRect()
  const nav = header.querySelector('[data-testid="nav-desktop"]')
  const navShown = nav && getComputedStyle(nav).display !== 'none'
  return {
    items: items.map((it) => ({ label: it.label, x: Math.round(it.x), y: Math.round(it.y), r: Math.round(it.r), b: Math.round(it.b) })),
    rows, overlaps,
    wrapped: items.filter((it) => it.wrapped).map((it) => it.label),
    outside: items.filter((it) => it.r > window.innerWidth + 0.5 || it.x < -0.5).map((it) => it.label),
    sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
    headerHeight: Math.round(hr.height * 10) / 10,
    barHeight: Math.round(br.height * 10) / 10,
    // Anything in the header below the bar would be a second row / an empty band.
    bandBelowBar: Math.round((hr.bottom - br.bottom) * 10) / 10,
    visibleHeaderChildren: [...header.children].filter((c) => c.getBoundingClientRect().height > 0).length,
    navShown,
    navInsideBar: !!nav && nav.parentElement === bar,
    navOverflow: navShown ? Math.round(nav.scrollWidth - nav.clientWidth) : 0,
    navLabels: navShown ? [...nav.children].filter((el) => el.getBoundingClientRect().width > 0).map((el) => (el.matches('div') ? el.querySelector('button') : el).textContent.replace('▾', '').trim()) : [],
    sticky: getComputedStyle(header).position === 'sticky',
  }
}

const browser = await chromium.launch()
const report = { header: [], behaviour: results }

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: width < DESKTOP, deviceScaleFactor: width < DESKTOP ? 2 : 1, serviceWorkers: 'block' })
  const page = await ctx.newPage()
  const open = async (path, lang) => {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
    await page.evaluate((l) => localStorage.setItem('ks_lang_v1', l), lang)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('header [data-testid="brand-logo"] img')
    await page.waitForFunction(() => { const i = document.querySelector('header [data-testid="brand-logo"] img'); return i.complete && i.naturalWidth > 0 })
    await page.evaluate(() => document.fonts.ready)
  }

  for (const lang of ['hi', 'en']) for (const [tag, path] of [['home', '/'], ['about', '/about']]) {
    await open(path, lang)
    const m = await page.evaluate(measureHeader)
    report.header.push({ width, path, lang, ...m })
    const id = `${width}px ${path} ${lang}`
    check(`${id}: no overlapping header items (${m.items.length} items)`, m.overlaps.length === 0, m.overlaps.join(', '))
    check(`${id}: nothing outside the viewport, no sideways scroll`, m.outside.length === 0 && !m.sideways, [...m.outside, m.sideways ? 'page scrolls' : ''].filter(Boolean).join(', '))
    check(`${id}: header is sticky`, m.sticky)
    if (width >= DESKTOP) {
      check(`${id}: exactly ONE header row (header ${m.headerHeight}px)`, m.rows === 1 && m.visibleHeaderChildren === 1 && m.navShown && m.navInsideBar, `rows ${m.rows}, header children ${m.visibleHeaderChildren}`)
      check(`${id}: no second row or empty band under the header`, m.bandBelowBar <= 1.5 && m.headerHeight <= 72, `band ${m.bandBelowBar}px, header ${m.headerHeight}px`)
      check(`${id}: no nav label wraps and the nav does not overflow its space`, m.wrapped.length === 0 && m.navOverflow <= 0, `${m.wrapped.join(', ')} overflow ${m.navOverflow}px`)
      const want = (width >= FULL ? ALL_TEN : [...SIX, 'nav_more']).map((k) => strings[k][lang])
      check(`${id}: nav shows ${width >= FULL ? 'all ten items' : 'six items + More'}, in order`, m.navLabels.join('|') === want.join('|'), m.navLabels.join('|'))
      const right = m.items.filter((it) => !it.label.startsWith('nav-') && it.label !== 'logo' && it.label !== 'site-name').map((it) => it.label.replace(/^right-\d+:/, ''))
      const wantRight = [...(path === '/' ? [] : ['search']), 'language-switch', strings.nav_login[lang], strings.nav_signup[lang]]
      check(`${id}: right side is ${path === '/' ? '' : 'search + mic, '}language, Login, Join`, right.join('|') === wantRight.join('|'), right.join('|'))
    } else {
      check(`${id}: mobile header unchanged — nav hidden, hamburger shown, one row`, !m.navShown && m.items.some((it) => it.label === 'hamburger') && m.rows === 1, `rows ${m.rows}`)
    }
    if (width !== 1279 && width !== 768) await page.screenshot({ path: join(OUT, `header-${width}-${tag}-${lang}.png`), clip: { x: 0, y: 0, width, height: 110 } })
  }

  if (width >= DESKTOP) {
    // Compact search: 🔍 opens the field, typing + Enter searches, Esc closes and returns focus.
    await open('/about', 'hi')
    const toggle = page.locator('[data-testid="nav-search-toggle"]')
    const field = page.locator('#nav-search-field')
    check(`search ${width}px: starts as a compact button (field hidden)`, !(await field.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false' && !!(await toggle.getAttribute('aria-label')))
    await toggle.focus()
    await page.keyboard.press('Enter')
    check(`search ${width}px: opens with the keyboard and focuses the field`, await field.isVisible() && (await toggle.getAttribute('aria-expanded')) === 'true' && await page.evaluate(() => document.activeElement?.type === 'search') && new URL(page.url()).pathname === '/about')
    const fb = await field.boundingBox()
    const h = await page.evaluate(measureHeader)
    check(`search ${width}px: the open field stays inside the header row and the viewport`, fb && fb.x >= 0 && fb.x + fb.width <= width && fb.y >= 0 && fb.y + fb.height <= h.headerHeight + 1 && h.rows === 1 && h.bandBelowBar <= 1.5, JSON.stringify(fb))
    await page.screenshot({ path: join(OUT, `search-open-${width}.png`), clip: { x: 0, y: 0, width, height: 110 } })
    await page.keyboard.press('Escape')
    check(`search ${width}px: Escape closes it and returns focus to the button`, !(await field.isVisible()) && await toggle.evaluate((el) => el === document.activeElement))
    await toggle.click()
    await page.mouse.click(width / 2, 500)
    check(`search ${width}px: outside click closes it`, !(await field.isVisible()))
    await toggle.click()
    await page.keyboard.type('गेहूं')
    await page.keyboard.press('Enter')
    await page.waitForURL('**/search?q=*')
    check(`search ${width}px: Enter searches and shows the results page`, new URL(page.url()).searchParams.get('q') === 'गेहूं' && !(await page.locator('#nav-search-field').isVisible()))
    const mic = page.locator('[data-testid="nav-search"] [data-testid="voice-search-btn"]')
    // The mic only renders where the browser supports voice input; when it does, it must be labelled.
    check(`search ${width}px: mic button (when the browser supports voice) is labelled`, (await mic.count()) === 0 || !!(await mic.getAttribute('aria-label')))
  }

  if (width >= DESKTOP && width < FULL) {
    // और / More: keyboard open, links, Tab, Escape, outside click, route change.
    await open('/', 'hi')
    const btn = page.locator('[data-testid="nav-more"] > button')
    const menu = page.locator('#nav-more-menu')
    check(`more menu ${width}px: closed at first, button says और`, !(await menu.isVisible()) && (await btn.getAttribute('aria-expanded')) === 'false' && (await btn.innerText()).includes(strings.nav_more.hi))
    await btn.focus()
    await page.keyboard.press('Enter')
    check(`more menu ${width}px: opens with the keyboard`, await menu.isVisible() && (await btn.getAttribute('aria-expanded')) === 'true')
    const hrefs = await menu.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    check(`more menu ${width}px: holds Agro-forestry, Video, How to use, About us (+ Founder)`, hrefs.join(',') === MORE_LINKS.join(','), hrefs.join(','))
    const box = await menu.boundingBox()
    check(`more menu ${width}px: stays inside the viewport`, box && box.x >= 0 && box.x + box.width <= width, JSON.stringify(box))
    await page.screenshot({ path: join(OUT, `more-menu-${width}.png`), clip: { x: 0, y: 0, width, height: 320 } })
    await page.keyboard.press('Tab')
    check(`more menu ${width}px: Tab moves to the first link`, await page.evaluate(() => document.activeElement?.getAttribute('href')) === MORE_LINKS[0])
    await page.keyboard.press('Escape')
    check(`more menu ${width}px: Escape closes it and returns focus`, !(await menu.isVisible()) && await btn.evaluate((el) => el === document.activeElement))
    await btn.click()
    await page.mouse.click(width / 2, 500)
    check(`more menu ${width}px: outside click closes it`, !(await menu.isVisible()))
    await btn.click()
    await menu.locator('a[href="/how-to-use"]').click()
    await page.waitForURL('**/how-to-use')
    check(`more menu ${width}px: closes on route change and reaches /how-to-use`, !(await page.locator('#nav-more-menu').isVisible()) && (await page.locator('[data-testid="nav-more"] > button').getAttribute('aria-expanded')) === 'false')
  }

  if (width >= FULL) {
    await open('/', 'hi')
    check(`header ${width}px: no More button when all ten items fit`, !(await page.locator('[data-testid="nav-more"]').isVisible()))
    // The existing dropdowns still open from the row.
    await page.locator('[data-testid="nav-about"] > button').click()
    check(`header ${width}px: About dropdown still opens with /about and /founder`, (await page.locator('#nav-about-menu a').evaluateAll((as) => as.map((a) => a.getAttribute('href')).join(','))) === '/about,/founder' && await page.locator('#nav-about-menu').isVisible())
    await page.keyboard.press('Escape')
  }
  await ctx.close()
}

await browser.close()
server.close()
writeFileSync(join(OUT, 'header-check.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
console.log(`\n${results.length - failures} passed, ${failures} failed — screenshots in docs/review/batch7h/`)
process.exit(failures ? 1 : 0)
