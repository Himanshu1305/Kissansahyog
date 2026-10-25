// npm run morning:poll -- --date 2026-10-24 --pct 64
// Writes yesterday's poll result into data/morning/poll-results.json so nobody edits JSON by hand.
import { pathToFileURL } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { isIsoDate } from './lib/ist.js'
import { pickPoll } from './lib/poll.js'

const file = new URL('../../data/morning/poll-results.json', import.meta.url)
const polls = JSON.parse(readFileSync(new URL('../../data/morning/polls.json', import.meta.url), 'utf8'))

export function recordResult(results, date, pct) {
  if (!isIsoDate(date)) throw new Error(`bad --date "${date}", use YYYY-MM-DD`)
  const n = Number(pct)
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`--pct must be a number from 0 to 100 (got "${pct}")`)
  const poll = pickPoll(polls, date)
  if (!poll) throw new Error('no poll found for that date')
  return { ...results, [date]: { question_id: poll.id, pct: Math.round(n) } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const a = process.argv.slice(2)
    const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined }
    const next = recordResult(JSON.parse(readFileSync(file, 'utf8')), get('--date'), get('--pct'))
    writeFileSync(file, JSON.stringify(next, null, 2) + '\n')
    const d = get('--date')
    console.log(`Saved: ${d} -> ${next[d].pct}% (question ${next[d].question_id}). Tomorrow's message will say it.`)
  } catch (e) { console.error(`Stopped: ${e.message}`); process.exit(1) }
}
