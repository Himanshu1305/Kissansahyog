#!/usr/bin/env node
// Batch 7A browser check — header at 320/360/390/768/1024/1280 in Hindi and English, About menu, footer,
// /about and the /grievance form. Serves dist/ itself (run `npm run build` first).
//   node scripts/shots-batch7a.mjs
// Screenshots + header-check.json go to docs/review/batch7a/. Exits non-zero if any
// header items overlap or any behaviour check fails. No database writes: the
// form's POST to /api/feedback is answered inside the browser.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch7a')
const PORT = 4179
const BASE = `http://localhost:${PORT}`
const WIDTHS = [320, 360, 390, 768, 1024, 1280]
const DESKTOP = 1024 // the desktop nav shows from Tailwind lg
const FULL = 1280 // all ten items (incl. the About menu) are in the row from Tailwind xl; below it About is inside और / More
mkdirSync(OUT, { recursive: true })

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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

// Bounding boxes of every visible header item, then every overlapping pair.
const measureHeader = () => {
  const header = document.querySelector('header')
  const items = []
  const add = (label, el) => {
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') return
    items.push({ label, x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, r: Math.round(r.right * 10) / 10, b: Math.round(r.bottom * 10) / 10 })
  }
  const bar = header.firstElementChild
  add('logo', bar.querySelector('[data-testid="brand-logo"] img'))
  add('site-name', bar.querySelector('[data-testid="nav-site-name"]'))
  header.querySelectorAll('[data-testid="nav-desktop"] > *').forEach((el, i) => add(el.matches('[data-testid="nav-about"]') ? 'about-menu' : `nav-${i}:${el.textContent.trim().slice(0, 12)}`, el))
  bar.querySelectorAll(':scope > div:last-child > *').forEach((el, i) => add(
    el.matches('[role="group"]') ? 'language-switch' : el.matches('[data-testid="nav-hamburger"]') ? 'hamburger' : `right-${i}:${el.textContent.trim().slice(0, 12) || el.tagName.toLowerCase()}`, el))
  const overlaps = []
  for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
    const a = items[i], b = items[j]
    if (a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5) overlaps.push(`${a.label} × ${b.label}`)
  }
  const logo = items.find((it) => it.label === 'logo')
  return {
    items, overlaps,
    logoHeight: logo ? Math.round((logo.b - logo.y) * 10) / 10 : null,
    overflowRight: items.filter((it) => it.r > window.innerWidth + 0.5 || it.x < -0.5).map((it) => it.label),
    pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth + 1,
  }
}

const browser = await chromium.launch()
const report = { header: [], behaviour: results }

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: width < 1024, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  // '/' has no search box in the header; '/about' has one (the tighter case).
  for (const [tag, path, lang] of [['home', '/', 'hi'], ['about', '/about', 'hi'], ['about-en', '/about', 'en']]) {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
    await page.evaluate((l) => localStorage.setItem('ks_lang_v1', l), lang)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('header [data-testid="brand-logo"] img')
    await page.waitForFunction(() => { const i = document.querySelector('header [data-testid="brand-logo"] img'); return i.complete && i.naturalWidth > 0 })
    const m = await page.evaluate(measureHeader)
    report.header.push({ width, path, lang, ...m })
    check(`header ${width}px ${path} ${lang}: no overlapping items (${m.items.length} items)`, m.overlaps.length === 0, m.overlaps.join(', '))
    check(`header ${width}px ${path} ${lang}: nothing outside the viewport, no sideways scroll`, m.overflowRight.length === 0 && !m.pageScrollsSideways, [...m.overflowRight, m.pageScrollsSideways ? 'page scrolls' : ''].filter(Boolean).join(', '))
    check(`header ${width}px ${path} ${lang}: logo height ${m.logoHeight}px is within 35–49px`, m.logoHeight >= 35 && m.logoHeight <= 49)
    await page.screenshot({ path: join(OUT, `header-${width}-${tag}.png`), clip: { x: 0, y: 0, width, height: 130 } })
  }
  await page.evaluate(() => localStorage.setItem('ks_lang_v1', 'hi'))
  await page.reload({ waitUntil: 'networkidle' })

  if (width >= DESKTOP && width < FULL) {
    // 1024–1279px (Batch 7H): the About links live in the और / More menu.
    const btn = page.locator('[data-testid="nav-more"] > button')
    const menu = page.locator('#nav-more-menu')
    await btn.focus()
    await page.keyboard.press('Enter')
    const hrefs = await menu.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    check(`more menu ${width}px: opens with the keyboard and has /about and /founder`, await menu.isVisible() && (await btn.getAttribute('aria-expanded')) === 'true' && hrefs.includes('/about') && hrefs.includes('/founder'), hrefs.join(','))
    await page.screenshot({ path: join(OUT, `about-menu-${width}.png`), clip: { x: 0, y: 0, width, height: 320 } })
    await page.keyboard.press('Escape')
    check(`more menu ${width}px: Escape closes it and returns focus`, !(await menu.isVisible()) && await btn.evaluate((el) => el === document.activeElement))
    await btn.click()
    await menu.locator('a[href="/founder"]').click()
    await page.waitForURL('**/founder')
    check(`more menu ${width}px: closes on route change and reaches /founder`, !(await page.locator('#nav-more-menu').isVisible()))
    check(`header ${width}px: the About dropdown itself is not in the row at this width`, !(await page.locator('[data-testid="nav-about"]').isVisible()))
  } else if (width >= FULL) {
    // Desktop dropdown: keyboard open, both links, Escape, outside click, route change.
    const btn = page.locator('[data-testid="nav-about"] > button')
    const menu = page.locator('#nav-about-menu')
    await btn.focus()
    await page.keyboard.press('Enter')
    check(`about menu ${width}px: opens with the keyboard`, await menu.isVisible() && (await btn.getAttribute('aria-expanded')) === 'true')
    const hrefs = await menu.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    check(`about menu ${width}px: has /about and /founder`, hrefs.join(',') === '/about,/founder', hrefs.join(','))
    const box = await menu.boundingBox()
    check(`about menu ${width}px: stays inside the viewport`, box && box.x >= 0 && box.x + box.width <= width, JSON.stringify(box))
    await page.screenshot({ path: join(OUT, `about-menu-${width}.png`), clip: { x: 0, y: 0, width, height: 260 } })
    await page.keyboard.press('Tab')
    check(`about menu ${width}px: Tab moves to the first link`, await page.evaluate(() => document.activeElement?.getAttribute('href')) === '/about')
    await page.keyboard.press('Escape')
    check(`about menu ${width}px: Escape closes it and returns focus`, !(await menu.isVisible()) && await btn.evaluate((el) => el === document.activeElement))
    await btn.click()
    await page.mouse.click(width / 2, 500)
    check(`about menu ${width}px: outside click closes it`, !(await menu.isVisible()))
    await btn.click()
    await menu.locator('a[href="/founder"]').click()
    await page.waitForURL('**/founder')
    check(`about menu ${width}px: closes on route change and reaches /founder`, !(await page.locator('#nav-about-menu').isVisible()))
    const topFounder = await page.locator('[data-testid="nav-desktop"]').locator(':scope > button, :scope > a').evaluateAll((els) => els.filter((el) => /founder|संस्थापक/i.test(el.textContent)).length)
    check(`header ${width}px: no separate top-level Founder link`, topFounder === 0)
  } else {
    // Mobile: hamburger → expandable About section (touch).
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.locator('[data-testid="nav-hamburger"]').tap()
    const toggle = page.locator('[data-testid="nav-about-mobile"] > button')
    const section = page.locator('#nav-about-mobile-menu')
    await toggle.scrollIntoViewIfNeeded()
    check(`mobile menu ${width}px: About section starts collapsed`, !(await section.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false')
    await toggle.tap()
    const hrefs = await section.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    check(`mobile menu ${width}px: About expands to /about and /founder`, await section.isVisible() && hrefs.join(',') === '/about,/founder', hrefs.join(','))
    await page.screenshot({ path: join(OUT, `mobile-menu-about-${width}.png`) })
    await section.locator('a[href="/about"]').tap()
    await page.waitForURL('**/about')
    check(`mobile menu ${width}px: menu closes on route change and reaches /about`, !(await page.locator('[data-testid="nav-about-mobile"]').isVisible()))
  }

  // Footer: the company line appears once.
  await page.goto(BASE + '/about', { waitUntil: 'networkidle' })
  const footerText = await page.locator('footer').innerText()
  const count = footerText.split('USD Vision AI LLP').length - 1
  check(`footer ${width}px: "USD Vision AI LLP" appears once`, count === 1, `found ${count}`)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.locator('footer').screenshot({ path: join(OUT, `footer-${width}.png`) })
  if (width === 390 || width === 1280) await page.screenshot({ path: join(OUT, `about-page-${width}.png`), fullPage: true })

  // The About page's link goes to the real /how-to-use page (built in Batch 7C).
  if (width === 390) {
    await page.goto(BASE + '/about', { waitUntil: 'networkidle' })
    await page.locator('[data-testid="about-how-to-use"]').click()
    await page.waitForTimeout(600)
    const url = new URL(page.url())
    check('how-to-use link lands on the /how-to-use page', url.pathname === '/how-to-use' && (await page.locator('h1').count()) === 1, page.url())
  }

  // Grievance form.
  if (width === 390 || width === 1280) {
    await page.goto(BASE + '/grievance', { waitUntil: 'networkidle' })
    const form = page.locator('[data-testid="feedback-form"]')
    const inputs = await form.locator('input, textarea, select').evaluateAll((els) => els.map((el) => `${el.type}:${el.name}`))
    check(`grievance ${width}px: e-mail + type + message only, no name or phone field`,
      inputs.includes('text:contact') && inputs.includes('textarea:message') && inputs.filter((i) => i.startsWith('radio:kind')).length === 3
      && !inputs.some((i) => /name$|phone|tel:/i.test(i.replace('ks_leave_empty', ''))), inputs.join(' '))
    // Batch 7E: no officer, appeal route or grievance@ in the page text; hello@ in the direct-email line.
    check(`grievance ${width}px: extra information is collapsed but present, without officer / appeal content`, await page.locator('[data-testid="grievance-legal"]').evaluate((d) => !d.open && d.textContent.includes('शिकायत कैसे करें') && !/grievance@|gac\.gov\.in|शिकायत अधिकारी|24 घंटे/.test(d.textContent)))
    check(`grievance ${width}px: "email us directly" goes to hello@`, (await page.locator('[data-testid="feedback-direct-email"]').getAttribute('href')) === 'mailto:hello@kissansahyog.com' && !(await page.locator('main').innerText()).includes('grievance@'))
    await page.screenshot({ path: join(OUT, `grievance-${width}.png`), fullPage: true })

    // Validation: empty form is refused.
    await form.locator('button[type="submit"]').click()
    check(`grievance ${width}px: empty form shows a validation message`, await form.locator('[role="alert"]').isVisible())

    // The server cannot store it (503) → e-mail fallback, no false "sent". Since Batch 7G
    // the form posts only to /api/feedback; the browser never calls the database itself.
    let sent = null
    await page.route('**/api/feedback', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) }))
    await form.locator('#fb-contact').fill('kisan@example.com')
    await form.locator('label:has(input[value="problem"])').click()
    await form.locator('#fb-message').fill('मंडी भाव का पेज नहीं खुल रहा है।')
    await form.locator('button[type="submit"]').click()
    await page.locator('[data-testid="feedback-mailto"]').waitFor()
    const href = await page.locator('[data-testid="feedback-mailto"]').getAttribute('href')
    check(`grievance ${width}px: server unavailable → e-mail fallback, no thank-you`, href.startsWith('mailto:grievance@kissansahyog.com?') && !(await page.locator('[data-testid="feedback-done"]').isVisible()))
    await page.screenshot({ path: join(OUT, `grievance-fallback-${width}.png`), fullPage: true })

    // The server stores it → warm confirmation; payload has no name.
    await page.unroute('**/api/feedback')
    await page.route('**/api/feedback', (route) => { sent = route.request().postDataJSON(); route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }) })
    await form.locator('button[type="submit"]').click()
    await page.locator('[data-testid="feedback-done"]').waitFor()
    check(`grievance ${width}px: stored by the server → confirmation shown`, (await page.locator('[data-testid="feedback-done"]').innerText()).length > 20)
    check(`grievance ${width}px: request carries e-mail, type, message and no name/phone`,
      sent && sent.email === 'kisan@example.com' && sent.kind === 'problem' && sent.message.length > 5 && !Object.keys(sent).some((k) => /name|phone/.test(k)), JSON.stringify(sent && Object.keys(sent)))
    await page.screenshot({ path: join(OUT, `grievance-done-${width}.png`) })
    await page.unroute('**/api/feedback')
  }
  await ctx.close()
}

await browser.close()
server.close()
writeFileSync(join(OUT, 'header-check.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
console.log(`\n${results.length - failures} passed, ${failures} failed — screenshots in docs/review/batch7a/`)
process.exit(failures ? 1 : 0)
