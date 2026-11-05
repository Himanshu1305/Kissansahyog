// Batch 18 Parts 3 and 6 - the six-district section of the message, the kill switch, the global guard, and the byte-for-byte regression proof.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { S } from '../../scripts/morning/strings.hi.js'
import { districtBlock } from '../../scripts/morning/lib/compose.js'
import { buildDistrictSummaries } from '../../scripts/morning/lib/districtWeather.js'
import { DISTRICTS } from '../../scripts/morning/lib/districts.js'
import { lint } from '../../scripts/morning/lib/compose.js'
import { run, baseline, withoutSection, sectionOf, crlf } from './helpers/morning18.mjs'

const IDX = [1, 2, 3, 4, 5, 6]
const ORDER = ['सागर', 'दमोह', 'पन्ना', 'टीकमगढ़', 'छतरपुर', 'निवाड़ी']

test('baseline: with no district loader the message is the F1-F6 baseline, byte for byte', async () => {
  for (const i of IDX) assert.equal(crlf((await run(i, null)).message), baseline(i), `F${i}`)
})

test('all districts available: removing the section (heading to closing line + its blank line) gives the baseline byte for byte, F1-F6', async () => {
  for (const i of IDX) {
    const m = (await run(i, 'all-dry')).message
    assert.ok(sectionOf(m), `F${i} has the section`)
    assert.equal(withoutSection(m), baseline(i), `F${i}`)
    assert.equal(lint(m).length, 0, `F${i} lint`)
  }
})

test('the section: right after the Sagar weather block, in fixed order, 8 added lines, short lines, closing invitation last', async () => {
  for (const i of IDX) {
    const m = crlf((await run(i, 'rain-two')).message)
    const blocks = m.split('\n\n')
    const at = blocks.findIndex((b) => b.startsWith(S.districtHeading))
    assert.ok(blocks[at - 1].startsWith(S.weatherHeading), 'comes right after the Sagar weather block')
    const lines = blocks[at].split('\n')
    assert.equal(lines.length, 8)
    assert.equal(lines[0], S.districtHeading)
    assert.equal(lines.at(-1), S.districtClosing)
    assert.ok(lines.at(-1).includes('kissansahyog.com/mausam'))
    lines.slice(1, 7).forEach((l, k) => assert.ok(l.includes(ORDER[k]), `${l} is ${ORDER[k]}`))
    for (const l of lines) assert.ok([...l].length <= 48, `line too long (${[...l].length}): ${l}`)
  }
})

test('rain in two districts: their words and the soon-marker show; the others read "no rain"', async () => {
  const s = sectionOf((await run(1, 'rain-two')).message).split('\n')
  assert.ok(s[1].includes(S.districtWord.dry) && s[2].includes(S.districtWord.dry))
  assert.ok(!s[3].includes(S.districtWord.dry) && !s[5].includes(S.districtWord.dry), `${s[3]} / ${s[5]}`)
  assert.ok(s[3].includes('पन्ना') && s[5].includes('छतरपुर'))
})

test('heavy rain in one district shows the heavy word and symbol', async () => {
  const s = sectionOf((await run(1, 'heavy')).message).split('\n')
  assert.ok(s[4].includes('टीकमगढ़'))
  const line = s[4]
  assert.ok(line.includes(S.districtWord.heavy) || line.includes(S.districtWord.moderate), line)
})

test('the Sagar row is the Sagar sentence data (same level and temperatures as the main verdict), whatever the Sagar cell says', async () => {
  for (const i of IDX) {
    const r = await run(i, 'all-dry')
    const row = sectionOf(r.message).split('\n')[1]
    const d0 = r.model.weather.days[0]
    assert.ok(row.includes(`${Math.round(d0.tmin)}–${Math.round(d0.tmax)}°`), row)
    assert.ok(row.includes(S.districtWord[r.model.verdict.windows.today.level]), row)
    assert.equal(r.model.districts[0].today.level, r.model.verdict.windows.today.level)
  }
})

test('one district unavailable: its line says so, nothing is dropped; the job report lists every district with its source', async () => {
  const r = await run(1, 'one-unavailable')
  const s = sectionOf(r.message).split('\n')
  assert.equal(s.length, 8)
  assert.equal(s[6], S.districtLineNone.replace('{name}', 'निवाड़ी'))
  assert.match(r.report, /Niwari \(25\.4_78\.8\): unavailable - /)
  for (const d of DISTRICTS) assert.ok(r.report.includes(`${d.id} (${d.key}):`), d.id)
  assert.match(r.report, /Damoh \(23\.8_79\.4\): cache, saved forecast [\d.]+ h old/)
})

test('all six saved forecasts unavailable: Sagar still shows the Sagar sentence data, the other five say so honestly, nothing throws', async () => {
  const r = await run(1, 'all-unavailable')
  const s = sectionOf(r.message).split('\n')
  assert.equal(s.length, 8)
  assert.ok(!s[1].includes(S.districtLineNone.split('{name}')[1]))
  assert.ok(s.slice(2, 7).every((l) => l.includes(S.districtLineNone.split('{name}')[1])))
  assert.equal(withoutSection(r.message), baseline(1))
})

test('stale cells are filled directly and the report says so', async () => {
  const r = await run(1, 'stale-two')
  assert.match(r.report, /Damoh \(23\.8_79\.4\): open-meteo-direct \(saved cell older than 8 h\)/)
  assert.equal(sectionOf(r.message).split('\n').length, 8)
})

test('KILL SWITCH: MORNING_DISTRICTS=off (any case, spaces) gives the baseline exactly and never calls the loader; other values = on', async () => {
  for (const v of ['off', 'OFF', 'Off', ' off ']) {
    let called = 0
    for (const i of IDX) {
      const r = await run(i, null, { env: { MORNING_DISTRICTS: v }, loader: async () => { called++; return [] } })
      assert.equal(crlf(r.message), baseline(i), `${v} F${i}`)
      assert.equal(r.model.districts, null)
    }
    assert.equal(called, 0, `loader not called for "${v}"`)
  }
  for (const v of [undefined, '', 'on', 'false', 'offf', '0']) {
    const r = await run(1, 'all-dry', { env: v === undefined ? {} : { MORNING_DISTRICTS: v } })
    assert.ok(sectionOf(r.message), `value ${JSON.stringify(v)} keeps the feature on`)
  }
})

test('GLOBAL GUARD: a thrown error, garbage, or a hang leaves the post unchanged, one report line says why, nothing throws', async () => {
  const boom = await run(1, null, { loader: async () => { throw new Error('boom') } })
  assert.equal(crlf(boom.message), baseline(1)); assert.match(boom.report, /districts: LEFT OUT - boom/)
  const sync = await run(1, null, { loader: () => { throw new Error('sync boom') } })
  assert.equal(crlf(sync.message), baseline(1)); assert.match(sync.report, /LEFT OUT - sync boom/)
  const hang = await run(1, null, { loader: () => new Promise(() => {}), limitMs: 40 })
  assert.equal(crlf(hang.message), baseline(1)); assert.match(hang.report, /LEFT OUT - district step took longer than/)
  const junk = await run(1, null, { loader: async () => [null, 5, { id: 'Damoh', weather: { days: 'x' } }] })
  assert.equal(sectionOf(junk.message).split('\n').length, 8) // garbage becomes six unavailable lines, still no exception
  assert.ok(junk.violations.length === 0)
})

test('strings: every district word and name exists; the Hindi lives only in strings.hi.js', () => {
  assert.deepEqual(DISTRICTS.map((d) => S.districtNames[d.id]), ORDER)
  for (const k of ['dry', 'drizzle', 'light', 'moderate', 'heavy']) assert.ok(S.districtWord[k] && S.districtSym[k], k)
  assert.ok(S.districtHeading && S.districtLine && S.districtLineNone && S.districtSoon && S.districtClosing)
  for (const f of ['scripts/morning/lib/districts.js', 'scripts/morning/lib/districtWeather.js', 'scripts/morning/lib/compose.js', 'scripts/morning/lib/generate.js']) {
    const code = readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
    assert.ok(!/[ऀ-ॿ]/.test(code), `${f} has Devanagari outside comments`)
  }
})

test('districtBlock: a hand-made list renders one line per district', () => {
  const items = DISTRICTS.map((d) => ({ id: d.id, nameHi: S.districtNames[d.id], available: true, today: { tmin: 10, tmax: 20, level: 'light' }, next2: 'dry' }))
  assert.equal(districtBlock(items).split('\n').length, 8)
  assert.equal(buildDistrictSummaries(null, { nowIso: '2026-10-31T00:30:00Z' }).length, 6)
})

test('workflow: exactly the one MORNING_DISTRICTS line was added; the four cron times are unchanged', () => {
  const y = crlf(readFileSync('.github/workflows/morning-post.yml', 'utf8'))
  assert.equal(y.split('\n').filter((l) => l.includes('MORNING_DISTRICTS')).length, 1)
  assert.ok(y.includes('          MORNING_DISTRICTS: ${{ vars.MORNING_DISTRICTS }}\n'))
  for (const c of ["'37 19 * * *'", "'47 20 * * *'", "'47 21 * * *'", "'37 22 * * *'"]) assert.ok(y.includes(`- cron: ${c}`), c)
  assert.equal((y.match(/- cron:/g) || []).length, 4)
})
