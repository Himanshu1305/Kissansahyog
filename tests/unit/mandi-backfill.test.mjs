// Batch 10E (Phase 2B) — pure parts of scripts/backfill-mandi-history.mjs: row mapping, validation,
// duplicate pick, outliers, SQL escaping. Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CROPS } from '../../src/content/crops.js'
import {
  SOURCE_COMMODITY, cropsToBackfill, parseDivisionDistricts, parseArrivalDate, windowFor, mapSourceRow,
  pickOnePerKey, splitOutliers, sqlText, sqlNumber, sqlDate, valuesTuple, transactionSql, countingSql,
  sortForLoad, chunk, maskKey,
} from '../../scripts/lib/mandi-backfill.mjs'

const DISTRICTS = ['Sagar', 'Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari']
const GRAM = { commodity_en: 'Gram', commodity_hi: 'चना', source: 'Bengal Gram(Gram)(Whole)' }
const WHEAT = { commodity_en: 'Wheat', commodity_hi: 'गेहूं', source: 'Wheat' }
const ctx = { districts: DISTRICTS, from: '2026-06-20', until: '2026-10-17', today: '2026-10-18', fetchedAt: '2026-10-18T16:25:50Z' }
const src = (o = {}) => ({ Arrival_Date: '20/08/2026', State: 'Madhya Pradesh', District: 'Sagar', Market: 'Sagar APMC',
  Commodity: 'Wheat', Variety: 'Wheat', Grade: 'FAQ', Min_Price: 2405, Modal_Price: 2560, Max_Price: 4200, ...o })

test('every crop in crops.js has an exact source name; Arhar is not one of them', () => {
  const list = cropsToBackfill(CROPS)
  assert.equal(list.length, CROPS.length)
  assert.equal(SOURCE_COMMODITY.Gram, 'Bengal Gram(Gram)(Whole)')
  assert.ok(!Object.values(SOURCE_COMMODITY).some((n) => /arhar|tur|red gram/i.test(n)))
  assert.throws(() => cropsToBackfill([{ mandi_en: 'Arhar', hi: 'अरहर' }]))
})

test('division districts come from places.js', () => {
  assert.deepEqual(parseDivisionDistricts(readFileSync(new URL('../../src/lib/location/places.js', import.meta.url), 'utf8')), DISTRICTS)
})

test('dates: dd/MM/yyyy parsing, real calendar dates only, window', () => {
  assert.equal(parseArrivalDate('17/10/2026'), '2026-10-17')
  assert.equal(parseArrivalDate('17-10-2026'), '2026-10-17')
  assert.equal(parseArrivalDate('31/02/2026'), null)
  assert.equal(parseArrivalDate('2026-10-17'), null)
  assert.deepEqual(windowFor('2026-10-17', 120), { from: '2026-06-20', until: '2026-10-17' })
  assert.throws(() => windowFor('2026-10-17', 0))
})

test('row mapping: columns, flags, numbers from strings, arrivals NULL', () => {
  const m = mapSourceRow(src({ Min_Price: '2405', Modal_Price: '2560', Max_Price: '4200' }), WHEAT, ctx)
  assert.equal(m.ok, true)
  assert.deepEqual(m.row, { commodity_en: 'Wheat', commodity_hi: 'गेहूं', market: 'Sagar APMC', district: 'Sagar', state: 'Madhya Pradesh',
    min_price: 2405, max_price: 4200, modal_price: 2560, price_date: '2026-08-20', is_sagar_district: true, in_sagar_division: true,
    arrivals_tonnes: null, fetched_at: '2026-10-18T16:25:50Z' })
  assert.equal(mapSourceRow(src({ District: 'Damoh', Market: 'Damoh APMC' }), WHEAT, ctx).row.is_sagar_district, false)
})

test('validation rejects', () => {
  const r = (o, crop = WHEAT) => mapSourceRow(src(o), crop, ctx).reason
  assert.equal(r({ Commodity: 'Red gram/Arhar/Tur(whole)' }, GRAM), 'commodity_mismatch')
  assert.equal(r({ Commodity: 'Wheat Atta' }), 'commodity_mismatch')
  assert.equal(r({ State: 'Uttar Pradesh' }), 'state_mismatch')
  assert.equal(r({ District: 'Indore' }), 'district_not_in_division')
  assert.equal(r({ Market: '' }), 'bad_market')
  assert.equal(r({ Market: 'Sagar\nAPMC' }), 'bad_market')
  assert.equal(r({ Arrival_Date: '32/10/2026' }), 'bad_date')
  assert.equal(r({ Arrival_Date: '19/10/2026' }), 'future_date')
  assert.equal(r({ Arrival_Date: '18/10/2026' }), 'outside_window') // today, after --until
  assert.equal(r({ Arrival_Date: '19/06/2026' }), 'outside_window')
  assert.equal(r({ Modal_Price: 0 }), 'price_not_positive')
  assert.equal(r({ Min_Price: -1 }), 'price_not_positive')
  assert.equal(r({ Max_Price: 'NR' }), 'price_not_positive')
  assert.equal(r({ Min_Price: 2600 }), 'min_modal_max_order')
  assert.equal(r({ Max_Price: 2500 }), 'min_modal_max_order')
})

test('one real row per key: FAQ first, then smallest Variety, then lowest modal — never an average', () => {
  const c = (o) => mapSourceRow(src(o), WHEAT, ctx)
  const res = pickOnePerKey([
    c({ Grade: 'Non-FAQ', Variety: 'Lokwan', Modal_Price: 2501, Max_Price: 4200 }),
    c({ Grade: 'FAQ', Variety: 'Mill Quality', Modal_Price: 2780 }),
    c({ Grade: 'FAQ', Variety: 'Lokwan', Modal_Price: 2711 }),
    c({ Grade: 'FAQ', Variety: 'Lokwan', Modal_Price: 2700 }),
    c({ Market: 'Khurai APMC', Modal_Price: 2525 }),
  ])
  assert.equal(res.picked.length, 2)
  assert.equal(res.duplicateKeys, 1)
  assert.equal(res.droppedRows, 3)
  const sagar = res.picked.find((r) => r.market === 'Sagar APMC')
  assert.equal(sagar.modal_price, 2700) // a real source row, not a mean
  // order of input does not matter
  const again = pickOnePerKey([c({ Grade: 'FAQ', Variety: 'Lokwan', Modal_Price: 2700 }), c({ Grade: 'Non-FAQ', Variety: 'A', Modal_Price: 2600 })])
  assert.equal(again.picked[0].modal_price, 2700)
})

test('outliers: > 5x or < 1/5 of the crop median are split out, other crops unaffected', () => {
  const row = (crop, modal) => ({ commodity_en: crop, modal_price: modal })
  const { kept, outliers, medians } = splitOutliers([row('Wheat', 2500), row('Wheat', 2600), row('Wheat', 2550), row('Wheat', 25000), row('Wheat', 400), row('Garlic', 9000)])
  assert.equal(medians.Wheat, 2550)
  assert.deepEqual(outliers.map((o) => o.modal_price).sort((a, b) => a - b), [400, 25000])
  assert.equal(kept.length, 4)
})

test('SQL escaping: quotes doubled, control characters refused, numbers/dates strict', () => {
  assert.equal(sqlText("Lav'Kush Nagar"), "'Lav''Kush Nagar'")
  assert.equal(sqlText("x'); drop table mandi_prices; --"), "'x''); drop table mandi_prices; --'")
  assert.equal(sqlText('चना'), "'चना'")
  assert.throws(() => sqlText('a\u0000b'))
  assert.throws(() => sqlText('a\nb'))
  assert.equal(sqlNumber(2560.5), '2560.5')
  assert.equal(sqlNumber(null), 'null')
  assert.throws(() => sqlNumber(NaN))
  assert.throws(() => sqlNumber('1; drop'))
  assert.throws(() => sqlDate("2026-10-17'; --"))
  const row = mapSourceRow(src({ Market: "O'Brien APMC" }), WHEAT, ctx).row
  const t = valuesTuple(row)
  assert.match(t, /'O''Brien APMC'/)
  // the statement has exactly one unbalanced-quote-free shape: even number of quotes
  assert.equal((t.match(/'/g) || []).length % 2, 0)
})

test('production file shape and staging counting SQL share the same insert', () => {
  const rows = sortForLoad([
    mapSourceRow(src({ Arrival_Date: '21/08/2026' }), WHEAT, ctx).row,
    mapSourceRow(src(), WHEAT, ctx).row,
  ])
  assert.equal(rows[0].price_date, '2026-08-20')
  const tx = transactionSql(rows)
  assert.match(tx, /^begin;\ninsert into public\.mandi_prices \(/)
  assert.match(tx, /on conflict \(commodity_en, market, price_date\) do nothing;\ncommit;\n$/)
  assert.ok(!/update|delete/i.test(tx.replace(/'[^']*'/g, '')))
  const inner = tx.slice('begin;\n'.length, tx.indexOf(';\ncommit;'))
  assert.ok(countingSql(rows).includes(inner))
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
})

test('api key is masked in log text', () => {
  assert.equal(maskKey('https://api.data.gov.in/resource/x?api-key=abc123&format=json'), 'https://api.data.gov.in/resource/x?api-key=<masked>&format=json')
})
