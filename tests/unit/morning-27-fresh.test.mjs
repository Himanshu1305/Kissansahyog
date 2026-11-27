// Batch 27 - the morning post never quotes a deadline that has already passed, approvals can expire, a due irrigation stage always shows,
// and a data file that is about to run dry is reported. The first test group is the exact bug of 27 Nov 2026: the wheat line said "25 November"
// (Hindi text in the data) while its window ran to 5 December.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deadlineDates, staleDeadlines, itemText, hasStaleDeadline, approvalExpired, auditData, auditWarnings, runway, RUNWAY_WARN_DAYS } from '../../scripts/morning/lib/freshness.js'
import { pickCalendarLine } from '../../scripts/morning/lib/workRules.js'
import { upcomingItems, pickSlot } from '../../scripts/morning/lib/content.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'
import { addDays } from '../../scripts/morning/lib/ist.js'
import { S } from '../../scripts/morning/strings.hi.js'

const DATA = loadData()
const M = (n) => S.months[n - 1]
const dl = (d, mo, word = S.deadlineWords[0]) => `${d} ${M(mo)} ${word}`

test('deadline dates: "<d> <month> until/before" is a deadline; ranges of past sowing dates and look-alike words are not', () => {
  assert.deepEqual(deadlineDates(`गेहूं ${dl(25, 11)} बो लें`, '2026-11-27').map((x) => x.iso), ['2026-11-25'])
  assert.deepEqual(deadlineDates(`पंजीकरण ${dl(5, 12, S.deadlineWords[1])} करें`, '2026-11-27').map((x) => x.iso), ['2026-12-05'])
  assert.deepEqual(deadlineDates(`${M(11)} में 1 ${M(11)} से 6 ${M(11)} के बीच बोई गेहूं`, '2026-11-27'), [], 'a range of past sowing dates is not a deadline')
  assert.deepEqual(deadlineDates(`25 ${M(11)} तकनीक`, '2026-11-27'), [], 'a longer word that starts with the deadline word is not a deadline')
  assert.deepEqual(deadlineDates(null, '2026-11-27'), []); assert.deepEqual(deadlineDates(42, '2026-11-27'), [])
})

test('deadline dates: spelling variants (with and without the nukta, the other October spelling) are read; the year is the nearest one', () => {
  assert.deepEqual(deadlineDates('15 फरवरी तक', '2027-01-20').map((x) => x.iso), ['2027-02-15'])
  assert.deepEqual(deadlineDates('15 फ़रवरी तक', '2027-01-20').map((x) => x.iso), ['2027-02-15'])
  assert.deepEqual(deadlineDates('31 अक्तूबर तक', '2026-10-01').map((x) => x.iso), ['2026-10-31'])
  assert.deepEqual(deadlineDates('10 जनवरी तक', '2026-12-28').map((x) => x.iso), ['2027-01-10'], 'December text, January deadline = next year')
  assert.deepEqual(deadlineDates('28 दिसंबर तक', '2027-01-03').map((x) => x.iso), ['2026-12-28'], 'January text, December deadline = last year')
})

test('staleDeadlines: over only AFTER the day itself (the deadline day is still fine)', () => {
  const t = `बो लें ${dl(25, 11)}`
  assert.equal(staleDeadlines(t, '2026-11-24').length, 0); assert.equal(staleDeadlines(t, '2026-11-25').length, 0)
  assert.equal(staleDeadlines(t, '2026-11-26').length, 1); assert.equal(staleDeadlines(t, '2026-11-27').length, 1)
})

test('the 27 Nov bug, as data: the OLD wheat line (text 25 Nov, window to 5 Dec) is caught by the audit and never used', () => {
  const OLD = { id: 's01', from: '2026-11-10', to: '2026-12-05', reviewed: true, text_hi: `गेहूं अभी बोना बाकी हो तो ${dl(25, 11)} बो लें; उसके बाद देर से बुवाई (1 ${M(12)}-5 ${M(1)}) में बीज 25% ज़्यादा लगता है` }
  const cal = { crop: 'wheat', sowing_dates: { from: '2026-10-20', to: '2027-01-05', reviewed: true }, stages: [], static: [OLD, { id: 's02', from: '2026-11-10', to: '2026-12-31', reviewed: true, text_hi: 'x' }] }
  const a = auditData({ ...DATA, cropCalendar: cal }, '2026-11-27')
  assert.equal(a.stale.length, 1); assert.equal(a.stale[0].id, 's01')
  assert.equal(a.windowProblems.length, 1); assert.equal(a.windowProblems[0].id, 's01'); assert.equal(a.windowProblems[0].shownUntil, '2026-12-05')
  // run time: on 27 Nov the old line is not picked; only s02 is left
  assert.equal(pickCalendarLine(cal, '2026-11-27').id, 's02')
  // and on 24 Nov (deadline not over yet) it IS allowed
  assert.ok(['s01', 's02'].includes(pickCalendarLine(cal, '2026-11-24').id))
  assert.ok(hasStaleDeadline(OLD, '2026-11-27')); assert.ok(!hasStaleDeadline(OLD, '2026-11-24'))
})

test('the real data files: no item can be shown after a deadline written in its own text (every file, every item)', () => {
  const a = auditData(DATA, '2026-11-27')
  assert.deepEqual(a.windowProblems, [], 'fix the window or the text of: ' + JSON.stringify(a.windowProblems))
  assert.deepEqual(a.stale, [], 'an item that can be shown today quotes a deadline that is over: ' + JSON.stringify(a.stale))
})

test('itemText reads wording only: ids, sources, approval stamps and window dates are not text', () => {
  const t = itemText({ id: 'x', from: '2026-01-01', to: '2026-02-01', text_hi: 'abc', source_name: 'Src', approved_by: 'founder, 2026-11-10', reviewed: true, lines_hi: ['l1', 'l2'], howto: { steps_hi: ['s1'], last_date: '2026-12-01' } })
  assert.equal(t, 'abc \n l1 \n l2 \n s1'); assert.ok(!t.includes('Src') && !t.includes('founder'))
})

test('approvals expire: review_expires ends use on the day after, in the calendar and in the slot pickers', () => {
  assert.ok(!approvalExpired({ review_expires: '2026-11-30' }, '2026-11-30')); assert.ok(approvalExpired({ review_expires: '2026-11-30' }, '2026-12-01')); assert.ok(!approvalExpired({}, '2030-01-01'))
  const cal = { sowing_dates: { from: '2026-10-20', to: '2027-01-05', reviewed: true }, stages: [], static: [{ id: 's9', from: '2026-11-01', to: '2026-12-31', reviewed: true, review_expires: '2026-11-30', text_hi: 'क' }] }
  assert.equal(pickCalendarLine(cal, '2026-11-30').id, 's9'); assert.equal(pickCalendarLine(cal, '2026-12-01'), null)
  const data = { events: [{ id: 'e1', reviewed: true, kind: 'event', scope: 'near', date: '2026-12-20', title_hi: 'मेला', review_expires: '2026-12-01' }] }
  assert.equal(upcomingItems('2026-11-30', data, false).length, 1); assert.equal(upcomingItems('2026-12-02', data, false).length, 0)
  // an event whose own title quotes a passed deadline is held back as well
  const data2 = { events: [{ id: 'e2', reviewed: true, kind: 'event', scope: 'near', date: '2026-12-20', title_hi: `पंजीकरण ${dl(25, 11)}` }] }
  assert.equal(upcomingItems('2026-11-24', data2, false).length, 1); assert.equal(upcomingItems('2026-11-27', data2, false).length, 0)
})

test('priority: a due irrigation stage shows EVERY day it is due (no static line takes its place), rain still hides it', () => {
  const cal = { sowing_dates: { from: '2026-10-20', to: '2027-01-05', reviewed: true }, stages: [{ id: 'irr1', label_hi: 'पहली सिंचाई', das_from: 20, das_to: 25, reviewed: true }], static: [{ id: 's9', from: '2026-11-01', to: '2026-12-31', reviewed: true, text_hi: 'क' }], rain_hold: { id: 'rain_hold', text_hi: 'ख', reviewed: true } }
  for (let d = '2026-11-20'; d <= '2026-12-20'; d = addDays(d, 1)) assert.equal(pickCalendarLine(cal, d).id, 'irr1', d)
  const v = { spray: { status: 'ok', reasonKey: '' }, harvest: { status: 'ok' }, windows: { h48: { level: 'heavy' } } }
  assert.notEqual(pickCalendarLine(cal, '2026-12-02', { verdict: v }).id, 'irr1')
})

test('runway: the report says how many days each file has left; under 30 days is a warning, 30 and over is not', () => {
  const data = { cropCalendar: { sowing_dates: { from: '2026-10-20', to: '2027-01-05' }, stages: [{ das_to: 85 }] }, events: [{ id: 'a', reviewed: true, date: '2026-12-20' }, { id: 'b', reviewed: false, date: '2027-06-01' }], schemes: [], moneyFacts: [{ id: 'm', reviewed: true, show_until: '2027-03-01' }] }
  const r = Object.fromEntries(runway(data, '2026-12-01').map((x) => [x.file, x]))
  assert.equal(r['events.json'].lastDay, '2026-12-20', 'unreviewed items do not count'); assert.equal(r['events.json'].daysLeft, 19)
  assert.equal(r['crop-calendar.json (irrigation lines)'].lastDay, '2027-03-31')
  const w = auditWarnings({ stale: [], windowProblems: [], runway: runway(data, '2026-12-01') })
  assert.equal(w.length, 1); assert.match(w[0], /events\.json has 19 day\(s\) left/)
  assert.equal(RUNWAY_WARN_DAYS, 30)
  assert.deepEqual(auditWarnings({ stale: [], windowProblems: [], runway: [{ file: 'x', lastDay: '2027-01-30', daysLeft: 30 }] }), [])
})

test('the report carries the warnings, and the same list comes back as result.warnings (run.mjs puts it on the GitHub summary)', async () => {
  const date = '2026-12-03', fx = loadFixture('normal', date)
  const old = JSON.parse(JSON.stringify(DATA)); old.cropCalendar.static[0].to = '2026-12-05' // the pre-fix window of the 27 Nov bug
  const r = await generate({ date, draft: false, data: old, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, nowIso: `${date}T01:00:00Z`, env: {} })
  assert.ok(r.warnings.some((w) => /^WARNING freshness: crop-calendar\.json item s01/.test(w)), r.warnings.join('\n'))
  assert.ok(r.warnings.some((w) => /^WARNING data: crop-calendar\.json item s01 can still be shown/.test(w)))
  assert.ok(r.report.includes('WARNING freshness: crop-calendar.json item s01'))
  assert.equal(staleDeadlines(r.message, date).length, 0, 'and the message itself has no passed deadline')
})

test('MORNING_CONTENT=off: no audit, no warnings (the old post exactly as before)', async () => {
  const date = '2026-12-03', fx = loadFixture('normal', date)
  const r = await generate({ date, draft: false, data: DATA, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, nowIso: `${date}T01:00:00Z`, env: { MORNING_CONTENT: 'off' } })
  assert.deepEqual(r.warnings, [])
})

test('THE SWEEP: 120 days from 27 Nov 2026 with the real data - no generated message quotes a deadline that is over, and none is empty of the "work" line', async () => {
  let bad = [], noWork = [], n = 0
  for (let date = '2026-11-27'; n < 120; date = addDays(date, 1), n++) {
    const fx = loadFixture('normal', date)
    const r = await generate({ date, draft: false, data: DATA, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, nowIso: `${date}T01:00:00Z`, env: {} })
    for (const d of staleDeadlines(r.message, date)) bad.push(`${date}: ${d.raw}`)
    for (const d of staleDeadlines(r.poll || '', date)) bad.push(`${date} (poll): ${d.raw}`)
    if (!r.taskFired || !r.taskFired.some((f) => f.startsWith('calendar:')) && date <= '2027-03-31') noWork.push(date)
  }
  assert.deepEqual(bad, [], 'past deadlines in generated posts')
  assert.deepEqual(noWork, [], 'days with no calendar line at all (the calendar has run dry - see the runway warning)')
})
