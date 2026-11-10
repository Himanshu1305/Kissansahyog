// "आज का काम": the rules live in data/morning/work-rules.json. Task texts there are generic wording only.
// Batch 17B: rain rules read the rain verdict (ctx.verdict) - the same spraying / harvest windows as /mausam - never a bare chance (%).
import { levelIndex } from '../../../src/lib/weather/rainVerdict.js'
import { S, fmt } from '../strings.hi.js'
export function ruleFires(when, day, ctx) {
  const checks = []
  const v = ctx.verdict || null
  if ('spray_reason' in when) checks.push(v != null && v.spray.status === 'stop' && when.spray_reason.includes(v.spray.reasonKey))
  if ('spray_status' in when) checks.push(v != null && when.spray_status.includes(v.spray.status))
  if ('harvest_status' in when) checks.push(v != null && when.harvest_status.includes(v.harvest.status))
  if ('level48_gte' in when) checks.push(v != null && levelIndex(v.windows.h48.level) >= levelIndex(when.level48_gte))
  if ('level48_in' in when) checks.push(v != null && when.level48_in.includes(v.windows.h48.level))
  if ('wind_gte' in when) checks.push(day != null && day.windMax != null && day.windMax >= when.wind_gte)
  if ('tmax_gte' in when) checks.push(day != null && day.tmax != null && day.tmax >= when.tmax_gte)
  if ('tmin_lte' in when) checks.push(day != null && day.tmin != null && day.tmin <= when.tmin_lte)
  if ('sowing_window' in when) checks.push(!!ctx.sowingOpen === when.sowing_window)
  if (!checks.length) return false
  return when.match === 'any' ? checks.some(Boolean) : checks.every(Boolean)
}

// day = today's forecast or null (weather failed). ctx = { sowingOpen }. -> { tasks: [string], fired: [ruleId] }
export function pickTasks(rulesFile, day, ctx = {}) {
  const tasks = [], fired = []
  for (const r of rulesFile.rules) {
    if (day == null && r.needs_weather !== false) continue // weather rules need weather
    if (!ruleFires(r.when, day, ctx)) continue
    fired.push(r.id)
    for (const t of r.tasks) if (!tasks.includes(t)) tasks.push(t)
  }
  return { tasks: tasks.slice(0, rulesFile.max_tasks ?? 3), fired }
}

// the sowing window is open from 1 October until the site's own banner date (src/content/kamPani.js BANNERS.sowing.validUntil)
export function sowingOpen(date, validUntil) {
  return date >= `${date.slice(0, 4)}-10-01` && date < validUntil
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Batch 21: the task line follows the crop-stage calendar (data/morning/crop-calendar.json). No Hindi here: the texts live in the data file.
const epochDays = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000)
export const MAX_WEATHER_TASKS_WITH_CALENDAR = 2 // weather safety tasks come first; with a calendar line there is room for at most 2 of them
export const RAIN_HIDES_IRRIGATION_FROM = 'light' // the 48-hour rain level from which an irrigation-stage line is hidden

// Is rain of at least `light` expected in the next 48 hours? Unknown weather (no verdict) is NOT treated as rain.
export function rainHidesIrrigation(verdict) {
  return !!verdict && levelIndex(verdict.windows.h48.level) >= levelIndex(RAIN_HIDES_IRRIGATION_FROM)
}

// The ONE calendar line for `date` (Batch 21B: "after sowing"). -> { id, text, source: 'calendar:<id>', unreviewed: bool, unreviewedIds: [ids], hidden: [ids], cohort } or null.
// A stage (irr1, irr2, irr3) is due on day D for the sowers sown between D - das_to and D - das_from, clipped to sowing_dates. The line is built from
// those dates (nothing is typed per day); if two stages are due the same day the EARLIER stage is shown. While a stage is due, every 3rd day
// (daysSinceEpoch % 3 === 0) a static line is shown instead; when none is due the static lines rotate. Stage lines are the irrigation lines:
// when rain is expected they are hidden and the static rain_hold line (with the other static lines) is shown instead. Static lines are never hidden.
const calOk = (e, draft) => (e.reviewed === true || draft) && e.too_long !== true && e.lint_blocked !== true // too_long / lint_blocked: a reviewer must fix the text first
const prevDay = (iso) => addDaysIso(iso, -1)
const addDaysIso = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const human = (iso) => fmt(S.dataDateLabel, { d: Number(iso.slice(8)), m: S.months[Number(iso.slice(5, 7)) - 1] })

// -> [{ stage, a, b }] for every stage whose cohort is not empty after clipping, in the order of calendar.stages (earlier stage first)
export function dueStages(calendar, date) {
  const sd = calendar && calendar.sowing_dates
  if (!sd || !Array.isArray(calendar.stages)) return []
  const out = []
  for (const st of calendar.stages) {
    const a0 = addDaysIso(date, -st.das_to), b0 = addDaysIso(date, -st.das_from)
    const a = a0 < sd.from ? sd.from : a0, b = b0 > sd.to ? sd.to : b0
    if (a <= b) out.push({ stage: st, a, b })
  }
  return out
}

function staticPool(calendar, date, draft) {
  return (calendar.static || []).filter((e) => e.from <= date && date <= e.to && calOk(e, draft))
}

// the plain pick of one day under one rain state; yesterday (same state) is used so a static line never repeats two days running while k > 1
function calPick(calendar, date, draft, rain, depth = 0) {
  const due = dueStages(calendar, date).find((d) => calOk(d.stage, draft) && calOk(calendar.sowing_dates, draft))
  const statics = staticPool(calendar, date, draft)
  const hidden = []
  let pool = statics
  if (due) {
    if (rain) {
      hidden.push(due.stage.id)
      const hold = calendar.rain_hold
      pool = hold && calOk(hold, draft) ? [...statics, hold] : statics
    } else if (!(statics.length && epochDays(date) % 3 === 0)) {
      return { kind: 'cohort', due, hidden, e: due.stage }
    }
  }
  if (!pool.length) return null
  let i = epochDays(date) % pool.length
  if (pool.length > 1 && depth < 400) { const y = calPick(calendar, prevDay(date), draft, rain, depth + 1); if (y && y.e.id === pool[i].id) i = (i + 1) % pool.length }
  return { kind: 'static', hidden, e: pool[i] }
}

export function pickCalendarLine(calendar, date, { draft = false, verdict = null } = {}) {
  if (!calendar || typeof calendar !== 'object') return null
  const r = calPick(calendar, date, draft, rainHidesIrrigation(verdict))
  if (!r) return null
  if (r.kind === 'cohort') {
    const sd = calendar.sowing_dates, st = r.due.stage
    const ids = [...(sd.reviewed === true ? [] : ['sowing_dates']), ...(st.reviewed === true ? [] : [st.id])]
    const text = fmt(S.cohortLine, { a: human(r.due.a), b: human(r.due.b), stage: st.label_hi, x: st.das_from, y: st.das_to })
    return { id: st.id, text, source: `calendar:${st.id}`, unreviewed: ids.length > 0, unreviewedIds: ids, hidden: r.hidden, cohort: { from: r.due.a, to: r.due.b } }
  }
  return { id: r.e.id, text: r.e.text_hi, source: `calendar:${r.e.id}`, unreviewed: r.e.reviewed !== true, unreviewedIds: r.e.reviewed === true ? [] : [r.e.id], hidden: r.hidden, cohort: null }
}

// Weather rules first (as today), then ONE calendar line. No reviewed calendar entry today: the old sowing_season rule exactly as before.
// -> { tasks, fired, calendar: {id,...}|null, source: 'calendar:<id>'|'fallback:sowing_season'|null, unreviewed: [ids] }
export function pickDayTasks(rulesFile, calendar, date, day, ctx = {}, { draft = false } = {}) {
  const line = pickCalendarLine(calendar, date, { draft, verdict: ctx.verdict || null })
  if (line) {
    const weather = pickTasks({ ...rulesFile, rules: rulesFile.rules.filter((r) => r.id !== 'sowing_season'), max_tasks: MAX_WEATHER_TASKS_WITH_CALENDAR }, day, ctx)
    const tasks = [...weather.tasks]
    if (!tasks.includes(line.text)) tasks.push(line.text)
    return { tasks, fired: [...weather.fired, line.source], calendar: line, source: line.source, unreviewed: line.unreviewedIds }
  }
  const old = pickTasks(rulesFile, day, ctx)
  const sowRule = rulesFile.rules.find((r) => r.id === 'sowing_season')
  const sow = old.fired.includes('sowing_season') && !!sowRule && sowRule.tasks.every((t) => old.tasks.includes(t)) // fired AND not cut off by the task cap
  return { tasks: old.tasks, fired: old.fired.map((id) => (id === 'sowing_season' ? 'fallback:sowing_season' : id)), calendar: null, source: sow ? 'fallback:sowing_season' : null, unreviewed: [] }
}
