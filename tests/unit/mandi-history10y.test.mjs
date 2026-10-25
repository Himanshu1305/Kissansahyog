// Batch 15A - ten-year monthly mandi history: pure helpers (src/lib/mandi/history10yCalc.js) and the shape of
// mandi_monthly_history (migration 0069). Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { normalizeRows, pickScope, latestYear, latestMonth, monthOfYearAverages, harvestByYear, harvestAverage, gapVsAverage } from '../../src/lib/mandi/history10yCalc.js'
import { CROPS } from '../../src/content/crops.js'

// build rows: for each year in `years`, each month in `months` -> price
const mk = (years, months, f) => years.flatMap((y) => months.map((m) => ({ month: `${y}-${String(m).padStart(2, '0')}`, price: f(y, m), n: 3 })))

test('normalizeRows: ISO dates to YYYY-MM, oldest first, drops empty and zero prices', () => {
  const r = normalizeRows([
    { month: '2024-03-01', modal_price: '2500.00', districts_reporting: 4 },
    { month: '2016-01-01', modal_price: '1600', districts_reporting: null },
    { month: '2020-05-01', modal_price: 0 }, { month: '2020-06-01', modal_price: null }, null,
  ])
  assert.deepEqual(r, [{ month: '2016-01', price: 1600, n: null }, { month: '2024-03', price: 2500, n: 4 }])
})

test('pickScope: division when it has 60+ months, else mp, else nothing', () => {
  const div = (n) => Array.from({ length: n }, (_, i) => ({ month: `2016-${i}`, price: 1, n: 1 }))
  const mp = [{ month: '2016-01', price: 9, n: null }]
  assert.equal(pickScope(div(60), mp).scope, 'sagar_division')
  assert.equal(pickScope(div(59), mp).scope, 'mp')
  assert.equal(pickScope(div(59), mp).rows, mp)
  assert.deepEqual(pickScope([], []), { rows: [], scope: null })
})

test('latestYear / latestMonth', () => {
  const rows = mk([2024, 2025], [1, 10], () => 1)
  assert.equal(latestYear(rows), 2025)
  assert.equal(latestMonth(rows), '2025-10')
  assert.equal(latestYear([]), null)
})

test('monthOfYearAverages: averages the calendar month over the last 5 years only', () => {
  // 2018 is outside the window 2021..2025 and must be ignored (price 9999 would wreck the average)
  const rows = [...mk([2018], [3], () => 9999), ...mk([2021, 2022, 2023, 2024, 2025], [3], (y) => 1000 + (y - 2021) * 100)]
  const a = monthOfYearAverages(rows)
  assert.equal(a.length, 12)
  assert.equal(a[2], 1200) // (1000+1100+1200+1300+1400)/5
  assert.equal(a[0], null)
})

test('monthOfYearAverages: a month with data in fewer than 3 of the 5 years is left out (null)', () => {
  const rows = [...mk([2021, 2025], [4], () => 2000), ...mk([2021, 2023, 2025], [5], () => 3000)]
  const a = monthOfYearAverages(rows)
  assert.equal(a[3], null) // April: 2 years only
  assert.equal(a[4], 3000) // May: 3 years
})

test('monthOfYearAverages: a gap year is NOT interpolated', () => {
  // March has no value in 2023; the average is over the 4 years that exist, not over 5 with a made-up 2023
  const rows = mk([2021, 2022, 2024, 2025], [3], (y) => (y === 2021 ? 1000 : 2000))
  assert.equal(monthOfYearAverages(rows)[2], Math.round((1000 + 2000 + 2000 + 2000) / 4))
})

test('monthOfYearAverages: endYear moves the window', () => {
  const rows = mk([2016, 2017, 2018, 2019, 2020, 2021], [3], (y) => y)
  assert.equal(monthOfYearAverages(rows, { endYear: 2020 })[2], Math.round((2016 + 2017 + 2018 + 2019 + 2020) / 5))
})

test('harvestByYear: mean of the harvest months per year, a year without them is left out', () => {
  const rows = [...mk([2021], [3, 4, 5], (y, m) => 1000 * (m - 2)), ...mk([2023], [4], () => 5000), ...mk([2024], [8], () => 7777)]
  assert.deepEqual(harvestByYear(rows, [3, 4, 5], { endYear: 2025 }), [{ year: 2021, price: 2000 }, { year: 2023, price: 5000 }])
})

test('harvestAverage: needs 3 years, ignores years outside the window, averages the yearly values', () => {
  const rows = [...mk([2015], [3, 4, 5], () => 99999), ...mk([2021, 2022, 2023, 2024, 2025], [3, 4, 5], (y) => 2000 + (y - 2021) * 100)]
  assert.deepEqual(harvestAverage(rows, [3, 4, 5]), { avg: 2200, years: 5 })
  assert.equal(harvestAverage(mk([2024, 2025], [3, 4, 5], () => 1), [3, 4, 5]), null)
})

test('harvestAverage: a partly filled latest year still counts for the months it has (Oct 2025 only)', () => {
  const rows = [...mk([2021, 2022, 2023, 2024], [10, 11], () => 4000), ...mk([2025], [10], () => 4500)]
  assert.deepEqual(harvestAverage(rows, [10, 11]), { avg: 4100, years: 5 })
})

test('gapVsAverage: whole percent, null on bad input', () => {
  assert.equal(gapVsAverage(2200, 2000), 10)
  assert.equal(gapVsAverage(1800, 2000), -10)
  assert.equal(gapVsAverage(2000, 2000), 0)
  assert.equal(gapVsAverage(null, 2000), null)
  assert.equal(gapVsAverage(2000, 0), null)
  assert.equal(gapVsAverage(undefined, undefined), null)
})

test('every crop has harvest_months (1-12, non-empty)', () => {
  for (const c of CROPS) {
    assert.ok(Array.isArray(c.harvest_months) && c.harvest_months.length > 0, c.slug)
    assert.ok(c.harvest_months.every((m) => Number.isInteger(m) && m >= 1 && m <= 12), c.slug)
  }
})

test('migration 0069: additive, ASCII, one table, select-only grants, no write policy, no touch of mandi_prices', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/0069_mandi_monthly_history.sql', import.meta.url), 'utf8')
  assert.ok(/^[\x00-\x7F]*$/.test(sql), 'pure ASCII')
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  assert.equal((code.match(/create table/gi) || []).length, 1)
  assert.ok(/create table if not exists public\.mandi_monthly_history/i.test(code))
  assert.ok(/drop policy if exists mandi_monthly_history_read/i.test(code))
  assert.ok(/grant select on table public\.mandi_monthly_history to anon, authenticated/i.test(code))
  assert.ok(!/grant\s+(insert|update|delete|all)/i.test(code))
  assert.ok(!/\b(alter table|drop table|drop function|create or replace function|create trigger)\b/i.test(code.replace(/alter table public\.mandi_monthly_history enable row level security/i, '')))
  assert.ok(!/mandi_prices/i.test(code))
  assert.ok(!/otp_required|session_enforced/i.test(code))
})

test('the committed history JSON (when present) is consistent', { skip: !existsSync(new URL('../../data/mandi-history/ceda-monthly-2016-2025.json', import.meta.url)) }, () => {
  const j = JSON.parse(readFileSync(new URL('../../data/mandi-history/ceda-monthly-2016-2025.json', import.meta.url), 'utf8'))
  assert.equal(Object.keys(j.commodities).length, 12)
  for (const [en, c] of Object.entries(j.commodities)) {
    for (const t of [...Object.keys(c.mp), ...Object.keys(c.sagar_division)]) assert.ok(t >= '2016-01' && t <= '2025-10', `${en} ${t}`)
    for (const v of Object.values(c.mp)) assert.ok(v > 0)
    for (const v of Object.values(c.sagar_division)) assert.ok(v.price > 0 && v.districts_reporting >= 1 && v.districts_reporting <= 5)
  }
})
