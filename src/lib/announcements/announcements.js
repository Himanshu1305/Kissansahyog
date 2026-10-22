// Batch 14A - announcement cards: pure helpers (India time, active window, dismissal, which cards to show).
// India has no daylight saving: IST is always UTC+5:30. Admin types start/end in India time; the database stores UTC.
const IST_MS = (5 * 60 + 30) * 60 * 1000

// '2026-10-24T09:00' (as typed in India time) -> ISO UTC string. Returns null for anything that is not a date-time.
export function istInputToIso(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(text || ''))
  if (!m) return null
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - IST_MS
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

// ISO UTC -> 'YYYY-MM-DDTHH:mm' in India time (for the form's date-time boxes).
export function isoToIstInput(iso) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  return new Date(ms + IST_MS).toISOString().slice(0, 16)
}

// Plain label such as '24 Oct 2026, 9:00 am IST'.
export function formatIst(iso, lang = 'en') {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  try {
    return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms)) + ' IST'
  } catch { return iso }
}

// The same rule the database uses: active, started, not yet ended.
export function inWindow(a, now = new Date()) {
  if (!a || a.is_active === false) return false
  const t = now.getTime()
  return t >= Date.parse(a.start_at) && t < Date.parse(a.end_at)
}

// India calendar day of a moment, 'YYYY-MM-DD' (dismissal is remembered per card per day).
export const istDay = (now = new Date()) => new Date(now.getTime() + IST_MS).toISOString().slice(0, 10)

export const DISMISS_KEY = 'ks_announce_closed_v1'
export function readDismissed(now = new Date()) {
  try {
    const all = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}')
    const today = istDay(now)
    return Object.fromEntries(Object.entries(all).filter(([, day]) => day === today))
  } catch { return {} }
}
export function writeDismissed(id, now = new Date()) {
  try {
    const all = readDismissed(now)
    all[id] = istDay(now)
    localStorage.setItem(DISMISS_KEY, JSON.stringify(all))
  } catch { /* storage blocked: it just comes back on reload */ }
}

// The cards to show: inside the window, not closed today (when closable), best priority first, at most `max`.
export function pickCards(list, now = new Date(), dismissed = {}, max = 2) {
  if (!Array.isArray(list)) return []
  return list
    .filter((a) => a && a.id && inWindow({ is_active: true, ...a }, now))
    .filter((a) => !(a.dismissible !== false && dismissed[a.id]))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || Date.parse(b.start_at) - Date.parse(a.start_at))
    .slice(0, max)
}

// Accepts only what the database accepts: nothing, a /path, or an https address.
export const safeLink = (u) => (typeof u === 'string' && (/^\/[^/\s][^\s]*$/.test(u) || /^https:\/\/[^\s/][^\s]*$/.test(u)) ? u : null)
export const safeImage = (u) => (typeof u === 'string' && (/^\/[^/\s][^\s]*$/.test(u) || /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[^\s]+$/.test(u)) ? u : null)

export const textOf = (a, base, lang) => {
  const o = a || {}
  return (lang === 'hi' ? o[`${base}_hi`] || o[`${base}_en`] : o[`${base}_en`] || o[`${base}_hi`]) || ''
}

export const STYLE_COLORS = {
  festival: { bg: 'var(--ks-saffron-tint)', border: 'var(--ks-saffron)' },
  info: { bg: 'var(--ks-green-tint)', border: 'var(--ks-green-dark)' },
  alert: { bg: '#fef3c7', border: '#b45309' },
}

export const LIMITS = { title: 80, body: 280, small: 120, label: 40, alt: 160 }
export const SMS_LOW_THRESHOLD = 300
