// Batch 18 Part 4 (P2) - the six-district strip on the card: nothing overflows, no emoji in the strip, size within the limit, off = no strip.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { cardData, renderCard } from '../../scripts/morning/card/render.mjs'
import { S } from '../../scripts/morning/strings.hi.js'
import { run } from './helpers/morning18.mjs'

let browser
const getBrowser = async () => (browser ||= await chromium.launch())
after(async () => { if (browser) await browser.close() })

const CASES = [['all dry', 1, 'all-dry'], ['mixed (heavy)', 4, 'heavy'], ['rain in two', 3, 'rain-two'], ['one unavailable', 1, 'one-unavailable'], ['all unavailable', 1, 'all-unavailable'], ['stale cells', 5, 'stale-two']]
for (const [label, f, sc] of CASES) {
  test(`card strip: ${label}: 1080x1350, nothing overflows, last box clear of the footer, under 500 KB`, async () => {
    const r = await run(f, sc)
    const data = cardData(r.model)
    assert.equal(data.districts.items.length, 6)
    assert.equal(data.districts.hint, S.cardDistrictHint)
    const { png, overflow } = await renderCard(data, { browser: await getBrowser() })
    assert.deepEqual(overflow, [])
    assert.equal(png.readUInt32BE(16), 1080); assert.equal(png.readUInt32BE(20), 1350)
    assert.ok(png.length < 500 * 1024, `${png.length} bytes`)
  })
}

test('card strip data: no emoji or symbol glyphs in the strip (plain text and CSS colours only, so no tofu boxes anywhere)', async () => {
  const d = cardData((await run(3, 'rain-two')).model).districts
  const text = JSON.stringify(d)
  assert.ok(!/[\u{1F000}-\u{1FFFF}☀-➿️]/u.test(text), text)
})

test('card strip: unavailable district shows the "no information" word, the Sagar cell equals the Sagar sentence data', async () => {
  const r = await run(3, 'one-unavailable')
  const it = cardData(r.model).districts.items
  assert.equal(it[5].word, S.cardDistrictNone); assert.equal(it[5].level, 'none')
  assert.equal(it[0].level, r.model.verdict.windows.today.level)
})

test('card: with MORNING_DISTRICTS=off or no loader there is no strip and the card data has districts: null', async () => {
  assert.equal(cardData((await run(1, null)).model).districts, null)
  assert.equal(cardData((await run(1, 'all-dry', { env: { MORNING_DISTRICTS: 'off' } })).model).districts, null)
})

test('card: worst case (heavy rain, long rows, strip with a soon-marker everywhere) still fits', async () => {
  const r = await run(4, 'heavy')
  const data = cardData(r.model)
  data.districts.items = data.districts.items.map((x) => ({ ...x, soon: S.cardDistrictSoon, word: S.districtWord.moderate, level: 'moderate' }))
  const { overflow } = await renderCard(data, { browser: await getBrowser() })
  assert.deepEqual(overflow, [])
})
