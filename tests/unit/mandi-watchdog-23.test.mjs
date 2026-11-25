// Batch 23 - the production price watchdog (scripts/lib/mandi-watchdog.mjs).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { watchdogCheck, annotations, summaryMarkdown, STALL_HOURS } from '../../scripts/lib/mandi-watchdog.mjs'
import { TRACKED_CROPS, WATCHDOG_MIN_MANDIS as MIN_MANDIS, WATCHDOG_MIN_CROPS as MIN_CROPS, MIN_CROPS as DISPLAY_CROPS } from '../../src/lib/mandi/pickRule.js'

const M = ['Banda APMC', 'Bina APMC', 'Damoh APMC', 'Khurai APMC', 'Sagar APMC']
const full = (d) => TRACKED_CROPS.flatMap((c) => M.map((m) => ({ commodity_en: c, market: m, modal_price: 3000, price_date: d })))
const thin = (d, crops = 2, mandis = 1) => TRACKED_CROPS.slice(0, crops).flatMap((c) => M.slice(0, mandis).map((m) => ({ commodity_en: c, market: m, modal_price: 2500, price_date: d })))
const NOW = Date.parse('2026-11-24T10:00:00Z') // Tuesday 15:30 IST (after the 14:00 IST grace)
const EARLY = Date.parse('2026-11-24T01:30:00Z') // Tuesday 07:00 IST (inside the grace)
const ago = (h) => new Date(NOW - h * 3600000).toISOString()
const run = (o) => watchdogCheck({ nowMs: NOW, today: '2026-11-24', newestFetchedAt: ago(2), ...o })

test('uses the watchdog floor constants (3 mandis, 5 crops), not copies', () => {
  assert.equal(MIN_MANDIS, 3); assert.equal(MIN_CROPS, 5); assert.equal(DISPLAY_CROPS, 7); assert.equal(STALL_HOURS, 12)
  const src = readFileSync(new URL('../../scripts/lib/mandi-watchdog.mjs', import.meta.url), 'utf8')
  assert.match(src, /from '\.\.\/\.\.\/src\/lib\/mandi\/pickRule\.js'/)
})

test('pass: yesterday full, newest = yesterday, written recently', () => {
  const r = run({ rows: [...full('2026-11-23'), ...full('2026-11-22')], newestDate: '2026-11-23' })
  assert.equal(r.status, 'PASS'); assert.equal(r.red, false); assert.deepEqual(r.errors, [])
})

test('fail: newest date older than yesterday', () => {
  const r = run({ rows: full('2026-11-22'), newestDate: '2026-11-22' })
  assert.equal(r.red, true); assert.match(r.errors[0], /older than yesterday/)
  assert.ok(annotations(r).some((l) => l.startsWith('::error::')))
})

test('fail: no rows at all', () => {
  const r = run({ rows: [], newestDate: null })
  assert.equal(r.red, true); assert.match(r.errors[0], /No price rows/)
})

test('fail: thin yesterday on a weekday (too few mandis, too few crops)', () => {
  assert.equal(run({ rows: thin('2026-11-23'), newestDate: '2026-11-23' }).red, true)          // 2 crops, 1 mandi
  assert.equal(run({ rows: thin('2026-11-23', 10, 2), newestDate: '2026-11-23' }).red, true)   // 2 mandis
  assert.equal(run({ rows: thin('2026-11-23', 4, 5), newestDate: '2026-11-23' }).red, true)    // 4 crops
  assert.equal(run({ rows: thin('2026-11-23', 5, 3), newestDate: '2026-11-23' }).red, false)   // exactly the limits
})

test('Sunday: a thin day is only a warning while 1 crop and 1 mandi reported; nothing at all is still a failure', () => {
  const sun = watchdogCheck({ nowMs: NOW, today: '2026-11-23', newestFetchedAt: ago(2), rows: thin('2026-11-22'), newestDate: '2026-11-22' })
  assert.equal(sun.red, false); assert.equal(sun.status, 'WARNING'); assert.equal(sun.warnings.length, 1)
  assert.ok(annotations(sun).some((l) => l.startsWith('::warning::')))
  const none = watchdogCheck({ nowMs: NOW, today: '2026-11-23', newestFetchedAt: ago(2), rows: full('2026-11-21'), newestDate: '2026-11-21' })
  assert.equal(none.red, true)
  // a Sunday that still meets the thresholds passes outright
  const ok = watchdogCheck({ nowMs: NOW, today: '2026-11-23', newestFetchedAt: ago(2), rows: thin('2026-11-22', 6, 4), newestDate: '2026-11-22' })
  assert.equal(ok.status, 'PASS')
})

test('listed public holiday behaves like a Sunday; the list is empty by default', () => {
  const rows = thin('2026-11-23'), base = { nowMs: NOW, today: '2026-11-24', newestFetchedAt: ago(2), rows, newestDate: '2026-11-23' }
  assert.equal(watchdogCheck(base).red, true)
  assert.equal(watchdogCheck({ ...base, holidays: ['2026-11-23'] }).status, 'WARNING')
})

test('fail: nothing written for more than 12 hours; skipped when fetched_at is unreadable', () => {
  const rows = full('2026-11-23')
  const stalled = run({ rows, newestDate: '2026-11-23', newestFetchedAt: ago(20) })
  assert.equal(stalled.red, true); assert.match(stalled.errors[0], /20\.0 hours/)
  assert.equal(run({ rows, newestDate: '2026-11-23', newestFetchedAt: ago(11) }).red, false)
  const skipped = run({ rows, newestDate: '2026-11-23', newestFetchedAt: null })
  assert.equal(skipped.red, false); assert.match(skipped.notes[0], /Stall check skipped/)
  assert.equal(run({ rows, newestDate: '2026-11-23', newestFetchedAt: 'junk' }).red, false)
})

test('summary table lists the last 5 days with rows, mandis, crops', () => {
  const md = summaryMarkdown(run({ rows: [...full('2026-11-23'), ...thin('2026-11-22')], newestDate: '2026-11-23' }))
  assert.match(md, /\| 2026-11-23 \| Mon \| 50 \| 5 \| 10 \|/)
  assert.match(md, /\| 2026-11-22 \| Sun \| 2 \| 1 \| 2 \|/)
  assert.equal(md.split('\n').filter((l) => /^\| 2026-/.test(l)).length, 5)
})

test('grace: before 14:00 IST the date and thin-day checks only warn; from 14:00 IST they fail; the stall check always fails', () => {
  const stale = { rows: full('2026-11-22'), newestDate: '2026-11-22', today: '2026-11-24', newestFetchedAt: ago(2) }
  const early = watchdogCheck({ ...stale, nowMs: EARLY })
  assert.equal(early.red, false); assert.equal(early.status, 'WARNING'); assert.match(early.warnings[0], /before 14:00 IST/)
  assert.equal(watchdogCheck({ ...stale, nowMs: NOW }).red, true)
  const thinY = { rows: thin('2026-11-23'), newestDate: '2026-11-23', today: '2026-11-24', newestFetchedAt: ago(2) }
  assert.equal(watchdogCheck({ ...thinY, nowMs: EARLY }).red, false)
  assert.equal(watchdogCheck({ ...thinY, nowMs: NOW }).red, true)
  // the 12-hour stall check fails at any hour
  const stalled = { rows: full('2026-11-23'), newestDate: '2026-11-23', today: '2026-11-24' }
  assert.equal(watchdogCheck({ ...stalled, nowMs: EARLY, newestFetchedAt: new Date(EARLY - 20 * 3600000).toISOString() }).red, true)
  // edges, computed in IST: 13:59 IST (08:29 UTC) warns, 14:00 IST (08:30 UTC) fails
  assert.equal(watchdogCheck({ ...stale, nowMs: Date.parse('2026-11-24T08:29:00Z') }).red, false)
  assert.equal(watchdogCheck({ ...stale, nowMs: Date.parse('2026-11-24T08:30:00Z') }).red, true)
  // the result does not depend on the order of the rows
  const a = watchdogCheck({ ...thinY, nowMs: NOW }), b = watchdogCheck({ ...thinY, rows: [...thinY.rows].reverse(), nowMs: NOW })
  assert.deepEqual(a.errors, b.errors)
})
