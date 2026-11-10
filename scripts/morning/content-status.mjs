// npm run morning:content [-- --from YYYY-MM-DD --days N]
// Read-only, no network: how much reviewed content each data file has, and what the post would show on each of the next days.
// Uses the "normal" fixture weather, so only the date logic is shown (a rainy day can change the task line).
import { pathToFileURL } from 'node:url'
import { istDate, addDays, isIsoDate } from './lib/ist.js'
import { generate, loadData } from './lib/generate.js'
import { loadFixture } from './fixtures.js'
import { S } from './strings.hi.js'
import { contentOff } from './lib/content.js'

const reviewedCount = (items) => (items || []).filter((x) => x.reviewed === true || x.verified === true).length

export function fileCounts(data) {
  const row = (name, items) => ({ name, total: items.length, reviewed: reviewedCount(items) })
  return [
    row('events.json', data.events || []),
    row('crop-calendar.json', [...(data.cropCalendar?.entries || []), ...(data.cropCalendar?.rain_hold ? [data.cropCalendar.rain_hold] : [])]),
    row('money-facts.json', data.moneyFacts || []),
    row('gyaan.json', data.gyaan || []),
    row('scheme-calendar.json', data.schemes || []),
    row('lines.json (kahawat)', data.lines?.kahawat || []),
    row('tips.json', data.tips || []),
    row('festivals.json', data.festivals || []),
    row('procurement-windows.json', data.procurement || []),
  ].map((r) => ({ ...r, unreviewed: r.total - r.reviewed }))
}

const weatherIds = (fired) => fired.filter((id) => !id.startsWith('calendar:') && !id.startsWith('fallback:'))

// -> [{ date, weekday, task, slot }]
export async function statusRows({ from, days, data = loadData(), env = process.env }) {
  const rows = []
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i)
    const fx = loadFixture('normal', date)
    const loaders = { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }
    const nowIso = `${date}T01:00:00Z` // IST morning of that day, so the rain verdict reads the fixture days and not today's clock
    const live = await generate({ date, data, loaders, env, draft: false, nowIso })
    const draft = await generate({ date, data, loaders, env, draft: true, nowIso })
    const w = weatherIds(live.taskFired)
    let task = [...(w.length ? [`weather:${w.join('+')}`] : []), ...(live.taskSource ? [live.taskSource] : [])].join(' + ') || 'none'
    if (draft.taskSource && draft.taskSource !== live.taskSource) task += ` [BLOCKED (unreviewed): ${draft.taskSource}]`
    const ls = live.model.slot, ds = draft.model.slot
    let slot = ls ? ls.kind : 'none'
    if (ds && (!ls || ds.kind !== ls.kind)) slot = `${ls ? ls.kind : 'none'} [BLOCKED (unreviewed: ${ds.usedUnreviewed.join(', ') || '-'}): ${ds.kind}]`
    rows.push({ date, weekday: S.weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()], task, slot })
  }
  return rows
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const get = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
  const from = get('--from') || istDate()
  const days = get('--days') == null ? 21 : Number(get('--days'))
  if (!isIsoDate(from)) throw new Error(`bad --from "${from}", use YYYY-MM-DD`)
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error(`bad --days "${get('--days')}", use 1 to 366`)
  const data = loadData()
  console.log(`Content status (MORNING_CONTENT is ${contentOff(env) ? 'OFF: old behaviour' : 'on'}); reads files only, no network`)
  console.log('')
  console.log('file'.padEnd(28) + 'total  reviewed  unreviewed')
  for (const r of fileCounts(data)) console.log(r.name.padEnd(28) + String(r.total).padStart(5) + String(r.reviewed).padStart(10) + String(r.unreviewed).padStart(12))
  console.log('')
  console.log(`Next ${days} days from ${from} (normal fixture weather):`)
  console.log('date        day          task line                                     slot')
  for (const r of await statusRows({ from, days, data, env })) console.log(`${r.date}  ${r.weekday.padEnd(11)}  ${r.task.padEnd(44)}  ${r.slot}`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((c) => process.exit(c), (e) => { console.error(`Stopped: ${e.message}`); process.exit(1) })
}
