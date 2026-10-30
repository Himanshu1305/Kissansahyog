// Renders the 1080x1350 PNG card with Playwright from card/template.html and the bundled Noto Sans Devanagari (OFL).
// Batch 17A: the look of docs/review/batch17a/reference (green header, weather box with 3 day boxes, mandi box with up to 5 rows,
// one scheme/task box, one tip box, dark footer). All data comes from the same model the written message uses.
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { S, fmt } from '../strings.hi.js'
import { skyGroup } from '../lib/weather.js'

const here = new URL('.', import.meta.url)
const font = (f) => readFileSync(new URL(`fonts/${f}`, here)).toString('base64')
// Devanagari faces for everything, then the latin faces on top for digits, rupee sign, arrows and punctuation (the
// Devanagari-only file draws digits wide and spaced).
const LAT = 'U+0000-00FF,U+20A8-20B9,U+2190-21FF,U+25B2,U+25BC,U+2000-206F'
const face = (file, weight, range) => `@font-face{font-family:'KSDev';font-weight:${weight};src:url(data:font/woff2;base64,${font(file)}) format('woff2');${range ? `unicode-range:${range};` : ''}}`
const WEIGHTS = [400, 600, 700, 800]
const FONTS = [
  ...WEIGHTS.map((w) => face(`noto-sans-devanagari-devanagari-${w}-normal.woff2`, w)),
  ...WEIGHTS.map((w) => face(`noto-sans-devanagari-latin-${w}-normal.woff2`, w, LAT)),
].join('\n')

export const MAX_ROWS = 5
const SKY_EMOJI = { clear: '☀️', fewClouds: '🌤️', cloudy: '☁️', fog: '🌫️', lightRain: '🌦️', rain: '🌧️', heavyRain: '🌧️', storm: '⛈️' }
const rupees = (n) => Math.round(Number(n)).toLocaleString('en-IN')
const dm = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`
const dayOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay()

function weatherBox(w, tasks) {
  if (!w) return null
  const d = w.days[0]
  const p = Math.round(d.rainProb ?? 0)
  const rain = fmt(p >= 50 || (d.rainMm ?? 0) >= 5 ? S.cardRainLikely : p < 30 ? S.cardRainNone : S.cardRainMaybe, { rain: p })
  const hint = (tasks || []).find((t) => t.includes('छिड़काव'))
  const group = skyGroup(d.code)
  return {
    title: `${SKY_EMOJI[group] || '☁️'} ${S.cardWeatherTitle}`,
    max: `${Math.round(d.tmax)}°`, min: `/${Math.round(d.tmin)}°`,
    line1: `${S.sky[group]}, ${rain}`,
    line2: [d.windMax != null ? fmt(S.cardWind, { wind: Math.round(d.windMax) }) : '', hint || ''].filter(Boolean).join(' · '),
    days: w.days.slice(0, 3).map((x, i) => ({ name: i === 0 ? S.cardToday : S.weekdaysShort[dayOf(x.date)], range: `${Math.round(x.tmax)}° / ${Math.round(x.tmin)}°`, rain: fmt(S.cardDayRain, { mm: Math.round(x.rainMm ?? 0) }) })),
  }
}

// the scheme/task box and the tip box: only reviewed/verified content the message could use (the model's slot and tasks)
function infoBoxes(model) {
  const slot = model.slot
  const tasks = model.tasks || []
  let scheme = null, tip = null, usedTask = null
  if (slot && slot.kind === 'scheme' && slot.scheme) scheme = { icon: '🏛️', title: fmt(S.cardSchemeTitle, { title: slot.scheme.title_hi }), body: slot.scheme.who_hi }
  else if (slot && slot.kind === 'countdown') scheme = { icon: '⏳', title: S.cardTaskTitle, body: slot.lines[0].replace(/\*/g, '').replace(/^⏳\s*/, '') }
  else if (tasks.length) { usedTask = tasks[0]; scheme = { icon: '🌾', title: S.cardTaskTitle, body: tasks[0] } }
  if (slot && ['saving', 'gyaan', 'kahawat'].includes(slot.kind)) tip = { icon: '🌱', title: S.cardTipTitle, body: slot.lines[1] }
  else { const next = tasks.find((t) => t !== usedTask && t !== scheme?.body); if (next) tip = { icon: '🌱', title: S.cardTipTitle, body: next } }
  return { scheme, tip }
}

// model = the compose model (see run.mjs); only sections with data are included, the layout stays complete without them.
export function cardData(model) {
  const m = model.mandi
  const prices = (m && m.shown.length ? [...m.shown, ...(m.extra || [])].slice(0, MAX_ROWS) : []).map((it) => {
    const dir = it.delta == null || it.delta === 0 ? 'flat' : it.delta > 0 ? 'up' : 'down'
    const arrow = dir === 'up' ? S.mandiArrowUp : dir === 'down' ? S.mandiArrowDown : ''
    return {
      name: it.name, market: it.best ? fmt(S.cardBestMandi, { market: it.best.market }) : '', price: `₹${rupees(it.price)}`, dir,
      change: dir === 'flat' ? '—' : `${arrow}${rupees(Math.abs(it.delta))}`,
    }
  })
  const label = m && !m.isYesterday ? fmt(S.cardOldNote, { date: `${Number(m.date.slice(8))} ${S.months[Number(m.date.slice(5, 7)) - 1]}` }) : ''
  const { scheme, tip } = infoBoxes(model)
  const d = new Date(`${model.date}T00:00:00Z`)
  return {
    brand: S.cardBrand,
    greeting: `🙏 ${S.cardGreeting}`,
    dateText: fmt(S.cardSub, { day: S.weekdays[d.getUTCDay()], d: d.getUTCDate(), m: S.months[d.getUTCMonth()] }),
    weather: weatherBox(model.weather, model.tasks),
    priceTitle: `📊 ${fmt(S.cardPriceTitle, { unit: S.cardUnit, date: m ? dm(m.date) : '' })}`,
    prices,
    priceNote: label,
    scheme, tip,
    noData: S.cardNoData,
    footer: S.cardFooter,
  }
}

export async function renderHtml(data) {
  const tpl = readFileSync(new URL('template.html', here), 'utf8')
  return tpl.replace('/*FONTS*/', () => FONTS).replace('/*DATA*/null', () => JSON.stringify(data))
}

// -> { png: Buffer, overflow: [string] } ; `overflow` lists any box whose content is wider/taller than the box, and any
// content that reaches the footer (last box bottom measured against the footer top).
export async function renderCard(data, { browser } = {}) {
  const own = !browser
  const b = browser || await chromium.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
    await page.setContent(await renderHtml(data), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.fit && window.fit())
    const overflow = await page.evaluate(() => {
      const out = [...document.querySelectorAll('.box')]
        .filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
        .map((e) => `${e.className}: ${e.textContent.slice(0, 30)}`)
      const foot = document.getElementById('foot').getBoundingClientRect()
      const secs = [...document.querySelectorAll('.sec')]
      const last = secs.length ? secs[secs.length - 1].getBoundingClientRect().bottom : 0
      if (foot.bottom > 1350 + 1) out.push(`footer pushed below the card (${Math.round(foot.bottom)})`)
      if (last > foot.top - 8) out.push(`content reaches the footer (last box bottom ${Math.round(last)}, footer top ${Math.round(foot.top)})`)
      return out
    })
    let png = await page.screenshot({ type: 'png' })
    await page.close()
    if (png.length > 500 * 1024) {
      try { const sharp = (await import('sharp')).default; png = await sharp(png).png({ palette: true, quality: 85, compressionLevel: 9 }).toBuffer() } catch { /* keep the original */ }
    }
    return { png, overflow }
  } finally { if (own) await b.close() }
}
