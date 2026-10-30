// Batch 16B - /admin/morning: pure helpers (no React, no network). Unit tests: tests/unit/morning-16b.test.mjs.
// All dates are India (IST) calendar dates as 'YYYY-MM-DD'.
const IST_MS = 330 * 60 * 1000
const DAY_MS = 86400000

export const istToday = (now = new Date()) => new Date(now.getTime() + IST_MS).toISOString().slice(0, 10)
export const isIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
export const shiftDate = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)

// The page shows the last 60 days and tomorrow (the job may run just after midnight IST). Anything else becomes today.
export function pickDate(wanted, today) {
  if (!isIso(wanted)) return today
  if (wanted > shiftDate(today, 1) || wanted < shiftDate(today, -60)) return today
  return wanted
}

// today, yesterday, ... n days, newest first
export const lastDays = (today, n = 14) => Array.from({ length: n }, (_, i) => shiftDate(today, -i))

// yesterday's poll result is stored on yesterday's row
export const pollResultDate = (date) => shiftDate(date, -1)

export const historyStatus = (row) => (!row ? 'none' : row.posted_at ? 'posted' : 'ready')

// Merge the 14-day day list with the rows the database returned -> [{date, status, row}]
export function historyList(today, rows, n = 14) {
  const by = new Map((rows || []).map((r) => [r.post_date, r]))
  return lastDays(today, n).map((date) => ({ date, row: by.get(date) || null, status: historyStatus(by.get(date)) }))
}

export const pctOk = (v) => { const n = Number(v); return v !== '' && v != null && Number.isInteger(n) && n >= 0 && n <= 100 }

export const cardDataUrl = (b64) => (b64 ? `data:image/png;base64,${b64}` : null)
export const cardFileName = (date) => `kisan-sahyog-card-${date}.png`

export function base64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Copy with the Clipboard API; on old webviews fall back to selecting the text and execCommand('copy').
// deps: { nav, doc, textarea } injected so it can be tested. Returns 'copied' or 'failed' (then the caller shows "select all").
export async function copyText(text, { nav = globalThis.navigator, doc = globalThis.document, textarea = null } = {}) {
  try {
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') { await nav.clipboard.writeText(text); return 'copied' }
  } catch { /* blocked: use the fallback */ }
  try {
    const el = textarea || (doc && doc.createElement ? doc.createElement('textarea') : null)
    if (!el) return 'failed'
    if (!textarea) { el.value = text; el.setAttribute?.('readonly', ''); el.style && (el.style.position = 'fixed'); doc.body.appendChild(el) }
    el.focus?.(); el.select?.(); el.setSelectionRange?.(0, String(text).length)
    const ok = !!(doc && doc.execCommand && doc.execCommand('copy'))
    if (!textarea && el.parentNode) el.parentNode.removeChild(el)
    return ok ? 'copied' : 'failed'
  } catch { return 'failed' }
}

// Batch 17A - the voice note
export const voiceFileName = (date) => `morning-${date}.mp3`
export const voiceDataUrl = (b64) => (b64 ? `data:audio/mpeg;base64,${b64}` : null)
export const hasVoice = (post) => !!(post && post.voice_mp3_b64)
export const whatsappTextUrl = (text) => `https://wa.me/?text=${encodeURIComponent(String(text || ''))}`
export function canShareFiles(nav, files) {
  try { return !!(nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && files.length > 0 && nav.canShare({ files })) } catch { return false }
}

export function canShareFile(nav, file) {
  try { return !!(nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) } catch { return false }
}

// RPC answers are jsonb. {ok:false,error} -> an Error with .code and the key of its message.
export const ERROR_KEYS = { forbidden: 'mp_err_forbidden', not_found: 'mp_err_not_found', bad_input: 'mp_err_bad_input' }
export function answerOrThrow(body) {
  if (body && body.ok === true) return body
  const code = (body && body.error) || 'unknown'
  throw Object.assign(new Error(code), { code, i18nKey: ERROR_KEYS[code] || 'err_unknown' })
}
