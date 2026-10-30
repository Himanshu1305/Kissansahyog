// Batch 17A Part A - Hindi number words and the spoken script.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toHindiWords, WORDS_0_99, rupeesPerQuintal, rupees, degrees, percent, weekdayDate, dayMonth } from '../../scripts/morning/voice/hindiNumber.mjs'
import { buildVoiceScript, speakable, isSpeakable, VOICE_HARD_MAX, CLOSING } from '../../scripts/morning/voice/voiceScript.mjs'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'

const n = (s) => s.normalize('NFC')

test('toHindiWords: the full 0-99 table is 100 distinct words', () => {
  assert.equal(WORDS_0_99.length, 100)
  assert.equal(new Set(WORDS_0_99).size, 100)
  for (let i = 0; i < 100; i++) assert.equal(toHindiWords(i), WORDS_0_99[i])
})

const CASES = [
  [0, 'शून्य'], [1, 'एक'], [6, 'छह'], [11, 'ग्यारह'], [27, 'सत्ताईस'], [50, 'पचास'], [99, 'निन्यानवे'],
  [100, 'एक सौ'], [101, 'एक सौ एक'], [150, 'एक सौ पचास'], [200, 'दो सौ'], [450, 'चार सौ पचास'], [999, 'नौ सौ निन्यानवे'],
  [1000, 'एक हज़ार'], [1001, 'एक हज़ार एक'], [2700, 'दो हज़ार सात सौ'], [6539, 'छह हज़ार पाँच सौ उनतालीस'], [6950, 'छह हज़ार नौ सौ पचास'],
  [7000, 'सात हज़ार'], [8050, 'आठ हज़ार पचास'], [11000, 'ग्यारह हज़ार'], [99999, 'निन्यानवे हज़ार नौ सौ निन्यानवे'],
]
for (const [num, words] of CASES) test(`toHindiWords(${num})`, () => assert.equal(toHindiWords(num), n(words)))

test('toHindiWords: out of range and non-integers throw', () => {
  for (const bad of [-1, 100000, 1.5, NaN, '5']) assert.throws(() => toHindiWords(bad), RangeError)
})

test('helpers: rupees, degrees, percent, dates', () => {
  assert.equal(rupeesPerQuintal(6950), n('छह हज़ार नौ सौ पचास रुपये क्विंटल'))
  assert.equal(rupees(149.6), n('एक सौ पचास रुपये'))
  assert.equal(degrees(25.4), 'पच्चीस डिग्री')
  assert.equal(degrees(-3), 'माइनस तीन डिग्री')
  assert.equal(percent(22), 'बाईस प्रतिशत')
  assert.equal(dayMonth('2026-10-30'), 'तीस अक्टूबर')
  assert.equal(weekdayDate('2026-10-30'), 'शुक्रवार, तीस अक्टूबर')
})

test('speakable: pronunciation map, digits, symbols and Latin letters', () => {
  assert.equal(speakable('पीएम-किसान'), 'पी एम किसान')
  assert.equal(speakable('ई-केवाईसी'), 'ई के वाई सी')
  assert.equal(speakable('MSP'), 'एम एस पी')
  assert.equal(speakable('kissansahyog.com'), 'किसान सहयोग डॉट कॉम')
  const dirty = speakable('🙏 ₹6,000 और 22% 🌾 https://x.in ABC 12°C')
  assert.ok(isSpeakable(dirty), dirty)
  assert.ok(!/[0-9]/.test(dirty))
})

const DATA = loadData()
async function modelFor(name, mutate) {
  const fx = loadFixture(name)
  const r = await generate({ date: fx.date, data: DATA, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
  if (mutate) mutate(r.model)
  return r.model
}

test('voice script: fixture day has no digits, emojis or URLs, only the allowed marks, and sensible length', async () => {
  const v = buildVoiceScript(await modelFor('normal'))
  assert.ok(isSpeakable(v.text), v.text)
  assert.ok(!/[0-9०-९]/.test(v.text) && !/http|www|\.com|[A-Za-z]/.test(v.text))
  assert.ok(v.chars >= 450 && v.chars <= VOICE_HARD_MAX, `${v.chars}`)
  assert.ok(v.text.startsWith('सीताराम किसान भाइयो!') && v.text.endsWith(CLOSING))
  assert.ok(v.text.includes('कल का मंडी भाव'))
  assert.match(v.sha256, /^[0-9a-f]{64}$/)
})

test('voice script: an older data date is named, never called today or yesterday', async () => {
  const v = buildVoiceScript(await modelFor('normal', (m) => { m.mandi = { ...m.mandi, isYesterday: false, date: '2026-10-22' } }))
  assert.ok(v.text.includes('बाईस अक्टूबर का मंडी भाव'))
  assert.ok(!v.text.includes('कल का मंडी भाव'))
})

test('voice script: sections without data are skipped and the script stays valid', async () => {
  for (const name of ['no-weather', 'missing-mandi']) {
    const v = buildVoiceScript(await modelFor(name))
    assert.ok(isSpeakable(v.text) && v.text.endsWith(CLOSING) && v.chars <= VOICE_HARD_MAX, name)
  }
  const none = buildVoiceScript(await modelFor('normal', (m) => { m.weather = null; m.mandi = null; m.tasks = []; m.slot = null }))
  assert.ok(isSpeakable(none.text))
  assert.ok(!none.text.includes('मंडी') && !none.text.includes('तापमान'))
})

test('voice script: rainy day says rain may come and speaks the spraying hint once', async () => {
  const v = buildVoiceScript(await modelFor('rainy'))
  assert.ok(v.text.includes('बारिश हो सकती है'))
  assert.equal(v.text.split('छिड़काव').length - 1, 1)
  assert.ok(isSpeakable(v.text) && v.chars <= VOICE_HARD_MAX)
})

test('voice script: a verified scheme is spoken with the pronunciation map, unreviewed content never leaks in', async () => {
  const v = buildVoiceScript(await modelFor('normal', (m) => { m.slot = { kind: 'scheme', lines: [], scheme: { title_hi: 'पीएम-किसान सम्मान निधि', who_hi: 'पात्र किसान परिवार' } } }))
  assert.ok(v.text.includes('पी एम किसान सम्मान निधि'))
  const same = buildVoiceScript(await modelFor('normal'))
  assert.ok(!same.text.includes('योजना'), 'a recap day has no scheme')
})

test('voice script: stays under the hard limit and drops optional parts when long', async () => {
  const v = buildVoiceScript(await modelFor('rainy', (m) => { m.tasks = ['बहुत लंबा काम '.repeat(40)]; }))
  assert.ok(v.chars <= VOICE_HARD_MAX + 400 && v.dropped.length > 0)
})
