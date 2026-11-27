// Batch 29 - the rules for an answer entered in the admin "KVK questions" tab. Used twice: by the admin form (to refuse a bad answer before it is sent) and by the
// morning job (scripts/morning/lib/kvk.js, which checks again before it uses an answer). The database checks the same limits (supabase/migrations/0079_kvk_questions.sql,
// function ks_kvk_clean); a test compares the numbers. No wording here: only error KEYS, the texts live in adminStrings.js.

export const LIMITS = {
  dasMin: 10, dasMax: 150, dasSpanMax: 20, // days after sowing
  seedPctMax: 100, // extra seed, in percent
  sourceMin: 3, sourceMax: 120, // characters of "who told us"
  toldMaxAgeDays: 60, // the answer must have been told today or in the last 60 days
  validMaxDays: 400, validDefaultDays: 120, // how long an answer is used
  dateMaxAheadDays: 400, // a date answer is at most this far after the day it was told
}
export const KINDS = ['stage_days', 'date', 'late_sowing']

// Per irrigation, the range the first day may start in (wheat, irrigated, timely sown). An answer far outside is almost surely a typing mistake.
export const STAGE_BOUNDS = { irr1: [15, 35], irr2: [30, 75], irr3: [60, 110] }

const ISO = /^\d{4}-\d{2}-\d{2}$/
export const isIso = (s) => typeof s === 'string' && ISO.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s
export const addDaysIso = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const wholeNumber = (v) => (typeof v === 'number' && Number.isInteger(v)) || (typeof v === 'string' && /^\d{1,3}$/.test(v.trim()))
const toInt = (v) => (typeof v === 'number' ? v : Number(String(v).trim()))

// -> { error: 'adm_kvk_err_...' } | { value: <cleaned answer> }.  `target` is the stage id for stage_days.
export function cleanAnswer(kind, raw, { target = null, sourceDate = null } = {}) {
  const a = raw && typeof raw === 'object' ? raw : {}
  if (kind === 'stage_days') {
    if (!wholeNumber(a.das_from) || !wholeNumber(a.das_to)) return { error: 'adm_kvk_err_range' }
    const from = toInt(a.das_from), to = toInt(a.das_to)
    if (from < LIMITS.dasMin || to > LIMITS.dasMax || from >= to || to - from > LIMITS.dasSpanMax) return { error: 'adm_kvk_err_range' }
    const b = target && STAGE_BOUNDS[target]
    if (b && (from < b[0] || from > b[1])) return { error: 'adm_kvk_err_range' }
    return { value: { das_from: from, das_to: to } }
  }
  if (kind === 'date' || kind === 'late_sowing') {
    const d = kind === 'date' ? a.date : a.last_date
    if (!isIso(d)) return { error: 'adm_kvk_err_date' }
    if (sourceDate && (d < sourceDate || d > addDaysIso(sourceDate, LIMITS.dateMaxAheadDays))) return { error: 'adm_kvk_err_date' }
    if (kind === 'date') return { value: { date: d } }
    const raw2 = a.seed_extra_pct
    if (raw2 === undefined || raw2 === null || String(raw2).trim() === '') return { value: { last_date: d } }
    if (!wholeNumber(raw2)) return { error: 'adm_kvk_err_seed' }
    const pct = toInt(raw2)
    if (pct < 0 || pct > LIMITS.seedPctMax) return { error: 'adm_kvk_err_seed' }
    return { value: { last_date: d, seed_extra_pct: pct } }
  }
  return { error: 'adm_kvk_err_range' }
}

// -> { error } | { value: { source_name, source_date, valid_until } }.  todayIso = the India date.
export function cleanMeta({ sourceName, sourceDate, validUntil }, todayIso) {
  const who = String(sourceName == null ? '' : sourceName).trim()
  if (who.length < LIMITS.sourceMin || who.length > LIMITS.sourceMax) return { error: 'adm_kvk_err_source' }
  if (!isIso(sourceDate) || sourceDate > todayIso || sourceDate < addDaysIso(todayIso, -LIMITS.toldMaxAgeDays)) return { error: 'adm_kvk_err_told' }
  if (!isIso(validUntil) || validUntil <= todayIso || validUntil > addDaysIso(todayIso, LIMITS.validMaxDays)) return { error: 'adm_kvk_err_valid' }
  return { value: { source_name: who, source_date: sourceDate, valid_until: validUntil } }
}

// The admin form's values -> { error } | { answer, meta }
export function formToAnswer(kind, target, f, todayIso) {
  const meta = cleanMeta({ sourceName: f.source_name, sourceDate: f.source_date, validUntil: f.valid_until }, todayIso)
  if (meta.error) return { error: meta.error }
  const raw = kind === 'stage_days' ? { das_from: f.das_from, das_to: f.das_to } : kind === 'date' ? { date: f.date } : { last_date: f.last_date, seed_extra_pct: f.seed_extra_pct }
  const a = cleanAnswer(kind, raw, { target, sourceDate: meta.value.source_date })
  if (a.error) return { error: a.error }
  return { answer: a.value, meta: meta.value }
}
