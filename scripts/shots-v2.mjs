#!/usr/bin/env node
// Phase 15 screenshot review — capture key routes at 375×812 and 1280×800.
//   node scripts/shots-v2.mjs [baseUrl]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.argv[2] || 'https://db5a1a0f.kissansahyog.pages.dev'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs/review/shots-v2')
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['home', '/'],
  ['greenhouse', '/greenhouse'],
  ['carbon-credit', '/carbon-credit'],
  ['carbon-brief', '/carbon-credit/niti-sujhav'],
  ['jugaad', '/jugaad'],
  ['cold-storage', '/cold-storage'],
  ['cold-storage-sagar', '/cold-storage/sagar'],
  ['sawaal-index', '/sawaal'],
  ['sawaal-detail', '/sawaal/pmfby-premium-kitna'],
  ['sawaal-detail2', '/sawaal/soybean-girdle-beetle-control'],
  ['fasal-soybean', '/fasal/soybean/samasya'],
  ['sawaal-category', '/sawaal/vishay/scheme'],
  ['mausam', '/mausam'],
  ['msp', '/msp'],
  ['yojana', '/yojana'],
  ['grievance', '/grievance'],
  ['terms', '/terms'],
  ['privacy', '/privacy'],
  ['resources', '/resources'],
  ['notfound', '/zzz-unknown-page'],
]
const SIZES = [['m', 375, 812], ['d', 1280, 800]]

const browser = await chromium.launch()
let ok = 0, fail = 0
for (const [name, path] of ROUTES) {
  for (const [tag, w, h] of SIZES) {
    const page = await browser.newContext({ viewport: { width: w, height: h } }).then((c) => c.newPage())
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(1200)
      await page.screenshot({ path: join(OUT, `${name}-${tag}.png`), fullPage: tag === 'd' })
      ok++
    } catch (e) { console.log(`FAIL ${name}-${tag}: ${e.message}`); fail++ }
    await page.close()
  }
  console.log(`shot ${name}`)
}
await browser.close()
console.log(`\n${ok} shots ok, ${fail} failed → ${OUT}`)
