// The rotating slot: one item by weekday, deterministic. Review gate: only reviewed:true items unless --draft.
import { S, fmt } from '../strings.hi.js'
import { daysBetween, weekday } from './ist.js'
import { weekChange } from './mandi.js'

const epochDays = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000)
const pick = (list, date) => (list.length ? list[Math.floor(epochDays(date) / 7) % list.length] : null) // same weekday cycles weekly
export const SLOT_BY_WEEKDAY = { 1: 'scheme', 2: 'countdown', 3: 'saving', 4: 'gyaan', 5: 'scheme', 6: 'kahawat', 0: 'recap' }

const usable = (items, draft) => {
  const ok = [], used = []
  for (const it of items || []) {
    if (it.reviewed === true || it.verified === true) ok.push(it)
    else if (draft) { ok.push(it); used.push(it.id) }
  }
  return { ok, used }
}

// nearest real dated deadline: sowing banner end and verified scheme deadlines. -> { id, text, days } or null
export function countdown(date, sowingValidUntil, schemes) {
  const c = []
  if (sowingValidUntil && date < sowingValidUntil) c.push({ id: 'sowing', days: daysBetween(date, sowingValidUntil), text: (d) => fmt(S.countdownSowing, { days: d }) })
  for (const s of schemes || []) {
    if (s.verified === true && s.deadline && s.deadline > date) c.push({ id: s.id, days: daysBetween(date, s.deadline), text: (d) => fmt(S.countdownScheme, { title: s.title_hi, days: d }) })
  }
  if (!c.length) return null
  c.sort((a, b) => a.days - b.days)
  return { id: c[0].id, days: c[0].days, text: c[0].text(c[0].days) }
}

// -> { kind, lines: [string], usedUnreviewed: [id] } or null (no slot today)
export function pickSlot(date, { draft = false, data, summary, sowingValidUntil } = {}) {
  const want = SLOT_BY_WEEKDAY[weekday(date)]
  const tryKind = (kind) => {
    if (kind === 'scheme') {
      const { ok, used } = usable(data.schemes, draft)
      const dated = ok.filter((s) => s.deadline && s.deadline >= date && daysBetween(date, s.deadline) <= 45).sort((a, b) => (a.deadline < b.deadline ? -1 : 1))
      const s = dated[0] || pick(ok.filter((x) => !x.deadline), date)
      if (!s) return null
      const lines = [S.slotScheme, fmt(S.slotSchemeLine, { title: s.title_hi, who: s.who_hi })]
      if (s.deadline) lines.push(fmt(S.slotSchemeDeadline, { date: s.deadline.split('-').reverse().join('-'), days: daysBetween(date, s.deadline) }))
      lines.push(fmt(S.slotSchemeSource, { source: s.source_name }))
      return { kind, lines, scheme: s, usedUnreviewed: used.includes(s.id) ? [s.id] : [] }
    }
    if (kind === 'countdown') {
      const c = countdown(date, sowingValidUntil, data.schemes)
      return c ? { kind, lines: [fmt(S.slotCountdown, { text: c.text })], usedUnreviewed: [] } : null
    }
    if (kind === 'saving' || kind === 'gyaan') {
      const { ok, used } = usable(kind === 'saving' ? data.tips : data.gyaan, draft)
      const it = pick(ok, date)
      if (!it) return null
      return { kind, lines: [kind === 'saving' ? S.slotSaving : S.slotGyaan, it.text_hi], usedUnreviewed: used.includes(it.id) ? [it.id] : [] }
    }
    if (kind === 'kahawat') {
      const { ok, used } = usable(data.lines?.kahawat, draft)
      const it = pick(ok, date)
      if (!it) return null
      return { kind, lines: [S.slotKahawat, it.text_hi], usedUnreviewed: used.includes(it.id) ? [it.id] : [] }
    }
    if (kind === 'recap') {
      const lines = []
      for (const it of summary?.shown || []) {
        const d = weekChange(it)
        if (d == null) continue
        lines.push(d === 0 ? fmt(S.recapLineFlat, { crop: it.name }) : fmt(S.recapLine, { crop: it.name, arrow: d > 0 ? S.mandiArrowUp : S.mandiArrowDown, delta: `₹${Math.abs(d)}` }))
      }
      return lines.length ? { kind, lines: [S.slotRecap, ...lines], usedUnreviewed: [] } : null
    }
    return null
  }
  return tryKind(want) || (want !== 'countdown' ? tryKind('countdown') : null)
}
