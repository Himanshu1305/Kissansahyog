// Batch 10F 3B — /msp trend chart geometry (src/lib/mandi/chartLayout.js).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { layoutChart, textWidth, PAD } from '../../src/lib/mandi/chartLayout.js'
import { basketSeries } from '../../src/lib/mandi/basket.js'
import { windowStart, formatDay } from '../../src/lib/mandi/mspWindow.js'

const TODAY = new Date('2026-10-19T06:00:00Z')
const fmt = (lang) => (iso) => formatDay(iso, lang, TODAY)
const ov = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
// Chart widths: the /msp content box at 320, 412 and 1280 px screens (16 px page gutters; 1280 = wide shell).
const WIDTHS = [288, 380, 1136]

function check(L, label) {
  const boxes = L.labels.map((l) => l.box)
  for (let a = 0; a < boxes.length; a++) {
    for (let b = a + 1; b < boxes.length; b++) assert.ok(!ov(boxes[a], boxes[b]), `${label}: labels ${L.labels[a].i} and ${L.labels[b].i} overlap`)
    const bx = boxes[a]
    assert.ok(bx.x >= 0 && bx.x + bx.w <= L.W && bx.y >= 0 && bx.y + bx.h <= L.H, `${label}: label ${L.labels[a].i} outside the chart`)
    if (L.msp) assert.ok(!ov(bx, L.msp.box), `${label}: label ${L.labels[a].i} covers the MSP label`)
    for (const t of L.ticks) assert.ok(!ov(bx, t.box), `${label}: label ${L.labels[a].i} covers tick ${t.text}`)
  }
  for (let a = 0; a < L.ticks.length; a++) for (let b = a + 1; b < L.ticks.length; b++) assert.ok(!ov(L.ticks[a].box, L.ticks[b].box), `${label}: ticks overlap`)
  const n = L.points.length
  const has = (i) => L.labels.some((l) => l.i === i)
  assert.ok(has(0) && has(n - 1) && has(L.iHi) && has(L.iLo), `${label}: first/last/high/low labelled`)
}

test('text width estimate is sane', () => {
  assert.ok(textWidth('17 अक्टू', 11) > 30 && textWidth('17 अक्टू', 11) < 60)
  assert.ok(textWidth('₹2,526', 12) > 30 && textWidth('₹2,526', 12) < 50)
})

test('empty and single point', () => {
  assert.deepEqual(layoutChart({ series: [], width: 300, fmtDay: fmt('hi') }).labels, [])
  const one = layoutChart({ series: [{ date: '2026-10-16', price: 2560, n: 20 }], width: 300, fmtDay: fmt('hi'), mspValue: 2585 })
  assert.equal(one.labels.length, 1)
  assert.deepEqual(one.labels[0].roles, ['last', 'first', 'high', 'low'])
})

test('x is by calendar date: a skipped day leaves a gap', () => {
  const s = [{ date: '2026-10-01', price: 1 }, { date: '2026-10-02', price: 2 }, { date: '2026-10-04', price: 3 }]
  const L = layoutChart({ series: s, width: 400, fmtDay: fmt('hi'), days: 7 })
  const [a, b, c] = L.points.map((p) => p.x)
  assert.ok(Math.abs((c - b) - 2 * (b - a)) < 0.01)
})

test('ticks: about every 5 days (30) / 15 days (90), wider when they would overlap, never overlapping', () => {
  const s = []
  for (let i = 0; i < 30; i++) s.push({ date: new Date(Date.UTC(2026, 8, 18 + i)).toISOString().slice(0, 10), price: 2500 + i })
  const wide = layoutChart({ series: s, width: 1136, fmtDay: fmt('hi'), days: 30 })
  assert.equal(wide.step, 5)
  const narrow = layoutChart({ series: s, width: 288, fmtDay: fmt('hi'), days: 30 })
  assert.ok(narrow.step >= 5 && narrow.step % 5 === 0)
  check(narrow, '30d synthetic 288')
})

const SNAP = new URL('../../docs/review/batch10f/evidence/staging-mandi-90d.json', import.meta.url)
test('real staging data: every crop, 7/30/90 days, hi + en, 288/380/1136 px — labels never overlap, stay inside, first/last/high/low labelled', { skip: !existsSync(SNAP) }, () => {
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
  const crops = [...new Set(snap.rows.map((r) => r[0]))]
  let charts = 0
  for (const crop of crops) {
    for (const days of [7, 30, 90]) {
      const from = windowStart(days, TODAY)
      const rows = snap.rows.filter((r) => r[0] === crop && r[2] >= from).map(([, market, price_date, modal_price]) => ({ market, price_date, modal_price }))
      const { series } = basketSeries(rows)
      if (!series.length) continue
      for (const lang of ['hi', 'en']) {
        for (const width of WIDTHS) {
          const L = layoutChart({ series, mspValue: 2585, width, days, fmtDay: fmt(lang) })
          check(L, `${crop} ${days}d ${lang} ${width}`)
          if (days === 7 && width >= 1136) assert.equal(L.labels.length, series.length, `${crop} 7d ${lang} ${width}: every dot labelled`)
          if (days === 7) assert.ok(L.labels.length >= Math.ceil(series.length / 2), `${crop} 7d ${lang} ${width}: at least every second dot`)
          charts++
        }
      }
    }
  }
  assert.ok(charts > 100)
})

test('the left gutter fits the y-axis prices (garlic ₹12,800)', () => {
  const L = layoutChart({ series: [{ date: '2026-10-01', price: 12800 }, { date: '2026-10-02', price: 6800 }], width: 300, fmtDay: (d) => d, days: 7 })
  assert.ok(L.plot.x0 >= textWidth('₹12,800', 11) + 6)
  for (const t of L.yTicks) assert.ok(t.box.x >= 0)
})
