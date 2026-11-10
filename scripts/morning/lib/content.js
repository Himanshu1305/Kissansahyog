// The rotating slot: one item by weekday, deterministic. Review gate: only reviewed:true items unless --draft.
// Batch 21: a weekly menu (SLOT_BY_WEEKDAY_V2) replaces the old map; MORNING_CONTENT=off keeps the old map and old formats exactly.
import { S, fmt } from '../strings.hi.js'
import { daysBetween, weekday, addDays } from './ist.js'
import { weekChange } from './mandi.js'

const epochDays = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000)
const pick = (list, date) => (list.length ? list[Math.floor(epochDays(date) / 7) % list.length] : null) // same weekday cycles weekly
export const SLOT_BY_WEEKDAY = { 1: 'scheme', 2: 'countdown', 3: 'saving', 4: 'gyaan', 5: 'scheme', 6: 'kahawat', 0: 'recap' } // the OFF map (Batch 16-18)
export const SLOT_BY_WEEKDAY_V2 = { 1: 'scheme', 2: 'upcoming', 3: 'money', 4: 'know', 5: 'howto', 6: 'kahawat', 0: 'recap' }

// kill switch, same pattern as districtsOff: any case, spaces trimmed. Any other value or unset = the new behaviour.
export const contentOff = (env = process.env) => String(env.MORNING_CONTENT ?? '').trim().toLowerCase() === 'off'

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

// ---------------------------------------------------------------------------------------------------------------------------------
// Batch 21 helpers
const human = (iso) => fmt(S.dataDateLabel, { d: Number(iso.slice(8)), m: S.months[Number(iso.slice(5, 7)) - 1] })
const inWindow = (it, date) => (!it.show_from || it.show_from <= date) && (!it.show_until || date <= it.show_until)
export const mondayOf = (date) => addDays(date, -((weekday(date) + 6) % 7)) // Monday of the Monday-Sunday week of `date`
export const THIN_POOL = 4 // a pool smaller than this is throttled: an item shows at most once in 4 weeks

// Thin-pool throttle. weekIndex = floor(epochDays / 7), the same week counter `pick` uses (it moves by one per week).
// pool >= 4: the item cycles weekly. pool < 4: an item shows only on weeks where weekIndex % 4 < poolSize (item number = weekIndex % 4); other weeks give null (fall back).
export function pickThrottled(pool, date) {
  const n = pool.length
  if (!n) return null
  const wi = Math.floor(epochDays(date) / 7)
  if (n >= THIN_POOL) return pool[wi % n]
  const r = wi % THIN_POOL
  return r < n ? pool[r] : null
}

// ---- Monday: scheme news. Also used by Friday (on the Monday of the same week) so the two days always show the same scheme.
export function pickScheme(date, data, draft) {
  const { ok, used } = usable((data.schemes || []).filter((s) => inWindow(s, date)), draft)
  const dated = ok.filter((s) => s.deadline && s.deadline >= date && daysBetween(date, s.deadline) <= 45).sort((a, b) => (a.deadline < b.deadline ? -1 : 1))
  const s = dated[0] || pickThrottled(ok.filter((x) => !x.deadline), date)
  return s ? { scheme: s, unreviewed: used.includes(s.id) } : null
}

function schemeLines(s, date) {
  if (s.news_hi) {
    const lines = [S.slotScheme, fmt(S.schemeNews, { title: s.title_hi, news: s.news_hi })]
    if (s.action_hi) lines.push(fmt(S.schemeAction, { action: s.action_hi }))
    lines.push(s.source_date ? fmt(S.sourceWithDate, { source: s.source_name, date: human(s.source_date) }) : fmt(S.slotSchemeSource, { source: s.source_name }))
    return lines
  }
  const lines = [S.slotScheme, fmt(S.slotSchemeLine, { title: s.title_hi, who: s.who_hi })]
  if (s.deadline) lines.push(fmt(S.slotSchemeDeadline, { date: s.deadline.split('-').reverse().join('-'), days: daysBetween(date, s.deadline) }))
  lines.push(fmt(S.slotSchemeSource, { source: s.source_name }))
  return lines
}

// ---- Friday: how to apply. Not eligible without a dated last_date (the day must not go out with a missing date).
const howtoEligible = (s) => !!(s && s.howto && typeof s.howto.last_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.howto.last_date))
function howtoLines(s) {
  const h = s.howto
  const lines = [S.slotHowto, fmt(S.slotSchemeLine, { title: s.title_hi, who: fmt(S.howtoPremium, { premium: h.premium_hi }) })]
  if (h.docs_hi) lines.push(fmt(S.howtoCarry, { docs: h.docs_hi }))
  if (h.where_hi) lines.push(fmt(S.howtoWhere, { where: h.where_hi }))
  for (const st of h.steps_hi || []) lines.push(st)
  lines.push(fmt(S.howtoLast, { date: human(h.last_date) }))
  lines.push(s.source_date ? fmt(S.sourceWithDate, { source: s.source_name, date: human(s.source_date) }) : fmt(S.slotSchemeSource, { source: s.source_name }))
  return lines
}

// ---- Tuesday: what is coming. Nearest 1-3 dated things, soonest first. Far-away events (scope "far") are not shown.
export function upcomingItems(date, data, draft) {
  const cands = []
  const { ok: evs, used } = usable(data.events, draft)
  for (const e of evs) {
    if (e.scope === 'far') continue
    if (!e.date) continue
    const place = e.place_hi ? fmt(S.upcomingPlace, { place: e.place_hi }) : ''
    if (e.kind === 'window' && e.date_to) {
      if (e.date <= date && date <= e.date_to) {
        const days = daysBetween(date, e.date_to)
        if (days > 0) cands.push({ id: e.id, days, text: fmt(S.upcomingWindow, { title: e.title_hi, days, date: human(e.date_to) }) + place, unrev: used.includes(e.id) })
        continue
      }
    }
    const days = daysBetween(date, e.date)
    if (days <= 0) continue
    const text = e.date_to && e.date_to > e.date
      ? fmt(S.upcomingEventRange, { title: e.title_hi, days, date: human(e.date), date2: human(e.date_to) })
      : fmt(S.upcomingEvent, { title: e.title_hi, days, date: human(e.date) })
    cands.push({ id: e.id, days, text: text + place, unrev: used.includes(e.id) })
  }
  const { ok: sch, used: sused } = usable(data.schemes, draft)
  for (const s of sch) {
    if (s.deadline && s.deadline > date) cands.push({ id: s.id, days: daysBetween(date, s.deadline), text: fmt(S.upcomingWindow, { title: s.title_hi, days: daysBetween(date, s.deadline), date: human(s.deadline) }), unrev: sused.includes(s.id) })
  }
  return cands.sort((a, b) => a.days - b.days).slice(0, 3)
}

function pickSlotNew(date, { draft, data, summary }) {
  const want = SLOT_BY_WEEKDAY_V2[weekday(date)]
  const tryKind = (kind) => {
    if (kind === 'scheme') {
      const r = pickScheme(date, data, draft)
      return r ? { kind, lines: schemeLines(r.scheme, date), scheme: r.scheme, usedUnreviewed: r.unreviewed ? [r.scheme.id] : [] } : null
    }
    if (kind === 'howto') {
      const r = pickScheme(mondayOf(date), data, draft)
      if (!r || !howtoEligible(r.scheme)) return null
      return { kind, lines: howtoLines(r.scheme), usedUnreviewed: r.unreviewed ? [r.scheme.id] : [] }
    }
    if (kind === 'upcoming') {
      const items = upcomingItems(date, data, draft)
      return items.length ? { kind, lines: [S.slotUpcoming, ...items.map((i) => i.text)], usedUnreviewed: items.filter((i) => i.unrev).map((i) => i.id) } : null
    }
    if (kind === 'money') {
      const { ok, used } = usable((data.moneyFacts || []).filter((m) => inWindow(m, date)), draft)
      const it = pickThrottled(ok, date)
      if (!it) return null
      return { kind, lines: [S.slotMoney, ...it.lines_hi, fmt(S.sourceWithDate, { source: it.source_name, date: human(it.source_date) })], usedUnreviewed: used.includes(it.id) ? [it.id] : [] }
    }
    if (kind === 'know') {
      const { ok, used } = usable(data.gyaan, draft)
      const it = pickThrottled(ok, date)
      if (!it) return null
      const lines = [S.slotKnow, it.text_hi]
      if (it.source_name) lines.push(it.source_date ? fmt(S.sourceWithDate, { source: it.source_name, date: human(it.source_date) }) : fmt(S.slotSchemeSource, { source: it.source_name }))
      return { kind, lines, usedUnreviewed: used.includes(it.id) ? [it.id] : [] }
    }
    if (kind === 'kahawat') {
      const { ok, used } = usable((data.lines?.kahawat || []).filter((k) => k.lint_blocked !== true), draft)
      const it = pickThrottled(ok, date)
      if (!it) return null
      const lines = [S.slotKahawat, it.text_hi, fmt(S.kahawatMeaning, { meaning: it.meaning_hi })]
      if (it.source_name) lines.push(fmt(S.kahawatSource, { source: it.source_name }))
      return { kind, lines, usedUnreviewed: used.includes(it.id) ? [it.id] : [] }
    }
    if (kind === 'recap') return recap(summary)
    return null
  }
  // fallback chain: the wanted kind, then 'upcoming', then no slot at all (honest: nothing eligible today)
  return tryKind(want) || (want !== 'upcoming' ? tryKind('upcoming') : null)
}

function recap(summary) {
  const lines = []
  for (const it of summary?.shown || []) {
    const d = weekChange(it)
    if (d == null) continue
    lines.push(d === 0 ? fmt(S.recapLineFlat, { crop: it.name }) : fmt(S.recapLine, { crop: it.name, arrow: d > 0 ? S.mandiArrowUp : S.mandiArrowDown, delta: `₹${Math.abs(d)}` }))
  }
  return lines.length ? { kind: 'recap', lines: [S.slotRecap, ...lines], usedUnreviewed: [] } : null
}

// -> { kind, lines: [string], usedUnreviewed: [id] } or null (no slot today)
export function pickSlot(date, { draft = false, data, summary, sowingValidUntil, env = process.env } = {}) {
  if (!contentOff(env)) return pickSlotNew(date, { draft, data, summary })
  return pickSlotOld(date, { draft, data, summary, sowingValidUntil })
}

// the Batch 16-18 behaviour, untouched
function pickSlotOld(date, { draft = false, data, summary, sowingValidUntil } = {}) {
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
    if (kind === 'recap') return recap(summary)
    return null
  }
  return tryKind(want) || (want !== 'countdown' ? tryKind('countdown') : null)
}
