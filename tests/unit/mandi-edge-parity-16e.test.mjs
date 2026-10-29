// Batch 16E: the Edge Function's shared copy (supabase/functions/_shared/mandi-core.js) must behave exactly like the Node originals.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as edge from '../../supabase/functions/_shared/mandi-core.js'
import * as bf from '../../scripts/lib/mandi-backfill.mjs'
import * as daily from '../../scripts/lib/mandi-daily.mjs'
import { CROPS } from '../../src/content/crops.js'

const districts = bf.parseDivisionDistricts(readFileSync('src/lib/location/places.js', 'utf8'))
const row = (c, d, m, date, min, mod, max, extra = {}) => ({ Commodity: c, State: 'Madhya Pradesh', District: d, Market: m, Arrival_Date: date, Min_Price: min, Modal_Price: mod, Max_Price: max, Variety: 'Other', Grade: 'FAQ', ...extra })
const FIXTURE = [
  row('Wheat', 'Sagar', 'Sagar', '27/10/2026', '2400', '2500', '2600'),
  row('Wheat', 'Sagar', 'Sagar', '27/10/2026', '2300', '2450', '2550', { Grade: 'Non-FAQ', Variety: 'Lokwan' }),   // duplicate key
  row('Wheat', 'Damoh', 'Damoh', '26-10-2026', '2400', '2520', '2600'),
  row('Wheat', 'Damoh', 'Hata', '28/10/2026', '2400', '25000', '26000'),                                          // outlier
  row('Wheat', 'Indore', 'Indore', '27/10/2026', '2400', '2500', '2600'),                                         // not division
  row('Wheat', 'Sagar', 'Rehli', '30/02/2026', '2400', '2500', '2600'),                                           // bad date
  row('Wheat', 'Sagar', 'Rehli', '29/10/2026', '2400', '2500', '2600'),                                           // future
  row('Wheat', 'Sagar', 'Bina', '27/10/2026', '2700', '2500', '2600'),                                            // order
  row('Soyabean', 'Panna', 'Panna', '25/10/2026', '4000', '4300', '4500'),
  row('Gold', 'Sagar', 'Sagar', '27/10/2026', '1', '1', '1'),
  null,
]
const TODAY = '2026-10-29'
const FETCHED = '2026-10-29T10:00:00.000Z'

test('constants and the exact commodity map match', () => {
  assert.deepEqual(edge.SOURCE_COMMODITY, bf.SOURCE_COMMODITY)
  assert.equal(edge.STATE, bf.STATE)
  assert.equal(edge.API_BASE, bf.API_BASE)
  assert.deepEqual(edge.DIVISION_DISTRICTS, districts)
  assert.equal(edge.PAGE, daily.PAGE)
  assert.equal(edge.RECENT_DAYS, daily.RECENT_DAYS)
  assert.equal(edge.MAX_DAYS, daily.MAX_DAYS)
})

test('crop list matches src/content/crops.js (names, Hindi names, order)', () => {
  assert.deepEqual(edge.CROP_LIST, CROPS.map((c) => ({ commodity_en: c.mandi_en, commodity_hi: c.hi })))
})

test('date helpers agree', () => {
  for (const s of ['27/10/2026', '27-10-2026', '30/02/2026', '', null, 'x', '1/1/2026']) assert.equal(edge.parseArrivalDate(s), bf.parseArrivalDate(s))
  assert.equal(edge.addDays('2026-10-29', -6), bf.addDays('2026-10-29', -6))
  assert.deepEqual(edge.windowForDays(TODAY, 7), daily.windowForDays(TODAY, 7))
})

test('request plan and paging rule agree', () => {
  const crops = daily.cropsWithSource(CROPS.map((c) => ({ commodity_en: c.mandi_en, commodity_hi: c.hi })))
  assert.deepEqual(edge.buildRequestPlan(crops, districts), daily.buildRequestPlan(crops, districts))
  const full = Array.from({ length: 1000 }, () => ({ Arrival_Date: '27/10/2026' }))
  assert.equal(edge.needsNextPage(full, '2026-10-23'), daily.needsNextPage(full, '2026-10-23'))
  assert.equal(edge.needsNextPage(full, '2026-10-28'), daily.needsNextPage(full, '2026-10-28'))
})

test('mapping, one-per-key, outlier split and write policy give identical output on the fixture', () => {
  const crops = daily.cropsWithSource([{ commodity_en: 'Wheat', commodity_hi: 'गेहूं' }, { commodity_en: 'Soyabean', commodity_hi: 'सोयाबीन' }])
  const records = FIXTURE.filter(Boolean).map((r) => ({ _crop: r.Commodity === 'Soyabean' ? 'Soyabean' : 'Wheat', ...r }))
  const ctx = { districts, today: TODAY, days: 7, fetchedAt: FETCHED }
  const a = edge.mapPrimaryRecords(records, crops, ctx)
  const b = daily.mapPrimaryRecords(records, crops, ctx)
  assert.deepEqual(a, b)
  assert.ok(a.rows.length > 0 && a.outliers.length === 1 && a.duplicateKeys === 1)   // the fixture really exercises the rules
  assert.deepEqual(edge.splitWritePolicy(a.rows, TODAY), daily.splitWritePolicy(b.rows, TODAY))
  // every individual helper too
  const c0 = crops[0]
  for (const r of FIXTURE) assert.deepEqual(edge.mapSourceRow(r, c0, { districts, from: '2026-10-23', until: TODAY, today: TODAY, fetchedAt: FETCHED }), bf.mapSourceRow(r, c0, { districts, from: '2026-10-23', until: TODAY, today: TODAY, fetchedAt: FETCHED }))
})

test('parseRequest: defaults, limits, and unknown crops refused', () => {
  const d = edge.parseRequest({})
  assert.equal(d.days, 7); assert.equal(d.crops.length, 10)
  assert.ok(d.crops.every((c) => c.source === bf.SOURCE_COMMODITY[c.commodity_en]))
  assert.equal(edge.parseRequest({ days: 14, crops: ['Wheat', 'Wheat', 'Garlic'] }).crops.length, 2)
  for (const bad of [{ days: 0 }, { days: 31 }, { days: 1.5 }, { days: 'x' }, { crops: [] }, { crops: ['Rice'] }, { crops: 'Wheat' }]) assert.ok(edge.parseRequest(bad).error, JSON.stringify(bad))
  assert.equal(edge.parseRequest(null).days, 7)
})

test('the function file wires in the security rules', () => {
  const src = readFileSync('supabase/functions/mandi-refresh/index.ts', 'utf8')
  assert.match(src, /x-cron-secret/); assert.match(src, /EXPECT_PROJECT_REF/); assert.match(src, /sameSecret/)
  assert.doesNotMatch(src, /console\.(log|error)\([^)]*\b(key|serviceKey)\b/)
})
