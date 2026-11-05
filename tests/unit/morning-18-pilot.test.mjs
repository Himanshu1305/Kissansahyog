// Batch 18 Part 1 - the five new district-HQ points are always-refreshed (PILOT) cells, in BOTH lists, identical.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as core from '../../supabase/functions/_shared/weather-core.js'
import { DISTRICTS } from '../../scripts/morning/lib/districts.js'

const src = readFileSync('scripts/refresh-data.mjs', 'utf8')
const block = src.match(/const PILOT = \[([\s\S]*?)\n\]/)[1]
const jobPilot = [...block.matchAll(/\{\s*lat:\s*([\d.]+),\s*lon:\s*([\d.]+)\s*\}/g)].map((m) => ({ lat: Number(m[1]), lon: Number(m[2]) }))

test('PILOT in the Edge Function core and in scripts/refresh-data.mjs are identical', () => {
  assert.ok(jobPilot.length >= 13)
  assert.deepEqual(jobPilot, core.PILOT.map((p) => ({ lat: p.lat, lon: p.lon })))
})

test('the six district cell keys are re-derived with the real cellCentre() and all are PILOT cells', () => {
  const expected = { Sagar: '23.8_78.7', Damoh: '23.8_79.4', Panna: '24.7_80.2', Tikamgarh: '24.7_78.8', Chhatarpur: '24.9_79.6', Niwari: '25.4_78.8' }
  const pilotKeys = new Set(core.PILOT.map((p) => core.cellCentre(p.lat, p.lon).key))
  assert.equal(DISTRICTS.length, 6)
  for (const d of DISTRICTS) {
    assert.equal(core.cellCentre(d.lat, d.lon).key, expected[d.id], d.id)
    assert.equal(d.key, expected[d.id], d.id)
    assert.ok(pilotKeys.has(d.key), `${d.id} ${d.key} is a PILOT cell`)
  }
})

test('PILOT: 13 points, 13 distinct cells (no two points share a cell), the limit of 60 leaves room', () => {
  assert.equal(core.PILOT.length, 13)
  assert.equal(new Set(core.PILOT.map((p) => core.cellCentre(p.lat, p.lon).key)).size, 13)
  assert.ok(core.MAX_LIMIT - core.PILOT.length >= 40)
  const list = core.buildCellList([])
  assert.equal(list.length, 13); assert.ok(list.every((c) => c.pilot))
})
