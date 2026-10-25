import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { parseFeedDate, todayIST, filterFresh, pickRecords, buildRows, checkProjectRef, decideExit, redact, daysBetween, summarize, PROD_REF, STAGING_REF } from '../../scripts/lib/mandi-feed.mjs'
import { matchCommodity } from '../../scripts/lib/mandi-commodity.mjs'

test('parseFeedDate: several formats', () => {
  assert.equal(parseFeedDate('17/10/2026'), '2026-10-17')
  assert.equal(parseFeedDate('17-10-2026'), '2026-10-17')
  assert.equal(parseFeedDate('7/1/2026'), '2026-01-07')
  assert.equal(parseFeedDate('2026-10-17'), '2026-10-17')
  assert.equal(parseFeedDate('2026-10-17T05:30:00Z'), '2026-10-17')
})
test('parseFeedDate: invalid', () => {
  for (const v of ['', null, undefined, 'abc', '31/02/2026', '2026-13-01', '00/10/2026']) assert.equal(parseFeedDate(v), null, String(v))
})
test('todayIST: IST boundary', () => {
  assert.equal(todayIST(new Date('2026-10-25T19:00:00Z')), '2026-10-26') // 00:30 IST next day
  assert.equal(todayIST(new Date('2026-10-25T23:00:00Z')), '2026-10-26')
  assert.equal(todayIST(new Date('2026-10-25T10:00:00Z')), '2026-10-25')
  assert.equal(todayIST(new Date('2026-10-25T18:29:00Z')), '2026-10-25')
})
const rec = (d, extra = {}) => ({ arrival_date: d, market: 'Sagar', district: 'Sagar', modal_price: '2500', ...extra })
test('filterFresh: stale, undated, future skipped; fresh kept with own date', () => {
  const r = filterFresh([rec('24/10/2026'), rec('17/10/2026'), rec('18/10/2026'), rec(undefined), rec('30/10/2026')], '2026-10-25')
  assert.equal(r.fresh.length, 2) // 24/10 and 18/10 (7 days)
  assert.equal(r.stale, 1); assert.equal(r.undated, 1); assert.equal(r.future, 1)
  assert.deepEqual(r.fresh.map((x) => x.__date), ['2026-10-24', '2026-10-18'])
})
test('an undated record is never stamped with today', () => {
  assert.equal(filterFresh([rec('')], '2026-10-25').fresh.length, 0)
})
test('buildRows: price_date is the record date; division flag preserved', () => {
  const { fresh } = filterFresh([rec('22/10/2026'), rec('24/10/2026', { market: 'Damoh', district: 'Damoh' }), rec('24/10/2026', { market: 'Indore', district: 'Indore' })], '2026-10-25')
  const rows = buildRows('Wheat', 'hi', pickRecords(fresh), 'x')
  assert.equal(rows.length, 2)
  assert.ok(rows.every((r) => r.in_sagar_division === true))
  assert.deepEqual(rows.map((r) => [r.market, r.price_date, r.is_sagar_district]), [['Damoh', '2026-10-24', false], ['Sagar', '2026-10-22', true]])
})
test('pickRecords: no division mandi -> one best MP record, flags false, newest wins', () => {
  const { fresh } = filterFresh([rec('20/10/2026', { market: 'Indore', district: 'Indore' }), rec('24/10/2026', { market: 'Bhopal', district: 'Bhopal' })], '2026-10-25')
  const picks = pickRecords(fresh)
  assert.equal(picks.length, 1); assert.equal(picks[0].inDivision, false); assert.equal(picks[0].record.market, 'Bhopal')
})
test('pickRecords: newest record per market', () => {
  const { fresh } = filterFresh([rec('20/10/2026', { modal_price: '1' }), rec('24/10/2026', { modal_price: '2' })], '2026-10-25')
  const rows = buildRows('Wheat', 'x', pickRecords(fresh))
  assert.equal(rows.length, 1); assert.equal(rows[0].modal_price, 2); assert.equal(rows[0].price_date, '2026-10-24')
})
test('exit-code rules', () => {
  const today = '2026-10-25'
  assert.equal(decideExit({ totalRows: 0, newestDate: null, today }).code, 1)
  assert.equal(decideExit({ totalRows: 5, newestDate: '2026-10-17', today }).code, 1)
  assert.equal(decideExit({ totalRows: 5, newestDate: '2026-10-22', today }).code, 0) // exactly 3 days
  assert.equal(decideExit({ totalRows: 5, newestDate: '2026-10-25', today }).code, 0)
  assert.equal(decideExit({ refOk: false, totalRows: 5, newestDate: '2026-10-25', today }).code, 1)
})
test('project-ref guard', () => {
  assert.equal(checkProjectRef(`https://${PROD_REF}.supabase.co`, PROD_REF).ok, true)
  assert.equal(checkProjectRef(`https://${STAGING_REF}.supabase.co`, PROD_REF).ok, false)
  assert.equal(checkProjectRef(`https://${PROD_REF}.supabase.co`, STAGING_REF).ok, false)
  assert.equal(checkProjectRef('', PROD_REF).ok, false)
  assert.equal(checkProjectRef(`https://${STAGING_REF}.supabase.co`, PROD_REF, true).ok, true) // dry run ignores
})
test('redact removes secrets; summary has no key and counts division rows', () => {
  const fake = 'FAKE-KEY-1234567890'
  assert.ok(!redact(`url?api-key=${fake}&x`, [fake]).includes(fake))
  const s = summarize({ perCommodity: [{ api: 'Wheat', rows: 3, division: 2, newest: '2026-10-24', skipped: 1 }], today: '2026-10-25', source: 'official' })
  assert.equal(s.division, 2); assert.equal(s.newest, '2026-10-24'); assert.ok(!s.text.includes(fake))
})
test('commodity matching unchanged', () => {
  assert.equal(matchCommodity('Bengal Gram(Gram)(Whole)', 'Gram'), true)
  assert.equal(matchCommodity('Red Gram/Arhar/Tur(Whole)', 'Gram'), false)
})
test('daysBetween', () => assert.equal(daysBetween('2026-10-17', '2026-10-25'), 8))

test('script: ref guard refuses before any network call; fake key never printed', () => {
  const fake = 'FAKE-SERVICE-KEY-abcdef123456'
  const r = spawnSync(process.execPath, ['scripts/refresh-data.mjs', '--expect-project-ref', PROD_REF], { encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: `https://${STAGING_REF}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: fake, DATA_GOV_IN_API_KEY: fake } })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /project ref/)
  assert.ok(!(r.stdout + r.stderr).includes(fake))
})
