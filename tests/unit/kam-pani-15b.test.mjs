// Batch 15B - /fasal-salah/kam-pani: pure logic (src/lib/kamPani/logic.js) and the integrity of the content file.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as C from '../../src/content/kamPani.js'
import { recommendForWater, incomeEstimate, incomeLines, gapPercent, sowingBanner, rainBanner, sagarToday, topMandis } from '../../src/lib/kamPani/logic.js'

// ---- water levels
test('recommendForWater: each level gives the mockup list in order (keep first, avoid last)', () => {
  const names = (l) => recommendForWater(l).map((r) => r.crop.en)
  assert.deepEqual(names(0), ['Gram', 'Lentil', 'Linseed', 'Wheat and mustard'])
  assert.deepEqual(names(1), ['Gram', 'Lentil', 'Barley', 'Wheat'])
  assert.deepEqual(names(2), ['Gram', 'Barley', 'Mustard', 'Wheat'])
  assert.deepEqual(names(3), ['Mustard', 'Gram', 'Wheat', 'Lentil'])
  assert.deepEqual(recommendForWater(0).map((r) => r.keep), [1, 1, 1, 0])
  assert.deepEqual(recommendForWater(3).map((r) => r.keep), [1, 1, 1, 0])
  assert.equal(recommendForWater(7), recommendForWater(3)) // 3 means "3 or more"
  assert.equal(recommendForWater(-1), recommendForWater(0))
})

// ---- income
test('incomeEstimate: yield x price, rounded; null when either is missing', () => {
  assert.equal(incomeEstimate({ yieldQ: 7.65, price: 5000 }), 38250)
  assert.equal(incomeEstimate({ yieldQ: 7.65, price: null }), null)
  assert.equal(incomeEstimate({ yieldQ: 0, price: 5000 }), null)
})
test('incomeLines: gram has avg, today and the 13 to 20 upside; wheat/lentil have no upside; mustard/barley have none', () => {
  const g = incomeLines({ cropId: 'gram', avg5: 5000, today: 6000 })
  assert.equal(g.yieldQ, 7.65); assert.equal(g.atAvg, 38250); assert.equal(g.atToday, 45900)
  assert.deepEqual(g.upside, { lo: 65000, hi: 100000 })
  const w = incomeLines({ cropId: 'wheat', avg5: 2000, today: null })
  assert.equal(w.atAvg, 22460); assert.equal(w.atToday, null); assert.equal(w.upside, null)
  assert.equal(incomeLines({ cropId: 'lentil', avg5: 5000, today: 5000 }).upside, null)
  for (const id of ['mustard', 'barley']) assert.deepEqual(incomeLines({ cropId: id, avg5: 5000, today: 5000 }), { yieldQ: null, atAvg: null, atToday: null, upside: null })
  assert.equal(incomeLines({ cropId: 'gram', avg5: null, today: 6000 }).upside, null)
})

// ---- gap
test('gapPercent: whole percent, sign kept, null when missing', () => {
  assert.equal(gapPercent(6905, 5091), 36)
  assert.equal(gapPercent(2000, 2113), -5)
  assert.equal(gapPercent(100, 100), 0)
  assert.equal(gapPercent(null, 100), null)
  assert.equal(gapPercent(100, 0), null)
})

// ---- banners expire by date
test('sowingBanner: shown before 2026-11-15 and gone from that day on; rainBanner until 2026-12-31', () => {
  assert.equal(sowingBanner(new Date('2026-10-23T09:00:00Z')).id, 'banner_sowing')
  assert.equal(sowingBanner('2026-11-14T23:59:00Z').id, 'banner_sowing')
  assert.equal(sowingBanner('2026-11-15T00:00:00Z'), null)
  assert.equal(sowingBanner('2027-03-01'), null)
  assert.equal(rainBanner('2026-12-30T10:00:00Z').id, 'banner_rain')
  assert.equal(rainBanner('2026-12-31T00:00:00Z'), null)
  assert.equal(C.BANNERS.sowing.validUntil, '2026-11-15'); assert.equal(C.BANNERS.rain.validUntil, '2026-12-31')
})

// ---- today's price rules
test('sagarToday: median of the Sagar mandi only; fewer than 3 reports -> null', () => {
  const r = (market, p) => ({ market, modal_price: p, price_date: '2026-10-20' })
  assert.deepEqual(sagarToday([r('Sagar APMC', 6000), r('Sagar APMC', 6200), r('Sagar APMC', 6100), r('Damoh APMC', 9000)]), { price: 6100, reports: 3 })
  assert.equal(sagarToday([r('Sagar APMC', 6000), r('Sagar APMC', 6200), r('Damoh APMC', 9000), r('Sagar(F&V) APMC', 1)]), null)
  assert.equal(sagarToday([]), null)
  assert.equal(sagarToday(null), null)
})
test('topMandis: top three by 14-day median, a mandi needs 2 reports', () => {
  const rows = [['A', 100], ['A', 120], ['B', 300], ['B', 310], ['C', 200], ['C', 220], ['D', 999], ['E', 150], ['E', 150]].map(([market, modal_price]) => ({ market, modal_price }))
  assert.deepEqual(topMandis(rows).map((m) => m.market), ['B', 'C', 'E'])
})

// ---- constants carried exactly
test('constants: MSP 2027-28, Sagar yields, gram upside', () => {
  assert.deepEqual(C.MSP_2027_28, { wheat: 2610, barley: 2286, gram: 5958, lentil: 7390, mustard: 6613 })
  assert.deepEqual(C.SAGAR_YIELD_Q, { gram: 7.65, wheat: 11.23, lentil: 4.32 })
  assert.deepEqual(C.GRAM_UPSIDE_Q, { min: 13, max: 20 })
  assert.equal(C.LAST_CHECKED, '2026-10-23')
})

// ---- content integrity
const blocks = [
  ...C.KP_CROPS, ...C.GOV_CARDS, ...C.LATE_CARDS, ...C.WET_CARDS, ...C.SAVE_CARDS,
  C.BANNERS.sowing, C.BANNERS.rain, C.IRRIGATION,
]
test('every block has an id, a boolean reviewed flag and at least one existing source', () => {
  const ids = new Set()
  for (const b of blocks) {
    assert.ok(b.id, 'id')
    assert.ok(!ids.has(b.id), `duplicate id ${b.id}`); ids.add(b.id)
    assert.equal(typeof b.reviewed, 'boolean', `${b.id} reviewed`)
    assert.ok(Array.isArray(b.sources) && b.sources.length >= 1, `${b.id} sources`)
    for (const s of b.sources) assert.ok(C.SOURCES[s], `${b.id}: unknown source ${s}`)
  }
  for (const [k, w] of Object.entries(C.WATER)) for (const r of w.recs) assert.equal(typeof r.reviewed, 'boolean', `water ${k} ${r.crop.en}`)
})
test('items inside crop cards carry their own reviewed flag and sources', () => {
  for (const c of C.KP_CROPS) {
    assert.equal(typeof c.days.reviewed, 'boolean'); assert.ok(c.days.sources.every((s) => C.SOURCES[s]))
    if (c.vars) { assert.equal(typeof c.vars.reviewed, 'boolean'); assert.ok(c.vars.sources.every((s) => C.SOURCES[s])) }
  }
})
test('the items the prompt says start unreviewed really are, and the CRIDA/own-data ones are not', () => {
  for (const c of [...C.GOV_CARDS, ...C.LATE_CARDS, ...C.WET_CARDS, ...C.SAVE_CARDS]) assert.equal(c.reviewed, false, c.id)
  const by = Object.fromEntries(C.KP_CROPS.map((c) => [c.id, c]))
  assert.equal(by.barley.reviewed, false)
  assert.equal(by.mustard.water.reviewed, false)
  for (const c of C.KP_CROPS) if (c.days.star) assert.equal(c.days.reviewed, false, `${c.id} days`)
  for (const c of C.KP_CROPS) if (c.vars) assert.equal(c.vars.reviewed, false, `${c.id} vars`)
  assert.equal(by.gram.reviewed, true)
  assert.equal(C.IRRIGATION.reviewed, true)
})

// every string of the content file, walked
function* strings(o, path = '') {
  if (typeof o === 'string') yield [path, o]
  else if (Array.isArray(o)) for (let i = 0; i < o.length; i++) yield* strings(o[i], `${path}[${i}]`)
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) yield* strings(v, `${path}.${k}`)
}
const all = [...strings(C)]
test('no "बीच का भाव" anywhere (the term is Modal भाव)', () => {
  for (const [p, s] of all) assert.ok(!s.includes('बीच का भाव'), p)
})
test('every {hi,en} text has both languages', () => {
  const miss = []
  const walk = (o, path) => {
    if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${path}[${i}]`))
    else if (o && typeof o === 'object') {
      if ('hi' in o || 'en' in o) { if (!(typeof o.hi === 'string' && o.hi && typeof o.en === 'string' && o.en)) miss.push(path) }
      for (const [k, v] of Object.entries(o)) if (k !== 'hi' && k !== 'en') walk(v, `${path}.${k}`)
    }
  }
  walk(C, 'C'); assert.deepEqual(miss, [])
})
test('no dose-like text (digits followed by kilo / ml / litre) and no price-prediction or guarantee words', () => {
  const dose = /\d\s*(किलो|ml|मिली|लीटर|kg|litre|liter|ग्राम)/i
  const predict = /(बढ़ेगा|गिरेगा|बढ़ेंगे|गिरेंगे|अभी बेचें|अभी खरीदें|buy now|sell now|will rise|will fall|guaranteed)/i
  for (const [p, s] of all) {
    if (p.startsWith('.SOURCES')) continue
    assert.ok(!dose.test(s), `dose-like text at ${p}: ${s}`)
    assert.ok(!predict.test(s), `prediction word at ${p}: ${s}`)
  }
})
test('every earning figure is labelled an estimate before costs', () => {
  assert.match(C.PAGE.estimate.hi, /लागत से पहले/); assert.match(C.PAGE.estimate.hi, /भाव अलग हो सकते हैं/)
  assert.match(C.PAGE.estimate.en, /before costs/); assert.match(C.PAGE.estimate.en, /may differ/)
})
test('the cost table is gone and no placeholder is left', () => {
  for (const [p, s] of all) { assert.ok(!s.includes('लागत का अंदाज़ा'), p); assert.ok(!s.includes('जोड़ना बाकी'), p) }
})
test('no emoji in the page text', () => {
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u
  for (const [p, s] of all) assert.ok(!emoji.test(s), p)
})
test('the farm-pond card has its anchor and the water-saving card links to it', () => {
  const pond = C.GOV_CARDS.find((c) => c.id === 'gov_khet_talab')
  assert.equal(pond.anchor, 'sarkari-sahara-khet-talab')
  assert.equal(C.SAVE_CARDS[0].link.to, '/fasal-salah/kam-pani#sarkari-sahara-khet-talab')
})
