// Batch 17A - the spoken Hindi script, built from the SAME model the written message uses (same data-date rules, same
// reviewed/verified gates). Deterministic, no AI. Output is plain Devanagari words with only । , ! ? as marks.
import { createHash } from 'node:crypto'
import { S } from '../strings.hi.js'
import { weatherPhrase } from '../lib/weatherLine.js'
import { levelIndex } from '../../../src/lib/weather/rainVerdict.js'
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

// Batch 18 (P3): ONE sentence about the districts, or null. Names only the districts with light rain or more today or tomorrow (up to three, then "और अन्य ज़िलों");
// if there is none, a "no rain today anywhere" sentence ONLY when all six districts are available. Unavailable districts are never mentioned.
export function districtSentence(districts) {
  if (!Array.isArray(districts) || !districts.length) return null
  const wet = districts.filter((d) => d.available && (levelIndex(d.today.level) >= 2 || levelIndex(d.tomorrow || 'dry') >= 2))
  if (wet.length) {
    const names = wet.slice(0, 3).map((d) => d.nameHi)
    const list = wet.length > 3 ? `${names.join(', ')}${S.voiceDistrictAnd}${S.voiceDistrictOthers}` : names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')}${S.voiceDistrictAnd}${names.at(-1)}`
    return `${S.voiceDistrictRain.replace('{names}', list)}।`
  }
  return districts.every((d) => d.available) ? `${S.voiceDistrictDry}।` : null
}
export const DISTRICT_VOICE_MAX_GROWTH = 0.12 // the district sentence may make the script at most 12 percent longer
export const DISTRICT_VOICE_MAX_CHARS = 765   // ... and never above this: at a conservative 17 characters a second that is 45 seconds (the 17E video follows the voice length)

// -> { text, chars, dropped: [string], sha256 }
export function buildVoiceScript(model) {
  const wx = weatherSentences(model)
  const item = itemSentence(model, wx.usedTask)
  const dist = districtSentence(model.districts)
  const build = (o) => {
    const parts = [`सीताराम किसान भाइयो! आज ${weekdayDate(model.date)} है।`]
    parts.push(...wx.text.slice(0, o.hint ? 2 : 1))
    if (o.dist && dist) parts.push(dist)
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
  // the district sentence is tried LAST on the finished (old) script and kept only if the script stays within +12 percent and the hard maximum; otherwise left out
  let districtAdded = false
  if (dist) {
    const withDist = build({ ...opts, dist: true })
    if (withDist.length <= text.length * (1 + DISTRICT_VOICE_MAX_GROWTH) && withDist.length <= DISTRICT_VOICE_MAX_CHARS) { text = withDist; districtAdded = true }
  }
  return { text, chars: text.length, dropped, districtAdded, sha256: createHash('sha256').update(text, 'utf8').digest('hex') }
}

export const SPOKEN_OK = /^[ऀ-ॣ।\s,!?]+$/
export const isSpeakable = (t) => SPOKEN_OK.test(t)
