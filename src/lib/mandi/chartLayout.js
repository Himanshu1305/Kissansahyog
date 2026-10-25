// Batch 10F — geometry of the /msp trend chart (src/components/pages/TrendChart.jsx). Pure: no React,
// no DOM (tests/unit/chart-layout.test.mjs). Everything is in CSS pixels of the real chart width, so
// text is never scaled down on a phone.
//   x  — by calendar date (a skipped day leaves a visible gap the line bridges; nothing is invented)
//   y  — price; the MSP line is inside the range so it is always visible
//   ticks  — date labels on the x-axis, about every 5 days (30-day view), 15 days (90) or 1 day (7),
//            spaced further apart when they would overlap
//   labels — always-visible two-line labels (date / price) on the first, last, highest and lowest
//            point; in the 7-day view on every dot (every second dot when they do not fit); placed
//            so that no two labels, the MSP label or the axis labels overlap and all stay inside the box

export const CHART_H = 260
export const PAD = { l: 50, r: 10, t: 34, b: 56 }
const LABEL_FONT = 12
const DATE_FONT = 11
const LINE_GAP = 2
const LABEL_H = DATE_FONT + LINE_GAP + LABEL_FONT + 4 // two lines + breathing room
const TICK_FONT = 11
const DAY_MS = 86400000

// Text width estimate (px) for the app's Noto Sans / Devanagari at a given size. Generous on purpose:
// a too-wide box only costs a little space, a too-narrow one could let two labels touch.
export function textWidth(s, size) {
  let w = 0
  for (const ch of String(s)) {
    if (/[ऀ-ॿ]/.test(ch)) w += /[ा-्॑-ॗॢॣऀ-ः]/.test(ch) ? 0.18 : 0.68
    else if (/[0-9₹]/.test(ch)) w += 0.6
    else if (ch === ' ') w += 0.3
    else if (/[,.·:]/.test(ch)) w += 0.32
    else w += 0.62
  }
  return Math.ceil(w * size) + 2
}

const dayNum = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS)
const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`

const overlaps = (a, b, gap = 3) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap

/**
 * series   [{date, price, n}] ascending (already the corrected basket series)
 * width    chart width in px
 * days     7 | 30 | 90 (picks the tick spacing and the 7-day dot labels)
 * fmtDay   (iso) => short date text ("17 अक्टू")
 */
export function layoutChart({ series, mspValue = null, width, days = 30, fmtDay }) {
  const W = Math.max(240, Math.round(width || 640))
  const H = CHART_H
  const n = series?.length || 0
  if (!n) return { W, H, plot: { x0: PAD.l, x1: W - PAD.r, y0: PAD.t, y1: H - PAD.b }, points: [], ticks: [], labels: [], yTicks: [], msp: null }

  const d0 = dayNum(series[0].date)
  const d1 = dayNum(series[n - 1].date)
  const span = Math.max(1, d1 - d0)
  const xOf = (iso) => (n === 1 ? (plot.x0 + plot.x1) / 2 : plot.x0 + ((dayNum(iso) - d0) / span) * (plot.x1 - plot.x0))
  const prices = series.map((p) => p.price)
  const vals = mspValue ? [...prices, mspValue] : prices
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (hi - lo < 20) { lo -= 10; hi += 10 }
  // The left gutter fits the longest y-axis price (₹12,800 for garlic).
  const gutter = Math.max(PAD.l, textWidth(rupee(hi), TICK_FONT) + 10, textWidth(rupee(lo), TICK_FONT) + 10)
  const plot = { x0: gutter, x1: W - PAD.r, y0: PAD.t, y1: H - PAD.b }
  const yOf = (v) => plot.y0 + (1 - (v - lo) / (hi - lo)) * (plot.y1 - plot.y0)
  const points = series.map((p, i) => ({ i, date: p.date, price: p.price, n: p.n, x: xOf(p.date), y: yOf(p.price) }))

  // Obstacles every label must avoid: the y-axis labels (left gutter), the MSP label, the tick row.
  const obstacles = []
  const yTicks = [hi, lo].map((v) => {
    const text = rupee(v)
    const y = yOf(v)
    const w = textWidth(text, TICK_FONT)
    return { value: v, text, y, box: { x: plot.x0 - 6 - w, y: y - TICK_FONT / 2 - 1, w, h: TICK_FONT + 2 } }
  })
  let msp = null
  if (mspValue) {
    const text = `MSP ${rupee(mspValue)}`
    const w = textWidth(text, TICK_FONT)
    const y = yOf(mspValue)
    // Above the dashed line at the right end; below it when there is no room above.
    const above = y - TICK_FONT - 3 >= 0
    msp = { text, y, ty: above ? y - 4 : y + TICK_FONT + 2, box: { x: plot.x1 - w, y: above ? y - TICK_FONT - 4 : y + 2, w, h: TICK_FONT + 2 } }
    obstacles.push(msp.box)
  }

  // ── x ticks ───────────────────────────────────────────────────────────────────────────────
  const baseStep = days <= 7 ? 1 : days <= 30 ? 5 : 15
  const tickW = Math.max(...points.map((p) => textWidth(fmtDay(p.date), TICK_FONT))) + 8
  const pxPerDay = (plot.x1 - plot.x0) / span
  let step = baseStep
  while (n > 1 && step * pxPerDay < tickW && step < span) step += baseStep
  const ticks = []
  const tickY = H - 8
  for (let d = d0; d <= d1; d += step) {
    const iso = new Date(d * DAY_MS).toISOString().slice(0, 10)
    const text = fmtDay(iso)
    const w = textWidth(text, TICK_FONT)
    const x = n === 1 ? (plot.x0 + plot.x1) / 2 : plot.x0 + (d - d0) * pxPerDay
    const bx = Math.min(Math.max(x - w / 2, 0), W - w)
    const box = { x: bx, y: tickY - TICK_FONT, w, h: TICK_FONT + 2 }
    if (ticks.some((t) => overlaps(t.box, box, 4))) continue
    ticks.push({ iso, text, x, tx: bx + w / 2, box })
  }
  const tickRowTop = tickY - TICK_FONT - 4

  // ── point labels ──────────────────────────────────────────────────────────────────────────
  let iHi = 0
  let iLo = 0
  points.forEach((p, i) => {
    if (p.price > points[iHi].price) iHi = i
    if (p.price < points[iLo].price) iLo = i
  })
  const mandatory = []
  for (const [i, role] of [[n - 1, 'last'], [0, 'first'], [iHi, 'high'], [iLo, 'low']]) {
    const m = mandatory.find((x) => x.i === i)
    if (m) m.roles.push(role)
    else mandatory.push({ i, roles: [role] })
  }
  const extra = []
  if (days <= 7 && n > 1) {
    const labelW = Math.max(...points.map((p) => Math.max(textWidth(fmtDay(p.date), DATE_FONT), textWidth(rupee(p.price), LABEL_FONT)))) + 6
    const spacing = (plot.x1 - plot.x0) / Math.max(1, n - 1)
    const every = spacing >= labelW ? 1 : 2
    for (let i = 0; i < n; i += every) if (!mandatory.some((m) => m.i === i)) extra.push({ i, roles: ['dot'] })
  }

  const placed = []
  const inside = (b) => b.x >= 0 && b.x + b.w <= W && b.y >= 0 && b.y + b.h <= tickRowTop
  const free = (b) => inside(b) && !placed.some((l) => overlaps(l.box, b)) && !obstacles.some((o) => overlaps(o, b)) && !yTicks.some((t) => overlaps(t.box, b))
  const tryPlace = (p, want, force) => {
    const date = fmtDay(p.date)
    const price = rupee(p.price)
    const w = Math.max(textWidth(date, DATE_FONT), textWidth(price, LABEL_FONT)) + 6
    const h = LABEL_H
    // Nearest spots first: right above / below the point, then one and two label-heights further
      // (a thin leader line joins a label to its point), each with five horizontal positions.
    const vert = want === 'below' ? ['below', 'above'] : ['above', 'below']
    const xs = [p.x - w / 2, p.x - w + 8, p.x - 8, p.x - w - 6, p.x + 6]
    const spots = []
    for (let level = 0; level < 3; level++) for (const v of vert) spots.push(v === 'above' ? p.y - h - 6 - level * (h + 3) : p.y + 7 + level * (h + 3))
    let best = null
    for (const y of spots) {
      for (const x0 of xs) {
        const x = Math.min(Math.max(x0, plot.x0 - 2), plot.x1 - w + 2)
        const box = { x, y, w, h }
        if (free(box)) return { box, date, price }
        if (force) {
          const cost = (inside(box) ? 0 : 1000) + placed.filter((l) => overlaps(l.box, box)).length * 10 + obstacles.filter((o) => overlaps(o, box)).length
          if (!best || cost < best.cost) best = { cost, box, date, price }
        }
      }
    }
    return force ? best : null
  }
  const labels = []
  for (const m of mandatory) {
    const p = points[m.i]
    const want = m.roles.includes('low') && !m.roles.includes('high') ? 'below' : 'above'
    const got = tryPlace(p, want, true)
    placed.push(got)
    labels.push({ i: m.i, roles: m.roles, ...got, px: p.x, py: p.y })
  }
  for (const m of extra) {
    const p = points[m.i]
    const got = tryPlace(p, 'above', false)
    if (!got) continue
    placed.push(got)
    labels.push({ i: m.i, roles: m.roles, ...got, px: p.x, py: p.y })
  }
  labels.sort((a, b) => a.i - b.i)
  return { W, H, plot, points, ticks, labels, yTicks, msp, iHi, iLo, step }
}

export const LABEL_METRICS = { LABEL_FONT, DATE_FONT, LINE_GAP, LABEL_H, TICK_FONT }
