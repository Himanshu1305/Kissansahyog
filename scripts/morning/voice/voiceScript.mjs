// Batch 17A - the spoken Hindi script, built from the SAME model the written message uses (same data-date rules, same
// reviewed/verified gates). Deterministic, no AI. Output is plain Devanagari words with only । , ! ? as marks.
import { createHash } from 'node:crypto'
import { S } from '../strings.hi.js'
import { weatherPhrase } from '../lib/weatherLine.js'
import { toHindiWords, rupeesPerQuintal, rupees, degrees, percent, dayMonth, weekdayDate } from './hindiNumber.mjs'

export const VOICE_TARGET = [450, 750]
export const VOICE_HARD_MAX = 900

const LETTERS = { A: 'ए', B: 'बी', C: 'सी', D: 'डी', E: 'ई', F: 'एफ', G: 'जी', H: 'एच', I: 'आई', J: 'जे', K: 'के', L: 'एल', M: 'एम', N: 'एन', O: 'ओ', P: 'पी', Q: 'क्यू', R: 'आर', S: 'एस', T: 'टी', U: 'यू', V: 'वी', W: 'डब्ल्यू', X: 'एक्स', Y: 'वाई', Z: 'ज़ेड' }
// longest first; applied before the generic clean-up
const PRONOUNCE = [
  ['kissansahyog.com', 'किसान सहयोग डॉट कॉम'],
  ['पीएम-किसान', 'पी एम किसान'],
  ['ई-केवाईसी', 'ई के वाई सी'],
  ['MSP', 'एम एस पी'],
  ['KVK', 'के वी के'],
]

function safeWords(d) {
  const n = Number(String(d).replace(/,/g, ''))
  return Number.isInteger(n) && n >= 0 && n <= 99999 ? toHindiWords(n) : ' '
}

// Anything left that a voice would misread: digits, symbols, Latin letters, emojis. Never throws.
export function speakable(text) {
  let t = String(text ?? '').normalize('NFC')
  for (const [from, to] of PRONOUNCE) t = t.split(from).join(to)
  t = t.replace(/₹\s*(\d[\d,]*)/g, (_, d) => ` ${safeWords(d)} रुपये `)
    .replace(/(\d[\d,]*)\s*%/g, (_, d) => ` ${safeWords(d)} प्रतिशत `)
    .replace(/\d[\d,]*/g, (d) => ` ${safeWords(d)} `)
    .replace(/[A-Za-z]/g, (c) => ` ${LETTERS[c.toUpperCase()]} `)
    .replace(/[‌‍]/g, '')
    .replace(/[^ऀ-ॣ।\s,!?]/g, ' ')   // keeps Devanagari letters and marks, danda, space, comma, ! ?
    .replace(/\s+([।,!?])/g, '$1')
    .replace(/\s+/g, ' ')
  return t.trim()
}

// Batch 17B: the weather sentence comes from the same one-sentence builder as the card and the message (style 'voice').
function weatherSentences(model) {
  const w = model.weather
  if (!w || !model.verdict) return { text: [], usedTask: null }
  const d = w.days[0]
  const phrase = weatherPhrase(model.verdict, d.code, 'voice')
  const out = [`${phrase.text}। दिन में तापमान ${degrees(d.tmax)} तक जाएगा।`]
  const hint = (model.tasks || []).find((t) => t.includes('छिड़काव'))
  if (hint) out.push(`${hint}।`)
  return { text: out, usedTask: hint || null }
}

function mandiSentences(m, crops) {
  if (!m || !m.shown.length || !crops) return []
  const head = m.isYesterday ? 'अब कल का मंडी भाव सुनिए।' : `अब ${dayMonth(m.date)} का मंडी भाव सुनिए।`
  // three different sentence shapes, so the endings and connectors do not repeat
  const SHAPES = [
    (n, p, d, up) => `सबसे पहले ${n}, भाव ${p} रहा${d ? `, जो ${d} ${up ? 'ऊपर' : 'नीचे'} है` : ''}`,
    (n, p, d, up) => `${n} की बात करें तो भाव ${p} है${d ? `, यानी ${d} की ${up ? 'तेज़ी' : 'गिरावट'}` : ''}`,
    (n, p, d, up) => `और ${n} का भाव ${p} दर्ज हुआ${d ? `, ${d} की ${up ? 'बढ़त' : 'कमी'} के साथ` : ''}`,
  ]
  const lines = m.shown.slice(0, crops).map((it, i) => `${SHAPES[i % 3](it.name, rupeesPerQuintal(it.price), it.delta ? rupees(Math.abs(it.delta)) : '', it.delta > 0)}।`)
  return [head, ...lines]
}

// ONE item: a scheme (only when the rotating slot is a reviewed/verified scheme) or the first work task not already spoken.
function itemSentence(model, usedTask) {
  const slot = model.slot
  if (slot && slot.kind === 'scheme' && slot.scheme) return `आज की योजना है ${slot.scheme.title_hi}, ${slot.scheme.who_hi}।`
  const task = (model.tasks || []).find((t) => t !== usedTask)
  return task ? `आज के लिए एक ज़रूरी बात, ${task}।` : null
}

export const CLOSING = 'पूरी जानकारी, किसान सहयोग डॉट कॉम पर। जय किसान!'

// -> { text, chars, dropped: [string], sha256 }
export function buildVoiceScript(model) {
  const wx = weatherSentences(model)
  const item = itemSentence(model, wx.usedTask)
  const build = (o) => {
    const parts = [`सीताराम किसान भाइयो! आज ${weekdayDate(model.date)} है।`]
    parts.push(...wx.text.slice(0, o.hint ? 2 : 1))
    parts.push(...mandiSentences(model.mandi, o.crops))
    if (o.item && item) parts.push(item)
    parts.push(CLOSING)
    return speakable(parts.join(' '))
  }
  const opts = { hint: true, crops: 3, item: true }
  const dropped = []
  let text = build(opts)
  const steps = [['crop3', () => { opts.crops = 2 }], ['hint', () => { opts.hint = false }], ['item', () => { opts.item = false }], ['crop2', () => { opts.crops = 1 }]]
  for (const [step, apply] of steps) {
    if (text.length <= VOICE_TARGET[1]) break
    apply(); dropped.push(step); text = build(opts)
  }
  return { text, chars: text.length, dropped, sha256: createHash('sha256').update(text, 'utf8').digest('hex') }
}

export const SPOKEN_OK = /^[ऀ-ॣ।\s,!?]+$/
export const isSpeakable = (t) => SPOKEN_OK.test(t)
