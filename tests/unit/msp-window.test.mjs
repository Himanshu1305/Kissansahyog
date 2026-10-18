// Batch 10E — /msp trend windows and their date labels (src/lib/mandi/mspWindow.js).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { windowStart, sliceWindow, formatRange, formatDay, windowInfo } from '../../src/lib/mandi/mspWindow.js'

const TODAY = new Date('2026-10-18T10:00:00Z')
// daily series from..to (inclusive), skipping the dates in `skip`
function days(from, to, skip = []) {
  const out = []
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10)
    if (!skip.includes(d)) out.push({ date: d, price: 2400 + out.length })
  }
  return out
}

test('windowStart = today minus N calendar days (UTC)', () => {
  assert.equal(windowStart(7, TODAY), '2026-10-11')
  assert.equal(windowStart(30, TODAY), '2026-09-18')
  assert.equal(windowStart(90, TODAY), '2026-07-20')
})

test('formatRange: same month compresses, cross month shows both, single day', () => {
  assert.equal(formatRange('2026-10-11', '2026-10-18', 'hi', TODAY), '11–18 अक्टू')
  assert.equal(formatRange('2026-09-19', '2026-10-18', 'hi', TODAY), '19 सित – 18 अक्टू')
  assert.equal(formatRange('2026-07-20', '2026-10-18', 'hi', TODAY), '20 जुल – 18 अक्टू')
  assert.equal(formatRange('2026-10-18', '2026-10-18', 'hi', TODAY), '18 अक्टू')
  assert.equal(formatRange('2026-10-11', '2026-10-18', 'en', TODAY), '11–18 Oct')
  assert.equal(formatRange('2026-09-19', '2026-10-18', 'en', TODAY), '19 Sep – 18 Oct')
  assert.equal(formatDay('2026-02-03', 'hi', TODAY), '3 फ़र')
  assert.equal(formatDay('2026-04-03', 'hi', TODAY), '3 अप्रै')
})

test('formatRange: the year appears only when needed', () => {
  assert.equal(formatRange('2025-12-20', '2026-01-05', 'hi', new Date('2026-01-06')), '20 दिस 2025 – 5 जन 2026')
  assert.equal(formatRange('2025-12-20', '2026-01-05', 'en', new Date('2026-01-06')), '20 Dec 2025 – 5 Jan 2026')
  assert.equal(formatRange('2025-10-11', '2025-10-18', 'hi', TODAY), '11–18 अक्टू 2025') // not this year
  assert.equal(formatRange('2026-03-01', '2026-10-18', 'en', TODAY), '1 Mar – 18 Oct') // current year
})

test('0 days: no range, nothing claimed', () => {
  const w = windowInfo([], 30, 'hi', TODAY)
  assert.deepEqual([w.n, w.first, w.last, w.range, w.thin, w.startsLate], [0, null, null, '', true, false])
  const old = windowInfo(days('2026-06-01', '2026-06-10'), 7, 'hi', TODAY) // data exists, but not in the window
  assert.equal(old.n, 0)
})

test('1 day', () => {
  const w = windowInfo([{ date: '2026-10-16', price: 5000 }], 7, 'hi', TODAY)
  assert.equal(w.n, 1); assert.equal(w.range, '16 अक्टू'); assert.equal(w.thin, true); assert.equal(w.startsLate, false)
})

test('fewer days than requested (Sunday missing) → thin, real range', () => {
  const s = days('2026-10-11', '2026-10-17', ['2026-10-11'])
  const w = windowInfo(s, 7, 'hi', TODAY)
  assert.equal(w.n, 6); assert.equal(w.thin, true); assert.equal(w.range, '12–17 अक्टू'); assert.equal(w.startsLate, false)
})

test('history shorter than the window: 30 and 90 show the same real range, 90 says it starts late', () => {
  const s = days('2026-09-22', '2026-10-17')
  const w30 = windowInfo(s, 30, 'hi', TODAY), w90 = windowInfo(s, 90, 'hi', TODAY)
  assert.equal(w30.range, '22 सित – 17 अक्टू'); assert.equal(w90.range, w30.range)
  assert.equal(w90.n, w30.n); assert.equal(w90.thin, true)
  assert.equal(w30.startsLate, false) // 4 days after 18 Sep
  assert.equal(w90.startsLate, true) // two months after 20 Jul: older prices do not exist
})

test('slices are nested and non-decreasing 7 ≤ 30 ≤ 90 on full data', () => {
  const s = days('2026-06-20', '2026-10-17')
  const n = [7, 30, 90].map((d) => sliceWindow(s, d, TODAY).length)
  assert.deepEqual(n, [7, 30, 90])
  assert.equal(windowInfo(s, 90, 'hi', TODAY).range, '20 जुल – 17 अक्टू')
  assert.equal(windowInfo(s, 90, 'hi', TODAY).thin, false)
})
