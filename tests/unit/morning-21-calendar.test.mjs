// Batch 21 Part 4 - the task line follows the wheat crop-stage calendar; irrigation-stage lines (irr1, irr2, irr3) are hidden when
// the 48-hour rain level is light or higher and a static line is shown instead.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pickCalendarLine, pickDayTasks, pickTasks, rainHidesIrrigation, MAX_WEATHER_TASKS_WITH_CALENDAR } from '../../scripts/morning/lib/workRules.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'
import { addDays, daysBetween } from '../../scripts/morning/lib/ist.js'
import { BANNERS } from '../../src/content/kamPani.js'
import { LEVELS } from '../../src/lib/weather/rainVerdict.js'

const RULES = JSON.parse(readFileSync('data/morning/work-rules.json', 'utf8'))
const CAL = JSON.parse(readFileSync('data/morning/crop-calendar.json', 'utf8'))
// the real calendar as if a person had reviewed everything (and shortened w05): used to test the logic on the real dates
const REVIEWED = { ...CAL, entries: CAL.entries.map((e) => { const { too_long, ...r } = e; return { ...r, reviewed: true } }), rain_hold: { ...CAL.rain_hold, reviewed: true } }
const TEXT = Object.fromEntries(CAL.entries.map((e) => [e.id, e.text_hi]))
const HOLD = CAL.rain_hold.text_hi
const verdict = (level48 = 'dry', o = {}) => ({ spray: { status: 'ok', reasonKey: '' }, harvest: { status: 'ok' }, windows: { h48: { level: level48 } }, ...o })
const day = (o = {}) => ({ date: '2026-12-10', tmin: 12, tmax: 26, windMax: 10, ...o })
const IRR = REVIEWED.entries.filter((e) => e.irrigation_stage)
const cal = (entries, o = {}) => ({ entries: entries.map((e) => ({ reviewed: true, text_hi: e.id, ...e })), ...o })
const win = (id, from, to, o = {}) => ({ id, from, to, ...o })

test('the irrigation stage lines are w07, w08 (irr1), w09 (irr2), w10 (irr3); the plan lines w02 and w04 are not', () => {
  assert.deepEqual(CAL.entries.filter((e) => e.irrigation_stage).map((e) => [e.id, e.irrigation_stage]), [['w07', 'irr1'], ['w08', 'irr1'], ['w09', 'irr2'], ['w10', 'irr3']])
})

test('calendar: the entry whose window holds today is picked (IST date, from..to inclusive)', () => {
  assert.equal(pickCalendarLine(REVIEWED, '2026-11-01').id, 'w01'); assert.equal(pickCalendarLine(REVIEWED, '2026-11-09').id, 'w01')
  assert.ok(['w02', 'w03', 'w04', 'w05'].includes(pickCalendarLine(REVIEWED, '2026-11-10').id))
  assert.equal(pickCalendarLine(REVIEWED, '2026-10-31'), null, 'before the first window')
  assert.equal(pickCalendarLine(REVIEWED, '2027-02-19'), null, 'after the last window')
  const l = pickCalendarLine(REVIEWED, '2026-12-10'); assert.equal(l.id, 'w07'); assert.equal(l.source, 'calendar:w07'); assert.equal(l.text, TEXT.w07)
})

test('calendar: only reviewed entries show; --draft shows the unreviewed ones and says so', () => {
  assert.equal(pickCalendarLine(CAL, '2026-11-02'), null)
  const d = pickCalendarLine(CAL, '2026-11-02', { draft: true })
  assert.equal(d.id, 'w01'); assert.equal(d.unreviewed, true)
  assert.equal(pickCalendarLine(REVIEWED, '2026-11-02', { draft: true }).unreviewed, false)
})

test('calendar: an entry marked too_long (w05, 151 characters) is not eligible until a reviewer shortens it', () => {
  const only = { entries: [{ ...CAL.entries.find((e) => e.id === 'w05'), reviewed: true }] }
  assert.equal(only.entries[0].too_long, true)
  assert.equal(pickCalendarLine(only, '2026-11-12'), null)
  assert.equal(pickCalendarLine(only, '2026-11-12', { draft: true }), null)
})

test('calendar: overlapping windows rotate (daysSinceEpoch % k); the same text never shows two days in a row while k > 1', () => {
  const k = (date) => REVIEWED.entries.filter((e) => e.from <= date && date <= e.to).length
  let prev = null, checked = 0, same = []
  for (let d = '2026-11-01'; d <= '2027-02-18'; d = addDays(d, 1)) {
    const cur = pickCalendarLine(REVIEWED, d)
    assert.ok(cur, `a line on ${d}`)
    if (prev && k(prev.date) > 1 && k(d) > 1) { checked++; if (cur.id === prev.id) same.push(`${prev.date}/${d}:${cur.id}`) }
    prev = { date: d, id: cur.id }
  }
  assert.ok(checked > 40, `${checked} consecutive day pairs checked`)
  assert.deepEqual(same, [], 'the same entry two days in a row')
  const c = cal([win('a', '2026-11-01', '2026-11-30'), win('b', '2026-11-01', '2026-11-30'), win('c', '2026-11-01', '2026-11-30')])
  for (let d = '2026-11-01'; d < '2026-11-30'; d = addDays(d, 1)) assert.notEqual(pickCalendarLine(c, d).id, pickCalendarLine(c, addDays(d, 1)).id)
})

test('calendar: works after the sowing banner date (BANNERS.sowing.validUntil) - 2026-12-05 and 2027-01-10 still have a line', () => {
  assert.equal(BANNERS.sowing.validUntil, '2026-11-15')
  for (const d of ['2026-12-05', '2027-01-10']) {
    assert.ok(d >= BANNERS.sowing.validUntil)
    const r = pickDayTasks(RULES, REVIEWED, d, day({ date: d }), { sowingOpen: false, verdict: verdict() })
    assert.ok(r.source.startsWith('calendar:'), d); assert.equal(r.tasks.length, 1); assert.deepEqual(r.fired, [r.source])
  }
})

test('calendar: with no reviewed entry for today the old sowing_season rule fires exactly as before (and after 15 Nov there is nothing, as before)', () => {
  const old = pickTasks(RULES, day(), { sowingOpen: true, verdict: verdict() })
  assert.deepEqual(old.tasks, ['बुवाई वाले खेत में नमी जाँचें'])
  const r = pickDayTasks(RULES, CAL, '2026-11-12', day({ date: '2026-11-12' }), { sowingOpen: true, verdict: verdict() })
  assert.deepEqual(r.tasks, old.tasks); assert.equal(r.source, 'fallback:sowing_season'); assert.deepEqual(r.fired, ['fallback:sowing_season']); assert.equal(r.calendar, null)
  const after = pickDayTasks(RULES, CAL, '2026-12-05', day(), { sowingOpen: false, verdict: verdict() })
  assert.deepEqual(after.tasks, []); assert.equal(after.source, null)
  // when a calendar line exists it replaces the old rule (never two sowing lines)
  const both = pickDayTasks(RULES, REVIEWED, '2026-11-12', day({ date: '2026-11-12' }), { sowingOpen: true, verdict: verdict() })
  assert.ok(!both.tasks.includes('बुवाई वाले खेत में नमी जाँचें')); assert.equal(both.tasks.length, 1)
})

test('calendar: weather rules come first and are never replaced by the calendar line', () => {
  const rain = pickDayTasks(RULES, REVIEWED, '2026-12-10', day(), { sowingOpen: false, verdict: verdict('moderate') })
  assert.equal(rain.tasks[0], 'खेत से पानी निकलने की नाली साफ़ रखें'); assert.deepEqual(rain.fired.slice(0, 1), ['rain_drain']); assert.equal(rain.tasks.length, 2)
  const wind = pickDayTasks(RULES, REVIEWED, '2026-12-10', day({ windMax: 30 }), { sowingOpen: false, verdict: verdict() })
  assert.equal(wind.tasks[0], 'तेज़ हवा में छिड़काव न करें')
  const cold = pickDayTasks(RULES, REVIEWED, '2026-12-10', day({ tmin: 4 }), { sowingOpen: false, verdict: verdict() })
  assert.match(cold.tasks[0], /पाले का ध्यान/); assert.equal(cold.tasks.at(-1), TEXT.w07)
  assert.ok(rain.fired.at(-1).startsWith('calendar:'))
})

test('calendar: at most 2 weather tasks plus the calendar line (max_tasks stays 3); without a calendar line the old 3 weather tasks stay', () => {
  assert.equal(RULES.max_tasks, 3); assert.equal(MAX_WEATHER_TASKS_WITH_CALENDAR, 2)
  const v = verdict('moderate', { spray: { status: 'stop', reasonKey: 'aw_spray_stop_rain' }, harvest: { status: 'stop' } })
  const d = day({ windMax: 30 }) // rain_spray, rain_cover, rain_drain, wind all fire
  const withCal = pickDayTasks(RULES, REVIEWED, '2026-12-10', d, { sowingOpen: false, verdict: v })
  assert.equal(withCal.tasks.length, 3)
  assert.deepEqual(withCal.tasks.slice(0, 2), ['दवा-खाद का छिड़काव बारिश रुकने के बाद करें', 'कटी फसल और अनाज ढककर रखें'])
  assert.equal(withCal.tasks[2], HOLD, 'the calendar line always keeps its place (here the static rain line, because moderate rain hides the irrigation line)')
  const dry = pickDayTasks(RULES, REVIEWED, '2026-12-10', d, { sowingOpen: false, verdict: { ...v, windows: { h48: { level: 'dry' } } } })
  assert.equal(dry.tasks[2], TEXT.w07)
  const noCal = pickDayTasks(RULES, CAL, '2026-12-10', d, { sowingOpen: false, verdict: v })
  assert.equal(noCal.tasks.length, 3); assert.ok(noCal.tasks.every((t) => t !== TEXT.w07)); assert.equal(noCal.source, null)
})

test('calendar: no weather at all (forecast failed) still gives the calendar line; weather rules are skipped', () => {
  const r = pickDayTasks(RULES, REVIEWED, '2026-12-10', null, { sowingOpen: false, verdict: null })
  assert.deepEqual(r.tasks, [TEXT.w07])
})

test('derived entries (w07-w10) match the arithmetic on the sourced intervals: sowing 10-25 Nov (timely) and 1 Dec - 5 Jan (late)', () => {
  const T = ['2026-11-10', '2026-11-25'], L = ['2026-12-01', '2027-01-05']
  const span = (iv, lo, hi) => [addDays(iv[0], lo), addDays(iv[1], hi)]
  const want = { w07: span(T, 20, 25), w08: span(L, 20, 25), w09: span(T, 50, 55), w10: span(T, 80, 85) }
  assert.deepEqual(want, { w07: ['2026-11-30', '2026-12-20'], w08: ['2026-12-21', '2027-01-30'], w09: ['2026-12-30', '2027-01-19'], w10: ['2027-01-29', '2027-02-18'] })
  for (const [id, [from, to]] of Object.entries(want)) {
    const e = CAL.entries.find((x) => x.id === id)
    assert.equal(e.derived, true, id); assert.equal(e.from, from, `${id} from`); assert.equal(e.to, to, `${id} to`); assert.ok(e.note && /derived/.test(e.note), `${id} shows its working in the note`)
  }
  for (const e of CAL.entries.filter((x) => !['w07', 'w08', 'w09', 'w10'].includes(x.id))) assert.equal(e.derived, false)
  assert.equal(daysBetween('2026-11-10', '2026-11-30'), 20); assert.equal(daysBetween('2026-11-25', '2026-12-20'), 25)
  assert.match(TEXT.w07, /30 नवंबर से 20 दिसंबर/); assert.match(TEXT.w08, /21 दिसंबर से 30 जनवरी/)
})

test('the seeds are all unreviewed: nothing in the calendar can show on the live post until a person flips it', () => {
  assert.ok(CAL.entries.every((e) => e.reviewed === false) && CAL.rain_hold.reviewed === false)
})

// ---------------------------------------------------------------------------------------------------------------------------------
// The founder's addition: irrigation stage lines are hidden when the 48-hour rain level is light or higher.
test('rain: the rule is "48-hour level light or more"; dry and drizzle do not hide, no forecast does not hide', () => {
  assert.deepEqual(LEVELS, ['dry', 'drizzle', 'light', 'moderate', 'heavy'])
  for (const l of ['dry', 'drizzle']) assert.equal(rainHidesIrrigation(verdict(l)), false, l)
  for (const l of ['light', 'moderate', 'heavy']) assert.equal(rainHidesIrrigation(verdict(l)), true, l)
  assert.equal(rainHidesIrrigation(null), false)
})

test('rain: every irrigation stage (irr1 on w07 and w08, irr2 on w09, irr3 on w10) is replaced by the static line at light, moderate and heavy', () => {
  const dates = { w07: '2026-12-10', w08: '2027-01-25', w09: '2027-01-10', w10: '2027-02-05' }
  for (const [id, d] of Object.entries(dates)) {
    for (const lvl of ['dry', 'drizzle']) {
      const t = pickCalendarLine(REVIEWED, d, { verdict: verdict(lvl) })
      assert.ok(t.id !== 'rain_hold' && !t.hidden.length, `${id} ${lvl}: shown normally`)
      assert.ok(IRR.some((e) => e.id === t.id), `${d} ${lvl} shows an irrigation line (${t.id})`)
    }
    for (const lvl of ['light', 'moderate', 'heavy']) {
      for (let off = 0; off < 6; off++) {
        const dd = addDays(d, off)
        if (!REVIEWED.entries.some((e) => e.irrigation_stage && e.from <= dd && dd <= e.to)) continue
        const t = pickCalendarLine(REVIEWED, dd, { verdict: verdict(lvl) })
        assert.ok(!IRR.some((e) => e.text_hi === t.text), `${dd} ${lvl}: irrigation text must be hidden`)
        assert.ok(t.id === 'rain_hold' || !IRR.some((e) => e.id === t.id), `${dd} ${lvl}`)
      }
    }
  }
  for (const lvl of ['light', 'moderate', 'heavy']) { const t = pickCalendarLine(REVIEWED, '2026-12-10', { verdict: verdict(lvl) }); assert.equal(t.text, HOLD); assert.equal(t.id, 'rain_hold'); assert.deepEqual(t.hidden, ['w07']) }
  const two = pickCalendarLine(REVIEWED, '2027-01-10', { verdict: verdict('light') })
  assert.equal(two.text, HOLD, 'two irrigation entries on one day (w08 and w09) become ONE static line'); assert.deepEqual([...two.hidden].sort(), ['w08', 'w09'])
})

test('rain: the static line is the same words on every rainy day (static, not rotating)', () => {
  const seen = new Set()
  for (const d of ['2026-12-10', '2026-12-12', '2027-01-25', '2027-02-05']) { const t = pickCalendarLine(REVIEWED, d, { verdict: verdict('moderate') }); if (t.id === 'rain_hold') seen.add(t.text) }
  assert.deepEqual([...seen], [HOLD])
  assert.ok(CAL.entries.every((e) => e.text_hi !== HOLD))
})

test('rain: non-irrigation lines (plan lines, varieties, seed rate) are not touched by rain', () => {
  for (const lvl of ['dry', 'light', 'heavy']) {
    assert.equal(pickCalendarLine(REVIEWED, '2026-11-02', { verdict: verdict(lvl) }).id, 'w01')
    assert.equal(pickCalendarLine(REVIEWED, '2026-11-02', { verdict: verdict(lvl) }).hidden.length, 0)
  }
  const c = cal([win('p1', '2026-11-10', '2026-11-20')], { rain_hold: { id: 'rain_hold', text_hi: 'स्थिर', reviewed: true } })
  assert.equal(pickCalendarLine(c, '2026-11-12', { verdict: verdict('heavy') }).id, 'p1')
})

test('rain: with irrigation and other entries on one day, rain removes only the irrigation ones (the static line and the others rotate; irrigation never shows)', () => {
  const c = cal([win('p1', '2026-12-01', '2026-12-31'), win('i1', '2026-12-01', '2026-12-31', { irrigation_stage: 'irr1' }), win('i2', '2026-12-01', '2026-12-31', { irrigation_stage: 'irr2' })], { rain_hold: { id: 'rain_hold', text_hi: 'स्थिर', reviewed: true } })
  const ids = []
  for (let d = '2026-12-01'; d <= '2026-12-30'; d = addDays(d, 1)) ids.push(pickCalendarLine(c, d, { verdict: verdict('light') }).id)
  assert.ok(!ids.includes('i1') && !ids.includes('i2'))
  assert.deepEqual([...new Set(ids)].sort(), ['p1', 'rain_hold'])
  for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1], 'no same line two days in a row')
  const dry = new Set(); for (let d = '2026-12-01'; d <= '2026-12-30'; d = addDays(d, 1)) dry.add(pickCalendarLine(c, d, { verdict: verdict('dry') }).id)
  assert.deepEqual([...dry].sort(), ['i1', 'i2', 'p1'])
})

test('rain: the static line is review-gated; an unreviewed static line is not shown live, the irrigation line stays hidden, and the old rule takes over', () => {
  const noHold = { ...REVIEWED, rain_hold: { ...CAL.rain_hold, reviewed: false } }
  assert.equal(pickCalendarLine(noHold, '2026-12-10', { verdict: verdict('light') }), null, 'nothing shown, and certainly not the irrigation line')
  const d = pickCalendarLine(noHold, '2026-12-10', { verdict: verdict('light'), draft: true })
  assert.equal(d.id, 'rain_hold'); assert.equal(d.unreviewed, true)
  const r = pickDayTasks(RULES, noHold, '2026-12-10', day(), { sowingOpen: false, verdict: verdict('light') })
  assert.deepEqual(r.tasks, []); assert.equal(r.source, null)
  const r2 = pickDayTasks(RULES, noHold, '2026-12-10', day(), { sowingOpen: true, verdict: verdict('light') })
  assert.equal(r2.source, 'fallback:sowing_season')
})

test('rain: weather safety tasks still come first on a rainy irrigation day, then the static line', () => {
  const r = pickDayTasks(RULES, REVIEWED, '2026-12-10', day(), { sowingOpen: false, verdict: verdict('moderate') })
  assert.deepEqual(r.tasks, ['खेत से पानी निकलने की नाली साफ़ रखें', HOLD])
  assert.deepEqual(r.fired, ['rain_drain', 'calendar:rain_hold'])
})

test('rain: no forecast (verdict null) cannot know about rain, so the irrigation line is shown as normal', () => {
  assert.equal(pickCalendarLine(REVIEWED, '2026-12-10', { verdict: null }).id, 'w07')
})

// ---- end to end through generate(): the real report and message
const run = async (date, { tomorrowMm = 0, draft = false, data } = {}) => {
  const fx = loadFixture('normal', date)
  const w = { ...fx.weather, days: fx.weather.days.map((d, i) => ({ ...d, rainMm: i === 1 ? tomorrowMm : d.rainMm, rainProb: i === 1 && tomorrowMm > 0 ? 70 : d.rainProb })) }
  return generate({ date, draft, data: data || { ...loadData(), cropCalendar: REVIEWED }, loaders: { weather: async () => w, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, nowIso: `${date}T01:00:00Z`, env: {} })
}
test('end to end: irrigation line shown on a dry day; hidden and replaced by the static line when the 48-hour rain is light or more (the report says so)', async () => {
  const dry = await run('2026-12-10')
  assert.equal(dry.model.verdict.windows.h48.level, 'dry'); assert.ok(dry.message.includes(TEXT.w07)); assert.ok(!dry.message.includes(HOLD)); assert.match(dry.report, /rules fired: calendar:w07/)
  const wet = await run('2026-12-10', { tomorrowMm: 6 })
  const lvl = wet.model.verdict.windows.h48.level
  assert.ok(LEVELS.indexOf(lvl) >= LEVELS.indexOf('light'), `48-hour level ${lvl}`)
  assert.ok(!wet.message.includes(TEXT.w07), 'the irrigation line is hidden'); assert.ok(wet.message.includes(HOLD), 'the static line is shown')
  assert.match(wet.report, /irrigation line hidden \(w07\)/); assert.match(wet.report, /rules fired: .*calendar:rain_hold/); assert.equal(wet.taskSource, 'calendar:rain_hold')
  assert.deepEqual(wet.violations, []); assert.ok(wet.message.length <= 1500)
  const drizzle = await run('2026-12-10', { tomorrowMm: 1.5 })
  assert.equal(drizzle.model.verdict.windows.h48.level, 'drizzle'); assert.ok(drizzle.message.includes(TEXT.w07), 'drizzle is below light: the irrigation line stays')
})

test('end to end: the live gate - the real seeded calendar (all unreviewed) shows nothing from the calendar, even on a rainy day; --draft shows the static line with the WARNING', async () => {
  const live = await run('2026-12-10', { tomorrowMm: 6, data: loadData() })
  assert.ok(!live.message.includes(HOLD) && !live.message.includes(TEXT.w07)); assert.equal(live.taskSource, null)
  const draft = await run('2026-12-10', { tomorrowMm: 6, draft: true, data: loadData() })
  assert.ok(draft.message.includes(HOLD)); assert.match(draft.warn, /calendar:rain_hold/)
})
