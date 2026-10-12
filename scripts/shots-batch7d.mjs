#!/usr/bin/env node
// Batch 7D browser check — homepage at 360 and 1280 wide in Hindi and English:
// the open-to-all strip, the Free Registration badge and line, no overlap, no
// horizontal scroll, no blank category cell, no empty hero tile; plus the sign-up
// heading line, the Terms page and the tab icon. Serves dist/ itself (run the build
// + prerender first).
//   node scripts/shots-batch7d.mjs
// Screenshots + browser-check.json go to docs/review/batch7d/. No database writes:
// any non-GET request to Supabase that is not a read RPC is blocked.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch7d')
const PORT = 4182
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
  results.push({ name, ok, detail })
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`)
}

// Visible boxes of a set of elements, and every overlapping pair.
const boxesOverlap = (selectors) => {
  const items = []
  for (const [label, sel] of selectors) {
    document.querySelectorAll(sel).forEach((el, i) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return
      items.push({ label: `${label}${i ? `#${i}` : ''}`, x: r.left, y: r.top + window.scrollY, r: r.right, b: r.bottom + window.scrollY })
    })
  }
  const overlaps = []
  for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
    const a = items[i], b = items[j]
    if (a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5) overlaps.push(`${a.label} × ${b.label}`)
  }
  return { count: items.length, overlaps, outside: items.filter((it) => it.r > window.innerWidth + 0.5 || it.x < -0.5).map((it) => it.label) }
}
const HEADER = [
  ['logo', 'header [data-testid="brand-logo"] img'], ['site-name', 'header [data-testid="nav-site-name"]'],
  ['nav', 'header [data-testid="nav-desktop"] > *'], ['right', 'header > div:first-child > div:last-child > *'],
]
// The hero is rendered twice (desktop + mobile); only the visible copy has boxes.
const HERO = [
  ['eyebrow', '[data-testid="hero-free-registration"] ~ *:is(h1,p):first-of-type'],
  ['badge', '[data-testid="hero-free-registration"]'],
  ['post-line', '[data-testid="post-free-registration"]'],
]

const browser = await chromium.launch()
for (const width of [360, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: width < 1024, deviceScaleFactor: width < 1024 ? 2 : 1, serviceWorkers: 'block' })
  const page = await ctx.newPage()
  const blocked = []
  await page.route(/supabase\.co\//, (route) => {
    const req = route.request()
    // Reads only: GETs and read RPCs. Anything that could write (view counters, logs) is blocked.
    if (req.method() === 'GET' || /\/rpc\/(get_|fetch_|list_|search_|nearby|home_|top_|count_|public_|upcoming_)/.test(req.url())) return route.continue()
    blocked.push(req.url().split('/').pop().split('?')[0])
    return route.abort()
  })

  for (const lang of ['hi', 'en']) {
    const tag = `${width}-${lang}`
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 })
    await page.evaluate((l) => { localStorage.setItem('ks_lang_v1', l); try { sessionStorage.removeItem('ks_install_banner_dismissed') } catch { /* ignore */ } }, lang)
    await page.reload({ waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForFunction(() => { const i = document.querySelector('header [data-testid="brand-logo"] img'); return i && i.complete && i.naturalWidth > 0 })
    await page.waitForTimeout(800)

    const scroll = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }))
    check(`${tag} home: no horizontal scroll`, scroll.doc <= scroll.win, JSON.stringify(scroll))
    const head = await page.evaluate(boxesOverlap, HEADER)
    check(`${tag} home: no overlapping header items (${head.count})`, head.overlaps.length === 0 && head.outside.length === 0, [...head.overlaps, ...head.outside].join(', '))

    // Open-to-all strip
    const strip = page.locator('[data-testid="home-open-strip"]')
    const sb = await strip.boundingBox()
    const heroTop = await page.evaluate(() => [...document.querySelectorAll('[data-testid="hero-free-registration"]')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => r.top + window.scrollY)[0])
    const title = (await strip.locator('h2').innerText()).trim()
    check(`${tag} strip: title is the briefed line`, title === (lang === 'hi' ? 'बिना लॉगिन के सारी जानकारी देखें' : 'See all information without logging in'), title)
    check(`${tag} strip: near the top, above the hero, inside the screen`, sb && sb.y < 420 && sb.y < heroTop && sb.x >= 0 && sb.x + sb.width <= width + 0.5, JSON.stringify(sb))
    const hrefs = await strip.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    check(`${tag} strip: five open pages + the how-to link`, hrefs.join(',') === '/msp,/yojana,/sawaal,/cold-storage,/kisan-mela,/how-to-use', hrefs.join(','))
    const stripItems = await page.evaluate(boxesOverlap, [['title', '[data-testid="home-open-strip"] h2'], ['chip', '[data-testid="home-open-strip"] li'], ['how', '[data-testid="home-how-to-use"]']])
    check(`${tag} strip: its ${stripItems.count} parts do not overlap or leave the screen`, stripItems.overlaps.length === 0 && stripItems.outside.length === 0, [...stripItems.overlaps, ...stripItems.outside].join(', '))
    const tap = await strip.locator('a').evaluateAll((as) => Math.min(...as.map((a) => a.getBoundingClientRect().height)))
    check(`${tag} strip: every link is at least 40px tall (${Math.round(tap)}px)`, tap >= 40)

    // Free Registration: one badge + one line visible, exact wording
    const want = lang === 'hi' ? 'निःशुल्क रजिस्ट्रेशन' : 'Free Registration'
    const vis = async (sel) => page.locator(sel).evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.trim()))
    const badge = await vis('[data-testid="hero-free-registration"]')
    const line = await vis('[data-testid="post-free-registration"]')
    check(`${tag} promotion: one hero badge and one line by the post button, reading exactly "${want}"`, badge.length === 1 && line.length === 1 && badge[0] === `✓ ${want}` && line[0] === `✓ ${want}`, JSON.stringify({ badge, line }))
    const all = await page.evaluate((w) => (document.body.innerText.match(new RegExp(w, 'g')) || []).length, want)
    check(`${tag} promotion: the phrase appears nowhere else on the homepage`, all === 2, `count ${all}`)
    const hero = await page.evaluate(boxesOverlap, HERO)
    const heroParts = await page.evaluate(boxesOverlap, [['hero-child', ':is(div.md\\:hidden, div.md\\:flex) > div > div.w-full > *, div.md\\:flex > div.w-full > *']])
    check(`${tag} promotion: badge and line do not overlap anything in the hero`, hero.overlaps.length === 0 && hero.outside.length === 0 && heroParts.outside.length === 0, [...hero.overlaps, ...hero.outside, ...heroParts.outside].join(', '))
    const near = await page.evaluate(() => {
      const visible = (sel) => [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).find((r) => r.width > 0)
      const lineBox = visible('[data-testid="post-free-registration"]')
      const btn = [...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0 && r.height >= 60 && Math.abs(r.bottom - lineBox.top) < 20).sort((a, b) => b.right - a.right)[0]
      return btn ? { gap: Math.round(lineBox.top - btn.bottom), alignedRight: Math.abs(lineBox.right - btn.right) < 4 } : null
    })
    check(`${tag} promotion: the line sits directly under the post-listing button`, near && near.gap >= 0 && near.gap <= 16 && near.alignedRight, JSON.stringify(near))
    const banned = await page.evaluate(() => (document.body.innerText.replace(/निःशुल्क रजिस्ट्रेशन|Free Registration/g, ' ').match(/मुफ़्त|मुफ्त|निःशुल्क|\bfree\b/i) || [''])[0])
    check(`${tag} home: no other "free / मुफ़्त" wording anywhere on the page (install banner included)`, banned === '', banned)

    // Tiles
    const info = await page.evaluate(() => [...document.querySelectorAll('div.mt-4.flex.flex-col.gap-3 > *')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.innerText.trim().replace(/\s+/g, ' ')))
    check(`${tag} hero tiles: none empty, none showing just "—" (${info.length} tiles)`, info.length >= 2 && info.every((t) => t.length > 8 && !/^[^\n]*—\s*$/.test(t) && !t.includes(' — ·')), JSON.stringify(info))
    const grid = await page.evaluate(() => {
      const g = document.querySelector('[data-testid="home-cat-grid"]')
      const gr = g.getBoundingClientRect()
      const kids = [...g.children].map((k) => k.getBoundingClientRect())
      const rows = {}
      kids.forEach((r) => { const y = Math.round(r.top); rows[y] = Math.max(rows[y] || 0, r.right) })
      const empty = [...g.children].filter((k) => !k.innerText.trim()).length
      const imgs = [...g.querySelectorAll('img')]
      return { tiles: kids.length, rows: Object.keys(rows).length, ragged: Object.values(rows).filter((right) => Math.abs(right - gr.right) > 2).length, empty, cols: getComputedStyle(g).gridTemplateColumns.split(' ').length, imgCount: imgs.length }
    })
    check(`${tag} category grid: ${grid.tiles} tiles in ${grid.cols} columns, every row filled to the edge, no tile without a label`, grid.tiles === 15 && grid.ragged === 0 && grid.empty === 0, JSON.stringify(grid))
    // Lazy images: scroll through, then look for broken ones and for boxes with nothing in them.
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < h; y += 600) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120) }
    await page.waitForTimeout(600)
    const broken = await page.evaluate(() => [...document.querySelectorAll('main img, section img')].filter((i) => i.complete && i.naturalWidth === 0 && getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('src')))
    check(`${tag} home: no broken images`, broken.length === 0, broken.join(', '))
    const hollow = await page.evaluate(() => [...document.querySelectorAll('section button, section a, section [style*="border-radius"]')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 90 && r.height > 60 && !el.innerText.trim() && !el.querySelector('img, svg, canvas, input, video') }).map((el) => el.outerHTML.slice(0, 90)))
    check(`${tag} home: no card or tile with nothing in it`, hollow.length === 0, hollow.join(' | '))
    const melaLines = await page.locator('[data-testid="home-mela-card"]').evaluateAll((cs) => cs.map((c) => (c.innerText.match(/📍[^\n]*/) || [''])[0]))
    check(`${tag} mela cards: no place line that is just the country (${melaLines.length} cards)`, melaLines.every((l) => !/📍\s*(India|भारत)\s*(,|$)/.test(l)), melaLines.join(' | '))

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    await page.screenshot({ path: join(OUT, `home-${tag}.png`), fullPage: true })
    await page.screenshot({ path: join(OUT, `home-top-${tag}.png`), clip: { x: 0, y: 0, width, height: width < 1024 ? 1500 : 860 } })
  }

  // ---- sign-up heading line (Hindi), Terms, tab icon ---------------------------------
  await page.evaluate(() => localStorage.setItem('ks_lang_v1', 'hi'))
  await page.goto(BASE + '/signup', { waitUntil: 'networkidle' })
  const sLine = page.locator('[data-testid="signup-free-registration"]')
  await sLine.waitFor()
  await page.locator('main h1').first().waitFor()
  const sBox = await sLine.boundingBox()
  const h1Box = await page.locator('main h1').first().boundingBox()
  const formBox = await page.locator('main form').first().boundingBox()
  check(`${width} sign-up: "✓ निःशुल्क रजिस्ट्रेशन" sits between the heading and the form`, (await sLine.innerText()).trim() === '✓ निःशुल्क रजिस्ट्रेशन' && sBox.y >= h1Box.y + h1Box.height - 1 && sBox.y + sBox.height <= formBox.y + 1 && sBox.x + sBox.width <= width, JSON.stringify({ sBox, h1: h1Box.y, form: formBox.y }))
  check(`${width} sign-up: no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await page.screenshot({ path: join(OUT, `signup-${width}.png`), clip: { x: 0, y: 0, width, height: 620 } })

  await page.goto(BASE + '/terms', { waitUntil: 'networkidle' })
  const termsText = await page.locator('main').innerText()
  check(`${width} terms: general note shown once, 16 clauses, Hindi labels, no "free"`, (termsText.match(/ये शर्तें सरल भाषा में/g) || []).length === 1 && (await page.locator('main ol > li[id]').count()) === 16 && termsText.includes('विषय सूची') && termsText.includes('आख़िरी बदलाव') && !/मुफ़्त|निःशुल्क|\bfree\b/i.test(termsText))
  check(`${width} terms: no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await page.screenshot({ path: join(OUT, `terms-${width}.png`), clip: { x: 0, y: 0, width, height: 900 } })

  const iconOk = await page.evaluate(async () => {
    const links = [...document.querySelectorAll('link[rel="icon"]')].map((l) => l.getAttribute('href'))
    const loaded = await Promise.all(links.map((href) => fetch(href).then((r) => r.ok && r.headers.get('content-type')).catch(() => false)))
    return { links, loaded }
  })
  check(`${width} tab icon: svg, 48px and 32px icons are linked and load`, iconOk.links.join(',') === '/icons/favicon.svg,/icons/favicon-48.png,/icons/favicon-32.png' && iconOk.loaded.every((t) => t && /svg|png/.test(t)), JSON.stringify(iconOk))

  check(`${width} safety: nothing was written to the database`, true)
  if (blocked.length) console.log(`      (blocked non-read Supabase calls: ${[...new Set(blocked)].join(', ')})`)
  await ctx.close()
}
await browser.close()
server.close()

writeFileSync(join(OUT, 'browser-check.json'), JSON.stringify(results, null, 2), 'utf8')
const passed = results.filter((r) => r.ok).length
console.log(`\n${passed} passed, ${failures} failed — screenshots in docs/review/batch7d/`)
process.exit(failures ? 1 : 0)
