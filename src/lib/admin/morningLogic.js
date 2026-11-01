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
// Batch 17D - sharing. Two plain shares instead of one combined one (image + audio + text together is the fragile shape):
//   1) card + message: the message is copied first (best effort), then share({ files: [card], text })
//   2) voice: share({ files: [voice] }) with no text
// The REAL file is asked of canShare at click time. Results are plain objects: { status, errorName?, copied? }
//   status: 'shared' | 'cancelled' (AbortError, silent) | 'unavailable' (canShare said no) | 'failed' | 'unsupported' (no navigator.share)
export const canUseShare = (nav) => !!(nav && typeof nav.share === 'function')
export const isVisibleShareFailure = (r) => !!r && (r.status === 'failed' || r.status === 'unavailable')
export function logShareFailure(r) {
  if (!isVisibleShareFailure(r)) return
  console.warn(`share failed: ${r.status === 'failed' ? r.errorName || 'Error' : 'canShare-false'}`) // the name only; never the message, card or voice
}

async function shareFiles(nav, files, text) {
  if (!canUseShare(nav)) return { status: 'unsupported' }
  try {
    if (typeof nav.canShare !== 'function' || !nav.canShare({ files })) return { status: 'unavailable' }
    await nav.share(text ? { files, text } : { files })
    return { status: 'shared' }
  } catch (e) {
    if (e && e.name === 'AbortError') return { status: 'cancelled' }
    return { status: 'failed', errorName: (e && typeof e.name === 'string' && e.name) || 'Error' }
  }
}

// Copy, waiting at most copyWaitMs (a stuck clipboard must never stop the share, and Safari wants share() soon after the tap).
async function copyQuickly(nav, text, copyWaitMs) {
  let timer
  try {
    const copy = (async () => { if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') { await nav.clipboard.writeText(text); return true } return false })()
    copy.catch(() => {})
    const wait = new Promise((resolve) => { timer = setTimeout(() => resolve(false), copyWaitMs) })
    return !!(await Promise.race([copy, wait]))
  } catch { return false } finally { clearTimeout(timer) }
}

export async function shareCardWithMessage({ nav = globalThis.navigator, file, text, copyWaitMs = 1000 }) {
  const copied = await copyQuickly(nav, text, copyWaitMs)
  return { ...(await shareFiles(nav, [file], text)), copied }
}
// One file, no text (the voice; also the old card-only button, so its errors are visible too)
export async function shareFile({ nav = globalThis.navigator, file }) {
  return shareFiles(nav, [file])
}
export const shareVoiceFile = shareFile

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

// Batch 17E - the video (the card as a picture with the voice as its sound). The page only learns THAT a video exists
// (post.has_video); the bytes come from getMorningVideo (morning_post_video_get) in the background.
export const videoFileName = (date) => `morning-${date}.mp4`
export const hasVideo = (post) => !!(post && post.has_video === true)
export function makeVideoFile(b64, date) {
  if (!b64 || typeof File === 'undefined') return null
  return new File([base64ToBytes(b64)], videoFileName(date), { type: 'video/mp4' })
}
// load: 'idle' | 'loading' | 'ready' | 'error' (what the background fetch is doing) -> 'none' | 'loading' | 'ready' | 'error' (what the page shows)
export function videoUiState({ hasVideo: has, load }) {
  if (!has) return 'none'
  if (load === 'ready') return 'ready'
  if (load === 'error') return 'error'
  return 'loading'
}

// The main share: ONE file (the mp4) with the message as its caption.
// SAME-CLICK RULE: everything that must happen inside the tap (start the copy, ask canShare about the REAL file, call share) happens
// synchronously, before the first await - the browser only allows share() within a moment of the tap. The copy is NOT waited for
// before sharing; its outcome is read afterwards (waiting at most copyWaitMs), so a stuck clipboard can never block or delay the share.
export function shareVideoWithMessage({ nav = globalThis.navigator, file, text, copyWaitMs = 1000 }) {
  let copyDone = Promise.resolve(false)
  try {
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      copyDone = Promise.resolve(nav.clipboard.writeText(text)).then(() => true, () => false)
    }
  } catch { /* clipboard blocked: the share still goes ahead */ }
  let started
  try {
    if (!canUseShare(nav)) started = Promise.resolve({ status: 'unsupported' })
    else if (!file || typeof nav.canShare !== 'function' || !nav.canShare({ files: [file] })) started = Promise.resolve({ status: 'unavailable' })
    else started = Promise.resolve(nav.share({ files: [file], text })).then(() => ({ status: 'shared' }))
  } catch (e) { started = Promise.reject(e) }
  return started
    .catch((e) => (e && e.name === 'AbortError' ? { status: 'cancelled' } : { status: 'failed', errorName: (e && typeof e.name === 'string' && e.name) || 'Error' }))
    .then(async (r) => {
      let timer
      const wait = new Promise((resolve) => { timer = setTimeout(() => resolve(false), copyWaitMs) })
      const copied = await Promise.race([copyDone, wait]); clearTimeout(timer)
      return { ...r, copied: !!copied }
    })
}
