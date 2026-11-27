// Batch 29 - answers entered by an admin in the "KVK questions" tab are used by the morning post by themselves.
// Flow: the database function morning_kvk_answers() (public key, read only) gives the answered, still-valid rows -> applyKvk() lays them over the repo data
// IN MEMORY for this one run (no data file is rewritten) -> the normal pickers and the Batch 27 freshness audit then work on the changed data.
// Three kinds of answer (src/lib/kvk/kvkRules.js): stage_days (the days of an irrigation), date (a scheme's last date), late_sowing (last sowing date + extra seed %).
// Every answer is checked AGAIN here (same rules as the admin form); a bad one is ignored with a WARNING line, never used. No Hindi in this file (strings.hi.js).
import { S, fmt } from '../strings.hi.js'
import { rpc } from './supa.js'
import { KINDS, cleanAnswer, isIso } from '../../../src/lib/kvk/kvkRules.js'

const human = (iso) => fmt(S.dataDateLabel, { d: Number(iso.slice(8)), m: S.months[Number(iso.slice(5, 7)) - 1] })
const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)))

// -> [] when nothing is set up (no keys, or the database function does not exist yet); throws on any other failure (the caller turns it into a WARNING line)
export async function loadKvkAnswers({ url, key, fetchImpl = fetch } = {}) {
  if (!url || !key) return []
  const r = await rpc({ url, key, fetchImpl, name: 'morning_kvk_answers', args: {} })
  if (r.status === 404 || (r.body && r.body.code === 'PGRST202')) return [] // migration 0079 not applied on this database yet: nothing to read
  if (r.status !== 200 || !Array.isArray(r.body)) throw new Error(`http ${r.status}`)
  return r.body
}

const stagesOrdered = (stages) => stages.every((st, i) => i === 0 || (st.das_from > stages[i - 1].das_to))

// data = the loaded data files; answers = rows from morning_kvk_answers(); date = the IST day of the run.
// -> { data (changed copy; the same object when nothing applies), notes: [report lines], used: [slugs] }.  Lines starting "WARNING" go to the GitHub summary too.
export function applyKvk(data, answers, date) {
  const notes = [], used = []
  if (!Array.isArray(answers) || answers.length === 0) return { data, notes, used }
  const out = { ...data, cropCalendar: clone(data.cropCalendar), schemes: clone(data.schemes), events: clone(data.events) }
  const warn = (slug, why) => notes.push(`WARNING kvk: the answer "${slug}" was NOT used (${why}); the post uses the repo data for it`)

  for (const row of answers) {
    const slug = row && typeof row.slug === 'string' ? row.slug : '?'
    if (!row || !KINDS.includes(row.kind) || typeof row.target !== 'string' || !isIso(row.source_date) || !isIso(row.valid_until) || typeof row.source_name !== 'string' || row.source_name.trim().length < 3) { warn(slug, 'incomplete row'); continue }
    if (row.valid_until < date) { warn(slug, `it expired on ${row.valid_until}; ask again in the admin KVK tab`); continue }
    const c = cleanAnswer(row.kind, row.answer, { target: row.target, sourceDate: row.source_date })
    if (c.error) { warn(slug, `the saved answer fails the checks: ${c.error}`); continue }
    const who = row.source_name.trim()
    const stamp = `KVK: ${who}, ${row.source_date}`

    if (row.kind === 'stage_days') {
      const cal = out.cropCalendar
      const stages = cal && Array.isArray(cal.stages) ? cal.stages : null
      const idx = stages ? stages.findIndex((st) => st.id === row.target) : -1
      if (idx < 0) { warn(slug, `no stage "${row.target}" in the crop calendar`); continue }
      const trial = stages.map((st, i) => (i === idx ? { ...st, das_from: c.value.das_from, das_to: c.value.das_to } : st))
      if (!stagesOrdered(trial)) { warn(slug, 'the days overlap or are out of order with the other irrigations'); continue }
      const { source_url, ...rest } = stages[idx] // the old source link belongs to the old days
      void source_url
      stages[idx] = { ...rest, das_from: c.value.das_from, das_to: c.value.das_to, source_name: who, reviewed: true, approved_by: stamp, kvk: true }
      used.push(slug); notes.push(`kvk: ${row.target} = ${c.value.das_from}-${c.value.das_to} days after sowing (told by ${who} on ${row.source_date}, valid until ${row.valid_until})`)
    } else if (row.kind === 'date') {
      const list = Array.isArray(out.schemes) ? out.schemes : []
      const idx = list.findIndex((s) => s.id === row.target)
      if (idx < 0) { warn(slug, `no scheme "${row.target}" in scheme-calendar.json`); continue }
      const s = list[idx]
      const { source_url, ...rest } = s
      void source_url
      list[idx] = { ...rest, deadline: c.value.date, ...(s.howto ? { howto: { ...s.howto, last_date: c.value.date } } : {}), source_name: who, verified: true, approved_by: stamp, kvk: true }
      used.push(slug); notes.push(`kvk: ${row.target} last date = ${c.value.date} (told by ${who} on ${row.source_date}, valid until ${row.valid_until})`)
    } else { // late_sowing
      const cal = out.cropCalendar
      if (!cal || !Array.isArray(cal.static)) { warn(slug, 'no crop calendar'); continue }
      if (c.value.last_date < date) { warn(slug, `its last sowing date ${c.value.last_date} is already over`); continue }
      const date_ = human(c.value.last_date)
      const text = fmt(S.kvkLateSowing, { date: date_ }) + (c.value.seed_extra_pct != null ? `; ${fmt(S.kvkLateSeed, { pct: c.value.seed_extra_pct })}` : '')
      cal.static = cal.static.filter((e) => e.id !== `kvk-${slug}`)
      cal.static.push({ id: `kvk-${slug}`, from: row.source_date, to: c.value.last_date, text_hi: text, source_name: who, reviewed: true, approved_by: stamp, kvk: true })
      // the approved "late sowing" window in events.json (1 Dec to 5 Jan, one website only) now ends on the date KVK told us
      const evList = Array.isArray(out.events) ? out.events : (out.events && Array.isArray(out.events.events) ? out.events.events : null)
      const ev = evList ? evList.find((e) => e.id === 'win-wheat-late') : null
      if (ev) {
        const { source_url, ...rest } = ev
        void source_url
        evList[evList.indexOf(ev)] = { ...rest, date: ev.date && ev.date < row.source_date ? ev.date : row.source_date, date_to: c.value.last_date, source_name: who, reviewed: true, approved_by: stamp, kvk: true }
      }
      used.push(slug); notes.push(`kvk: late-sowing line added until ${c.value.last_date}${c.value.seed_extra_pct != null ? `, extra seed ${c.value.seed_extra_pct}%` : ''} (told by ${who} on ${row.source_date})`)
    }
  }
  return { data: used.length ? out : data, notes, used }
}

