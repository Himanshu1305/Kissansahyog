// Batch 12C — home-page mandi ticker: one row per crop, Hindi names for every mandi, steady speed.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { strings } from '../../src/lib/i18n/strings.js'
import { marketLabel, normMarket, MARKET_SUFFIX, DISTRICT_SUFFIX } from '../../src/lib/mandi/marketNames.js'
import { tickerRows, tickerDuration, TICKER_MAX } from '../../src/lib/mandi/tickerRows.js'

const hi = (k) => strings[k]?.hi
const MARKETS = JSON.parse(readFileSync(new URL('./fixtures/staging-markets-12c.json', import.meta.url), 'utf8'))
const row = (commodity_en, market, extra = {}) => ({ commodity_en, commodity_hi: commodity_en, market, district: 'Sagar', modal_price: 2000, is_local: false, ...extra })

test('every staging market has a Hindi label (Devanagari, no Latin letters)', () => {
  assert.ok(MARKETS.length >= 57)
  for (const m of MARKETS) {
    assert.ok(MARKET_SUFFIX[normMarket(m.market)], `no mapping for market "${m.market}"`)
    const label = marketLabel(m.market, m.district, hi)
    assert.ok(/[\u0900-\u097F]/.test(label) && !/[A-Za-z]/.test(label), `label for "${m.market}" is "${label}"`)
  }
})

test('names with and without the APMC suffix give the same label', () => {
  assert.equal(marketLabel('Khurai', 'Sagar', hi), marketLabel('Khurai APMC', 'Sagar', hi))
  assert.equal(marketLabel('Sagar|x'.slice(0, 5), 'Sagar', hi), 'सागर मंडी')
  assert.notEqual(marketLabel('Sagar(F&V) APMC', 'Sagar', hi), marketLabel('Sagar APMC', 'Sagar', hi))
})

test('an unknown market falls back to the district Hindi name, then the raw name', () => {
  assert.equal(marketLabel('Newtown APMC', 'Damoh', hi), 'दमोह')
  assert.equal(marketLabel('Newtown APMC', 'Nowhere', hi), 'Newtown APMC')
  assert.equal(marketLabel('Newtown APMC', null, hi), 'Newtown APMC')
})

test('every staging district has a Hindi name', () => {
  for (const d of new Set(MARKETS.map((m) => m.district))) assert.ok(DISTRICT_SUFFIX[d.toLowerCase().replace(/\s+/g, '')], `no district name for ${d}`)
})

test('every new string has hi and en (parity)', () => {
  const keys = Object.keys(strings).filter((k) => /^mandi_(mkt|dist)_/.test(k))
  assert.ok(keys.length >= 70)
  for (const k of keys) { assert.ok(strings[k].hi?.length > 0, `${k} hi`); assert.ok(strings[k].en?.length > 0, `${k} en`) }
  for (const s of [...Object.values(MARKET_SUFFIX).map((x) => `mandi_mkt_${x}`), ...Object.values(DISTRICT_SUFFIX).map((x) => `mandi_dist_${x}`)]) assert.ok(strings[s], `missing string ${s}`)
})

test('ticker: one row per crop, fixed crop order, capped at 12', () => {
  const crops = ['Garlic', 'Zeera', 'Wheat', 'Paddy(Dhan)(Common)', 'Soyabean', 'Gram', 'Mustard', 'Lentil', 'Moong', 'Urad', 'Maize', 'Apple', 'Banana', 'Cumin']
  const rows = crops.flatMap((c) => ['Sagar APMC', 'Damoh APMC', 'Khurai APMC'].map((m) => row(c, m)))
  const out = tickerRows(rows)
  assert.equal(out.length, TICKER_MAX)
  assert.deepEqual(out.map((r) => r.commodity_en), ['Wheat', 'Soyabean', 'Gram', 'Mustard', 'Lentil', 'Moong', 'Urad', 'Maize', 'Paddy(Dhan)(Common)', 'Garlic', 'Apple', 'Banana'])
  assert.equal(new Set(out.map((r) => r.commodity_en)).size, out.length)
})

test('ticker: prefers a local mandi, then Sagar; deterministic', () => {
  const rows = [row('Wheat', 'Damoh APMC'), row('Wheat', 'Khurai APMC', { is_local: true }), row('Wheat', 'Sagar APMC', { is_local: true }),
    row('Gram', 'Damoh APMC'), row('Gram', 'Sagar APMC'), row('Gram', 'Panna APMC'),
    row('Urad', 'Panna APMC'), row('Urad', 'Damoh APMC', { arrivals_tonnes: 9 }), row('Moong', 'Panna APMC'), row('Moong', 'Damoh APMC')]
  const pick = (c, out) => out.find((r) => r.commodity_en === c).market
  const a = tickerRows(rows)
  assert.equal(pick('Wheat', a), 'Sagar APMC')
  assert.equal(pick('Gram', a), 'Sagar APMC')
  assert.equal(pick('Urad', a), 'Damoh APMC') // bigger arrivals
  assert.equal(pick('Moong', a), 'Damoh APMC') // name order
  assert.deepEqual(tickerRows([...rows].reverse()), a)
  assert.deepEqual(tickerRows(rows), a)
})

test('ticker: rows without a price are skipped; empty input is fine', () => {
  assert.deepEqual(tickerRows(null), [])
  assert.deepEqual(tickerRows([row('Wheat', 'Sagar APMC', { modal_price: null })]), [])
})

test('ticker speed: ~35 px/s on the first half, never under 40 s', () => {
  assert.equal(tickerDuration(0), 40)
  assert.equal(tickerDuration(2000), 40)       // 1000 px / 35 = 28.6 s → floor 40
  assert.equal(tickerDuration(2800), 40)       // 1400 / 35 = 40
  assert.equal(tickerDuration(7000), 100)      // 3500 / 35
  assert.equal(tickerDuration(4200), 60)
})
