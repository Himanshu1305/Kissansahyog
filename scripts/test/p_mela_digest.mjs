// PERMANENT tests for Phase 6 digest-readiness (pure, mocked dates — no network).
// Run: node scripts/test/p_mela_digest.mjs
import { selectDigestMelas, daysUntil, groupDigestByUser } from '../../src/lib/mela/melaDigest.js'

let pass = 0, fail = 0
const ok = (n, c, e = '') => { c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n + (e ? ' — ' + e : ''))) }
const asOf = '2026-10-01'

const rows = [
  { user_id: 'u1', is_date_confirmed: true, event_date_start: '2026-10-01', event_date_end: '2026-10-02' }, // today (positive)
  { user_id: 'u1', is_date_confirmed: true, event_date_start: '2026-10-04' }, // +3 edge (positive)
  { user_id: 'u2', is_date_confirmed: true, event_date_start: '2026-10-05' }, // +4 (negative — just outside)
  { user_id: 'u2', is_date_confirmed: false, expected_period: 'Oct 2026' }, // unconfirmed (negative)
  { user_id: 'u3', is_date_confirmed: true, event_date_start: '2026-09-28', event_date_end: '2026-09-29' }, // ended (negative)
  { user_id: 'u3', is_date_confirmed: true, event_date_start: '2026-09-30', event_date_end: '2026-10-03' }, // ongoing (edge, positive)
]

const sel = selectDigestMelas(rows, asOf)
ok('selects exactly the 3 in-window confirmed melas', sel.length === 3, `got ${sel.length}`)
ok('today is included (positive)', sel.some((r) => r.event_date_start === '2026-10-01'))
ok('+3 day start is included (edge)', sel.some((r) => r.event_date_start === '2026-10-04'))
ok('+4 day start is excluded (negative)', !sel.some((r) => r.event_date_start === '2026-10-05'))
ok('unconfirmed date is excluded (negative)', !sel.some((r) => r.is_date_confirmed === false))
ok('already-ended mela is excluded (negative)', !sel.some((r) => r.event_date_end === '2026-09-29'))
ok('ongoing (started before, ends within) is included (edge)', sel.some((r) => r.event_date_start === '2026-09-30'))
ok('daysUntil(+3) === 3', daysUntil(rows[1], asOf) === 3)
ok('daysUntil(today) === 0', daysUntil(rows[0], asOf) === 0)
ok('invalid asOf → empty selection', selectDigestMelas(rows, 'not-a-date').length === 0)

const grouped = groupDigestByUser(rows, asOf)
ok('grouped by user → u1 + u3 only', Object.keys(grouped).sort().join(',') === 'u1,u3')
ok('u1 has 2 in-window melas', grouped.u1?.length === 2)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
