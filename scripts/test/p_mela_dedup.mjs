// PERMANENT tests for state normalization + robust dedup/merge (Phase 5). PURE logic + an in-memory
// mock DB — never hits live sites, the live DB, or the AI API. Run: node scripts/test/p_mela_dedup.mjs
import { normalizeState, stateHindi, CANONICAL_STATE_NAMES } from '../../src/content/states.js'
import { statesIn, filterMelas } from '../../src/lib/mela/melaFormat.js'
import { selectDigestMelas } from '../../src/lib/mela/melaDigest.js'
import {
  matchEvents, clusterByEvent, textMatch, districtCompatible, locationMatch,
  pickSurvivor, planMerge, mergeIntoSurvivor, dedupActiveMelas, pairKey, periodWindow,
} from '../mela/dedup.mjs'

let pass = 0, fail = 0
const ok = (n, c, e = '') => { c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n + (e ? ' — ' + e : ''))) }
const P = (o) => ({ latitude: null, longitude: null, geocode_precision: null, ...o })

// ============================================================================================
// normalizeState — abbreviations, Hindi, legacy names, whitespace; unmappable → null (never guess)
// ============================================================================================
for (const v of ['MP', 'M.P.', 'M P', 'मध्य प्रदेश', 'म.प्र.', 'madhya pradesh ', 'Madhyapradesh']) {
  ok(`normalizeState(${JSON.stringify(v)}) → Madhya Pradesh`, normalizeState(v) === 'Madhya Pradesh', String(normalizeState(v)))
}
ok('normalizeState UP / उत्तर प्रदेश → Uttar Pradesh', normalizeState('UP') === 'Uttar Pradesh' && normalizeState('उत्तर प्रदेश') === 'Uttar Pradesh')
ok('legacy Orissa → Odisha', normalizeState('Orissa') === 'Odisha')
ok('legacy Uttaranchal → Uttarakhand', normalizeState('Uttaranchal') === 'Uttarakhand')
ok('legacy Pondicherry → Puducherry', normalizeState('Pondicherry') === 'Puducherry')
ok('Chandigarh (UT) → Chandigarh', normalizeState('Chandigarh (UT)') === 'Chandigarh')
ok('pre-2020 Daman and Diu → merged UT', normalizeState('Daman and Diu') === 'Dadra and Nagar Haveli and Daman and Diu')
ok('unmappable city name → null (NOT guessed)', normalizeState('Bhopal') === null)
ok('empty / junk → null', normalizeState('') === null && normalizeState('   ') === null && normalizeState(null) === null)
ok('28 states + 8 UTs present', CANONICAL_STATE_NAMES.length === 36)
ok('stateHindi maps en → hi', stateHindi('Madhya Pradesh') === 'मध्य प्रदेश')
// reverse-geocode fallback (1c): whatever principalSubdivision BigDataCloud returns is run through the
// same normaliser — so a derived "Madhya Pradesh" / "MP" still lands canonical.
ok('reverse-geocoded value normalizes like any other', normalizeState('Madhya Pradesh') === 'Madhya Pradesh' && normalizeState('Karnataka') === 'Karnataka')

// ============================================================================================
// periodWindow — expected-month parsing (drives expected-vs-confirmed date overlap)
// ============================================================================================
ok('periodWindow "Oct 2026" → full October', JSON.stringify(periodWindow('Oct 2026')) === JSON.stringify([Math.floor(Date.UTC(2026, 9, 1) / 864e5), Math.floor(Date.UTC(2026, 9, 31) / 864e5)]))
ok('periodWindow "February–March 2027" spans both months', periodWindow('February–March 2027')[0] === Math.floor(Date.UTC(2027, 1, 1) / 864e5) && periodWindow('February–March 2027')[1] === Math.floor(Date.UTC(2027, 2, 31) / 864e5))
ok('periodWindow with no year → null', periodWindow('February (annual recurring)') === null)

// ============================================================================================
// DEDUP — positive merges
// ============================================================================================
const pantSeed = P({ id: 'p1', name_en: 'Pantnagar Kisan Mela, GBPUA&T', organizer_name: 'G.B. Pant University of Agriculture & Technology', venue: 'GBPUA&T Campus', district: 'Udham Singh Nagar', state: 'Uttarakhand', latitude: 29.022, longitude: 79.491, is_date_confirmed: false, expected_period: 'Oct 2026' })
const pantConf = P({ id: 'p2', name_en: '120th All India Kisan Mela & Agro-Industry Exhibition', organizer_name: 'Govind Ballabh Pant University of Agriculture & Technology (GBPUAT), Pantnagar', venue: 'GBPUAT Campus, Pantnagar', district: 'Udham Singh Nagar', state: 'Uttarakhand', is_date_confirmed: true, event_date_start: '2026-10-03', event_date_end: '2026-10-06' })
ok('Pantnagar: expected-Oct vs confirmed-3–6-Oct, diff venue wording → MERGE', matchEvents(pantSeed, pantConf).match === true, matchEvents(pantSeed, pantConf).reason)

const mpAbbrev = P({ id: 'm1', name_en: 'Rabi Krishi Mela', organizer_name: 'KVK Sehore', venue: 'KVK Ground', district: 'Sehore', state: 'MP', is_date_confirmed: true, event_date_start: '2026-11-10', event_date_end: '2026-11-11' })
const mpFull = P({ id: 'm2', name_en: 'Rabi Krishi Mela', organizer_name: 'KVK Sehore', venue: 'KVK Ground', district: 'Sehore', state: 'Madhya Pradesh', is_date_confirmed: true, event_date_start: '2026-11-10', event_date_end: '2026-11-11' })
ok('MP vs Madhya Pradesh duplicates MERGE after normalization', matchEvents(mpAbbrev, mpFull).match === true, matchEvents(mpAbbrev, mpFull).reason)

const expoFull = P({ id: 'h1', name_en: 'Horti Agri India Expo 2027', venue: 'Yashobhoomi (IICC), Dwarka, New Delhi (South West Delhi)', district: 'New Delhi', state: 'Delhi', is_date_confirmed: true, event_date_start: '2027-03-05', event_date_end: '2027-03-07' })
const expoShort = P({ id: 'h2', name_en: 'Horti Agri India Expo 2027', venue: 'Yashobhoomi (IICC), Dwarka', district: 'New Delhi', state: 'Delhi', is_date_confirmed: true, event_date_start: '2027-03-05', event_date_end: '2027-03-07' })
ok('private expo, one venue string fuller → MERGE (containment)', matchEvents(expoFull, expoShort).match === true)

const vp1 = P({ id: 'v1', name_en: 'AgriExpo A', venue: 'Hall 1', district: 'New Delhi', state: 'Delhi', latitude: 28.60, longitude: 77.20, geocode_precision: 'venue', is_date_confirmed: true, event_date_start: '2027-01-05', event_date_end: '2027-01-07' })
const vp2 = P({ id: 'v2', name_en: 'Totally Different Name', venue: 'Hall 2', district: 'New Delhi', state: 'Delhi', latitude: 28.606, longitude: 77.205, geocode_precision: 'venue', is_date_confirmed: true, event_date_start: '2027-01-06', event_date_end: '2027-01-08' })
ok('both venue-precision within 5km → MERGE on coordinates alone (2a)', matchEvents(vp1, vp2).match === true, matchEvents(vp1, vp2).reason)

// ============================================================================================
// DEDUP — must NOT merge different events
// ============================================================================================
const pauMarch = P({ id: 's1', name_en: 'PAU Kisan Mela', organizer_name: 'Punjab Agricultural University', venue: 'PAU Campus', district: 'Ludhiana', state: 'Punjab', is_date_confirmed: true, event_date_start: '2027-03-10', event_date_end: '2027-03-12' })
const pauSep = P({ id: 's2', name_en: 'PAU Kisan Mela', organizer_name: 'Punjab Agricultural University', venue: 'PAU Campus', district: 'Ludhiana', state: 'Punjab', is_date_confirmed: true, event_date_start: '2027-09-10', event_date_end: '2027-09-12' })
ok('PAU March vs September at the same venue → SEPARATE (2c)', matchEvents(pauMarch, pauSep).match === false && matchEvents(pauMarch, pauSep).reason === 'dates_apart')

const pauLdh = P({ id: 'r1', organizer_name: 'Punjab Agricultural University', venue: 'PAU Campus', district: 'Ludhiana', state: 'Punjab', is_date_confirmed: false, expected_period: 'March 2027' })
const pauFdk = P({ id: 'r2', organizer_name: 'Punjab Agricultural University', venue: 'Regional Research Station', district: 'Faridkot', state: 'Punjab', is_date_confirmed: false, expected_period: 'March 2027' })
ok('PAU Ludhiana vs Faridkot (same org, same month, diff district) → SEPARATE (district gate)', matchEvents(pauLdh, pauFdk).match === false)

const diffDist1 = P({ id: 'd1', name_en: 'Kisan Mela', organizer_name: 'KVK', venue: 'KVK Ground', district: 'Jaipur', state: 'Rajasthan', is_date_confirmed: true, event_date_start: '2026-11-10', event_date_end: '2026-11-10' })
const diffDist2 = P({ id: 'd2', name_en: 'Kisan Mela', organizer_name: 'KVK', venue: 'KVK Ground', district: 'Kota', state: 'Rajasthan', is_date_confirmed: true, event_date_start: '2026-11-10', event_date_end: '2026-11-10' })
ok('two events same date, different districts → SEPARATE', matchEvents(diffDist1, diffDist2).match === false)

const diffState1 = P({ id: 'x1', name_en: 'Kisan Mela', venue: 'KVK Ground', district: 'Ludhiana', state: 'Punjab', is_date_confirmed: true, event_date_start: '2026-11-10', event_date_end: '2026-11-10' })
const diffState2 = P({ id: 'x2', name_en: 'Kisan Mela', venue: 'KVK Ground', district: 'Ludhiana', state: 'Haryana', is_date_confirmed: true, event_date_start: '2026-11-10', event_date_end: '2026-11-10' })
ok('same text, different state → SEPARATE (state_mismatch)', matchEvents(diffState1, diffState2).reason === 'state_mismatch')

// 2a-i false-merge guard: two DIFFERENT events, same city, same week, both only city-CENTROID precision.
const cent1 = P({ id: 'c1', name_en: 'KVK Bhopal Kisan Mela', organizer_name: 'KVK Bhopal', venue: 'KVK Grounds', district: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.25, longitude: 77.41, geocode_precision: 'area', is_date_confirmed: true, event_date_start: '2026-11-10', event_date_end: '2026-11-11' })
const cent2 = P({ id: 'c2', name_en: 'Bhopal Dairy & AgroTech Summit', organizer_name: 'Dairy Board', venue: 'Lake View Convention', district: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.25, longitude: 77.41, geocode_precision: 'area', is_date_confirmed: true, event_date_start: '2026-11-12', event_date_end: '2026-11-13' })
ok('same-city CENTROID, same week, different events → SEPARATE (2a-i)', matchEvents(cent1, cent2).match === false, matchEvents(cent1, cent2).reason)
ok('2a-i: area-precision coords never trigger a location match', locationMatch(cent1, cent2).ok === false)

// ============================================================================================
// clusterByEvent + do-not-merge exclusions (3f)
// ============================================================================================
const clusters = clusterByEvent([pantSeed, pantConf, pauMarch, pauSep])
ok('clusterByEvent: Pantnagar pair clusters, PAU March/Sept stay singletons', clusters.length === 3 && clusters.some((c) => c.length === 2))
const excl = new Set([pairKey('p1', 'p2')])
const clustersEx = clusterByEvent([pantSeed, pantConf], { exclusions: excl })
ok('a split-apart pair is NOT re-clustered (exclusion honored)', clustersEx.length === 2)

// ============================================================================================
// MERGE RULES (pure)
// ============================================================================================
ok('pickSurvivor prefers confirmed over expected', pickSurvivor([pantSeed, pantConf]).id === 'p2')
const survA = P({ id: 'A', name_en: 'Expo', source_urls: ['https://a/1'], address: null, highlights_hi: null, is_date_confirmed: false, expected_period: 'Oct 2026' })
const dupB = P({ id: 'B', name_en: 'Expo', source_urls: ['https://b/2', 'https://a/1'], address: 'Main Rd', highlights_hi: 'नमूना', is_date_confirmed: true, event_date_start: '2026-10-03', event_date_end: '2026-10-05' })
const plan = planMerge(survA, [dupB])
ok('planMerge unions source_urls (dedup)', plan.source_urls.length === 2 && plan.source_urls.includes('https://a/1') && plan.source_urls.includes('https://b/2'))
ok('planMerge fills blank survivor fields from the duplicate', plan.address === 'Main Rd' && plan.highlights_hi === 'नमूना')
ok('planMerge adopts a confirmed date over the survivor expected one', plan.is_date_confirmed === true && plan.event_date_start === '2026-10-03' && plan.expected_period === null)

// ============================================================================================
// mergeIntoSurvivor against an in-memory mock DB (interest re-point w/o PK violation; deactivate)
// ============================================================================================
function mockDb(tables) {
  class QB {
    constructor(t) { this.t = t; this.filters = []; this._op = 'select'; this._payload = null }
    select() { this._op = 'select'; return this }
    update(p) { this._op = 'update'; this._payload = p; return this }
    delete() { this._op = 'delete'; return this }
    eq(k, v) { this.filters.push([k, 'eq', v]); return this }
    in(k, vs) { this.filters.push([k, 'in', vs]); return this }
    _m(r) { return this.filters.every(([k, op, v]) => (op === 'in' ? v.includes(r[k]) : r[k] === v)) }
    then(res) { res(this._run()) }
    _run() {
      const arr = tables[this.t] || (tables[this.t] = [])
      if (this._op === 'select') return { data: arr.filter((r) => this._m(r)).map((r) => ({ ...r })), error: null }
      if (this._op === 'update') { for (const r of arr) if (this._m(r)) Object.assign(r, this._payload); return { data: null, error: null } }
      if (this._op === 'delete') { tables[this.t] = arr.filter((r) => !this._m(r)); return { data: null, error: null } }
      return { data: null, error: null }
    }
  }
  return { from: (t) => new QB(t) }
}

;(async () => {
  const tables = {
    kisan_mela: [
      { id: 'S', name_en: 'Survivor', source_urls: ['https://s'], is_active: true },
      { id: 'D', name_en: 'Dup', source_urls: ['https://d'], is_active: true },
    ],
    kisan_mela_interest: [
      { mela_id: 'S', user_id: 'U1', original_mela_id: null },
      { mela_id: 'D', user_id: 'U1', original_mela_id: null }, // conflict → must stay on D
      { mela_id: 'D', user_id: 'U2', original_mela_id: null }, // → re-point to S
    ],
    kisan_mela_candidates: [{ id: 'cand1', kisan_mela_id: 'D' }],
  }
  const db = mockDb(tables)
  await mergeIntoSurvivor({ db, survivor: tables.kisan_mela[0], dups: [tables.kisan_mela[1]], reason: 'test' })
  const dupRow = tables.kisan_mela.find((r) => r.id === 'D')
  ok('merge: dup deactivated with merged_into (not deleted)', dupRow && dupRow.is_active === false && dupRow.merged_into === 'S')
  const sInt = tables.kisan_mela_interest.filter((r) => r.mela_id === 'S').map((r) => r.user_id).sort()
  ok('merge: U2 interest re-pointed to survivor', sInt.includes('U2'))
  ok('merge: U1 (already on survivor) NOT duplicated — no PK violation', sInt.filter((u) => u === 'U1').length === 1)
  ok('merge: U1 conflict row preserved on the dup for a later split', tables.kisan_mela_interest.some((r) => r.mela_id === 'D' && r.user_id === 'U1'))
  ok('merge: re-pointed interest records original_mela_id', tables.kisan_mela_interest.find((r) => r.mela_id === 'S' && r.user_id === 'U2').original_mela_id === 'D')
  ok('merge: candidate back-reference re-pointed to survivor', tables.kisan_mela_candidates[0].kisan_mela_id === 'S')

  // dedupActiveMelas end-to-end on the mock: a 3-row identical cluster → 1 survivor + 2 deactivated.
  const t2 = {
    kisan_mela: [
      { id: 'K1', name_en: 'KISAN Agri Show 2026', venue: 'Pune International Exhibition Centre', district: 'Pune', state: 'Maharashtra', is_active: true, is_date_confirmed: true, event_date_start: '2026-12-09', event_date_end: '2026-12-13', source_urls: ['https://k1'] },
      { id: 'K2', name_en: 'KISAN Agri Show 2026 (34th edition)', venue: 'Pune International Exhibition Centre', district: 'Pune', state: 'Maharashtra', is_active: true, is_date_confirmed: true, event_date_start: '2026-12-09', event_date_end: '2026-12-13', source_urls: ['https://k2'] },
      { id: 'K3', name_en: 'KISAN Agri Show 2026', venue: 'Pune International Exhibition Centre', district: 'Pune', state: 'Maharashtra', is_active: true, is_date_confirmed: true, event_date_start: '2026-12-09', event_date_end: '2026-12-13', source_urls: ['https://k3'] },
    ],
    kisan_mela_interest: [], kisan_mela_candidates: [],
  }
  const recs = await dedupActiveMelas({ db: mockDb(t2), rows: t2.kisan_mela.map((r) => ({ ...r })), exclusions: new Set() })
  ok('dedupActiveMelas: 3 identical → 1 merge record with 2 merged-away', recs.length === 1 && recs[0].merged.length === 2)
  const active = t2.kisan_mela.filter((r) => r.is_active)
  ok('dedupActiveMelas: exactly 1 active survivor remains', active.length === 1)
  ok('dedupActiveMelas: survivor has all 3 source_urls combined', (active[0].source_urls || []).length === 3)

  // ==========================================================================================
  // Filter dropdown (1e) + digest regression (survivor row)
  // ==========================================================================================
  const listed = [{ state: 'MP' }, { state: 'Madhya Pradesh' }, { state: 'Chandigarh (UT)' }, { state: 'Karnataka' }]
  ok('statesIn: only canonical names, no "MP"/"Chandigarh (UT)"', JSON.stringify(statesIn(listed)) === JSON.stringify(['Chandigarh', 'Karnataka', 'Madhya Pradesh']))
  ok('filterMelas matches a raw "MP" row under canonical "Madhya Pradesh"', filterMelas(listed, { state: 'Madhya Pradesh' }).length === 2)

  const survivorRow = { user_id: 'U9', is_date_confirmed: true, event_date_start: '2026-10-03', event_date_end: '2026-10-03', merged_into: null, source_urls: ['https://a', 'https://b'] }
  ok('digest window still selects a merged survivor in range (regression)', selectDigestMelas([survivorRow], '2026-10-01').length === 1)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
