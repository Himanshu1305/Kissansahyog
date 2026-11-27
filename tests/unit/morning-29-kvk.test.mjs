// Batch 29 - answers entered in the admin "KVK questions" tab are used by the morning post by themselves.
// Covers: the shared rules (kvkRules.js) and that they equal the database limits; applyKvk() for all three kinds; the loader; the generator hook (offline);
// the effect on the real picks (irrigation days, scheme last date + Friday how-to, late-sowing line); that a bad / expired answer is never used.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LIMITS, STAGE_BOUNDS, KINDS, cleanAnswer, cleanMeta, formToAnswer, isIso, addDaysIso } from '../../src/lib/kvk/kvkRules.js'
import { applyKvk, loadKvkAnswers } from '../../scripts/morning/lib/kvk.js'
import { pickCalendarLine } from '../../scripts/morning/lib/workRules.js'
import { pickSlot } from '../../scripts/morning/lib/content.js'
import { auditData } from '../../scripts/morning/lib/freshness.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'

const DATA = loadData()
const SQL = readFileSync('supabase/migrations/0079_kvk_questions.sql', 'utf8')
const row = (slug, kind, target, answer, over = {}) => ({ slug, kind, target, answer, source_name: 'KVK Sagar, Dr X', source_date: '2026-11-27', valid_until: '2027-03-01', ...over })
const IRR2 = row('wheat-irr2-days', 'stage_days', 'irr2', { das_from: 52, das_to: 57 })
const PMFBY = row('pmfby-rabi-last-date', 'date', 'pmfby-rabi', { date: '2027-01-10' })
const LATE = row('wheat-late-sowing', 'late_sowing', 'wheat', { last_date: '2027-01-05', seed_extra_pct: 25 })

// ---------------------------------------------------------------------------------------------------------------- rules
test('rules: stage days - range, order, bounds, numbers as text from a form', () => {
  assert.deepEqual(cleanAnswer('stage_days', { das_from: 52, das_to: 57 }, { target: 'irr2' }), { value: { das_from: 52, das_to: 57 } })
  assert.deepEqual(cleanAnswer('stage_days', { das_from: '52', das_to: ' 57 ' }, { target: 'irr2' }), { value: { das_from: 52, das_to: 57 } })
  for (const bad of [{ das_from: 5, das_to: 20 }, { das_from: 50, das_to: 50 }, { das_from: 57, das_to: 52 }, { das_from: 50, das_to: 80 }, { das_from: 50, das_to: 160 }, { das_from: 'x', das_to: 55 }, { das_from: 52.5, das_to: 55 }, {}, null, { das_from: '', das_to: '' }])
    assert.equal(cleanAnswer('stage_days', bad, { target: 'irr2' }).error, 'adm_kvk_err_range', JSON.stringify(bad))
  assert.equal(cleanAnswer('stage_days', { das_from: 20, das_to: 25 }, { target: 'irr2' }).error, 'adm_kvk_err_range', 'irr2 cannot start at day 20 (a typing mistake)')
  assert.ok(cleanAnswer('stage_days', { das_from: 20, das_to: 25 }, { target: 'irr1' }).value, 'irr1 may')
  assert.deepEqual(Object.keys(STAGE_BOUNDS), ['irr1', 'irr2', 'irr3'])
})

test('rules: dates and extra seed', () => {
  assert.deepEqual(cleanAnswer('date', { date: '2026-12-31' }, { sourceDate: '2026-11-27' }), { value: { date: '2026-12-31' } })
  for (const bad of ['2026-13-45', '31-12-2026', '', null, '2026-02-30']) assert.equal(cleanAnswer('date', { date: bad }, { sourceDate: '2026-11-27' }).error, 'adm_kvk_err_date', String(bad))
  assert.equal(cleanAnswer('date', { date: '2026-11-26' }, { sourceDate: '2026-11-27' }).error, 'adm_kvk_err_date', 'before the day it was told')
  assert.equal(cleanAnswer('date', { date: addDaysIso('2026-11-27', 401) }, { sourceDate: '2026-11-27' }).error, 'adm_kvk_err_date')
  assert.deepEqual(cleanAnswer('late_sowing', { last_date: '2027-01-05' }, { sourceDate: '2026-11-27' }), { value: { last_date: '2027-01-05' } })
  assert.deepEqual(cleanAnswer('late_sowing', { last_date: '2027-01-05', seed_extra_pct: '' }, { sourceDate: '2026-11-27' }), { value: { last_date: '2027-01-05' } })
  assert.deepEqual(cleanAnswer('late_sowing', { last_date: '2027-01-05', seed_extra_pct: '25' }, { sourceDate: '2026-11-27' }), { value: { last_date: '2027-01-05', seed_extra_pct: 25 } })
  for (const bad of [150, 'abc', -5, 25.5]) assert.equal(cleanAnswer('late_sowing', { last_date: '2027-01-05', seed_extra_pct: bad }, { sourceDate: '2026-11-27' }).error, 'adm_kvk_err_seed', String(bad))
  assert.equal(cleanAnswer('nonsense', {}, {}).error, 'adm_kvk_err_range')
  assert.ok(isIso('2026-12-31') && !isIso('2026-12-32') && !isIso('26-12-31'))
})

test('rules: who told us, the day they told, how long it stays valid', () => {
  const today = '2026-11-27'
  assert.ok(cleanMeta({ sourceName: 'KVK Sagar, Dr X', sourceDate: '2026-11-27', validUntil: '2027-03-27' }, today).value)
  assert.equal(cleanMeta({ sourceName: 'ab', sourceDate: today, validUntil: '2027-03-27' }, today).error, 'adm_kvk_err_source')
  assert.equal(cleanMeta({ sourceName: '', sourceDate: today, validUntil: '2027-03-27' }, today).error, 'adm_kvk_err_source')
  assert.equal(cleanMeta({ sourceName: 'x'.repeat(121), sourceDate: today, validUntil: '2027-03-27' }, today).error, 'adm_kvk_err_source')
  assert.equal(cleanMeta({ sourceName: 'KVK', sourceDate: '2026-11-28', validUntil: '2027-03-27' }, today).error, 'adm_kvk_err_told')
  assert.equal(cleanMeta({ sourceName: 'KVK', sourceDate: '2026-09-27', validUntil: '2027-03-27' }, today).error, 'adm_kvk_err_told')
  assert.equal(cleanMeta({ sourceName: 'KVK', sourceDate: today, validUntil: today }, today).error, 'adm_kvk_err_valid')
  assert.equal(cleanMeta({ sourceName: 'KVK', sourceDate: today, validUntil: addDaysIso(today, 401) }, today).error, 'adm_kvk_err_valid')
  const f = { source_name: 'KVK Sagar', source_date: today, valid_until: '2027-03-27', das_from: '52', das_to: '57' }
  assert.deepEqual(formToAnswer('stage_days', 'irr2', f, today).answer, { das_from: 52, das_to: 57 })
  assert.equal(formToAnswer('stage_days', 'irr2', { ...f, source_name: '' }, today).error, 'adm_kvk_err_source')
  assert.equal(formToAnswer('late_sowing', 'wheat', { ...f, last_date: '2027-01-05', seed_extra_pct: '' }, today).answer.last_date, '2027-01-05')
})

test('the database checks the same limits as the rules (numbers compared)', () => {
  const need = [`v_from < ${LIMITS.dasMin}`, `v_to > ${LIMITS.dasMax}`, `v_to - v_from > ${LIMITS.dasSpanMax}`, `p_source_date < v_today - ${LIMITS.toldMaxAgeDays}`, `p_valid_until > v_today + ${LIMITS.validMaxDays}`,
    `v_d > p_source_date + ${LIMITS.dateMaxAheadDays}`, `v_pct > ${LIMITS.seedPctMax}`, `< ${LIMITS.sourceMin}`, `> ${LIMITS.sourceMax}`]
  for (const n of need) assert.ok(SQL.includes(n), `the migration has "${n}"`)
  for (const k of KINDS) assert.ok(SQL.includes(`'${k}'`), k)
  assert.equal(LIMITS.validDefaultDays <= LIMITS.validMaxDays, true)
})

test('the migration: RLS on, no table grants, only the morning function is meant for the public key, rollback exists', () => {
  assert.match(SQL, /alter table public\.kvk_questions enable row level security/)
  assert.match(SQL, /revoke all on public\.kvk_questions from public, anon, authenticated/)
  assert.match(SQL, /grant execute on function public\.morning_kvk_answers\(\) to anon, authenticated/)
  assert.equal((SQL.match(/require_admin_session\(p_actor, false\)/g) || []).length, 3, 'list, answer, reopen all check the admin session')
  assert.match(SQL, /security definer/)
  assert.ok(!/answered_by/.test(SQL.slice(SQL.indexOf('create or replace function public.morning_kvk_answers'))), 'the public function does not return who answered')
  assert.match(readFileSync('supabase/migrations/rollback/0079_kvk_questions_rollback.sql', 'utf8'), /drop table if exists public\.kvk_questions/)
  for (const slug of ['wheat-irr2-days', 'wheat-irr3-days', 'pmfby-rabi-last-date', 'wheat-late-sowing']) assert.ok(SQL.includes(`'${slug}'`), slug)
})

// ---------------------------------------------------------------------------------------------------------------- applyKvk
test('applyKvk: nothing answered -> the SAME data object, no notes', () => {
  for (const none of [[], null, undefined]) { const r = applyKvk(DATA, none, '2026-12-01'); assert.equal(r.data, DATA); assert.deepEqual(r.notes, []); assert.deepEqual(r.used, []) }
})

test('applyKvk: stage days change that stage only, the input data is not touched, the stage is stamped', () => {
  const before = JSON.stringify(DATA.cropCalendar)
  const r = applyKvk(DATA, [IRR2], '2026-12-01')
  assert.equal(JSON.stringify(DATA.cropCalendar), before, 'input untouched')
  const st = (d, id) => d.cropCalendar.stages.find((s) => s.id === id)
  assert.deepEqual([st(r.data, 'irr2').das_from, st(r.data, 'irr2').das_to], [52, 57])
  assert.deepEqual([st(r.data, 'irr1').das_from, st(r.data, 'irr3').das_from], [20, 80])
  assert.equal(st(r.data, 'irr2').reviewed, true); assert.match(st(r.data, 'irr2').approved_by, /^KVK: KVK Sagar, Dr X, 2026-11-27$/); assert.equal(st(r.data, 'irr2').source_url, undefined)
  assert.deepEqual(r.used, ['wheat-irr2-days']); assert.match(r.notes[0], /irr2 = 52-57 days/)
})

test('applyKvk: days that overlap the next irrigation are refused with a WARNING (the stored irrigation days stay)', () => {
  const r = applyKvk(DATA, [row('wheat-irr2-days', 'stage_days', 'irr2', { das_from: 75, das_to: 95 })], '2026-12-01') // irr3 starts at day 80
  assert.deepEqual(r.used, [])
  assert.equal(r.data, DATA)
  assert.equal(r.notes.length, 1); assert.match(r.notes[0], /^WARNING kvk: .*overlap or are out of order/)
})

test('applyKvk: a scheme last date replaces the deadline AND the how-to last date, and stamps it', () => {
  const r = applyKvk(DATA, [PMFBY], '2026-12-01')
  const s = r.data.schemes.find((x) => x.id === 'pmfby-rabi')
  assert.equal(s.deadline, '2027-01-10'); assert.equal(s.howto.last_date, '2027-01-10'); assert.equal(s.verified, true); assert.equal(s.source_name, 'KVK Sagar, Dr X'); assert.equal(s.source_url, undefined)
  assert.equal(DATA.schemes.find((x) => x.id === 'pmfby-rabi').deadline, '2026-12-31', 'input untouched')
})

test('applyKvk: bad rows are never used: unknown stage or scheme, expired, incomplete, failing the checks', () => {
  const rows = [
    row('a', 'stage_days', 'irr9', { das_from: 52, das_to: 57 }), row('b', 'date', 'no-such-scheme', { date: '2027-01-10' }),
    row('c', 'stage_days', 'irr2', { das_from: 52, das_to: 57 }, { valid_until: '2026-11-30' }), { slug: 'd', kind: 'date' },
    row('e', 'date', 'pmfby-rabi', { date: 'nonsense' }), row('f', 'late_sowing', 'wheat', { last_date: '2026-11-30' }), row('g', 'weird', 'x', {}),
    row('h', 'date', 'pmfby-rabi', { date: '2027-01-10' }, { source_name: 'ab' }),
  ]
  const r = applyKvk(DATA, rows, '2026-12-01')
  assert.deepEqual(r.used, []); assert.equal(r.data, DATA)
  assert.equal(r.notes.length, rows.length); assert.ok(r.notes.every((n) => n.startsWith('WARNING kvk:')))
  assert.match(r.notes[2], /expired on 2026-11-30/); assert.match(r.notes[5], /already over/)
})

test('applyKvk: the late-sowing line uses the strings file, ends at the last sowing date, and passes the freshness audit', () => {
  const r = applyKvk(DATA, [LATE], '2026-12-01')
  const e = r.data.cropCalendar.static.find((x) => x.id === 'kvk-wheat-late-sowing')
  assert.deepEqual([e.from, e.to, e.reviewed], ['2026-11-27', '2027-01-05', true])
  assert.ok(e.text_hi.includes('5 जनवरी तक') && e.text_hi.includes('25%'), e.text_hi)
  const a = auditData(r.data, '2026-12-20')
  assert.deepEqual(a.stale.filter((x) => x.id === e.id), []); assert.deepEqual(a.windowProblems.filter((x) => x.id === e.id), [])
  const noSeed = applyKvk(DATA, [row('wheat-late-sowing', 'late_sowing', 'wheat', { last_date: '2027-01-05' })], '2026-12-01')
  assert.ok(!noSeed.data.cropCalendar.static.find((x) => x.id === 'kvk-wheat-late-sowing').text_hi.includes('%'))
  const twice = applyKvk(r.data, [LATE], '2026-12-01')
  assert.equal(twice.data.cropCalendar.static.filter((x) => x.id === 'kvk-wheat-late-sowing').length, 1, 'no duplicate line')
})

// ---------------------------------------------------------------------------------------------------------------- the real picks change
test('effect: the 2nd irrigation cohort moves with the KVK days (the first irrigation still wins while it has sowers)', () => {
  const r = applyKvk(DATA, [IRR2], '2027-02-05')
  const was = pickCalendarLine(DATA.cropCalendar, '2027-02-05', {}), now = pickCalendarLine(r.data.cropCalendar, '2027-02-05', {})
  assert.equal(was.id, 'irr2'); assert.equal(now.id, 'irr2')
  assert.deepEqual(was.cohort, { from: '2026-12-12', to: '2026-12-17' })
  assert.deepEqual(now.cohort, { from: '2026-12-10', to: '2026-12-15' })
  assert.ok(now.text.includes('52-57'), now.text)
  assert.equal(now.unreviewed, false)
})

test('effect: the scheme last date reaches the Monday scheme line and the Friday how-to', () => {
  const r = applyKvk(DATA, [PMFBY], '2026-12-01')
  const mon = pickSlot('2026-12-07', { data: r.data, env: {} }), fri = pickSlot('2026-12-04', { data: r.data, env: {} })
  assert.equal(mon.kind, 'scheme'); assert.ok(mon.lines.join('\n').includes('10-01-2027'), mon.lines.join(' | '))
  assert.equal(fri.kind, 'howto'); assert.ok(fri.lines.join('\n').includes('10 जनवरी') && !fri.lines.join('\n').includes('31 दिसंबर'), fri.lines.join(' | '))
  assert.ok(fri.lines.join('\n').includes('KVK Sagar, Dr X'), 'the source line names who told us')
  const old = pickSlot('2026-12-04', { data: DATA, env: {} })
  assert.ok(old.lines.join('\n').includes('31 दिसंबर'))
})

test('effect: the late-sowing line shows on rain days (when the irrigation line is hidden) until its last date, then never', () => {
  const r = applyKvk(DATA, [LATE], '2026-12-01')
  const rain = { windows: { h48: { level: 'heavy' } } }
  const seen = []
  for (let i = 0; i < 30; i++) { const d = addDaysIso('2026-12-05', i); const l = pickCalendarLine(r.data.cropCalendar, d, { verdict: rain }); if (l && l.id === 'kvk-wheat-late-sowing') seen.push(d) }
  assert.ok(seen.length >= 3, `shown on ${seen.length} of 30 rain days`)
  const l = pickCalendarLine(r.data.cropCalendar, seen[0], { verdict: rain })
  assert.ok(l.text.includes('देर से बुवाई') && l.text.includes('5 जनवरी तक'))
  for (let i = 0; i < 30; i++) { const d = addDaysIso('2027-01-06', i); const x = pickCalendarLine(r.data.cropCalendar, d, { verdict: rain }); assert.ok(!x || x.id !== 'kvk-wheat-late-sowing', d) }
})

// ---------------------------------------------------------------------------------------------------------------- loader
test('loader: no keys -> []; function missing (404 / PGRST202) -> []; ok -> rows; anything else throws', async () => {
  const mk = (status, body) => async () => ({ status, text: async () => JSON.stringify(body) })
  assert.deepEqual(await loadKvkAnswers({}), [])
  assert.deepEqual(await loadKvkAnswers({ url: 'https://x.supabase.co', key: 'k', fetchImpl: mk(404, { code: 'PGRST202' }) }), [])
  assert.deepEqual(await loadKvkAnswers({ url: 'https://x.supabase.co', key: 'k', fetchImpl: mk(200, [IRR2]) }), [IRR2])
  await assert.rejects(loadKvkAnswers({ url: 'https://x.supabase.co', key: 'k', fetchImpl: mk(500, { message: 'boom' }) }), /http 500/)
  await assert.rejects(loadKvkAnswers({ url: 'https://x.supabase.co', key: 'k', fetchImpl: mk(200, { not: 'an array' }) }), /http 200/)
})

// ---------------------------------------------------------------------------------------------------------------- generator hook (offline)
const run = (date, loaders, env = {}) => { const fx = loadFixture('normal', date); return generate({ date, draft: false, data: DATA, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }), ...loaders }, nowIso: `${date}T01:00:00Z`, env }) }

test('generator: answers are used, reported, and the post is built', async () => {
  const r = await run('2026-12-04', { kvk: async () => [PMFBY] })
  assert.ok(r.report.includes('kvk: pmfby-rabi last date = 2027-01-10'), r.report)
  assert.ok(r.message.includes('10 जनवरी'), 'the Friday how-to shows the KVK date')
  assert.deepEqual(r.warnings.filter((w) => /kvk/.test(w)), [])
})

test('generator: a failing loader leaves the post on the repo data and adds ONE warning (also to the summary list)', async () => {
  const r = await run('2026-12-04', { kvk: async () => { throw new Error('http 500') } })
  assert.ok(r.message.includes('31 दिसंबर'))
  const w = r.warnings.filter((x) => /kvk/.test(x)); assert.equal(w.length, 1); assert.match(w[0], /^WARNING kvk: the saved KVK answers could not be read \(http 500\)/)
  assert.ok(r.report.includes(w[0]))
})

test('generator: a bad row is ignored with a warning; MORNING_CONTENT=off never calls the loader; no loader = no change', async () => {
  const bad = await run('2026-12-04', { kvk: async () => [row('x', 'date', 'pmfby-rabi', { date: 'nope' })] })
  assert.ok(bad.message.includes('31 दिसंबर')); assert.equal(bad.warnings.filter((x) => /kvk/.test(x)).length, 1)
  let called = 0
  await run('2026-12-04', { kvk: async () => { called++; return [PMFBY] } }, { MORNING_CONTENT: 'off' })
  assert.equal(called, 0)
  const none = await run('2026-12-04', {})
  assert.ok(none.message.includes('31 दिसंबर')); assert.deepEqual(none.warnings.filter((x) => /kvk/.test(x)), [])
})

test('no Devanagari in the new logic files (the Hindi lives in strings.hi.js)', () => {
  for (const f of ['scripts/morning/lib/kvk.js', 'src/lib/kvk/kvkRules.js']) {
    const code = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
    assert.ok(!/[ऀ-ॿ]/.test(code), f)
  }
})

test('a late-sowing answer also ends the "late sowing of wheat" window in events.json on the date KVK told; without an answer the window is unchanged', () => {
  const list = (d) => (Array.isArray(d.events) ? d.events : d.events.events)
  const before = list(DATA).find((e) => e.id === 'win-wheat-late')
  assert.equal(before.date_to, '2027-01-05')
  const r = applyKvk(DATA, [row('wheat-late-sowing', 'late_sowing', 'wheat', { last_date: '2026-12-25' })], '2026-12-01')
  const after = list(r.data).find((e) => e.id === 'win-wheat-late')
  assert.equal(after.date_to, '2026-12-25'); assert.equal(after.kvk, true); assert.ok(!('source_url' in after)); assert.match(after.approved_by, /^KVK: /)
  assert.equal(list(DATA).find((e) => e.id === 'win-wheat-late').date_to, '2027-01-05', 'the loaded data is not changed')
  assert.equal(applyKvk(DATA, [], '2026-12-01').data, DATA)
})
