// Batch 10F 3C — the /msp trend measures price change, not which mandis reported (src/lib/mandi/basket.js).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { basketSeries, BASKET_SHARE, DAY_SHARE, MIN_BASKET } from '../../src/lib/mandi/basket.js'
import { medianByDate } from '../../src/lib/mandi/history.js'
import { windowStart } from '../../src/lib/mandi/mspWindow.js'

const day = (i) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10)
// 10 regular mandis at flat prices 2,500…2,590 for 10 days.
function flatRows() {
  const rows = []
  for (let i = 0; i < 10; i++) for (let m = 0; m < 10; m++) rows.push({ market: `M${m}`, price_date: day(i), modal_price: 2500 + m * 10 })
  return rows
}

test('constants are the documented rule', () => {
  assert.equal(BASKET_SHARE, 0.6)
  assert.equal(DAY_SHARE, 2 / 3)
  assert.equal(MIN_BASKET, 3)
})

test('synthetic: a day with only a few HIGH-priced mandis no longer creates a spike', () => {
  const rows = flatRows()
  // Day 10: only two expensive mandis (one of them a one-off) report.
  rows.push({ market: 'M9', price_date: day(10), modal_price: 2590 }, { market: 'X', price_date: day(10), modal_price: 3300 })
  const old = medianByDate(rows)
  assert.equal(old.at(-1).price, Math.round((2590 + 3300) / 2), 'the old daily median jumps on the thin day')
  const res = basketSeries(rows)
  assert.equal(res.few, false)
  assert.deepEqual(res.basket, ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'])
  assert.deepEqual(res.skipped, [day(10)])
  assert.ok(res.series.every((p) => p.price === 2545), 'every kept day is the flat basket median')
  assert.equal(res.series.at(-1).date, day(9))
})

test('synthetic: a day with only a few LOW-priced mandis no longer creates a dip', () => {
  const rows = flatRows()
  for (const m of [0, 1, 2]) rows.push({ market: `M${m}`, price_date: day(10), modal_price: 2500 + m * 10 })
  const res = basketSeries(rows)
  assert.deepEqual(res.skipped, [day(10)])
  assert.equal(res.series.at(-1).price, 2545)
})

test('a day where most basket mandis report is kept, a real move shows', () => {
  const rows = flatRows()
  for (let m = 0; m < 8; m++) rows.push({ market: `M${m}`, price_date: day(10), modal_price: 2600 + m * 10 })
  const res = basketSeries(rows)
  assert.deepEqual(res.skipped, [])
  assert.equal(res.series.at(-1).date, day(10))
  assert.equal(res.series.at(-1).price, 2635)
  assert.equal(res.series.at(-1).n, 8)
})

test('mandis that rarely report are left out of the basket', () => {
  const rows = flatRows()
  rows.push({ market: 'RARE', price_date: day(3), modal_price: 9000 })
  const res = basketSeries(rows)
  assert.ok(!res.basket.includes('RARE'))
  assert.equal(res.series.find((p) => p.date === day(3)).price, 2545)
})

test('fewer than 3 stable mandis: plain daily median, flagged few', () => {
  const rows = []
  for (let i = 0; i < 6; i++) rows.push({ market: 'A', price_date: day(i), modal_price: 2000 + i }, { market: 'B', price_date: day(i), modal_price: 2100 + i })
  rows.push({ market: 'C', price_date: day(0), modal_price: 1900 })
  const res = basketSeries(rows)
  assert.equal(res.few, true)
  assert.deepEqual(res.series, medianByDate(rows).map((p, i) => ({ ...p, n: i === 0 ? 3 : 2 })))
})

test('no made-up values: every point is a median of real prices of that same day', () => {
  const rows = flatRows()
  rows.push({ market: 'M0', price_date: day(11), modal_price: 1 })
  const res = basketSeries(rows)
  for (const p of res.series) {
    const same = rows.filter((r) => r.price_date === p.date).map((r) => r.modal_price)
    assert.ok(p.price >= Math.min(...same) && p.price <= Math.max(...same))
  }
})

test('empty / bad input', () => {
  assert.deepEqual(basketSeries([]).series, [])
  assert.deepEqual(basketSeries(null).series, [])
  assert.deepEqual(basketSeries([{ market: 'A', price_date: day(0), modal_price: null }]).series, [])
})

// Real staging data (read-only snapshot pulled in Phase 3 by scripts/batch10f/pull-mandi-90d.mjs).
const SNAP = new URL('../../docs/review/batch10f/evidence/staging-mandi-90d.json', import.meta.url)
test('real staging data: wheat 30-day series no longer ends with the artificial 17 Oct drop', { skip: !existsSync(SNAP) }, () => {
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
  const from = windowStart(30, new Date('2026-10-19T06:00:00Z'))
  const rows = snap.rows.filter((r) => r[0] === 'Wheat' && r[2] >= from).map(([, market, price_date, modal_price]) => ({ market, price_date, modal_price }))
  const before = medianByDate(rows).at(-1)
  assert.deepEqual(before, { date: '2026-10-17', price: 2526 }, 'before: the plain median ends on the thin Saturday')
  const after = basketSeries(rows)
  assert.ok(after.skipped.includes('2026-10-17'))
  assert.equal(after.series.at(-1).date, '2026-10-16')
  assert.equal(after.series.at(-1).price, 2560)
  // The 90-day window no longer has the 15 Aug spike (2 mandis, ₹3,263).
  const from90 = windowStart(90, new Date('2026-10-19T06:00:00Z'))
  const rows90 = snap.rows.filter((r) => r[0] === 'Wheat' && r[2] >= from90).map(([, market, price_date, modal_price]) => ({ market, price_date, modal_price }))
  assert.equal(medianByDate(rows90).find((p) => p.date === '2026-08-15').price, 3263)
  const s90 = basketSeries(rows90)
  assert.ok(!s90.series.some((p) => p.date === '2026-08-15'))
  assert.ok(Math.max(...s90.series.map((p) => p.price)) < 2700)
})
