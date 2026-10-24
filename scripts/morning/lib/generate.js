// The whole generation as one function: inputs in, { message, poll, report, model } out. No file or network access here
// except through the injected loaders, so the tests can run it fully offline.
import { readFileSync } from 'node:fs'
import { S, fmt } from '../strings.hi.js'
import { istDate, addDays } from './ist.js'
import { tithiAt, SAGAR } from './tithi.js'
import { getForecast, PROVIDER_NAME } from './weather.js'
import { pickTasks, sowingOpen } from './workRules.js'
import { chooseDate, summarize, MAX_MOVE_PCT, MIN_MANDIS, WINDOW_DAYS, MEDIAN_BAND } from './mandi.js'
import { compose, lint, pickBlessing, TARGET_CHARS, HARD_CHARS, KVK_PHONE } from './compose.js'
import { pickSlot } from './content.js'
import { pickPoll, pollText, yesterdayLine } from './poll.js'
import { BANNERS } from '../../../src/content/kamPani.js'

const DATA_DIR = new URL('../../../data/morning/', import.meta.url)
export function loadData(dir = DATA_DIR) {
  const j = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
  return {
    workRules: j('work-rules.json'), msp: j('msp-reference.json').entries, procurement: j('procurement-windows.json'), schemes: j('scheme-calendar.json'),
    festivals: j('festivals.json'), tips: j('tips.json'), gyaan: j('gyaan.json'), lines: j('lines.json'), polls: j('polls.json'), pollResults: j('poll-results.json'),
  }
}

// opts: { date, draft, data, loaders: { weather(date) -> forecast|null, mandi(date) -> {rows, flag}|null (throws on failure), yesterdayPoll(date) -> {question_id,pct}|null } }
export async function generate({ date, draft = false, data, loaders }) {
  const yesterday = addDays(date, -1)
  const notes = []   // per-section report lines
  const unreviewed = []

  // weather
  let weather = null
  try { weather = await loaders.weather(date) } catch { weather = null }
  notes.push(weather ? `weather: OK (${weather.provider}), days ${weather.days.map((d) => d.date).join(', ')}` : 'weather: OMITTED (forecast failed or timed out); weather-dependent tasks and the weather lines are left out')

  // mandi
  let mandi = null, mandiNote = '', suspect = [], skipped = [], flag = null
  try {
    const got = await loaders.mandi(date)
    flag = got.flag
    const pick = chooseDate(got.rows, yesterday)
    if (!pick) mandiNote = `OMITTED: no Sagar-division price rows in the last 3 days up to ${yesterday} (rows read: ${got.rows.length}, filter ${flag})`
    else {
      const sum = summarize(got.rows, pick.date)
      suspect = sum.suspect; skipped = sum.skipped
      if (!sum.shown.length) mandiNote = `OMITTED: data date ${pick.date} had no crop with prices from ${MIN_MANDIS}+ mandis that passed the checks`
      else { mandi = { ...sum, date: pick.date, isYesterday: pick.isYesterday }; mandiNote = `OK: data date ${pick.date}${pick.isYesterday ? ' (yesterday)' : ' (OLDER than yesterday, labelled in the message)'}, filter ${flag}, ${sum.shown.length} crop(s) shown` }
    }
  } catch (e) { mandiNote = `OMITTED: could not read mandi data (${e.message})` }
  notes.push(`mandi: ${mandiNote}`)

  // tasks
  const day0 = weather ? weather.days[0] : null
  const open = sowingOpen(date, BANNERS.sowing.validUntil)
  const { tasks, fired } = pickTasks(data.workRules, day0, { sowingOpen: open })
  notes.push(`aaj ka kaam: ${tasks.length ? `rules fired: ${fired.join(', ')}` : 'OMITTED: no rule fired'}`)

  // tithi / festival / blessing / poll
  const tithi = tithiAt(date)
  const festival = (data.festivals || []).find((f) => f.verified === true && f.date === date) || null
  const blessing = pickBlessing(data.lines.blessing, date, draft)
  if (blessing && blessing.reviewed !== true) unreviewed.push(`blessing:${blessing.id}`)
  const poll = pickPoll(data.polls, date)
  let yRes = null
  try { yRes = loaders.yesterdayPoll ? await loaders.yesterdayPoll(date) : data.pollResults[yesterday] || null } catch { yRes = null }
  const pollYesterday = yesterdayLine(yRes, data.polls)
  notes.push(`poll: ${poll ? poll.id : 'none'}; yesterday result: ${pollYesterday ? `${pollYesterday.pct}%` : 'none'}`)

  const model = { date, tithi, festival, blessing, pollYesterday, weather, tasks, mandi, mspEntries: data.msp, procurement: data.procurement }
  const slot = pickSlot(date, { draft, data, summary: mandi, sowingValidUntil: BANNERS.sowing.validUntil })
  model.slot = slot
  if (slot) for (const id of slot.usedUnreviewed) unreviewed.push(`${slot.kind}:${id}`)
  notes.push(`rotating slot: ${slot ? slot.kind : 'none today'}`)

  const out = compose(model)
  const violations = lint(out.text)

  const warn = draft && unreviewed.length ? `WARNING: --draft used ${unreviewed.length} UNREVIEWED item(s): ${unreviewed.join(', ')}. Do not post without checking them.` : null
  const report = [
    ...(warn ? [warn, ''] : []),
    `Morning message report for ${date} (IST)`,
    `generated: ${new Date().toISOString()}`,
    '',
    ...notes,
    `tithi: ${tithi.n} (${tithi.paksha}), sunrise ${tithi.sunrise.toISOString()}; Sagar ${SAGAR.lat}N ${SAGAR.lon}E`,
    festival ? `festival: ${festival.name_hi}` : 'festival: none (data/morning/festivals.json has no verified entry for today)',
    `weather provider: ${PROVIDER_NAME}`,
    `data freshness: mandi ${mandi ? mandi.date : 'n/a'}, weather ${weather ? date : 'n/a'}`,
    '',
    `suspect data (not shown): ${suspect.length ? suspect.map((s) => `${s.crop} - ${s.reason}`).join('; ') : 'none'}`,
    `crops skipped: ${skipped.length ? skipped.map((s) => `${s.crop} - ${s.reason}`).join('; ') : 'none'}`,
    `unreviewed items used: ${unreviewed.length ? unreviewed.join(', ') : 'none'}`,
    `characters: ${out.chars} (target ${TARGET_CHARS}, hard limit ${HARD_CHARS})${out.dropped.length ? `; dropped to fit: ${out.dropped.join(', ')}` : ''}${out.overTarget ? '; above the 1200 target' : ''}`,
    `lint: ${violations.length ? `FAILED - ${violations.join('; ')}` : 'passed'}`,
    '',
    'thresholds used:',
    ...data.workRules.rules.map((r) => `  ${r.id}: ${JSON.stringify(r.when)}`),
    `  mandi: min ${MIN_MANDIS} mandis per crop, max one-step move ${MAX_MOVE_PCT}%, price band ${MEDIAN_BAND[0]}x-${MEDIAN_BAND[1]}x of the ${WINDOW_DAYS}-day median, up to 4 crops`,
    `  KVK phone shown: ${KVK_PHONE}`,
  ].join('\n')

  const pollTxt = poll ? pollText(poll, S.pollFileTitle) : ''
  return { message: out.text, poll: pollTxt, pollQuestionId: poll ? poll.id : null, report, model, compose: out, violations, warn, haveWeather: !!weather, haveMandi: !!mandi }
}

export const defaultLoaders = {
  weather: (date) => getForecast(SAGAR.lat, SAGAR.lon, date),
}
export { istDate }
