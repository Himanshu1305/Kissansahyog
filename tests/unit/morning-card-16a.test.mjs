// Batch 16A - the 1080x1350 card: Playwright render of fixtures with an overflow assertion (needs the Playwright chromium).
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { cardData, renderCard } from '../../scripts/morning/card/render.mjs'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture, FIXTURE_DATE } from '../../scripts/morning/fixtures.js'

const DATA = loadData()
let browser
const getBrowser = async () => (browser ||= await chromium.launch())
after(async () => { if (browser) await browser.close() })

const modelFor = async (name, mutate) => {
  const fx = loadFixture(name)
  const rows = mutate ? mutate(fx.rows) : fx.rows
  const r = await generate({ date: FIXTURE_DATE, data: DATA, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows, flag: 'fixture' }) } })
  return r.model
}
const isPng = (b) => b.length > 8 && b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && b.readUInt32BE(16) === 1080 && b.readUInt32BE(20) === 1350

for (const name of ['normal', 'rainy', 'no-weather', 'missing-mandi']) {
  test(`card renders at 1080x1350 with nothing overflowing: ${name}`, async () => {
    const { png, overflow } = await renderCard(cardData(await modelFor(name)), { browser: await getBrowser() })
    assert.ok(isPng(png)); assert.deepEqual(overflow, [])
    assert.ok(png.length < 600 * 1024, `${png.length} bytes`)
  })
}

test('card: a long crop name and a 4-digit price do not overflow their boxes', async () => {
  const data = cardData(await modelFor('normal'))
  data.prices[0] = { name: 'बहुत लंबे नाम वाली फसल का नाम और उसका पूरा विवरण', price: '₹12,345', dir: 'up', change: '▲ ₹1,234' }
  data.prices[1].name = 'अतिदीर्घनामवालीफसलजिसकानामबहुतहीलम्बाहै'
  const { overflow } = await renderCard(data, { browser: await getBrowser() })
  assert.deepEqual(overflow, [])
})

test('card: the old-date note and text sizes meet the brief (no text under 22px; mandi names are the smallest)', async () => {
  const model = await modelFor('normal')
  model.mandi = { ...model.mandi, isYesterday: false, date: '2026-10-22' }
  const data = cardData(model)
  assert.equal(data.priceNote, '(22 अक्टूबर के भाव)')
  const b = await getBrowser()
  const page = await b.newPage({ viewport: { width: 1080, height: 1350 } })
  await page.setContent((await import('../../scripts/morning/card/render.mjs')).renderHtml ? await (await import('../../scripts/morning/card/render.mjs')).renderHtml(data) : '')
  const small = await page.evaluate(() => [...document.querySelectorAll('#card *')].filter((e) => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 22).map((e) => e.className))
  await page.close()
  assert.deepEqual(small, [])
})

// WCAG AA (4.5:1) for the colour pairs the card uses (the site's tokens, src/styles/tokens.css)
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
test('card colours: every text/background pair is at least 4.5:1', () => {
  const pairs = [['#FFFFFF', '#24733F'], ['#FFFFFF', '#185A31'], ['#173323', '#EAF3DE'], ['#3F4A38', '#EAF3DE'], ['#185A31', '#EAF3DE'], ['#173323', '#FFFFFF'], ['#185A31', '#FFFFFF'], ['#B4520A', '#FFFFFF'], ['#3F4A38', '#FFFFFF']]
  for (const [fg, bg] of pairs) assert.ok(ratio(fg, bg) >= 4.5, `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`)
})
