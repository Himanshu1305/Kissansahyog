// PERMANENT tests for the public-page pure helpers (filters, distance sort, date labels).
// Run: node scripts/test/p_mela_format.mjs
import { filterMelas, sortByDistance, melaMonth, melaDateLabel, isExpectedDate, statesIn } from '../../src/lib/mela/melaFormat.js'

let pass = 0, fail = 0
const ok = (n, c, e = '') => { c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n + (e ? ' — ' + e : ''))) }

const melas = [
  { id: 'a', state: 'Punjab', is_date_confirmed: false, expected_period: 'Mar 2027', latitude: 30.9, longitude: 75.8 },
  { id: 'b', state: 'Karnataka', is_date_confirmed: true, event_date_start: '2026-11-10', event_date_end: '2026-11-12', latitude: 13.07, longitude: 77.58 },
  { id: 'c', state: 'Punjab', is_date_confirmed: true, event_date_start: '2026-03-05', latitude: 31.6, longitude: 74.8 },
  { id: 'd', state: 'Delhi', is_date_confirmed: false, expected_period: 'Feb 2027', latitude: 28.6, longitude: 77.1 },
]

// --- state filter (positive/negative) ---
ok('state filter → Punjab yields a + c', filterMelas(melas, { state: 'Punjab' }).map((m) => m.id).sort().join('') === 'ac')
ok('state filter → no match yields empty (edge)', filterMelas(melas, { state: 'Kerala' }).length === 0)
ok('no filter → all', filterMelas(melas, {}).length === 4)

// --- month filter: confirmed uses start month; unconfirmed parses expected_period month ---
ok('melaMonth confirmed (Nov) = 11', melaMonth(melas[1]) === 11)
ok('melaMonth expected "Mar 2027" = 3', melaMonth(melas[0]) === 3)
ok('month filter March → a + c', filterMelas(melas, { month: 3 }).map((m) => m.id).sort().join('') === 'ac')
ok('month filter Nov → b only', filterMelas(melas, { month: 11 }).map((m) => m.id).join('') === 'b')

// --- distance sort reflects the center ---
const nearPunjab = sortByDistance(melas, { latitude: 31.0, longitude: 75.0 })
ok('nearest-first from Punjab puts a Punjab mela first', ['a', 'c'].includes(nearPunjab[0].id))
ok('no center → order preserved', sortByDistance(melas, null).map((m) => m.id).join('') === 'abcd')

// --- date labels: confirmed vs अपेक्षित clearly distinguished ---
ok('confirmed is NOT flagged expected', isExpectedDate(melas[1]) === false)
ok('unconfirmed IS flagged expected', isExpectedDate(melas[0]) === true)
ok('expected label uses the passed prefix', melaDateLabel(melas[0], 'en', { expectedLabel: 'Expected' }) === 'Expected: Mar 2027')
ok('confirmed label renders a real date (en)', /2026/.test(melaDateLabel(melas[1], 'en')) && /Nov|November/.test(melaDateLabel(melas[1], 'en')))

ok('statesIn → distinct sorted', statesIn(melas).join(',') === 'Delhi,Karnataka,Punjab')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
