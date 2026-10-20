// Batch 12B — Dussehra greeting: India-date gate, strings parity, and the card source rules.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { activeFestival, indiaDate, FESTIVALS } from '../../src/lib/festivals.js'
import { strings } from '../../src/lib/i18n/strings.js'

const at = (iso) => new Date(iso)
const id = (iso) => activeFestival(at(iso))?.id ?? null

test('exactly one festival: dussehra-2026, 2026-10-20 to 2026-10-20', () => {
  assert.equal(FESTIVALS.length, 1)
  assert.deepEqual(FESTIVALS[0], { id: 'dussehra-2026', fromDate: '2026-10-20', toDate: '2026-10-20' })
})

test('India-time boundaries', () => {
  assert.equal(id('2026-10-19T23:59:00+05:30'), null)
  assert.equal(id('2026-10-20T00:00:00+05:30'), 'dussehra-2026')
  assert.equal(id('2026-10-20T12:00:00+05:30'), 'dussehra-2026')
  assert.equal(id('2026-10-20T23:59:59+05:30'), 'dussehra-2026')
  assert.equal(id('2026-10-21T00:00:00+05:30'), null)
  assert.equal(indiaDate(at('2026-10-19T18:29:59Z')), '2026-10-19')
  assert.equal(indiaDate(at('2026-10-19T18:30:00Z')), '2026-10-20')
})

test('the device timezone does not change the answer', () => {
  const instants = ['2026-10-19T18:29:00Z', '2026-10-19T18:30:00Z', '2026-10-20T18:29:00Z', '2026-10-20T18:30:00Z']
  const expected = [null, 'dussehra-2026', 'dussehra-2026', null]
  const old = process.env.TZ
  try {
    for (const tz of ['Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'UTC']) {
      process.env.TZ = tz
      assert.deepEqual(instants.map(id), expected, tz)
    }
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old }
})

test('greeting strings have hi and en, soft wording, no promise words', () => {
  const keys = Object.keys(strings).filter((k) => k.startsWith('fest_'))
  assert.ok(keys.length >= 5)
  for (const k of keys) { assert.ok(strings[k].hi && strings[k].en, k); assert.ok(/[ऀ-ॿ]/.test(strings[k].hi), `${k} hi is Hindi`) }
  assert.equal(strings.fest_dussehra_title.hi, 'विजयादशमी (दशहरा) की हार्दिक शुभकामनाएं')
  assert.equal(strings.fest_dussehra_title.en, 'Warm wishes on Vijayadashami (Dussehra)')
  assert.equal(strings.fest_dussehra_line.hi, 'आज के दिन नीलकंठ पक्षी के दर्शन को शुभ माना जाता है।')
  assert.equal(strings.fest_dussehra_line.en, 'Seeing the Neelkanth bird (Indian Roller) is considered auspicious today.')
  assert.equal(strings.fest_dussehra_from.hi, '— किसान सहयोग परिवार की ओर से')
  assert.equal(strings.fest_dussehra_from.en, '— from the Kissan Sahyog family')
  for (const k of keys) assert.ok(!/free|pilot|मुफ़्त|निःशुल्क|गारंटी/i.test(strings[k].hi + strings[k].en), k)
})

test('card source: client-side gate, own-site picture, no animation, 48px close, storage in try/catch', () => {
  const src = readFileSync(new URL('../../src/components/FestivalCard.jsx', import.meta.url), 'utf8')
  assert.match(src, /useEffect\(/)
  assert.match(src, /activeFestival\(new Date\(\)\)/)
  assert.match(src, /__KS_PRERENDER/)
  assert.match(src, /role="region"/)
  assert.match(src, /h-12 w-12/)
  assert.match(src, /aria-label=\{t\('fest_close'\)\}/)
  assert.ok(!/animate|transition|@keyframes|https?:\/\//.test(src), 'no animation, no hot-linked URL')
  for (const m of src.matchAll(/localStorage\.(get|set)Item/g)) {
    const before = src.slice(Math.max(0, m.index - 80), m.index)
    assert.match(before, /try \{/)
  }
})

test('picture files exist, are small, are served from our own site', () => {
  assert.ok(statSync(new URL('../../public/festival/neelkanth.webp', import.meta.url)).size < 70 * 1024)
  assert.ok(statSync(new URL('../../public/festival/neelkanth-112.webp', import.meta.url)).size < 10 * 1024)
})
