#!/usr/bin/env node
// Batch 3 screenshot review — capture the rewritten content pages at 375×812 and
// 1280×800, and flag horizontal scroll / missing NavBar on each.
//   node scripts/shots-batch3.mjs [baseUrl]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs/review/shots-batch3')
mkdirSync(OUT, { recursive: true })

// [name, path, {lang?, click?}]
const ROUTES = [
  ['home', '/', {}],
  ['greenhouse-subsidy', '/greenhouse/subsidy', {}],
  ['greenhouse-subsidy-en', '/greenhouse/subsidy', { lang: 'en' }],
  ['jugaad-jankari', '/jugaad/jankari', {}],
  ['carbon-credit', '/carbon-credit', {}],
  ['carbon-credit-en', '/carbon-credit', { lang: 'en' }],
  ['carbon-brief', '/carbon-credit/niti-sujhav', {}],
  ['cold-storage', '/cold-storage', {}],
  ['fasal-salah-crop', '/fasal-salah', { click: '[data-testid^="fasal-crop-"]' }],
  ['sawaal-index', '/sawaal', {}],
  ['sawaal-hindi', '/sawaal/soybean-yellow-mosaic-virus', {}],
  ['sawaal-english', '/sawaal/soybean-yellow-mosaic-virus', { lang: 'en' }],
  ['sawaal-legacy', '/sawaal/gehun-pattiyon-bhure-pile-chakatte-naarangi-dhaariyaan', {}],
  ['grievance', '/grievance', {}],
  ['terms', '/terms', {}],
  ['privacy', '/privacy', {}],
]
const SIZES = [['m', 375, 812], ['d', 1280, 800]]

const browser = await chromium.launch()
let ok = 0, fail = 0
const warnings = []
for (const [name, path, opts] of ROUTES) {
  for (const [tag, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } })
    if (opts.lang) await ctx.addInitScript((l) => localStorage.setItem('ks_lang_v1', l), opts.lang)
    const page = await ctx.newPage()
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(1000)
      if (opts.click) { try { await page.locator(opts.click).first().click({ timeout: 4000 }); await page.waitForTimeout(800) } catch { /* variant */ } }
      const diag = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        hasNav: !!document.querySelector('nav, header'),
      }))
      if (diag.scrollW > diag.innerW + 1) warnings.push(`${name}-${tag}: horizontal scroll (${diag.scrollW} > ${diag.innerW})`)
      if (!diag.hasNav) warnings.push(`${name}-${tag}: no nav/header element`)
      await page.screenshot({ path: join(OUT, `${name}-${tag}.png`), fullPage: tag === 'd' })
      ok++
    } catch (e) { console.log(`FAIL ${name}-${tag}: ${e.message}`); fail++ }
    await ctx.close()
  }
  console.log(`shot ${name}`)
}
await browser.close()
console.log(`\n${ok} shots ok, ${fail} failed → ${OUT}`)
if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach((w) => console.log('  ' + w)) }
else console.log('\nNo horizontal-scroll / missing-nav warnings.')
