// Batch 18 Part 5 (P3) - ONE spoken district sentence: rules, +12 percent cap, old script unchanged without it, speakable, no link spoken.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildVoiceScript, districtSentence, isSpeakable, DISTRICT_VOICE_MAX_CHARS } from '../../scripts/morning/voice/voiceScript.mjs'
import { S } from '../../scripts/morning/strings.hi.js'
import { DISTRICTS } from '../../scripts/morning/lib/districts.js'
import { run } from './helpers/morning18.mjs'

const mk = (levels, avail = []) => DISTRICTS.map((d, i) => ({ id: d.id, nameHi: S.districtNames[d.id], available: !avail.includes(i), today: { level: levels[i]?.[0] || 'dry' }, tomorrow: levels[i]?.[1] || 'dry' }))

test('rule: names only districts with light rain or more today or tomorrow', () => {
  assert.equal(districtSentence(mk([[], [], ['light'], [], [null, 'moderate']])), 'आज या कल पन्ना और छतरपुर में बारिश हो सकती है।')
  assert.equal(districtSentence(mk([['heavy']])), 'आज या कल सागर में बारिश हो सकती है।')
  assert.equal(districtSentence(mk([[], [], [], ['drizzle', 'drizzle']])), S.voiceDistrictDry + '।') // drizzle does not count
})
test('rule: up to three names, then "और अन्य ज़िलों"', () => {
  assert.equal(districtSentence(mk([['light'], ['light'], ['light']])), 'आज या कल सागर, दमोह और पन्ना में बारिश हो सकती है।')
  const four = districtSentence(mk([['light'], ['light'], ['light'], ['light']]))
  assert.equal(four, 'आज या कल सागर, दमोह, पन्ना और अन्य ज़िलों में बारिश हो सकती है।')
  assert.equal(districtSentence(mk(DISTRICTS.map(() => ['heavy']))), four)
})
test('rule: the dry sentence only when all six are available; unavailable districts are never mentioned', () => {
  assert.equal(districtSentence(mk([])), 'सागर संभाग के किसी भी ज़िले में आज बारिश नहीं होगी।')
  assert.equal(districtSentence(mk([], [5])), null)
  const s = districtSentence(mk([[], [], ['light']], [5]))
  assert.equal(s, 'आज या कल पन्ना में बारिश हो सकती है।')
  assert.ok(!s.includes('निवाड़ी'))
  assert.equal(districtSentence(null), null); assert.equal(districtSentence([]), null)
})

test('F1-F6: script with the sentence minus the sentence = the old script; growth <= 12 percent; speakable; no link, no digits', async () => {
  for (const i of [1, 2, 3, 4, 5, 6]) {
    for (const sc of ['all-dry', 'rain-two', 'one-unavailable', 'all-unavailable']) {
      const r = await run(i, sc)
      const old = buildVoiceScript({ ...r.model, districts: null })
      const now = buildVoiceScript(r.model)
      assert.ok(now.chars <= old.chars * 1.12 + 0.5, `F${i} ${sc}: ${old.chars} -> ${now.chars}`)
      assert.ok(!now.districtAdded || now.chars <= DISTRICT_VOICE_MAX_CHARS)
      assert.ok(isSpeakable(now.text), 'only Devanagari and marks')
      assert.ok(!/[0-9]/.test(now.text) && !/mausam|मौसम डॉट/.test(now.text))
      if (now.districtAdded) {
        const sentence = districtSentence(r.model.districts)
        assert.ok(now.text.includes(sentence))
        assert.equal(now.text.replace(` ${sentence}`, ''), old.text, `F${i} ${sc}: removing the sentence gives the old script`)
      } else assert.equal(now.text, old.text)
    }
  }
})

test('kill switch / no districts: the voice script is byte-identical to the old one', async () => {
  for (const i of [1, 3, 4]) {
    const off = await run(i, 'all-dry', { env: { MORNING_DISTRICTS: 'off' } })
    assert.equal(off.model.districts, null)
    const none = await run(i, null)
    assert.equal(buildVoiceScript(off.model).text, buildVoiceScript(none.model).text)
    assert.equal(buildVoiceScript(off.model).districtAdded, false)
  }
})

test('the cap: a sentence that would push the script over +12 percent is left out, and the old script is returned', async () => {
  const r = await run(1, 'rain-two')
  const old = buildVoiceScript({ ...r.model, districts: null })
  const big = { ...r.model, districts: mk(DISTRICTS.map(() => ['heavy'])) }
  const v = buildVoiceScript(big)
  assert.ok(v.chars <= old.chars * 1.12 + 0.5)
  // tiny base script: build one by dropping everything so +12 percent cannot fit a sentence
  const tiny = buildVoiceScript({ ...r.model, mandi: null, tasks: [], slot: null, districts: mk([['light']]) })
  const tinyOld = buildVoiceScript({ ...r.model, mandi: null, tasks: [], slot: null, districts: null })
  assert.ok(tiny.chars <= tinyOld.chars * 1.12 + 0.5)
})

test('the invitation to kissansahyog.com/mausam is not in the spoken script (message and card only)', async () => {
  const r = await run(3, 'rain-two')
  assert.ok(!buildVoiceScript(r.model).text.includes('मौसम डॉट'))
  assert.ok(!Object.keys(S).filter((k) => k.startsWith('voiceDistrict')).some((k) => String(S[k]).includes('kissansahyog')))
})
