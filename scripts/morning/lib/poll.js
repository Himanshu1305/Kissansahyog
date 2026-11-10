// Poll of the day (deterministic by date) and yesterday's result line.
const epochDays = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000)
const inRange = (md, from, to) => (from <= to ? md >= from && md <= to : md >= from || md <= to) // ranges may wrap the year end

// Batch 21: a poll may carry weekday (0-6). On that weekday an in-window poll for it is preferred; on other days it is left out of the rotation.
// opts.weekdays === false (MORNING_CONTENT=off) ignores weekday polls completely, so the rotation is exactly the old one.
export function pickPoll(polls, date, { weekdays = true } = {}) {
  const md = date.slice(5)
  const wd = new Date(`${date}T00:00:00Z`).getUTCDay()
  const all = (polls || []).filter((p) => weekdays || p.weekday == null)
  const active = all.filter((p) => inRange(md, p.from, p.to))
  const today = active.filter((p) => p.weekday === wd)
  if (today.length) return today[Math.floor(epochDays(date) / 7) % today.length]
  const general = active.filter((p) => p.weekday == null)
  const list = general.length ? general : all.filter((p) => p.weekday == null)
  return list.length ? list[epochDays(date) % list.length] : null
}

export function pollText(poll, title) {
  return [title, poll.question_hi, ...poll.options_hi.map((o, i) => `${i + 1}. ${o}`)].join('\n')
}

// yesterdayResult = { question_id, pct } | null -> { pct, label } | null
export function yesterdayLine(yesterdayResult, polls) {
  if (!yesterdayResult || yesterdayResult.pct == null || !Number.isFinite(Number(yesterdayResult.pct))) return null
  const q = (polls || []).find((p) => p.id === yesterdayResult.question_id)
  return { pct: Math.round(Number(yesterdayResult.pct)), label: q?.yes_label || null }
}
