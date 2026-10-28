import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { parseDivisionDistricts, SOURCE_COMMODITY, maskKey } from '../../scripts/lib/mandi-backfill.mjs'
import { decideExit, daysBetween, redact } from '../../scripts/lib/mandi-feed.mjs'
import {
  PAGE, parseDays, windowForDays, cropsWithSource, buildRequestPlan, requestUrl, needsNextPage, mapPrimaryRecords,
  firstWithRows, splitWritePolicy, describeError, lagNote,
} from '../../scripts/lib/mandi-daily.mjs'

const districts = parseDivisionDistricts(readFileSync('src/lib/location/places.js', 'utf8'))
const crops = cropsWithSource([{ commodity_en: 'Wheat', commodity_hi: 'गेहूं' }, { commodity_en: 'Gram', commodity_hi: 'चना' }])
const today = '2026-10-25'
const ctx = { districts, today, days: 14, fetchedAt: '2026-10-25T04:00:00Z' }
const src = (o = {}) => ({ _crop: 'Wheat', State: 'Madhya Pradesh', District: 'Sagar', Market: 'Sagar', Commodity: 'Wheat', Variety: 'Other', Grade: 'FAQ', Arrival_Date: '24/10/2026', Min_Price: '2500', Max_Price: '2700', Modal_Price: '2600', ...o })

test('division districts are the six the source spells', () => {
  assert.deepEqual([...districts].sort(), ['Chhatarpur', 'Damoh', 'Niwari', 'Panna', 'Sagar', 'Tikamgarh'])
})

test('request plan: one request per crop x district, exact filters, newest first', () => {
  const plan = buildRequestPlan(crops, districts)
  assert.equal(plan.length, 2 * 6)
  const p = plan.find((x) => x.crop === 'Gram' && x.district === 'Damoh').params
  assert.equal(p['filters[State]'], 'Madhya Pradesh')
  assert.equal(p['filters[District]'], 'Damoh')
  assert.equal(p['filters[Commodity]'], 'Bengal Gram(Gram)(Whole)')
  assert.equal(p['sort[Arrival_Date]'], 'desc')
  assert.equal(p.limit, PAGE)
})
test('request plan: every app crop has an exact source name', () => {
  assert.equal(buildRequestPlan(cropsWithSource(Object.keys(SOURCE_COMMODITY).map((k) => ({ commodity_en: k, commodity_hi: k }))), districts).length, 60)
  assert.throws(() => cropsWithSource([{ commodity_en: 'Arhar', commodity_hi: 'x' }]), /no exact source/)
})
test('request url: key and offset', () => {
  const u = requestUrl({ limit: 1000 }, 'K123456', 2000)
  assert.equal(u.host, 'api.data.gov.in'); assert.equal(u.searchParams.get('offset'), '2000'); assert.equal(u.searchParams.get('api-key'), 'K123456')
  assert.equal(requestUrl({}, 'K', 0).searchParams.has('offset'), false)
})
test('paging: stop on short page or when the oldest row is before the window', () => {
  const full = (d) => Array.from({ length: PAGE }, () => ({ Arrival_Date: d }))
  assert.equal(needsNextPage([{ Arrival_Date: '24/10/2026' }], '2026-10-12'), false)
  assert.equal(needsNextPage(full('20/10/2026'), '2026-10-12'), true)
  assert.equal(needsNextPage(full('01/10/2026'), '2026-10-12'), false)
})

test('mapping: a good row is mapped with the record own arrival date', () => {
  const { rows } = mapPrimaryRecords([src()], crops, ctx)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].price_date, '2026-10-24')
  assert.equal(rows[0].in_sagar_division, true); assert.equal(rows[0].is_sagar_district, true)
  assert.equal(rows[0].commodity_en, 'Wheat'); assert.equal(rows[0].modal_price, 2600)
})
test('mapping: rejects district outside the division, future, bad date, non-positive price', () => {
  const m = mapPrimaryRecords([
    src({ District: 'Bhopal' }), src({ Arrival_Date: '26/10/2026' }), src({ Arrival_Date: '31/02/2026' }),
    src({ Modal_Price: '0' }), src({ Min_Price: '-5' }), src({ State: 'Uttar Pradesh' }), src({ Commodity: 'Rice' }),
  ], crops, ctx)
  assert.equal(m.rows.length, 0)
  assert.equal(m.rejects.district_not_in_division, 1); assert.equal(m.rejects.future_date, 1); assert.equal(m.rejects.bad_date, 1)
  assert.equal(m.rejects.price_not_positive, 2); assert.equal(m.rejects.state_mismatch, 1); assert.equal(m.rejects.commodity_mismatch, 1)
})
test('mapping: a row older than the window is not taken', () => {
  assert.equal(mapPrimaryRecords([src({ Arrival_Date: '01/10/2026' })], crops, ctx).rows.length, 0)
  assert.equal(mapPrimaryRecords([src({ Arrival_Date: '01/10/2026' })], crops, { ...ctx, days: 30 }).rows.length, 1)
})
test('one row per key: FAQ preferred, never averaged', () => {
  const m = mapPrimaryRecords([src({ Grade: 'Non-FAQ', Modal_Price: '2000', Min_Price: '1900', Max_Price: '2100' }), src({ Grade: 'FAQ', Modal_Price: '2600' })], crops, ctx)
  assert.equal(m.rows.length, 1); assert.equal(m.rows[0].modal_price, 2600); assert.equal(m.droppedRows, 1)
})
test('outlier split: a price 5x off the crop median is held back, not written', () => {
  const recs = ['A', 'B', 'C', 'D'].map((mk) => src({ Market: mk }))
  recs.push(src({ Market: 'E', Min_Price: '26000', Max_Price: '27000', Modal_Price: '26000' }))
  const m = mapPrimaryRecords(recs, crops, ctx)
  assert.equal(m.rows.length, 4); assert.equal(m.outliers.length, 1); assert.equal(m.outliers[0].market, 'E')
})

test('days: default 7, --days wins over env, max 30, junk falls back', () => {
  assert.equal(parseDays([], {}), 7)
  assert.equal(parseDays(['--days', '14'], { MANDI_DAYS: '3' }), 14)
  assert.equal(parseDays([], { MANDI_DAYS: '14' }), 14)
  assert.equal(parseDays(['--days', '99'], {}), 30)
  for (const bad of ['0', '-3', 'abc', '2.5', '']) assert.equal(parseDays(['--days', bad], {}), 7, bad)
  assert.equal(parseDays([], { MANDI_DAYS: '' }), 7)
  assert.deepEqual(windowForDays('2026-10-25', 14), { from: '2026-10-12', until: '2026-10-25' })
})

test('fallback order: primary empty -> secondary -> wrapper; first with rows wins', async () => {
  const calls = []
  const mk = (name, rows, fail) => ({ name, get: async () => { calls.push(name); if (fail) throw new Error('boom'); return rows } })
  let r = await firstWithRows([mk('primary', []), mk('secondary', [1]), mk('wrapper', [2])])
  assert.equal(r.source, 'secondary'); assert.deepEqual(calls, ['primary', 'secondary'])
  calls.length = 0
  r = await firstWithRows([mk('primary', [], true), mk('secondary', []), mk('wrapper', [2])])
  assert.equal(r.source, 'wrapper'); assert.deepEqual(calls, ['primary', 'secondary', 'wrapper'])
  assert.equal(r.errors[0].source, 'primary')
  r = await firstWithRows([mk('primary', [1]), mk('secondary', [2])])
  assert.equal(r.source, 'primary'); assert.equal(calls.length, 4)
  r = await firstWithRows([mk('primary', []), mk('wrapper', [])])
  assert.equal(r.source, null); assert.deepEqual(r.rows, [])
})

test('write policy: last 2 days upsert, older insert-if-absent', () => {
  const rows = ['2026-10-25', '2026-10-24', '2026-10-23', '2026-10-22', '2026-10-18'].map((d) => ({ price_date: d }))
  const w = splitWritePolicy(rows, today)
  assert.deepEqual(w.upsert.map((r) => r.price_date), ['2026-10-25', '2026-10-24', '2026-10-23'])
  assert.deepEqual(w.insertIfAbsent.map((r) => r.price_date), ['2026-10-22', '2026-10-18'])
})

test('stale newest -> exit code 1; fresh -> 0; zero rows -> 1', () => {
  assert.equal(decideExit({ totalRows: 10, newestDate: '2026-10-17', today }).code, 1)
  assert.equal(decideExit({ totalRows: 10, newestDate: '2026-10-23', today }).code, 0)
  assert.equal(decideExit({ totalRows: 0, newestDate: null, today }).code, 1)
  assert.match(lagNote('2026-10-17', today, daysBetween), /^RED/)
  assert.match(lagNote('2026-10-23', today, daysBetween), /^Normal/)
  assert.match(lagNote(null, today, daysBetween), /^RED/)
})

test('errors: the cause code is shown, the key never is', () => {
  const key = 'SECRETKEY1234567890'
  const e = new TypeError('fetch failed', { cause: Object.assign(new Error(`getaddrinfo ENOTFOUND api.data.gov.in?api-key=${key}`), { code: 'ENOTFOUND' }) })
  const line = describeError(e, [key])
  assert.match(line, /ENOTFOUND/); assert.ok(!line.includes(key))
  assert.ok(!describeError(new Error(`GET https://api.data.gov.in/x?api-key=${key}&format=json`), [key]).includes(key))
  assert.ok(!maskKey(requestUrl({}, key).toString()).includes(key))
  assert.ok(!redact(`x ${key} y`, [key]).includes(key))
})

test('script: no shared demo key remains; dry run needs no database and prints no key', () => {
  const code = readFileSync('scripts/refresh-data.mjs', 'utf8')
  assert.ok(!code.includes('579b464db66ec23bdd000001'))
  const fake = 'FAKE-DATAGOV-KEY-abcdef123456'
  const r = spawnSync(process.execPath, ['scripts/refresh-data.mjs', '--expect-project-ref', 'eltmcznjcqiahqhjvpjg'], {
    encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: 'https://wzxtqbqlahyahsnoqqva.supabase.co', SUPABASE_SERVICE_ROLE_KEY: fake, DATA_GOV_IN_API_KEY: fake },
  })
  assert.equal(r.status, 1)
  assert.ok(!(r.stdout + r.stderr).includes(fake))
})
