#!/usr/bin/env node
// Batch 19-B browser proof against a local preview. For every Pashupalan page at 360 and 1280 px, Hindi and English:
// one H1, no horizontal scroll, tap targets >= 44 px, no console errors, every internal link clicked, safe external links,
// direct loads (with/without trailing slash, reload after client navigation), the calculator.
//   node scripts/batch19/proof-b.mjs <baseUrl> <outDir>      writes proof.json + links.json + screenshots/
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = (process.argv[2] || 'http://localhost:4182').replace(/\/$/, '')
const OUT = process.argv[3] || 'docs/review/batch19b/evidence/browser'
mkdirSync(OUT, { recursive: true })
const PATHS = ['/pashupalan', '/pashupalan/desi-gay-anudan', '/pashupalan/kamdhenu-yojana', '/pashupalan/gaushala-anudan', '/pashupalan/pashu-kisan-credit-card', '/pashupalan/kendriya-yojanayen', '/pashupalan/desi-nasle', '/pashupalan/pashupalan-se-kamai']
const VPS = [{ n: 360, w: 360, h: 800 }, { n: 1280, w: 1280, h: 900 }]
const proof = []; const links = []; const direct = []
const browser = await chromium.launch()
const slug = (p) => p.replace(/\//g, '_').replace(/^_/, '') || 'home'

async function open(ctx, url, lang, errors) {
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)))
  await page.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch {} }, lang)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(500)
  return page
}

for (const vp of VPS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } })
  for (const lang of ['hi', 'en']) {
    for (const path of PATHS) {
      const errors = []
      const page = await open(ctx, BASE + path, lang, errors)
      const r = await page.evaluate(() => {
        const q = (s) => [...document.querySelectorAll(s)]
        const vis = (e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }
        const small = q('main a, main button, main summary, main input').filter(vis).filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => (e.textContent || e.placeholder || '').trim().slice(0, 30))
        const ld = q('script[type="application/ld+json"]').map((s) => { try { return JSON.parse(s.textContent) } catch { return null } })
        const faqLd = ld.find((x) => x && x['@type'] === 'FAQPage')
        const faqVisible = q('#faq details').map((d) => [d.querySelector('summary span').textContent.trim(), d.querySelector('p').textContent.trim()])
        const faqSame = !!faqLd && faqLd.mainEntity.length === faqVisible.length && faqLd.mainEntity.every((m, i) => m.name === faqVisible[i][0] && m.acceptedAnswer.text === faqVisible[i][1])
        const ext = q('main a[target="_blank"]').filter((a) => !a.closest('[data-testid="wa-channel-btn"]'))
        const unsafe = ext.filter((a) => !/noopener/.test(a.rel) || !/noreferrer/.test(a.rel)).map((a) => a.href)
        const bodyPx = parseFloat(getComputedStyle(document.querySelector('main p') || document.body).fontSize)
        return {
          h1: q('h1').length, hScroll: document.documentElement.scrollWidth > window.innerWidth + 1, scrollW: document.documentElement.scrollWidth,
          small, faqSame, faqCount: faqVisible.length, faqOpen: q('#faq details[open]').length, unsafe, extCount: ext.length,
          directBtns: q('[data-testid="pashu-direct"]').length, noLink: q('[data-testid="pashu-nolink"]').length, tiles: q('main ul li p.text-\\[26px\\]').length,
          cards: q('[data-testid="pashu-cards"] > li').length, tablesVisible: q('table').filter(vis).length, bodyPx,
          devanagariInMain: /[ऀ-ॿ]/.test(document.querySelector('main')?.innerText || ''),
          words: (document.querySelector('main')?.innerText || '').split(/\s+/).filter(Boolean).length,
          internal: q('main a[href^="/"]').map((a) => a.getAttribute('href')),
        }
      })
      r.path = path; r.vp = vp.n; r.lang = lang; r.consoleErrors = errors
      await page.screenshot({ path: join(OUT, `${slug(path)}-${vp.n}-${lang}.png`), fullPage: true })
      // click EVERY internal link (by index), check it lands on a Pashupalan/site page with one H1
      const total = r.internal.length
      const p2 = page
      for (let i = 0; i < total; i++) {
        const href = r.internal[i]
        let res = { path, vp: vp.n, lang, index: i, href }
        try {
          const el = p2.locator('main a[href^="/"]').nth(i)
          await el.scrollIntoViewIfNeeded({ timeout: 4000 })
          await el.click({ timeout: 6000 })
          await p2.waitForSelector('h1', { timeout: 8000 })
          await p2.waitForTimeout(150)
          const trim = (x) => (x.length > 1 && x.endsWith('/') ? x.slice(0, -1) : x)
          const now = trim(new URL(p2.url()).pathname)
          const want = trim(href.split('#')[0].split('?')[0])
          res = { ...res, landed: now, ok: now === want && (await p2.locator('h1').count()) >= 1 }
        } catch (e) { res = { ...res, ok: false, error: String(e).slice(0, 120) } }
        links.push(res)
        await p2.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {})
        await p2.waitForSelector('main a[href^="/"]', { timeout: 8000 }).catch(() => {})
        if (new URL(p2.url()).pathname !== path) await p2.goto(BASE + path, { waitUntil: 'domcontentloaded' })
      }
      proof.push(r)
      await page.close()
    }
  }
  // direct loads: with/without trailing slash, and reload after client navigation
  for (const path of PATHS) {
    for (const url of [path, path + '/']) {
      const errors = []
      const page = await open(ctx, BASE + url, 'hi', errors)
      direct.push({ vp: vp.n, url, kind: 'direct', ok: (await page.locator('h1').count()) === 1 && errors.length === 0, errors })
      await page.close()
    }
  }
  {
    const errors = []
    const page = await open(ctx, BASE + '/pashupalan', 'hi', errors)
    await page.locator('[data-testid="pashu-scheme-link"]').first().click()
    await page.waitForURL('**/pashupalan/desi-gay-anudan**'); await page.reload({ waitUntil: 'networkidle' })
    direct.push({ vp: vp.n, url: '/pashupalan -> card click -> reload', kind: 'reload', ok: (await page.locator('h1').count()) === 1 && new URL(page.url()).pathname.includes('desi-gay-anudan'), errors })
    await page.close()
  }
  // calculator (income page)
  for (const lang of ['hi', 'en']) {
    const errors = []
    const page = await open(ctx, BASE + '/pashupalan/pashupalan-se-kamai', lang, errors)
    const empty = await page.locator('[data-testid="calc-animals"]').inputValue()
    const before = await page.locator('[data-testid="calc-result"]').innerText()
    await page.fill('[data-testid="calc-animals"]', '2'); await page.fill('[data-testid="calc-litres"]', '5'); await page.fill('[data-testid="calc-price"]', '40'); await page.fill('[data-testid="calc-cost"]', '100')
    const income = await page.locator('[data-testid="calc-income"]').innerText(); const diff = await page.locator('[data-testid="calc-diff"]').innerText()
    await page.check('[data-testid="calc-aid"]'); const withAid = await page.locator('[data-testid="calc-diff-aid"]').innerText()
    const stored = await page.evaluate(() => localStorage.length + sessionStorage.length)
    await page.locator('[data-testid="pashu-calc"]').screenshot({ path: join(OUT, `calc-${vp.n}-${lang}.png`) })
    proof.push({ calc: true, vp: vp.n, lang, startsEmpty: empty === '', beforeText: before.slice(0, 40), income, diff, withAid, ok: empty === '' && /12,000/.test(income) && /6,000/.test(diff) && /7,800/.test(withAid), consoleErrors: errors })
    await page.close()
  }
  // guide + homepage untouched
  {
    const page = await open(ctx, BASE + '/pashupalan', 'hi', [])
    const picks = {}
    for (const id of ['few', 'dairy', 'gaushala', 'money', 'breed']) { await page.click(`[data-testid="guide-${id}"]`); picks[id] = await page.getAttribute('[data-testid="guide-go"]', 'href') }
    proof.push({ guide: picks, vp: vp.n })
    await page.close()
  }
  await ctx.close()
}
await browser.close()
const bad = {
  h1: proof.filter((r) => r.path && r.h1 !== 1).length, hScroll: proof.filter((r) => r.hScroll).length,
  small: proof.filter((r) => r.small?.length).map((r) => `${r.path} ${r.vp} ${r.lang}: ${r.small.join('|')}`),
  consoleErrors: proof.filter((r) => r.consoleErrors?.length).length, unsafe: proof.filter((r) => r.unsafe?.length).length,
  brokenLinks: links.filter((l) => !l.ok).length, directFail: direct.filter((d) => !d.ok).length,
  calcFail: proof.filter((r) => r.calc && !r.ok).length, faqMismatch: proof.filter((r) => r.path && !r.faqSame).length,
}
const summary = { base: BASE, internalLinksClicked: links.length, linksOk: links.filter((l) => l.ok).length, directLoads: direct.length, bad }
writeFileSync(join(OUT, '..', 'links.json'), JSON.stringify({ summary: { ...summary }, clicked: links, direct }, null, 1))
writeFileSync(join(OUT, '..', 'proof.json'), JSON.stringify({ summary, pages: proof.map(({ internal, ...r }) => r) }, null, 1))
console.log(JSON.stringify(summary, null, 1))
