// Batch 17A Part E - the restyled card: never overflows 1080x1350 for 0, 3 and 5 mandi rows, with and without the scheme/tip boxes.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { cardData, renderCard, MAX_ROWS } from '../../scripts/morning/card/render.mjs'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture, FIXTURE_DATE } from '../../scripts/morning/fixtures.js'

const DATA = loadData()
let browser
const getBrowser = async () => (browser ||= await chromium.launch())
after(async () => { if (browser) await browser.close() })

const modelFor = async (name = 'normal') => {
  const fx = loadFixture(name)
  const r = await generate({ date: FIXTURE_DATE, data: DATA, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
  return r.model
}
const item = (i) => ({ crop: {}, name: ['गेहूं', 'चना', 'सरसों', 'सोयाबीन', 'लहसुन', 'मक्का'][i % 6], price: 6950 + i * 1111, delta: i % 3 === 0 ? 0 : (i % 3 === 1 ? 150 : -450), best: { market: i % 2 ? 'बड़ामलहरा मंडी' : 'अजयगढ़ मंडी', price: 7000 }, series: [] })
const SCHEME = { kind: 'scheme', lines: [], scheme: { title_hi: 'पीएम-किसान सम्मान निधि', who_hi: 'साल में छह हज़ार रुपये, तीन किस्तों में सीधे बैंक खाते में। ई-केवाईसी और आधार-लिंक खाता ज़रूरी।' } }
const TIP = { kind: 'saving', lines: ['💡 *आज की बचत*', 'बुवाई से पहले बीज का उपचार ज़रूर करें, रोग कम लगते हैं, पैदावार बेहतर होती है।'] }
const isPng = (b) => b.length > 8 && b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && b.readUInt32BE(16) === 1080 && b.readUInt32BE(20) === 1350

for (const rows of [0, 3, 5]) for (const boxes of ['none', 'scheme+tip', 'task only']) {
  test(`card: ${rows} mandi rows, ${boxes}: 1080x1350, nothing overflows, last box clear of the footer, under 500 KB`, async () => {
    const m = await modelFor()
    m.mandi = rows ? { ...m.mandi, shown: Array.from({ length: rows }, (_, i) => item(i)), extra: [] } : null
    if (boxes === 'scheme+tip') { m.slot = { ...SCHEME }; m.tasks = ['तेज़ हवा में छिड़काव न करें', 'सिंचाई वाले खेत में नमी जाँचें'] }
    else if (boxes === 'none') { m.slot = null; m.tasks = [] }
    else { m.slot = null; m.tasks = ['बुवाई वाले खेत में नमी जाँचें'] }
    const data = cardData(m)
    assert.equal(data.prices.length, rows)
    if (boxes === 'none') assert.ok(!data.scheme && !data.tip)
    if (boxes === 'scheme+tip') assert.ok(data.scheme && data.tip)
    const { png, overflow } = await renderCard(data, { browser: await getBrowser() })
    assert.ok(isPng(png)); assert.deepEqual(overflow, [])
    assert.ok(png.length < 500 * 1024, `${png.length} bytes`)
  })
}

test('card: worst case (rainy, 5 long rows, scheme with a long text, tip, wind + spraying hint) still fits', async () => {
  const m = await modelFor('rainy')
  m.mandi = { ...m.mandi, shown: Array.from({ length: 5 }, (_, i) => ({ ...item(i), name: 'बहुत लंबे नाम वाली फसल' })), extra: [] }
  m.slot = { ...SCHEME, scheme: { ...SCHEME.scheme, who_hi: SCHEME.scheme.who_hi + ' ' + SCHEME.scheme.who_hi } }
  m.tasks = ['दवा-खाद का छिड़काव कल पर टालें', 'कटी फसल और अनाज ढककर रखें']
  const { overflow } = await renderCard(cardData(m), { browser: await getBrowser() })
  assert.deepEqual(overflow, [])
})

test('card: more than 5 crops are cut at 5; extra verified crops fill the rows', async () => {
  const m = await modelFor()
  m.mandi = { ...m.mandi, shown: [item(0), item(1), item(2), item(3)], extra: [item(4), item(5), item(6)] }
  assert.equal(MAX_ROWS, 5); assert.equal(cardData(m).prices.length, 5)
})

test('card data: the real data date is in the mandi title; older prices say so; digits use the rupee format; arrows and flat marker', async () => {
  const m = await modelFor()
  const d = cardData(m)
  assert.match(d.priceTitle, /\(24\/10\)/)
  assert.ok(d.greeting.includes('सीताराम किसान भाइयो!') && d.dateText === 'रविवार, 25 अक्टूबर · सागर संभाग')
  assert.ok(d.footer.includes('kissansahyog.com') && d.footer.includes('जय किसान'))
  const m2 = await modelFor(); m2.mandi = { ...m2.mandi, isYesterday: false, date: '2026-10-22' }
  const d2 = cardData(m2); assert.match(d2.priceTitle, /\(22\/10\)/); assert.equal(d2.priceNote, '(22 अक्टूबर के भाव)')
  const m3 = await modelFor(); m3.mandi = { ...m3.mandi, shown: [item(0), item(1), item(2)], extra: [] }
  const [flat, up, down] = cardData(m3).prices
  assert.equal(flat.change, '—'); assert.ok(up.change.startsWith('▲') && down.change.startsWith('▼') && down.dir === 'down')
  assert.ok(flat.price.startsWith('₹') && /^₹[\d,]+$/.test(flat.price))
})

test('card data: sections without data are left out (no weather, no mandi)', async () => {
  const none = await modelFor('no-weather'); assert.equal(cardData(none).weather, null)
  const nm = await modelFor('missing-mandi'); assert.deepEqual(cardData(nm).prices, [])
})

// WCAG AA (4.5:1) for the colour pairs of the new look
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
test('card colours: text/background pairs of the new look are at least 4.5:1', () => {
  const pairs = [['#ffffff', '#1f5e2e'], ['#1f2a1c', '#ffffff'], ['#1f5e2e', '#ffffff'], ['#6a6a58', '#ffffff'], ['#c2570c', '#ffffff'], ['#1a7f37', '#ffffff'], ['#c62828', '#ffffff'], ['#f2b705', '#1f2a1c'], ['#1f2a1c', '#f2b705'], ['#ffffff', '#1f2a1c'], ['#1f2a1c', '#eef5e8']]
  for (const [fg, bg] of pairs) assert.ok(ratio(fg, bg) >= 4.5, `${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`)
})
