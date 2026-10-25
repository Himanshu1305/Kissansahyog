// Renders the 1080x1350 PNG card with Playwright from card/template.html and the bundled Noto Sans Devanagari (OFL).
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { S, fmt } from '../strings.hi.js'
import { skyGroup } from '../lib/weather.js'
import { KVK_PHONE } from '../lib/compose.js'
import { tithiLine } from '../lib/compose.js'

const here = new URL('.', import.meta.url)
const font = (f) => readFileSync(new URL(`fonts/${f}`, here)).toString('base64')
const DEV = 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF'
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const face = (file, weight, range) => `@font-face{font-family:'KSDev';font-weight:${weight};src:url(data:font/woff2;base64,${font(file)}) format('woff2');unicode-range:${range};}`
const FONTS = [
  face('noto-sans-devanagari-devanagari-400-normal.woff2', 400, DEV), face('noto-sans-devanagari-devanagari-700-normal.woff2', 700, DEV),
  face('noto-sans-devanagari-latin-400-normal.woff2', 400, LAT), face('noto-sans-devanagari-latin-700-normal.woff2', 700, LAT),
].join('\n')

const rupees = (n) => Math.round(Number(n)).toLocaleString('en-IN')
const dateText = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${S.weekdays[d.getUTCDay()]}, ${d.getUTCDate()} ${S.months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// model = the compose model (see run.mjs); only sections with data are included, the layout stays complete without them.
export function cardData(model) {
  const w = model.weather
  const m = model.mandi
  const prices = (m && m.shown.length ? m.shown.slice(0, 4) : []).map((it) => {
    const dir = it.delta == null || it.delta === 0 ? 'flat' : it.delta > 0 ? 'up' : 'down'
    const arrow = dir === 'up' ? S.mandiArrowUp : dir === 'down' ? S.mandiArrowDown : S.mandiArrowFlat
    return { name: it.name, price: `₹${rupees(it.price)}`, dir, change: it.delta == null ? '' : it.delta === 0 ? arrow : `${arrow} ₹${rupees(Math.abs(it.delta))}` }
  })
  const label = m && !m.isYesterday ? fmt(S.cardOldNote, { date: `${Number(m.date.slice(8))} ${S.months[Number(m.date.slice(5, 7)) - 1]}` }) : ''
  return {
    brand: S.cardBrand,
    dateText: dateText(model.date),
    tithiText: tithiLine(model.tithi)?.replace(/\*/g, '') || '',
    weather: w ? {
      title: S.cardWeatherTitle,
      temps: `${Math.round(w.days[0].tmin)}–${Math.round(w.days[0].tmax)}°C`,
      sky: S.sky[skyGroup(w.days[0].code)],
      rain: fmt(S.cardRain, { rain: Math.round(w.days[0].rainProb ?? 0) }),
    } : null,
    priceTitle: fmt(S.cardPriceTitle, { unit: S.cardUnit }),
    prices,
    priceNote: label,
    noData: S.cardNoData,
    footer: fmt(S.cardFooter, { phone: KVK_PHONE }),
  }
}

export async function renderHtml(data) {
  const tpl = readFileSync(new URL('template.html', here), 'utf8')
  return tpl.replace('/*FONTS*/', FONTS).replace('/*DATA*/null', JSON.stringify(data))
}

// -> { png: Buffer, overflow: [string] } ; `overflow` lists any .box element whose content is wider/taller than the box.
export async function renderCard(data, { browser } = {}) {
  const own = !browser
  const b = browser || await chromium.launch()
  try {
    const page = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
    await page.setContent(await renderHtml(data), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const overflow = await page.evaluate(() => [...document.querySelectorAll('.box')]
      .filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
      .map((e) => `${e.className}: ${e.textContent.slice(0, 30)}`))
    const bodyBottom = await page.evaluate(() => { const r = document.getElementById('foot').getBoundingClientRect(); return r.bottom })
    if (bodyBottom > 1350 + 1) overflow.push(`footer pushed below the card (${Math.round(bodyBottom)})`)
    const body = await page.evaluate(() => { const e = document.getElementById('body'); return e.scrollHeight > e.clientHeight + 1 })
    if (body) overflow.push('body content taller than its area')
    let png = await page.screenshot({ type: 'png' })
    await page.close()
    if (png.length > 500 * 1024) {
      try { const sharp = (await import('sharp')).default; png = await sharp(png).png({ palette: true, quality: 85, compressionLevel: 9 }).toBuffer() } catch { /* keep the original */ }
    }
    return { png, overflow }
  } finally { if (own) await b.close() }
}
