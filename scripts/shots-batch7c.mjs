#!/usr/bin/env node
// Batch 7C browser check — /how-to-use at 320/360/390/768/1280 in Hindi and English:
// no horizontal scroll, no overlapping header items, six accessible SVG diagrams
// whose labels fit and stay readable, plus the links from the header, mobile menu,
// footer, homepage, post screen and About page. Serves dist/ itself (run the build
// + prerender first).
//   node scripts/shots-batch7c.mjs
// Screenshots + browser-check.json go to docs/review/batch7c/. No database writes:
// any non-GET request to Supabase is blocked.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch7c')
const PORT = 4181
const BASE = `http://localhost:${PORT}`
const WIDTHS = [320, 360, 390, 768, 1280]
const DESKTOP = 1024 // the full nav row shows from Tailwind lg
const MIN_TEXT_PX = 14
mkdirSync(OUT, { recursive: true })

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' }
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  const direct = join(DIST, url)
  // Prerendered routes are dist/<route>/index.html, like the real host serves them.
  const page = join(DIST, url, 'index.html')
  const hit = extname(direct) && existsSync(direct) ? direct : existsSync(page) ? page : join(DIST, 'index.html')
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

// Bounding boxes of every visible header item, then every overlapping pair
// (same method as scripts/shots-batch7a.mjs).
const measureHeader = () => {
  const header = document.querySelector('header')
  const items = []
  const add = (label, el) => {
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return
    items.push({ label, x: r.left, y: r.top, r: r.right, b: r.bottom })
  }
  const bar = header.firstElementChild
  add('logo', bar.querySelector('[data-testid="brand-logo"] img'))
  add('site-name', bar.querySelector('[data-testid="nav-site-name"]'))
  header.querySelectorAll('[data-testid="nav-desktop"] > *').forEach((el, i) => add(`nav-${i}:${el.textContent.trim().slice(0, 14)}`, el))
  bar.querySelectorAll(':scope > div:last-child > *').forEach((el, i) => add(
    el.matches('[role="group"]') ? 'language-switch' : el.matches('[data-testid="nav-hamburger"]') ? 'hamburger' : `right-${i}:${el.textContent.trim().slice(0, 12) || el.tagName.toLowerCase()}`, el))
  const overlaps = []
  for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
    const a = items[i], b = items[j]
    if (a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5) overlaps.push(`${a.label} × ${b.label}`)
  }
  const navRows = new Set(items.filter((it) => it.label.startsWith('nav-')).map((it) => Math.round(it.y)))
  return {
    count: items.length, overlaps, navRows: navRows.size,
    outside: items.filter((it) => it.r > window.innerWidth + 0.5 || it.x < -0.5).map((it) => it.label),
    sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
    headerHeight: Math.round(header.getBoundingClientRect().height),
  }
}

// Every diagram: a11y attributes, label fit, label size on screen.
const measureDiagrams = () => [...document.querySelectorAll('[data-testid^="howto-diagram-"]')].map((fig) => {
  const svg = fig.querySelector('svg')
  const box = svg.getBoundingClientRect()
  const scale = box.width / svg.viewBox.baseVal.width
  const ids = (svg.getAttribute('aria-labelledby') || '').split(' ')
  const texts = [...svg.querySelectorAll('text')].map((t) => {
    const r = t.getBoundingClientRect()
    return { text: t.textContent, px: parseFloat(getComputedStyle(t).fontSize) * scale, left: r.left - box.left, right: box.right - r.right, top: r.top - box.top, bottom: box.bottom - r.bottom, w: r.width }
  })
  // A label must also stop before the icon column / tile edge it shares a row with.
  const clipped = [...svg.querySelectorAll('text')].filter((t) => {
    const r = t.getBoundingClientRect()
    return [...svg.querySelectorAll('g[transform]')].some((icon) => {
      const i = icon.getBoundingClientRect()
      return r.left < i.right - 0.5 && i.left < r.right - 0.5 && r.top < i.bottom - 0.5 && i.top < r.bottom - 0.5
    })
  }).map((t) => t.textContent)
  return {
    name: fig.dataset.testid.replace('howto-diagram-', ''),
    role: svg.getAttribute('role'),
    title: svg.querySelector(':scope > title')?.textContent || '',
    desc: svg.querySelector(':scope > desc')?.textContent || '',
    labelled: ids.length === 2 && ids.every((id) => svg.querySelector(`[id="${id}"]`)),
    images: svg.querySelectorAll('image, foreignObject').length,
    width: Math.round(box.width),
    fitsViewport: box.left >= -0.5 && box.right <= window.innerWidth + 0.5,
    minPx: Math.min(...texts.map((t) => t.px)),
    outside: texts.filter((t) => t.left < 1 || t.right < 1 || t.top < 0 || t.bottom < 0).map((t) => t.text),
    clipped,
    font: getComputedStyle(svg.querySelector('text')).fontFamily.split(',')[0].replace(/["']/g, ''),
    labels: texts.length,
  }
})

const browser = await chromium.launch()
const report = { pages: [], results }

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: width < DESKTOP, deviceScaleFactor: width <= 390 ? 2 : 1, serviceWorkers: 'block' })
  const page = await ctx.newPage()
  await page.route(/supabase\.co\//, (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()))

  for (const lang of ['hi', 'en']) {
    const tag = `${width}-${lang}`
    await page.goto(BASE + '/how-to-use', { waitUntil: 'networkidle', timeout: 45000 })
    await page.evaluate((l) => localStorage.setItem('ks_lang_v1', l), lang)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="howto-diagram-install"] svg text')
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => { const i = document.querySelector('header [data-testid="brand-logo"] img'); return i && i.complete && i.naturalWidth > 0 })

    const h1 = (await page.locator('h1').innerText()).trim()
    check(`${tag}: page renders with its heading`, (await page.locator('h1').count()) === 1 && h1 === (lang === 'hi' ? 'वेबसाइट कैसे इस्तेमाल करें' : 'How to use the website'), h1)

    const scroll = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, win: window.innerWidth }))
    check(`${tag}: no horizontal scroll`, scroll.doc <= scroll.win && scroll.body <= scroll.win, JSON.stringify(scroll))
    const wide = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1) }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).slice(0, 30)}`).slice(0, 5))
    check(`${tag}: nothing in the page sticks out of the viewport`, wide.length === 0, wide.join(' | '))

    const head = await page.evaluate(measureHeader)
    check(`${tag}: no overlapping header items (${head.count} items)`, head.overlaps.length === 0, head.overlaps.join(', '))
    check(`${tag}: no header item outside the viewport`, head.outside.length === 0 && !head.sideways, head.outside.join(', '))
    if (width >= DESKTOP) {
      check(`${tag}: desktop header keeps two rows (brand row + one nav row)`, head.navRows === 1, `nav rows: ${head.navRows}, header ${head.headerHeight}px`)
      const item = page.locator('[data-testid="nav-how-to-use"]')
      check(`${tag}: "How to use" is a visible header item, marked as the current page`, (await item.isVisible()) && (await item.getAttribute('href')) === '/how-to-use' && (await item.getAttribute('aria-current')) === 'page')
    } else {
      check(`${tag}: below desktop the nav row is hidden and the hamburger is shown`, !(await page.locator('[data-testid="nav-desktop"]').isVisible()) && (await page.locator('[data-testid="nav-hamburger"]').isVisible()))
    }

    const diagrams = await page.evaluate(measureDiagrams)
    check(`${tag}: six diagrams, in order`, diagrams.map((d) => d.name).join(',') === 'services,access,post,find,sawaal,install', diagrams.map((d) => d.name).join(','))
    const a11y = diagrams.filter((d) => d.role !== 'img' || d.title.length < 8 || d.desc.length < 40 || !d.labelled).map((d) => d.name)
    check(`${tag}: every diagram has role="img", a <title> and a <desc>, wired with aria-labelledby`, a11y.length === 0, a11y.join(','))
    check(`${tag}: diagrams are pure inline SVG with real <text> (no images, no foreignObject)`, diagrams.every((d) => d.images === 0 && d.labels >= 5))
    const off = diagrams.filter((d) => !d.fitsViewport).map((d) => `${d.name}:${d.width}`)
    check(`${tag}: every diagram fits the viewport`, off.length === 0, off.join(','))
    const small = diagrams.filter((d) => d.minPx < MIN_TEXT_PX).map((d) => `${d.name}:${d.minPx.toFixed(1)}px`)
    check(`${tag}: smallest diagram label is ${Math.min(...diagrams.map((d) => d.minPx)).toFixed(1)}px (minimum ${MIN_TEXT_PX}px)`, small.length === 0, small.join(','))
    const spill = diagrams.flatMap((d) => [...d.outside.map((t) => `${d.name}: "${t}" leaves the drawing`), ...d.clipped.map((t) => `${d.name}: "${t}" runs into an icon`)])
    check(`${tag}: every label fits inside its diagram and clears the icons`, spill.length === 0, spill.join(' | '))
    check(`${tag}: diagram text uses the site font`, diagrams.every((d) => d.font === 'Noto Sans Devanagari'), [...new Set(diagrams.map((d) => d.font))].join(','))

    const lists = await page.evaluate(() => [...document.querySelectorAll('[data-testid="howto-section"]')].map((s) => ({ id: s.id, lists: s.querySelectorAll('[data-testid="howto-steps"]').length, items: s.querySelectorAll('[data-testid="howto-steps"] > li').length, svg: s.querySelectorAll('svg[role="img"]').length })))
    check(`${tag}: eight sections; a–g each have a written step list`, lists.length === 8 && lists.slice(0, 7).every((s) => s.lists >= 1 && s.items >= 2), JSON.stringify(lists))
    check(`${tag}: FAQ shows 8 questions with answers, and a link to /grievance`, (await page.locator('[data-testid="howto-faq"] dt').count()) === 8 && (await page.locator('[data-testid="howto-faq"] dd').count()) === 8 && (await page.locator('[data-testid="howto-grievance"]').getAttribute('href')) === '/grievance')
    const body = await page.locator('main').innerText()
    const banned = body.match(/मुफ़्त|मुफ्त|निःशुल्क|\bfree\b|ईमेल|e-?mail|पासवर्ड|password|\bOTP\b|ओटीपी/i)
    check(`${tag}: no "free/मुफ़्त" and no e-mail / password / OTP on the page`, !banned, banned ? banned[0] : '')

    report.pages.push({ width, lang, scroll, header: head, diagrams })
    await page.screenshot({ path: join(OUT, `how-to-use-${tag}.png`), fullPage: true })
    await page.screenshot({ path: join(OUT, `header-${tag}.png`), clip: { x: 0, y: 0, width, height: 130 } })
    if (width === 320 || width === 1280) {
      for (const d of diagrams) await page.locator(`[data-testid="howto-diagram-${d.name}"]`).screenshot({ path: join(OUT, `diagram-${d.name}-${tag}.png`) })
    }
  }

  // ---- links (Hindi) -------------------------------------------------------------
  await page.evaluate(() => localStorage.setItem('ks_lang_v1', 'hi'))
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const homeHead = await page.evaluate(measureHeader)
  check(`${width} home: header has no overlap and no sideways scroll`, homeHead.overlaps.length === 0 && homeHead.outside.length === 0 && !homeHead.sideways, [...homeHead.overlaps, ...homeHead.outside].join(', '))
  const strip = page.locator('[data-testid="home-how-to-use"]')
  await strip.scrollIntoViewIfNeeded()
  const stripBox = await strip.boundingBox()
  check(`${width} home: prominent "How to use" strip links to /how-to-use and fits the screen`, (await strip.getAttribute('href')) === '/how-to-use' && (await strip.innerText()).includes('कैसे इस्तेमाल करें') && stripBox.x >= 0 && stripBox.x + stripBox.width <= width + 0.5 && stripBox.height >= 40, JSON.stringify(stripBox))
  await strip.screenshot({ path: join(OUT, `home-strip-${width}.png`) })
  const footerLink = page.locator('footer a[href="/how-to-use"]')
  check(`${width} footer: has the "कैसे इस्तेमाल करें" link`, (await footerLink.count()) === 1 && (await footerLink.innerText()).trim() === 'कैसे इस्तेमाल करें')

  if (width >= DESKTOP) {
    await page.locator('[data-testid="nav-how-to-use"]').click()
    await page.waitForURL('**/how-to-use')
    check(`${width} header: the item opens /how-to-use`, new URL(page.url()).pathname === '/how-to-use')
    const about = page.locator('[data-testid="nav-about"] > button')
    await about.click()
    check(`${width} header: the About dropdown next to it still opens`, await page.locator('#nav-about-menu').isVisible())
    await page.screenshot({ path: join(OUT, `header-about-open-${width}.png`), clip: { x: 0, y: 0, width, height: 240 } })
    await page.keyboard.press('Escape')
  } else {
    await page.locator('[data-testid="nav-hamburger"]').click()
    const item = page.locator('[data-testid="nav-how-to-use-mobile"]')
    await item.scrollIntoViewIfNeeded()
    const box = await item.boundingBox()
    check(`${width} mobile menu: "कैसे इस्तेमाल करें" is visible without expanding anything, 44px tall, inside the screen`, (await item.isVisible()) && box.height >= 44 && box.x >= 0 && box.x + box.width <= width + 0.5, JSON.stringify(box))
    check(`${width} mobile menu: no sideways scroll while open`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await page.screenshot({ path: join(OUT, `mobile-menu-${width}.png`), fullPage: false })
    await item.click()
    await page.waitForURL('**/how-to-use')
    check(`${width} mobile menu: the item opens /how-to-use and the menu closes`, new URL(page.url()).pathname === '/how-to-use' && !(await page.locator('[data-testid="nav-how-to-use-mobile"]').isVisible()))
  }

  // About page link: a real page now, not a redirect.
  await page.goto(BASE + '/about', { waitUntil: 'networkidle' })
  await page.locator('[data-testid="about-how-to-use"]').click()
  await page.waitForTimeout(500)
  check(`${width} about: its link lands on /how-to-use (no redirect back to /about)`, new URL(page.url()).pathname === '/how-to-use' && (await page.locator('h1').innerText()).includes('वेबसाइट कैसे इस्तेमाल करें'), page.url())

  // Table of contents jumps to a section.
  await page.locator('nav a[href="#listing-kaise-dalein"]').click()
  await page.waitForTimeout(400)
  check(`${width} contents list: jumps to the posting section`, await page.evaluate(() => { const r = document.getElementById('listing-kaise-dalein').getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight }))

  // Section a) tiles are links to real pages.
  const serviceLinks = await page.locator('#kya-kya-hai [data-testid="howto-steps"] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  check(`${width} services list: eight links`, serviceLinks.join(',') === '/bazaar,/sawaal,/msp,/mausam,/cold-storage,/kisan-mela,/yojana,/videos', serviceLinks.join(','))

  await ctx.close()
}

// Direct load of the old placeholder target: must be the page itself.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' })
  const page = await ctx.newPage()
  await page.goto(BASE + '/how-to-use', { waitUntil: 'networkidle' })
  check('direct load: /how-to-use stays on /how-to-use (no leftover redirect)', new URL(page.url()).pathname === '/how-to-use' && new URL(page.url()).hash === '')
  await ctx.close()
}

await browser.close()
server.close()
writeFileSync(join(OUT, 'browser-check.json'), JSON.stringify(report, null, 2), 'utf8')
const passed = results.filter((r) => r.ok).length
console.log(`\n${passed} passed, ${failures} failed — screenshots in docs/review/batch7c/`)
process.exit(failures ? 1 : 0)
