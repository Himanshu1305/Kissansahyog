// Batch 21B - the task line says what comes AFTER sowing: a rolling cohort line computed from dates (irrigation stages irr1, irr2, irr3) and two static lines.
// Irrigation (cohort) lines are hidden when the 48-hour rain level is light or higher; rain_hold is shown instead. Static lines are never hidden.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pickCalendarLine, pickDayTasks, pickTasks, dueStages, rainHidesIrrigation, MAX_WEATHER_TASKS_WITH_CALENDAR } from '../../scripts/morning/lib/workRules.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'
import { S, fmt } from '../../scripts/morning/strings.hi.js'
import { OLD_DATA_DIR } from './helpers/contentOff.mjs'
import { addDays } from '../../scripts/morning/lib/ist.js'
import { BANNERS } from '../../src/content/kamPani.js'
import { LEVELS } from '../../src/lib/weather/rainVerdict.js'

const RULES = JSON.parse(readFileSync('data/morning/work-rules.json', 'utf8'))
const CAL = JSON.parse(readFileSync('tests/unit/fixtures/morning-data-pre-approval/crop-calendar.json', 'utf8'))
const yes = (o) => ({ ...o, reviewed: true })
const REVIEWED = { ...CAL, sowing_dates: yes(CAL.sowing_dates), stages: CAL.stages.map(yes), static: CAL.static.map(yes), rain_hold: yes(CAL.rain_hold) }
const S01 = CAL.static[0].text_hi, S02 = CAL.static[1].text_hi, HOLD = CAL.rain_hold.text_hi
const verdict = (level48 = 'dry', o = {}) => ({ spray: { status: 'ok', reasonKey: '' }, harvest: { status: 'ok' }, windows: { h48: { level: level48 } }, ...o })
const day = (o = {}) => ({ date: '2026-12-10', tmin: 12, tmax: 26, windMax: 10, ...o })
const ep = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86400000)
const cohortText = (stage, a, b) => fmt(S.cohortLine, { a: fmt(S.dataDateLabel, { d: Number(a.slice(8)), m: S.months[Number(a.slice(5, 7)) - 1] }), b: fmt(S.dataDateLabel, { d: Number(b.slice(8)), m: S.months[Number(b.slice(5, 7)) - 1] }), stage: stage.label_hi, x: stage.das_from, y: stage.das_to })
const due = (d) => dueStages(REVIEWED, d).map((x) => [x.stage.id, x.a, x.b])
const isCohort = (l) => l && l.cohort != null
// a day where the 3rd-day rule does NOT swap in a static line
const notThird = (d) => ep(d) % 3 !== 0
const nextDay = (d, pred) => { while (!pred(d)) d = addDays(d, 1); return d }

test('the new shape: sowing_dates, three stages with sources, two static lines, rain_hold kept; all unreviewed; w01-w10 are gone', () => {
  assert.deepEqual(CAL.sowing_dates, { from: '2026-10-20', to: '2027-01-05', basis: 'main sowing by 7 Nov 2026 per founder/farmer feedback; late sowing to 5 Jan per Krishisewa; KVK Sagar to confirm', reviewed: false })
  assert.deepEqual(CAL.stages.map((s) => [s.id, s.label_hi, s.das_from, s.das_to]), [['irr1', 'पहली सिंचाई', 20, 25], ['irr2', 'दूसरी सिंचाई', 50, 55], ['irr3', 'तीसरी सिंचाई', 80, 85]])
  for (const s of [...CAL.stages, ...CAL.static]) { assert.equal(s.source_name, 'Krishisewa (KVK Sagar to confirm)'); assert.match(s.source_url, /krishisewa\.com/); assert.equal(s.reviewed, false) }
  assert.deepEqual(CAL.static.map((s) => [s.id, s.from, s.to]), [['s01', '2026-11-10', '2026-12-05'], ['s02', '2026-11-10', '2026-12-31']])
  assert.equal(CAL.rain_hold.text_hi, 'बारिश आने वाली है: सिंचाई का फ़ैसला खेत की नमी देखकर करें'); assert.equal(CAL.rain_hold.reviewed, false)
  assert.ok(!('entries' in CAL)); assert.ok(!JSON.stringify(CAL).includes('"w0'))
})

test('arithmetic: cohort = [D - das_to, D - das_from], clipped to sowing_dates (exact dates from the brief)', () => {
  assert.deepEqual(due('2026-11-14'), [['irr1', '2026-10-20', '2026-10-25']], 'clipped to the season start (10-20 would be D-25 exactly)')
  assert.deepEqual(due('2026-12-02'), [['irr1', '2026-11-07', '2026-11-12']])
  assert.ok(due('2026-12-14').some((x) => x[0] === 'irr2' && x[1] === '2026-10-20' && x[2] === '2026-10-25'), 'irr2 reaches the earliest cohort')
  assert.deepEqual(due('2027-01-31').find((x) => x[0] === 'irr3'), ['irr3', '2026-11-07', '2026-11-12'])
  // clipping at the start: before the first cohort is complete, the window is cut
  assert.deepEqual(due('2026-11-12'), [['irr1', '2026-10-20', '2026-10-23']], 'D-25 = 10-18 is clipped up to 10-20')
  assert.deepEqual(due('2026-11-09'), [['irr1', '2026-10-20', '2026-10-20']], 'the first sower only'); assert.deepEqual(due('2026-11-08'), [], 'nobody is due yet')
  // clipping at the end (sowing_dates.to = 2027-01-05)
  assert.deepEqual(due('2027-01-28').find((x) => x[0] === 'irr1'), ['irr1', '2027-01-03', '2027-01-05'], 'cut at sowing_dates.to')
  assert.deepEqual(due('2027-01-31').filter((x) => x[0] === 'irr1'), [])
  assert.deepEqual(due('2027-02-20').map((x) => x[0]), ['irr2', 'irr3'])
  // after sowing_dates.to + das_to nothing is due
  assert.deepEqual(due(addDays('2027-01-05', 85 + 1)), []); assert.deepEqual(due(addDays('2027-01-05', 85)), [['irr3', '2027-01-05', '2027-01-05']])
  assert.deepEqual(due('2026-10-20'), [])
})

test('the Hindi cohort line: dates from S.months, stage label, days after sowing - only in strings.hi.js', () => {
  assert.equal(S.cohortLine, '{a} से {b} के बीच बोई गेहूं की {stage} का समय अब है (बुवाई के {x}-{y} दिन बाद)')
  const d = nextDay('2026-12-02', notThird)
  const l = pickCalendarLine(REVIEWED, d)
  assert.equal(l.id, 'irr1'); assert.deepEqual(l.cohort, { from: addDays(d, -25), to: addDays(d, -20) })
  assert.equal(l.text, cohortText(CAL.stages[0], addDays(d, -25), addDays(d, -20))); assert.match(l.text, /बोई गेहूं की पहली सिंचाई का समय अब है \(बुवाई के 20-25 दिन बाद\)$/)
  assert.equal(l.source, 'calendar:irr1')
  assert.equal(pickCalendarLine(REVIEWED, '2026-12-02', { draft: false })?.text.includes('7 नवंबर') || ep('2026-12-02') % 3 === 0, true)
})

test('two stages due the same day: the EARLIER stage is shown', () => {
  for (let d = '2026-12-10'; d < '2027-01-20'; d = addDays(d, 1)) {
    const all = due(d)
    if (all.length > 1 && notThird(d)) { const l = pickCalendarLine(REVIEWED, d); assert.equal(l.id, all[0][0], d); assert.equal(l.id, 'irr1' === all[0][0] ? 'irr1' : all[0][0]) }
  }
  const d = nextDay('2026-12-14', (x) => notThird(x) && due(x).length > 1)
  assert.ok(due(d).length > 1, 'a day with two stages exists'); assert.equal(pickCalendarLine(REVIEWED, d).id, due(d)[0][0]); assert.ok(due(d)[0][0] < due(d)[1][0])
})

test('Batch 27: a due stage ALWAYS shows (no 3rd-day swap any more); static lines never take its place while it is due and rain is not coming', () => {
  for (let d = '2026-11-14'; d <= '2026-12-04'; d = addDays(d, 1)) { // s01 and s02 are both eligible here, a stage is due every day
    const l = pickCalendarLine(REVIEWED, d)
    assert.ok(isCohort(l), `${d} cohort (daysSinceEpoch % 3 = ${ep(d) % 3})`)
  }
  // with no eligible static line the cohort line shows every day, as before
  const noStatic = { ...REVIEWED, static: [] }
  for (let d = '2026-11-14'; d <= '2026-12-04'; d = addDays(d, 1)) assert.ok(isCohort(pickCalendarLine(noStatic, d)), d)
})

test('no stage due: the static lines rotate; with nothing eligible there is no line', () => {
  const noStage = { ...REVIEWED, stages: [] } // static-only days (a stage is always due in Nov-Feb for the real dates)
  const l = pickCalendarLine(noStage, '2026-11-10'); assert.ok(['s01', 's02'].includes(l.id))
  assert.equal(pickCalendarLine(REVIEWED, '2027-04-01'), null); assert.equal(pickCalendarLine(REVIEWED, '2026-10-01'), null)
  assert.equal(pickCalendarLine(null, '2026-11-10'), null)
})

test('static lines rotate; the same line is never shown two days in a row while more than one is eligible (1 Nov 2026 - 20 Feb 2027, dry); the days that repeat are reported', () => {
  const repeats = []; let prev = null, pairs = 0
  for (let d = '2026-11-01'; d <= '2027-02-20'; d = addDays(d, 1)) {
    const l = pickCalendarLine(REVIEWED, d)
    if (l && prev && prev.l) {
      const kBoth = staticCount(prev.d) > 1 && staticCount(d) > 1
      if (kBoth) pairs++
      if (l.id === prev.l.id && !isCohort(l)) repeats.push(`${prev.d}/${d}:${l.id} (k ${staticCount(prev.d)},${staticCount(d)})`)
    }
    prev = { d, l }
  }
  assert.ok(pairs >= 20, `${pairs} pairs with k > 1 on both days`)
  assert.deepEqual(repeats.filter((r) => /k [2-9],[2-9]/.test(r)), [], 'no repeat while more than one static line is eligible')
  // cohort lines repeat their id, but their dates differ every day
  for (let d = '2026-11-14'; d < '2027-02-20'; d = addDays(d, 1)) { const a = pickCalendarLine(REVIEWED, d), b = pickCalendarLine(REVIEWED, addDays(d, 1)); if (isCohort(a) && isCohort(b)) assert.notEqual(a.text, b.text, `${d}: same cohort text two days in a row`) }
  console.log(`days where the same line repeats (k = 1 only): ${repeats.length ? repeats.join('; ') : 'none'}`)
})
function staticCount(d) { return REVIEWED.static.filter((e) => e.from <= d && d <= e.to).length + 0 }

test('works after the sowing banner date (BANNERS.sowing.validUntil): 2026-12-05 and 2027-01-10 have a line', () => {
  assert.equal(BANNERS.sowing.validUntil, '2026-11-15')
  for (const d of ['2026-12-05', '2027-01-10']) {
    assert.ok(d >= BANNERS.sowing.validUntil)
    const r = pickDayTasks(RULES, REVIEWED, d, day({ date: d }), { sowingOpen: false, verdict: verdict() })
    assert.ok(r.source.startsWith('calendar:'), d); assert.equal(r.tasks.length, 1); assert.deepEqual(r.fired, [r.source])
  }
})

test('gate: unreviewed sowing_dates OR unreviewed stage = no cohort line live; draft shows it and lists the ids', () => {
  const d = nextDay('2026-12-02', notThird)
  assert.equal(pickCalendarLine(CAL, d), null, 'all unreviewed: nothing live')
  const noSd = { ...REVIEWED, sowing_dates: CAL.sowing_dates, static: [] }
  assert.equal(pickCalendarLine(noSd, d), null)
  const noStage = { ...REVIEWED, stages: CAL.stages, static: [] }
  assert.equal(pickCalendarLine(noStage, d), null)
  const dr = pickCalendarLine(CAL, d, { draft: true })
  assert.ok(isCohort(dr)); assert.equal(dr.unreviewed, true); assert.deepEqual(dr.unreviewedIds, ['sowing_dates', 'irr1'])
  assert.deepEqual(pickCalendarLine({ ...REVIEWED, sowing_dates: CAL.sowing_dates }, d, { draft: true }).unreviewedIds, ['sowing_dates'])
  assert.deepEqual(pickCalendarLine({ ...REVIEWED, stages: CAL.stages }, d, { draft: true }).unreviewedIds, ['irr1'])
  assert.equal(pickCalendarLine(REVIEWED, d, { draft: true }).unreviewed, false)
  // a reviewed static line shows live even when the cohort data is not reviewed
  const onlyStatic = { ...CAL, static: CAL.static.map(yes) }
  assert.ok(['s01', 's02'].includes(pickCalendarLine(onlyStatic, d).id))
})

test('a static line marked too_long (or lint_blocked) is not eligible until a reviewer fixes it', () => {
  const c = { ...REVIEWED, stages: [], static: [{ ...CAL.static[0], reviewed: true, too_long: true }] }
  assert.equal(pickCalendarLine(c, '2026-11-10'), null); assert.equal(pickCalendarLine(c, '2026-11-10', { draft: true }), null)
})

test('fallback: with no reviewed line the old sowing_season rule fires exactly as before (and after 15 Nov there is nothing)', () => {
  const old = pickTasks(RULES, day(), { sowingOpen: true, verdict: verdict() })
  assert.deepEqual(old.tasks, ['बुवाई वाले खेत में नमी जाँचें'])
  const r = pickDayTasks(RULES, CAL, '2026-11-12', day({ date: '2026-11-12' }), { sowingOpen: true, verdict: verdict() })
  assert.deepEqual(r.tasks, old.tasks); assert.equal(r.source, 'fallback:sowing_season'); assert.deepEqual(r.fired, ['fallback:sowing_season']); assert.equal(r.calendar, null)
  const after = pickDayTasks(RULES, CAL, '2026-12-05', day(), { sowingOpen: false, verdict: verdict() })
  assert.deepEqual(after.tasks, []); assert.equal(after.source, null)
  const both = pickDayTasks(RULES, REVIEWED, '2026-11-12', day({ date: '2026-11-12' }), { sowingOpen: true, verdict: verdict() })
  assert.ok(!both.tasks.includes('बुवाई वाले खेत में नमी जाँचें')); assert.equal(both.tasks.length, 1)
})

test('weather rules come first; at most 2 weather tasks plus the calendar line (max_tasks stays 3)', () => {
  const d = nextDay('2026-12-02', notThird)
  const rain = pickDayTasks(RULES, REVIEWED, d, day({ date: d }), { sowingOpen: false, verdict: verdict('moderate') })
  assert.equal(rain.tasks[0], 'खेत से पानी निकलने की नाली साफ़ रखें'); assert.equal(rain.tasks.length, 2)
  const cold = pickDayTasks(RULES, REVIEWED, d, day({ date: d, tmin: 4 }), { sowingOpen: false, verdict: verdict() })
  assert.match(cold.tasks[0], /पाले का ध्यान/); assert.match(cold.tasks.at(-1), /सिंचाई का समय अब है/)
  assert.equal(RULES.max_tasks, 3); assert.equal(MAX_WEATHER_TASKS_WITH_CALENDAR, 2)
  const v = verdict('moderate', { spray: { status: 'stop', reasonKey: 'aw_spray_stop_rain' }, harvest: { status: 'stop' } })
  const w = pickDayTasks(RULES, REVIEWED, d, day({ date: d, windMax: 30 }), { sowingOpen: false, verdict: v })
  assert.equal(w.tasks.length, 3); assert.deepEqual(w.tasks.slice(0, 2), ['दवा-खाद का छिड़काव बारिश रुकने के बाद करें', 'कटी फसल और अनाज ढककर रखें']); assert.equal(w.tasks[2], HOLD)
  const noCal = pickDayTasks(RULES, CAL, d, day({ date: d, windMax: 30 }), { sowingOpen: false, verdict: v })
  assert.equal(noCal.tasks.length, 3); assert.equal(noCal.source, null)
  assert.deepEqual(pickDayTasks(RULES, REVIEWED, d, null, { sowingOpen: false, verdict: null }).tasks.length, 1, 'no forecast: weather rules skipped, calendar line stays')
})

// ---------------------------------------------------------------------------------------------------------------------------------
// The rain rule: cohort lines ARE the irrigation lines
test('rain: the rule is "48-hour level light or more"; dry and drizzle do not hide, no forecast does not hide', () => {
  assert.deepEqual(LEVELS, ['dry', 'drizzle', 'light', 'moderate', 'heavy'])
  for (const l of ['dry', 'drizzle']) assert.equal(rainHidesIrrigation(verdict(l)), false, l)
  for (const l of ['light', 'moderate', 'heavy']) assert.equal(rainHidesIrrigation(verdict(l)), true, l)
  assert.equal(rainHidesIrrigation(null), false)
})

test('rain: the cohort line (irr1, irr2, irr3) is hidden at light, moderate and heavy and rain_hold shows instead; dry and drizzle show the cohort line', () => {
  const probes = { irr1: '2026-12-02', irr2: '2026-12-30', irr3: '2027-02-20' }
  for (const [id, start] of Object.entries(probes)) {
    const d = nextDay(start, (x) => notThird(x) && pickCalendarLine(REVIEWED, x)?.id === id)
    for (const lvl of ['dry', 'drizzle']) { const l = pickCalendarLine(REVIEWED, d, { verdict: verdict(lvl) }); assert.ok(isCohort(l) && l.id === id, `${id} ${lvl}`); assert.equal(l.hidden.length, 0) }
    for (const lvl of ['light', 'moderate', 'heavy']) {
      for (let off = 0; off < 8; off++) {
        const dd = addDays(d, off)
        if (!due(dd).length) continue
        const t = pickCalendarLine(REVIEWED, dd, { verdict: verdict(lvl) })
        assert.ok(!isCohort(t), `${dd} ${lvl}: no cohort/irrigation line in rain`); assert.ok(!/सिंचाई का समय अब है/.test(t.text), `${dd} ${lvl}`); assert.deepEqual(t.hidden, [due(dd).find(() => true)[0]])
        assert.ok(['rain_hold', 's01', 's02'].includes(t.id))
      }
    }
  }
  // where no static line is eligible (after 31 Dec), rain_hold is THE line
  for (const lvl of ['light', 'moderate', 'heavy']) { const t = pickCalendarLine(REVIEWED, '2027-01-12', { verdict: verdict(lvl) }); assert.equal(t.id, 'rain_hold'); assert.equal(t.text, HOLD) }
})

test('rain: static lines and days with no stage due are never hidden by rain', () => {
  for (const lvl of ['dry', 'light', 'heavy']) {
    const l = pickCalendarLine({ ...REVIEWED, stages: [] }, '2026-11-10', { verdict: verdict(lvl) })
    assert.ok(['s01', 's02'].includes(l.id), lvl); assert.equal(l.hidden.length, 0)
  }
  // on a 3rd-day static swap the static line shows in rain too
  const d = nextDay('2026-11-20', (x) => ep(x) % 3 === 0)
  assert.ok(['s01', 's02', 'rain_hold'].includes(pickCalendarLine(REVIEWED, d, { verdict: verdict('heavy') }).id))
})

test('rain: in rain the static lines and rain_hold rotate and never repeat two days running; the cohort text never shows', () => {
  const ids = []
  for (let d = '2026-11-20'; d <= '2026-12-04'; d = addDays(d, 1)) ids.push(pickCalendarLine(REVIEWED, d, { verdict: verdict('light') }).id)
  assert.ok(ids.every((i) => ['s01', 's02', 'rain_hold'].includes(i)))
  for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1])
})

test('rain: rain_hold is review-gated; unreviewed it is not shown live, the cohort line is still hidden, the old rule takes over', () => {
  const noHold = { ...REVIEWED, static: [], rain_hold: CAL.rain_hold }
  const d = nextDay('2026-12-02', notThird)
  assert.equal(pickCalendarLine(noHold, d, { verdict: verdict('light') }), null)
  const dr = pickCalendarLine(noHold, d, { verdict: verdict('light'), draft: true }); assert.equal(dr.id, 'rain_hold'); assert.deepEqual(dr.unreviewedIds, ['rain_hold'])
  assert.deepEqual(pickDayTasks(RULES, noHold, d, day({ date: d }), { sowingOpen: false, verdict: verdict('light') }).tasks, [])
  assert.equal(pickDayTasks(RULES, noHold, d, day({ date: d }), { sowingOpen: true, verdict: verdict('light') }).source, 'fallback:sowing_season')
})

test('rain: weather safety first on a rainy irrigation day, then the static line / rain_hold', () => {
  const d = '2027-01-12'
  const r = pickDayTasks(RULES, REVIEWED, d, day({ date: d }), { sowingOpen: false, verdict: verdict('moderate') })
  assert.deepEqual(r.tasks, ['खेत से पानी निकलने की नाली साफ़ रखें', HOLD]); assert.deepEqual(r.fired, ['rain_drain', 'calendar:rain_hold'])
})

test('rain: no forecast (verdict null) cannot know about rain, so the cohort line is shown as normal', () => {
  const d = nextDay('2026-12-02', notThird)
  assert.ok(isCohort(pickCalendarLine(REVIEWED, d, { verdict: null })))
})

// ---- end to end through generate()
const run = async (date, { tomorrowMm = 0, draft = false, data } = {}) => {
  const fx = loadFixture('normal', date)
  const w = { ...fx.weather, days: fx.weather.days.map((d, i) => ({ ...d, rainMm: i === 1 ? tomorrowMm : d.rainMm, rainProb: i === 1 && tomorrowMm > 0 ? 70 : d.rainProb })) }
  return generate({ date, draft, data: data || { ...loadData(OLD_DATA_DIR), cropCalendar: REVIEWED }, loaders: { weather: async () => w, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, nowIso: `${date}T01:00:00Z`, env: {} })
}
test('end to end: cohort line on a dry day; rain_hold when the 48-hour rain is light or more (report says so); drizzle keeps the cohort line', async () => {
  const date = nextDay('2026-12-10', notThird)
  const dry = await run(date)
  assert.equal(dry.model.verdict.windows.h48.level, 'dry'); assert.match(dry.message, /बोई गेहूं की .* सिंचाई का समय अब है/); assert.match(dry.report, /rules fired: calendar:irr\d/)
  const wet = await run(date, { tomorrowMm: 6 })
  assert.ok(LEVELS.indexOf(wet.model.verdict.windows.h48.level) >= LEVELS.indexOf('light'))
  assert.ok(!/सिंचाई का समय अब है/.test(wet.message)); assert.match(wet.report, /irrigation line hidden \(irr\d\)/)
  assert.ok(wet.message.includes(HOLD) || wet.message.includes(S01) || wet.message.includes(S02) || wet.taskSource === null)
  assert.deepEqual(wet.violations, []); assert.ok(wet.message.length <= 1500)
  const drizzle = await run(date, { tomorrowMm: 1.5 })
  assert.equal(drizzle.model.verdict.windows.h48.level, 'drizzle'); assert.match(drizzle.message, /सिंचाई का समय अब है/)
})

test('end to end: live gate - the real seeded calendar (all unreviewed) shows nothing from the calendar; --draft shows the cohort line with the WARNING ids', async () => {
  const date = nextDay('2026-12-02', notThird)
  const live = await run(date, { data: loadData(OLD_DATA_DIR) })
  assert.equal(live.taskSource, null); assert.ok(!/सिंचाई का समय अब है/.test(live.message)); assert.equal(live.warn, null)
  const draft = await run(date, { draft: true, data: loadData(OLD_DATA_DIR) })
  assert.match(draft.message, /सिंचाई का समय अब है/); assert.match(draft.warn, /calendar:sowing_dates, calendar:irr1/)
})

test('S01 and S02 are plain static lines (no dates computed) and are not irrigation lines', () => {
  assert.ok(S01.includes('25 नवंबर') && S02.includes('तारीख़'))
  assert.ok(!REVIEWED.static.some((e) => e.irrigation_stage))
})
