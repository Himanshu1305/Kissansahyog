// Batch 16F — the homepage price tile shows the same price, mandi and date as the mandi strip.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { strings } from '../../src/lib/i18n/strings.js'
import { register } from 'node:module'
import { tickerRows } from '../../src/lib/mandi/tickerRows.js'
import { marketLabel } from '../../src/lib/mandi/marketNames.js'

register('./fixtures/loader-16f.mjs', import.meta.url)
const { getTodayForFarmer } = await import('../../src/lib/today/forFarmer.js')

const mk = (lang) => (k) => strings[k]?.[lang] ?? `?${k}`
const row = (commodity_en, market, modal_price, extra = {}) => ({ commodity_en, commodity_hi: commodity_en, market, district: 'Sagar', modal_price, is_local: true, ...extra })
const MSP = [{ crop_en: 'Wheat', msp_per_quintal: 2585 }, { crop_en: 'Soyabean', msp_per_quintal: 5328 }]
// Cheapest-first, as pricesFor() orders them: rows[0] is Khurai 2305, the strip picks Ajaigarh 2700.
const ROWS = [row('Wheat', 'Khurai APMC', 2305, { is_local: false }), row('Wheat', 'Ajaigarh APMC', 2700, { arrivals_tonnes: 50 }), row('Soyabean', 'Sagar APMC', 5000)]
const isoDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const run = (lang, mandi, msp = MSP) => getTodayForFarmer({ weather: null, mandi, msp, alert: null, t: mk(lang) })

test('the tile uses the strip row, not the cheapest first row', () => {
  const strip = tickerRows(ROWS).find((r) => r.commodity_en === 'Wheat')
  assert.equal(strip.modal_price, 2700)
  for (const lang of ['hi', 'en']) {
    const r = run(lang, { rows: ROWS, day: 'today', date: isoDaysAgo(0) })
    assert.match(r.priceValue, /₹2,700$/)
    assert.ok(!r.priceLine.includes('2,305'))
    assert.ok(r.priceNote.startsWith(marketLabel(strip.market, strip.district, mk(lang))), r.priceNote)
  }
})

test('MSP gap is computed on the shown price (above and below)', () => {
  const up = run('en', { rows: ROWS, date: isoDaysAgo(0) })
  assert.equal(up.priceTone, 'above'); assert.match(up.priceNote, /MSP ₹2,585 is ₹115 above/)
  const low = run('en', { rows: [row('Wheat', 'Sagar APMC', 2500)], date: isoDaysAgo(0) })
  assert.equal(low.priceTone, 'below'); assert.match(low.priceNote, /₹85 below/)
})

test('wheat missing -> soybean; both missing -> no tile; no MSP -> no tile', () => {
  const soy = run('en', { rows: [ROWS[2]], date: isoDaysAgo(0) })
  assert.match(soy.priceValue, /₹5,000$/); assert.ok(soy.priceValue.length > 7)
  assert.equal(run('en', { rows: [row('Gram', 'Sagar APMC', 5000)], date: isoDaysAgo(0) }).priceLine, null)
  assert.equal(run('en', { rows: [], day: 'none', date: null }).priceLine, null)
  assert.equal(run('en', { rows: ROWS, date: isoDaysAgo(0) }, []).priceLine, null)
})

test('caption: today / yesterday / older, with dd/mm', () => {
  const dm = (n) => { const [, m, d] = isoDaysAgo(n).split('-'); return `${d}/${m}` }
  assert.equal(run('en', { rows: ROWS, date: isoDaysAgo(0) }).priceCaption, "Today's price")
  assert.equal(run('hi', { rows: ROWS, date: isoDaysAgo(0) }).priceCaption, 'आज का भाव')
  assert.equal(run('en', { rows: ROWS, date: isoDaysAgo(1) }).priceCaption, `Yesterday's price (${dm(1)})`)
  assert.equal(run('hi', { rows: ROWS, date: isoDaysAgo(1) }).priceCaption, `कल का भाव (${dm(1)})`)
  assert.equal(run('en', { rows: ROWS, date: isoDaysAgo(4) }).priceCaption, `Previous price (${dm(4)})`)
  assert.equal(run('hi', { rows: ROWS, date: isoDaysAgo(4) }).priceCaption, `पिछला भाव (${dm(4)})`)
})

test('every string the tile uses has hi and en', () => {
  for (const k of ['tf_price_cap', 'tf_from', 'tf_above_word', 'tf_below_word', 'hl_crop_wheat', 'hl_crop_soybean', 'mandi_price_yesterday', 'mandi_price_older', 'home_msp_link']) {
    assert.ok(strings[k]?.hi && strings[k]?.en, k)
  }
})

test('the strip output is unchanged for a fixed fixture', () => {
  const out = tickerRows(ROWS).map((r) => `${r.commodity_en}:${r.market}:${r.modal_price}`)
  assert.deepEqual(out, ['Wheat:Ajaigarh APMC:2700', 'Soyabean:Sagar APMC:5000'])
})
