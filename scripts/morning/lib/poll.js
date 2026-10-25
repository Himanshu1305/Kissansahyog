// Poll of the day (deterministic by date) and yesterday's result line.
const epochDays = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000)
const inRange = (md, from, to) => (from <= to ? md >= from && md <= to : md >= from || md <= to) // ranges may wrap the year end

export function pickPoll(polls, date) {
  const md = date.slice(5)
  const active = (polls || []).filter((p) => inRange(md, p.from, p.to))
  const list = active.length ? active : polls || []
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
