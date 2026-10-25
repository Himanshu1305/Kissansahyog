// Batch 10E — the /msp trend read: paging past PostgREST max_rows and the per-day median
// (src/lib/mandi/history.js), with a fake client that behaves like PostgREST (max_rows cap).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchAllPages, medianByDate, PAGE_SIZE } from '../../src/lib/mandi/history.js'

// rows newest first, like the query (order price_date desc); maxRows = server cap
function fakeServer(rows, maxRows = 1000) {
  const calls = []
  const fetchPage = async (from, to) => {
    calls.push([from, to])
    const n = Math.min(to - from + 1, maxRows)
    return { data: rows.slice(from, from + n), error: null }
  }
  return { fetchPage, calls }
}
function mkRows(nDays, perDay) {
  const out = []
  for (let i = 0; i < nDays; i++) {
    const d = new Date(Date.UTC(2026, 9, 17) - i * 86400000).toISOString().slice(0, 10)
    for (let m = 0; m < perDay; m++) out.push({ price_date: d, modal_price: 2400 + m * 10 })
  }
  return out
}

test('page size equals the server cap', () => assert.equal(PAGE_SIZE, 1000))

test('reads every page until a short page (2,189 rows → 3 requests), newest day kept', async () => {
  const rows = mkRows(90, 25).slice(0, 2189)
  const { fetchPage, calls } = fakeServer(rows)
  const r = await fetchAllPages(fetchPage)
  assert.equal(r.error, null); assert.equal(r.data.length, 2189); assert.equal(r.truncated, false)
  assert.deepEqual(calls, [[0, 999], [1000, 1999], [2000, 2999]])
  assert.equal(r.data[0].price_date, '2026-10-17')
})

test('the old single capped read kept 40 of 90 days; paging keeps all 90', async () => {
  const rows = mkRows(90, 25) // 2,250 rows
  const ascending = [...rows].reverse()
  assert.equal(medianByDate(ascending.slice(0, 1000)).length, 40) // old: ascending + server cap
  const paged = medianByDate((await fetchAllPages(fakeServer(rows).fetchPage)).data)
  assert.equal(paged.length, 90); assert.equal(paged.at(-1).date, '2026-10-17'); assert.equal(paged[0].date, '2026-07-20')
})

test('exact multiple of the page size ends with an empty page', async () => {
  const { fetchPage, calls } = fakeServer(mkRows(40, 25)) // 1,000 rows
  const r = await fetchAllPages(fetchPage)
  assert.equal(r.data.length, 1000); assert.equal(calls.length, 2)
})

test('page cap stops the loop and reports truncation (newest rows kept)', async () => {
  const { fetchPage, calls } = fakeServer(mkRows(100, 30)) // 3,000 rows
  const r = await fetchAllPages(fetchPage, { maxPages: 2 })
  assert.equal(calls.length, 2); assert.equal(r.truncated, true); assert.equal(r.data.length, 2000)
  assert.equal(r.data[0].price_date, '2026-10-17')
})

test('a server cap smaller than the page size stops after one page (documented limit)', async () => {
  const { fetchPage } = fakeServer(mkRows(10, 30), 100)
  const r = await fetchAllPages(fetchPage)
  assert.equal(r.data.length, 100)
})

test('an error on any page fails the whole read', async () => {
  let n = 0
  const r = await fetchAllPages(async () => (++n === 2 ? { data: null, error: { message: 'boom' } } : { data: Array(1000).fill({ price_date: '2026-10-17', modal_price: 1 }), error: null }))
  assert.equal(r.data, null); assert.equal(r.error.message, 'boom')
})

test('medianByDate: per-day median, ascending, skips null prices', () => {
  const s = medianByDate([
    { price_date: '2026-10-17', modal_price: 2500 }, { price_date: '2026-10-17', modal_price: 2300 }, { price_date: '2026-10-17', modal_price: 2400 },
    { price_date: '2026-10-16', modal_price: 2401 }, { price_date: '2026-10-16', modal_price: 2410 },
    { price_date: '2026-10-15', modal_price: null },
  ])
  assert.deepEqual(s, [{ date: '2026-10-16', price: 2406 }, { date: '2026-10-17', price: 2400 }])
  assert.deepEqual(medianByDate([]), [])
})
