// Cloudflare Pages Function — Feedback & Grievance form (/grievance).
//
//   POST /api/feedback  { email?, mobile?, kind, message, lang?, device?, public_ok?, ks_leave_empty? }
//     → 200 { ok: true }            stored (the notification e-mail is best-effort)
//     → 400 { error: 'feedback_…' } the person can fix it (bad contact, empty message…)
//     → 429 { error: 'feedback_too_many' }
//     → 503 { error: 'unavailable' } nothing stored — the browser then tries its fallback
//
// What it does, in order:
//   1. validates again (the browser and the RPC do too) and checks the honeypot;
//   2. stores the message through the submit_feedback RPC (migration 0055);
//   3. e-mails the team through the Resend REST API, then stamps notified_at through
//      mark_feedback_notified (service role only).
// A message that was stored is ALWAYS reported as success, even when the e-mail could
// not be sent or RESEND_API_KEY is missing — that only logs a server-side warning.
//
// Env (Pages project → Settings → Variables and Secrets), read here only:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (same names as functions/transcribe.js)
//   RESEND_API_KEY
// No key, URL or upstream error text is ever put in a response.

const KINDS = ['suggestion', 'problem', 'other']
const PUBLIC_KINDS = ['suggestion', 'other']
const KIND_LABEL = { suggestion: 'Suggestion', problem: 'Problem', other: 'Other' }
const MESSAGE_MIN = 5
const MESSAGE_MAX = 4000
const BODY_MAX = 20000 // bytes of JSON we are willing to read
const MAIL_FROM = 'Kisan Sahyog <hello@kissansahyog.com>'
const MAIL_TO = 'grievance@kissansahyog.com'
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
// Codes the RPC raises that the person can act on → HTTP status.
const USER_ERRORS = {
  feedback_contact_required: 400,
  feedback_email_invalid: 400,
  feedback_mobile_invalid: 400,
  feedback_kind_invalid: 400,
  feedback_message_required: 400,
  feedback_message_too_long: 400,
  feedback_too_many: 429,
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

// Same rules as src/lib/feedback/contact.js (kept in step by scripts/verify-batch7b.mjs).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export function normalizeEmail(value) {
  const e = String(value ?? '').trim().toLowerCase()
  return e && e.length <= 254 && EMAIL_RE.test(e) ? e : null
}
export function normalizeMobile(value) {
  let m = String(value ?? '').replace(/[\s-]/g, '')
  if (m.startsWith('+91')) m = m.slice(3)
  else if (/^91\d{10}$/.test(m)) m = m.slice(2)
  if (/^0\d{10}$/.test(m)) m = m.slice(1)
  return /^[6-9]\d{9}$/.test(m) ? m : null
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Validates the posted JSON. Returns { error } or { value } with clean fields.
export function validate(body) {
  const b = body && typeof body === 'object' ? body : {}
  const hasEmail = String(b.email ?? '').trim() !== ''
  const hasMobile = String(b.mobile ?? '').trim() !== ''
  if (!hasEmail && !hasMobile) return { error: 'feedback_contact_required' }
  const email = hasEmail ? normalizeEmail(b.email) : null
  if (hasEmail && !email) return { error: 'feedback_email_invalid' }
  const mobile = hasMobile ? normalizeMobile(b.mobile) : null
  if (hasMobile && !mobile) return { error: 'feedback_mobile_invalid' }
  const kind = String(b.kind ?? '').trim()
  if (!KINDS.includes(kind)) return { error: 'feedback_kind_invalid' }
  const message = String(b.message ?? '').trim()
  if (message.length < MESSAGE_MIN) return { error: 'feedback_message_required' }
  if (message.length > MESSAGE_MAX) return { error: 'feedback_message_too_long' }
  return {
    value: {
      email,
      mobile,
      kind,
      message,
      lang: b.lang === 'hi' || b.lang === 'en' ? b.lang : null,
      device: String(b.device ?? '').trim().slice(0, 80) || 'unknown',
      // Public display is never honoured for a problem/complaint.
      public_ok: b.public_ok === true && PUBLIC_KINDS.includes(kind),
    },
  }
}

// The notification e-mail. All user text is escaped in the HTML part.
export function buildEmail(v, now = new Date()) {
  const type = KIND_LABEL[v.kind]
  const first = v.message.replace(/\s+/g, ' ').trim().slice(0, 60)
  const when = `${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`
  const contact = [v.email && `Email: ${v.email}`, v.mobile && `Mobile: ${v.mobile}`].filter(Boolean).join(' | ')
  const language = v.lang === 'en' ? 'English' : v.lang === 'hi' ? 'Hindi' : 'Not given'
  const publicLine = v.kind === 'problem' ? 'No (problems are never shown publicly)' : v.public_ok ? 'Yes, anonymously, after review' : 'No'
  const rows = [['Type', type], ['Contact', contact], ['Language', language], ['Time', when], ['Public display allowed', publicLine]]
  const text = `${rows.map(([k, val]) => `${k}: ${val}`).join('\n')}\n\nMessage:\n${v.message}\n`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1c1917">`
    + `<table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, val]) => `<tr><td style="font-weight:bold;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(val)}</td></tr>`).join('')}</table>`
    + `<p style="font-weight:bold;margin:16px 0 4px">Message</p>`
    + `<p style="white-space:pre-wrap;margin:0;padding:12px;background:#f5f5f4;border-radius:8px">${escapeHtml(v.message)}</p>`
    + `</div>`
  const mail = { from: MAIL_FROM, to: [MAIL_TO], subject: `[Feedback/Grievance] ${type} — ${first}`, text, html }
  if (v.email) mail.reply_to = v.email
  return mail
}

function supabaseCreds(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || null
  const key = env.SUPABASE_SERVICE_ROLE_KEY || null
  return url && key ? { url: String(url).replace(/\/+$/, ''), key } : null
}

async function rpc(creds, name, args, timeoutMs = 8000) {
  return fetch(`${creds.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: creds.key, authorization: `Bearer ${creds.key}` },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(timeoutMs),
  })
}

// Only our own pages may post here (same list as functions/transcribe.js). A request
// with no Origin and no Referer is treated as same-origin.
function hostAllowed(host) {
  if (!host) return false
  const h = host.toLowerCase()
  return (
    h === 'kissansahyog.com' ||
    h === 'www.kissansahyog.com' ||
    h === 'staging.kissansahyog.com' ||
    h === 'kissansahyog.pages.dev' || h.endsWith('.kissansahyog.pages.dev') ||
    h === 'kissansahyog-prod.pages.dev' || h.endsWith('.kissansahyog-prod.pages.dev') ||
    h === 'localhost' || h.startsWith('localhost:') ||
    h === '127.0.0.1' || h.startsWith('127.0.0.1:')
  )
}
function originOk(request) {
  const pick = (v) => { try { return v ? new URL(v).host : null } catch { return null } }
  const oHost = pick(request.headers.get('origin'))
  const rHost = pick(request.headers.get('referer'))
  if (!oHost && !rHost) return true
  return hostAllowed(oHost) || (!oHost && hostAllowed(rHost))
}

// Best-effort: never throws, never changes what the browser is told.
async function notify(env, creds, id, value) {
  const key = env.RESEND_API_KEY
  if (!key) {
    console.warn(`[feedback] message ${id} saved but NOT e-mailed: RESEND_API_KEY is not set for this Pages project.`)
    return
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify(buildEmail(value)),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.warn(`[feedback] message ${id} saved but the notification e-mail failed: Resend HTTP ${res.status}.`)
      return
    }
  } catch (e) {
    console.warn(`[feedback] message ${id} saved but the notification e-mail failed: ${String(e && e.name ? e.name : 'error')}.`)
    return
  }
  try {
    const res = await rpc(creds, 'mark_feedback_notified', { p_id: id }, 6000)
    if (!res.ok) console.warn(`[feedback] message ${id} e-mailed, but notified_at was not set: HTTP ${res.status}.`)
  } catch {
    console.warn(`[feedback] message ${id} e-mailed, but notified_at was not set (request failed).`)
  }
}

export async function onRequestPost(context) {
  const { request, env } = context
  if (!originOk(request)) return json({ error: 'forbidden_origin' }, 403)

  let body
  try {
    const raw = await request.text()
    if (raw.length > BODY_MAX) return json({ error: 'feedback_message_too_long' }, 400)
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'bad_request' }, 400)

  // Honeypot: people never see or fill this field. Answer like a success, store nothing.
  if (String(body.ks_leave_empty ?? '').trim() !== '') return json({ ok: true })

  const checked = validate(body)
  if (checked.error) return json({ error: checked.error }, USER_ERRORS[checked.error] || 400)
  const v = checked.value

  const creds = supabaseCreds(env)
  if (!creds) {
    console.warn('[feedback] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set for this Pages project; nothing stored.')
    return json({ error: 'unavailable' }, 503)
  }

  let id
  try {
    const res = await rpc(creds, 'submit_feedback', {
      p_email: v.email, p_mobile: v.mobile, p_kind: v.kind, p_message: v.message,
      p_lang: v.lang, p_device: v.device, p_public_ok: v.public_ok,
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400).toLowerCase()
      const code = Object.keys(USER_ERRORS).find((c) => detail.includes(c))
      if (code) return json({ error: code }, USER_ERRORS[code])
      console.warn(`[feedback] submit_feedback failed: HTTP ${res.status} (is migration 0055 applied?).`)
      return json({ error: 'unavailable' }, 503)
    }
    id = await res.json()
  } catch (e) {
    console.warn(`[feedback] submit_feedback request failed: ${String(e && e.name ? e.name : 'error')}.`)
    return json({ error: 'unavailable' }, 503)
  }

  // Stored. Keep the worker alive for the e-mail without making the person wait.
  const work = notify(env, creds, id, v)
  if (typeof context.waitUntil === 'function') context.waitUntil(work)
  else await work
  return json({ ok: true })
}

// Anything but POST: say so plainly (also stops the SPA shell answering here).
export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } })
  return json({ error: 'method_not_allowed' }, 405)
}
