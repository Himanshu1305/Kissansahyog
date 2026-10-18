// Batch 10E 5.1 — homepage Kisan Mela teaser: only Madhya Pradesh + neighbouring states, MP first.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { homeRegionMelas, HOME_MELA_STATES } from '../../src/lib/mela/melaFormat.js'

// Already soonest-first, as fetchUpcomingMelas passes them.
const ka1 = { id: 'ka1', state: 'Karnataka', event_date_start: '2026-10-22' }
const up1 = { id: 'up1', state: 'Uttar Pradesh', event_date_start: '2026-11-02' }
const up2 = { id: 'up2', state: 'U.P.', event_date_start: '2026-11-12' }
const mh1 = { id: 'mh1', state: 'Maharashtra', event_date_start: '2026-11-20' }
const tg1 = { id: 'tg1', state: 'Telangana', event_date_start: '2026-11-25' }
const mp1 = { id: 'mp1', state: 'Madhya Pradesh', event_date_start: '2027-01-09' }
const mp2 = { id: 'mp2', state: 'मध्य प्रदेश', event_date_start: '2027-02-14' }
const mp3 = { id: 'mp3', state: 'M.P.', event_date_start: '2027-03-01' }
const india = { id: 'in', state: 'India', event_date_start: '2026-10-30' }
const blank = { id: 'bl', state: null, event_date_start: '2026-10-31' }
const ids = (a) => a.map((m) => m.id)

test('the six allowed states', () => {
  assert.deepEqual(HOME_MELA_STATES, ['Madhya Pradesh', 'Uttar Pradesh', 'Maharashtra', 'Chhattisgarh', 'Gujarat', 'Rajasthan'])
})

test('MP + UP + Karnataka: Karnataka dropped, MP first, then UP in date order', () => {
  assert.deepEqual(ids(homeRegionMelas([ka1, up1, up2, mp1], 3)), ['mp1', 'up1', 'up2'])
})

test('Hindi / abbreviated state spellings match (मध्य प्रदेश, M.P., U.P.)', () => {
  assert.deepEqual(ids(homeRegionMelas([up2, mp2, mp3], 5)), ['mp2', 'mp3', 'up2'])
})

test('MP fills the limit before any neighbour', () => {
  assert.deepEqual(ids(homeRegionMelas([up1, mh1, mp1, mp2, mp3], 3)), ['mp1', 'mp2', 'mp3'])
})

test('only out-of-region / unknown states → [] (section hidden)', () => {
  assert.deepEqual(homeRegionMelas([ka1, tg1, india, blank], 3), [])
})

test('no melas at all → []', () => {
  assert.deepEqual(homeRegionMelas([], 3), [])
  assert.deepEqual(homeRegionMelas(null, 3), [])
  assert.deepEqual(homeRegionMelas(undefined), [])
})

test('neighbours only (no MP) keep their incoming order', () => {
  assert.deepEqual(ids(homeRegionMelas([ka1, up1, tg1, mh1], 3)), ['up1', 'mh1'])
})

test('input is not mutated', () => {
  const input = [ka1, up1, mp1]
  homeRegionMelas(input, 3)
  assert.deepEqual(ids(input), ['ka1', 'up1', 'mp1'])
})
