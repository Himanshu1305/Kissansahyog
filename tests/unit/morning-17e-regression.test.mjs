// Batch 17E - nothing else changed: the six sample messages (F1-F6), the voice scripts and one sample card are byte-for-byte the same as before.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'
import { buildVoiceScript } from '../../scripts/morning/voice/voiceScript.mjs'
import { cardData, renderCard } from '../../scripts/morning/card/render.mjs'

const DATA = loadData()
const file = (p) => readFileSync(new URL(`../../${p}`, import.meta.url))
const text = (p) => file(p).toString('utf8').replace(/\r\n/g, '\n')
const SAMPLES = [['rain-f1', 'f1-dry'], ['rain-f2', 'f2-real-30oct'], ['rain-f3', 'f3-rain-soon'], ['rain-f4', 'f4-heavy'], ['rain-f5', 'f5'], ['rain-f6', 'f6']]
const make = async (fixture) => {
  const fx = loadFixture(fixture)
  return generate({ date: fx.date, data: DATA, nowIso: fx.nowIso, loaders: { weather: fx.weatherLoader, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
}

for (const [fixture, label] of SAMPLES) {
  test(`17E regression ${label}: message identical to the 17D evidence, voice script identical to the 17B evidence`, async () => {
    const res = await make(fixture)
    assert.equal(res.message, text(`docs/review/batch17d/evidence/message-after-${label}.txt`), `${label} message`)
    assert.equal(`${buildVoiceScript(res.model).text}\n`, text(`docs/review/batch17b/evidence/voice-script-${label}.txt`), `${label} voice script`)
  })
}

test('17E regression: the sample card F1 is byte-for-byte the 17B card', async () => {
  const res = await make('rain-f1')
  const r = await renderCard(cardData(res.model))
  assert.equal(Buffer.compare(r.png, file('docs/review/batch17b/evidence/card-f1-dry.png')), 0)
})
