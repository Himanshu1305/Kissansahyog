// Batch 17B follow-up - the reproduction of the founder's 30 Oct card, written so that the SAME file runs on release-17a (old code) and
// release-17b (new code): it only uses what both have (generate, loadData, cardData, buildVoiceScript) and only relative imports.
// F2 = daily chance 80%, day total 1 mm, weather code 80 (rain shower). On 17a these tests FAIL (that is the proof they catch the bug).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { makeRows } from '../../scripts/morning/fixtures.js'
import { cardData } from '../../scripts/morning/card/render.mjs'
import { buildVoiceScript } from '../../scripts/morning/voice/voiceScript.mjs'
import { assertNoRepeats } from './helpers/repeatedWords.mjs'

const DATE = '2026-10-30'
const day = (date, o) => ({ date, tmin: 18, tmax: 31, rainProb: 10, rainMm: 0, windMax: 9, code: 2, ...o })
const F2 = { provider: 'f2', days: [day('2026-10-30', { rainProb: 80, rainMm: 1, code: 80 }), day('2026-10-31', {}), day('2026-11-01', {})] }
async function f2() {
  return generate({ date: DATE, data: loadData(), nowIso: '2026-10-30T10:30:00Z', loaders: { weather: async () => F2, mandi: async () => ({ rows: makeRows(DATE), flag: 'fixture' }) } })
}

test('F2 message: the weather line shows no rain percentage for about 1 mm of rain', async () => {
  const res = await f2()
  const line = res.message.split('\n').find((l) => l.includes('आज सागर')) || ''
  assert.ok(line, 'weather line exists')
  assert.ok(!/\d+\s*%/.test(line), `percentage in: ${line}`)
})
test('F2 message: no "postpone spraying" task for 1 mm of rain', async () => {
  const res = await f2()
  assert.ok(!/छिड़काव/.test(res.message), 'a spraying task is in the message')
})
test('F2 repeated-word guard: message has no repeated word', async () => {
  assertNoRepeats(assert, (await f2()).message, 'F2 message')
})
test('F2 repeated-word guard: card weather lines have no repeated word (the founder saw "हल्की बारिश, बारिश हो सकती है")', async () => {
  const card = cardData((await f2()).model)
  assertNoRepeats(assert, card.weather.line1, 'F2 card line1')
  assertNoRepeats(assert, card.weather.line2, 'F2 card line2')
})
test('F2 card: no "postpone spraying" anywhere on the card', async () => {
  const card = cardData((await f2()).model)
  const all = [card.weather.line1, card.weather.line2, card.scheme && card.scheme.body, card.tip && card.tip.body].filter(Boolean).join(' | ')
  assert.ok(!/छिड़काव/.test(all), all)
})
test('F2 repeated-word guard: voice script has no repeated word, and says no chance in percent', async () => {
  const v = buildVoiceScript((await f2()).model)
  assertNoRepeats(assert, v.text, 'F2 voice')
  assert.ok(!/प्रतिशत/.test(v.text), 'a rain percentage is spoken')
})
