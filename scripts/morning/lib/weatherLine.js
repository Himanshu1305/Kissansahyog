// Batch 17B - the ONE sentence about today's weather, built from the rain verdict (src/lib/weather/rainVerdict.js).
// No Hindi in this file (the repo test forbids it): every word comes from scripts/morning/strings.hi.js.
// Rules: a rain word appears at most once; the sky word is used only when there is no rain wording of its own;
// a rain chance (%) is shown only when light rain or more is expected.
import { S, fmt } from '../strings.hi.js'
import { skyGroup } from './weather.js'

// Sky group for the phrase: rain / storm codes mean nothing when the verdict says "dry", so they read as plain cloud.
export const neutralSky = (code) => { const g = skyGroup(code); return ['clear', 'fewClouds', 'cloudy', 'fog'].includes(g) ? g : 'cloudy' }
const mmShown = (mm) => Math.max(1, Math.round(mm))

// style: 'text' (message and card) or 'voice' (spoken). -> { level, text }
export function weatherPhrase(v, code, style = 'text') {
  const level = v.windows.today.level
  const w = v.windows.today
  const sky = neutralSky(code)
  const voice = style === 'voice'
  const vars = { mm: mmShown(w.mm), p: w.probPct }
  if (level === 'dry') return { level, text: fmt((voice ? S.wxVoice : S.wx).dry, { sky: (voice ? S.wxVoiceSky : S.sky)[sky] }) }
  if (level === 'drizzle') return { level, text: fmt((voice ? S.wxVoice : S.wx).drizzle, vars) }
  const table = w.showProb ? (voice ? S.wxVoice : S.wx) : (voice ? S.wxVoiceProbless : S.wxProbless)
  return { level, text: fmt(table[level], vars) }
}

// One day of the "tomorrow / day after" line: { level, text }
export function dayPhrase(day) {
  const mm = day.mm
  return { level: day.level, text: fmt(S.wxDay[day.level], { mm: mmShown(mm) }) }
}
