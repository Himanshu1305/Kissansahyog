// Builds message.txt from a model of already-computed facts, applies the size caps and the lint.
import { S, fmt } from '../strings.hi.js'
import { strings } from '../../../src/lib/i18n/strings.js'
import { mspFor, procurementFor, seasonShort } from './msp.js'
import { trendHeadline } from './mandi.js'
import { weatherPhrase, dayPhrase } from './weatherLine.js'
import { LIGHT_MIN_MM } from '../../../src/lib/weather/rainVerdict.js'
import { BANNED, BANNED_EN, RE_JI } from './lintWords.js'

// The KVK Sagar number is the site's own constant (src/lib/i18n/strings.js res_card_offices_1); never retyped here.
export const KVK_PHONE = (strings.res_card_offices_1.hi.match(/\d{5}-\d{6}/) || [''])[0]

export const TARGET_CHARS = 1200
export const HARD_CHARS = 1500

const epochDays = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000)
const dateLabel = (iso) => fmt(S.dataDateLabel, { d: Number(iso.slice(8)), m: S.months[Number(iso.slice(5, 7)) - 1] })
const rupees = (n) => Math.round(Number(n)).toLocaleString('en-IN')

export function tithiLine(t) {
  if (!t) return null
  if (t.n === 15) return S.tithiPoornima
  if (t.n === 30) return S.tithiAmavasya
  const vars = { paksha: t.paksha === 'shukla' ? S.pakshaShukla : S.pakshaKrishna, tithi: S.tithiNames[t.idx] }
  return fmt(t.idx === 10 ? S.tithiBold : S.tithi, vars)
}

export function pickBlessing(lines, date, draft) {
  const ok = (lines || []).filter((l) => l.reviewed === true || draft)
  return ok.length ? ok[epochDays(date) % ok.length] : null
}

function mandiLines(model, opts) {
  const m = model.mandi
  if (!m || !m.shown.length) return { text: S.mandiNone, msp: [], belowAny: false }
  const header = m.isYesterday ? S.mandiHeader : fmt(S.mandiHeaderOld, { date: dateLabel(m.date) })
  const shown = m.shown.slice(0, opts.crops)
  const out = [header]
  shown.forEach((it, i) => {
    const arrow = it.delta == null ? '' : it.delta > 0 ? S.mandiArrowUp : it.delta < 0 ? S.mandiArrowDown : S.mandiArrowFlat
    const delta = it.delta == null || it.delta === 0 ? '' : `₹${rupees(Math.abs(it.delta))}`
    out.push(fmt(S.mandiLine, { crop: it.name, price: rupees(it.price), arrow, delta }).replace(/ +$/, ''))
    if (i === 0 && it.best) out.push(fmt(S.mandiBest, { market: it.best.market, price: rupees(it.best.price) }))
  })
  const msp = []
  let belowAny = false, procLines = []
  for (const it of shown) {
    const ref = mspFor(it.crop.mandi_en, it.crop.season, m.date, model.mspEntries)
    if (!ref) continue
    const gap = it.price - ref.msp
    if (gap < 0) {
      belowAny = true
      const w = procurementFor(it.crop.mandi_en, m.date, model.procurement)
      if (w) procLines.push(fmt(S.procurementActive, { details: w.details_hi || fmt(S.procurementUntil, { crop: it.name, date: dateLabel(w.end) }) }))
    }
    msp.push(fmt(gap < 0 ? S.mspBelow : gap > 0 ? S.mspAbove : S.mspAt, { crop: it.name, season: seasonShort(ref.label), gap: rupees(Math.abs(gap)) }))
  }
  out.push(...msp)
  if (procLines.length) out.push(...procLines)
  else if (belowAny) out.push(fmt(S.procurementAsk, { phone: KVK_PHONE }))
  return { text: out.join('\n'), msp, belowAny }
}

function rujhanBlock(model) {
  const m = model.mandi
  if (!m || !m.shown.length) return null
  const top = trendHeadline(m.shown)
  if (!top) return null
  const key = top.direction === 'up' ? S.rujhanUp : top.direction === 'down' ? S.rujhanDown : S.rujhanMixed
  const lines = [S.rujhanHeader, fmt(key, { crop: top.item.name })]
  const v = model.verdict
  if (v) {
    // Batch 17B: only an expected AMOUNT of rain is mentioned, never a bare chance (%)
    const mm = Math.max(v.days[1]?.mm ?? 0, v.days[2]?.mm ?? 0)
    if (mm >= LIGHT_MIN_MM) lines.push(fmt(S.rujhanWeather, { mm: Math.max(1, Math.round(mm)) }))
  }
  lines.push(S.rujhanDisclaimer)
  return lines.join('\n')
}

export function render(model, opts) {
  const blocks = []
  const head = [S.greeting]
  const tl = tithiLine(model.tithi)
  if (tl) head.push(tl)
  if (model.festival) head.push(fmt(S.festival, { name: model.festival.name_hi }))
  if (model.blessing) head.push(model.blessing.text_hi)
  if (model.pollYesterday) head.push(model.pollYesterday.label ? fmt(S.pollYesterday, { pct: model.pollYesterday.pct, answer: model.pollYesterday.label }) : fmt(S.pollYesterdayShort, { pct: model.pollYesterday.pct }))
  blocks.push(head.join('\n'))

  const w = model.weather
  if (w && model.verdict) {
    const d0 = w.days[0]
    const lines = [fmt(S.weatherToday, { tmin: Math.round(d0.tmin), tmax: Math.round(d0.tmax), wx: weatherPhrase(model.verdict, d0.code).text })]
    if (opts.weatherNext && w.days[1] && w.days[2]) {
      const f = (d, i) => fmt(S.weatherDay, { tmin: Math.round(d.tmin), tmax: Math.round(d.tmax), wx: dayPhrase(model.verdict.days[i]).text })
      lines.push(fmt(S.weatherNext, { a: f(w.days[1], 1), b: f(w.days[2], 2) }))
    }
    blocks.push(lines.join('\n'))
  }
  const tasks = (model.tasks || []).slice(0, opts.tasks)
  if (tasks.length) blocks.push([S.workHeader, ...tasks.map((t, i) => fmt(S.workItem, { n: i + 1, text: t }))].join('\n'))

  blocks.push(mandiLines(model, opts).text)
  if (opts.rujhan) { const r = rujhanBlock(model); if (r) blocks.push(r) }
  if (opts.slot && model.slot) blocks.push(model.slot.lines.join('\n'))
  blocks.push([S.closing1, S.closing2].join('\n'))
  return blocks.join('\n\n')
}

// Drop order when over the hard limit: rotating slot, next-two-days weather line, bhav ka rujhan, third task, fourth crop.
export const DROP_STEPS = ['slot', 'weatherNext', 'rujhan', 'task3', 'crop4']
export function compose(model) {
  const opts = { slot: true, weatherNext: true, rujhan: true, tasks: 3, crops: 4 }
  const dropped = []
  let text = render(model, opts)
  for (const step of DROP_STEPS) {
    if (text.length <= HARD_CHARS) break
    if (step === 'slot') opts.slot = false
    else if (step === 'weatherNext') opts.weatherNext = false
    else if (step === 'rujhan') opts.rujhan = false
    else if (step === 'task3') opts.tasks = 2
    else if (step === 'crop4') opts.crops = 3
    dropped.push(step)
    text = render(model, opts)
  }
  return { text, chars: text.length, dropped, opts, overTarget: text.length > TARGET_CHARS, overHard: text.length > HARD_CHARS }
}

// ---- lint (section 6). Returns the list of violations; the CLI and the tests fail on any.
const DISCLAIMER = S.rujhanDisclaimer
export function lint(text) {
  const bad = []
  const t = text.split(DISCLAIMER).join('') // the fixed disclaimer is explicitly allowed
  for (const w of BANNED) if (t.includes(w)) bad.push(`banned phrase: ${w}`)
  for (const r of BANNED_EN) if (r.test(t)) bad.push(`banned phrase: ${r}`)
  if (RE_JI.test(t)) bad.push('standalone ji')
  const first = text.split('\n')[0]
  if (first !== S.greeting) bad.push('greeting is not the exact required text')
  if (/\b0?\d{10}\b|\b[6-9]\d{9}\b/.test(text.replace(KVK_PHONE, ''))) bad.push('phone number other than the KVK constant')
  if (text.length > HARD_CHARS) bad.push(`over hard limit (${text.length} > ${HARD_CHARS})`)
  return bad
}
