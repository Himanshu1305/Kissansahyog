// "आज का काम": the rules live in data/morning/work-rules.json. Task texts there are generic wording only.
export function ruleFires(when, day, ctx) {
  const checks = []
  if ('rain_prob_gte' in when) checks.push(day != null && day.rainProb != null && day.rainProb >= when.rain_prob_gte)
  if ('rain_mm_gte' in when) checks.push(day != null && day.rainMm != null && day.rainMm >= when.rain_mm_gte)
  if ('rain_prob_lt' in when) checks.push(day != null && day.rainProb != null && day.rainProb < when.rain_prob_lt)
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
