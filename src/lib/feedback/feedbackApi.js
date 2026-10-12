import { supabase } from '../supabaseClient'
import { getDeviceId } from '../device'
import { parseContact } from './contact'

// Feedback & Grievance form (/grievance). The form asks for one way to reach the
// person (an e-mail address or a mobile number), a type and a message.
export const FEEDBACK_KINDS = ['suggestion', 'problem', 'other']
// Only these may ever be shown publicly, and only with the person's permission.
export const PUBLIC_KINDS = ['suggestion', 'other']
export const FEEDBACK_EMAIL = 'grievance@kissansahyog.com'
export const FEEDBACK_MAX = 4000
const ENDPOINT = '/api/feedback'

const CONTACT_ERROR_KEY = {
  required: 'fb_err_contact_required',
  email: 'err_invalid_email',
  mobile: 'fb_err_mobile',
  unknown: 'fb_err_contact',
}

// Client-side check; the server function and the RPC repeat it. Returns
// { field, key } (field = 'contact' | 'message', key = i18n key) or null.
export function validateFeedback({ contact, message }) {
  const c = parseContact(contact)
  if (c.error) return { field: 'contact', key: CONTACT_ERROR_KEY[c.error] }
  const m = String(message || '').trim()
  if (m.length < 5) return { field: 'message', key: 'fb_err_message' }
  if (m.length > FEEDBACK_MAX) return { field: 'message', key: 'fb_err_message_long' }
  return null
}

// Server / RPC error code → i18n key. Kept here (not in lib/errors.js) because
// these codes are specific to this form.
const CODE_TO_KEY = {
  feedback_contact_required: 'fb_err_contact_required',
  feedback_email_invalid: 'err_invalid_email',
  feedback_mobile_invalid: 'fb_err_mobile',
  feedback_message_required: 'fb_err_message',
  feedback_message_too_long: 'fb_err_message_long',
  feedback_too_many: 'fb_err_too_many',
}

function refused(code) {
  const err = new Error(code)
  err.i18nKey = CODE_TO_KEY[code]
  err.canEmail = false
  return err
}

// 1) The site's own server function: stores the message and e-mails the team.
// Returns true when stored, false when the function is not there / not usable (local
// dev, before deploy, not configured) so the caller can try the direct RPC. A refusal
// the person can fix (bad input, too many messages) throws.
async function viaServer(payload) {
  let res
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
  } catch {
    return false
  }
  let body = null
  try { body = await res.json() } catch { /* not JSON → not our function */ }
  if (res.ok && body?.ok === true) return true
  if (body?.error && CODE_TO_KEY[body.error]) throw refused(body.error)
  return false
}

// 2) Straight to the submit_feedback RPC (migration 0055). No notification e-mail on
// this path; the message is still in the inbox table.
async function viaRpc(payload) {
  let error
  try {
    ({ error } = await supabase.rpc('submit_feedback', {
      p_email: payload.email,
      p_mobile: payload.mobile,
      p_kind: payload.kind,
      p_message: payload.message,
      p_lang: payload.lang,
      p_device: payload.device,
      p_public_ok: payload.public_ok,
    }))
  } catch (e) {
    error = e
  }
  if (!error) return
  const raw = String(error?.message || error || '').toLowerCase()
  const code = Object.keys(CODE_TO_KEY).find((c) => raw.includes(c))
  if (code) throw refused(code)
  const err = new Error('feedback_unavailable')
  err.i18nKey = 'fb_err_unavailable'
  err.canEmail = true
  throw err
}

// Sends the message: server function first, then the direct RPC. Any failure throws
// an Error carrying `i18nKey`; `canEmail` is true when the message could not be
// stored at all — the page then offers the same message as a ready-to-send e-mail,
// so it never shows a thank-you for something that was not saved.
export async function submitFeedback({ contact, kind, message, lang, publicOk }) {
  const c = parseContact(contact)
  const safeKind = FEEDBACK_KINDS.includes(kind) ? kind : 'other'
  const payload = {
    email: c.email || null,
    mobile: c.mobile || null,
    kind: safeKind,
    message: String(message).trim(),
    lang,
    device: getDeviceId(),
    public_ok: !!publicOk && PUBLIC_KINDS.includes(safeKind),
  }
  if (await viaServer(payload)) return
  await viaRpc(payload)
}

// Approved, consented suggestions for /about. Never throws: before the migration is
// applied (or when offline) there is simply nothing to show.
export async function fetchPublicFeedback(limit = 20) {
  try {
    const { data, error } = await supabase.rpc('get_public_feedback', { p_limit: limit })
    if (error || !Array.isArray(data)) return []
    return data
      .filter((r) => r && typeof r.message === 'string' && r.message.trim() && PUBLIC_KINDS.includes(r.kind))
      .map((r) => ({ message: r.message.trim(), kind: r.kind, lang: r.lang || null }))
  } catch {
    return []
  }
}

// mailto: link carrying the same message, for the fallback above.
export function feedbackMailto({ kindLabel, message }) {
  const subject = `Kissan Sahyog — ${kindLabel}`
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(String(message || '').trim())}`
}
