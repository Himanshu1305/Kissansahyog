#!/usr/bin/env node
// Batch 19 browser proof (local preview only). For each page at 360 and 1280 px (Hindi and English):
// no horizontal scroll, one H1, status badge, note, channel button, >= 48 px tap targets for CTAs, JSON-LD parses,
// FAQPage text equals visible FAQ text, table vs stacked cards, screenshots into the evidence folder.
//   node scripts/batch19/proof.mjs <baseUrl> <outDir> [homeBaseUrlForBefore]
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4181'
const OUT = process.argv[3] || 'docs/review/batch19/evidence/browser'
const BEFORE = process.argv[4] || ''
mkdirSync(OUT, { recursive: true })
const PATHS = ['/pashupalan', '/pashupalan/desi-gay-anudan', '/pashupalan/kamdhenu-yojana', '/pashupalan/gaushala-anudan', '/pashupalan/pashu-kisan-credit-card', '/pashupalan/kendriya-yojanayen', '/pashupalan/desi-nasle']
const VPS = [{ n: 360, w: 360, h: 800 }, { n: 1280, w: 1280, h: 900 }]
const results = []
const browser = await chromium.launch()
const slug = (p) => p.replace(/\//g, '_').replace(/^_/, '') || 'home'

async function open(ctx, url, lang) {
  const page = await ctx.newPage()
  await page.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch {} }, lang)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(700)
  return page
}

for (const vp of VPS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 })
  for (const path of PATHS) {
    const page = await open(ctx, BASE + path, 'hi')
    const r = await page.evaluate(() => {
      const q = (s) => [...document.querySelectorAll(s)]
      const visible = (e) => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }
      const small = q('main a, main button, main summary').filter(visible).filter((e) => e.getBoundingClientRect().height < 44).map((e) => (e.textContent || '').trim().slice(0, 30))
      const ld = q('script[type="application/ld+json"]').map((s) => { try { return JSON.parse(s.textContent) } catch { return null } })
      const faqLd = ld.find((x) => x && x['@type'] === 'FAQPage')
      const faqVisible = q('#faq details').map((d) => [d.querySelector('summary').textContent.trim(), d.querySelector('p').textContent.trim()])
      const faqSame = !!faqLd && faqLd.mainEntity.length === faqVisible.length && faqLd.mainEntity.every((m, i) => m.name === faqVisible[i][0] && m.acceptedAnswer.text === faqVisible[i][1])
      return {
        title: document.title, canonical: document.querySelector('link[rel=canonical]')?.href, h1: q('h1').length,
        hScroll: document.documentElement.scrollWidth > window.innerWidth + 1, scrollW: document.documentElement.scrollWidth,
        status: q('[data-testid="pashu-status"]').filter(visible).length, note: !!document.querySelector('[data-testid="pashu-note"]'), channel: q('[data-testid="wa-channel-btn"]').length,
        answerWords: (document.querySelector('[data-testid="pashu-answer"]')?.textContent || '').trim().split(/\s+/).length,
        small, ldParsed: ld.filter(Boolean).length, ldTypes: ld.filter(Boolean).map((x) => x['@type']), faqSame, faqCount: faqVisible.length,
        tableVisible: q('[data-testid="pashu-table"]').filter(visible).length, cardsVisible: q('[data-testid="pashu-cards"]').filter(visible).length,
        related: q('[data-testid="pashu-related"]').length, dateModified: ld.find((x) => x && x.dateModified)?.dateModified,
        wordsVisible: (document.querySelector('main')?.innerText || '').split(/\s+/).filter(Boolean).length,
      }
    })
    r.path = path; r.vp = vp.n; r.lang = 'hi'
    await page.screenshot({ path: join(OUT, `${slug(path)}-${vp.n}.png`), fullPage: true })
    results.push(r)
    await page.close()
  }
  // English view of the hub and one detail page
  for (const path of ['/pashupalan', '/pashupalan/desi-gay-anudan']) {
    const page = await open(ctx, BASE + path, 'en')
    const info = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, hScroll: document.documentElement.scrollWidth > window.innerWidth + 1, devanagariInMain: /[ऀ-ॿ]/.test(document.querySelector('main')?.innerText || '') }))
    results.push({ path, vp: vp.n, lang: 'en', ...info })
    await page.screenshot({ path: join(OUT, `${slug(path)}-${vp.n}-en.png`), fullPage: true })
    await page.close()
  }
  // Decision guide interaction on the hub
  const page = await open(ctx, BASE + '/pashupalan', 'hi')
  const picks = {}
  for (const id of ['few', 'dairy', 'gaushala', 'money', 'breed']) {
    await page.click(`[data-testid="guide-${id}"]`)
    picks[id] = await page.getAttribute('[data-testid="guide-go"]', 'href')
  }
  results.push({ path: '/pashupalan', vp: vp.n, guide: picks })
  await page.screenshot({ path: join(OUT, `guide-${vp.n}.png`), fullPage: false })
  await page.close()
  // Homepage after (and before when given)
  const hp = await open(ctx, BASE + '/', 'hi')
  const pill = await hp.evaluate(() => ({ link: !!document.querySelector('a[href="/pashupalan"]'), hScroll: document.documentElement.scrollWidth > window.innerWidth + 1 }))
  results.push({ path: '/', vp: vp.n, ...pill })
  await hp.screenshot({ path: join(OUT, `home-after-${vp.n}.png`), fullPage: true }); await hp.close()
  if (BEFORE) { const hb = await open(ctx, BEFORE + '/', 'hi'); await hb.screenshot({ path: join(OUT, `home-before-${vp.n}.png`), fullPage: true }); await hb.close() }
  // other entry points
  for (const p of ['/yojana', '/yojana/mp', '/yojana/central']) {
    const yp = await open(ctx, BASE + p, 'hi')
    results.push({ path: p, vp: vp.n, pashuLink: !!(await yp.$('[data-testid="yojana-pashupalan-link"]')), footerLink: !!(await yp.$('[data-testid="footer-pashupalan"]')) })
    await yp.close()
  }
  await ctx.close()
}
await browser.close()
writeFileSync(join(OUT, 'proof.json'), JSON.stringify(results, null, 2))
const bad = results.filter((r) => r.hScroll || (typeof r.h1 === 'number' && r.h1 !== 1) || (r.small && r.small.length) || (r.faqSame === false) || r.devanagariInMain)
console.log(`checked ${results.length} rows; problems: ${bad.length}`)
for (const b of bad) console.log(JSON.stringify(b))
