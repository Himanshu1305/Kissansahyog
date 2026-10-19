// Batch 11A — shared code of the OTP Pages Functions (functions/api/otp/send.js, verify.js, config.js).
// Not a route: it exports no request handler, and public/_routes.json sends only /api/*, /geo, /geocode and
// /transcribe to Functions.
//
// SECRETS. TWOFACTOR_API_KEY and SUPABASE_SERVICE_ROLE_KEY are read from the Pages project's encrypted
// variables and used only inside outgoing requests. The 2Factor key is PART OF THE PROVIDER URL, so:
//   * no URL, no provider response text and no error message of a provider call is ever logged or returned;
//   * logs are one JSON line: function, event, HTTP status and a short error class, phone as its last 2 digits.
// Provider messages are never shown to anybody; the browser gets our own error codes (Hindi/English text in
// src/lib/i18n/strings.js).
//
// TEST OVERRIDE. TWOFACTOR_BASE_URL replaces the provider address ONLY when ENVIRONMENT === 'test' (local
// wrangler runs with a mock provider). On the real Pages projects ENVIRONMENT is not 'test', so it is ignored.

export const PROVIDER_BASE = 'https://2factor.in/API/V1'
export const TEMPLATE = 'Kisan_Sahyog_OTP_v3'
export const RESEND_AFTER = 30
export const BODY_MAX = 1024
const PROVIDER_TIMEOUT_MS = 8000
const RPC_TIMEOUT_MS = 8000

export function providerBase(env) {
  if (env && env.ENVIRONMENT === 'test' && env.TWOFACTOR_BASE_URL) return String(env.TWOFACTOR_BASE_URL).replace(/\/+$/, '')
  return PROVIDER_BASE
}

export const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } })

export function log(fn, event, fields = {}) {
  // Only whitelisted, non-secret fields reach the log.
  const safe = {}
  for (const k of ['status', 'cls', 'reason', 'phone2', 'purpose']) if (fields[k] !== undefined) safe[k] = fields[k]
  console.warn(JSON.stringify({ fn, event, ...safe }))
}
export const last2 = (phone) => (typeof phone === 'string' && phone.length >= 2 ? `**${phone.slice(-2)}` : '')
export const errClass = (e) => String((e && e.name) || 'error').slice(0, 40)

// 10-digit Indian mobile number, exactly as the app sends it (no +91, no spaces).
export const PHONE_RE = /^[6-9]\d{9}$/
export const CODE_RE = /^\d{6}$/
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// Same list as functions/api/feedback.js plus the Capacitor app origins (https://localhost and
// capacitor://localhost both have the host "localhost"). For these POSTs an Origin header is REQUIRED.
export function hostAllowed(host) {
  if (!host) return false
  const h = host.toLowerCase()
  return (
    h === 'kissansahyog.com' || h === 'www.kissansahyog.com' || h === 'staging.kissansahyog.com' ||
    h === 'kissansahyog.pages.dev' || h.endsWith('.kissansahyog.pages.dev') ||
    h === 'kissansahyog-prod.pages.dev' || h.endsWith('.kissansahyog-prod.pages.dev') ||
    h === 'localhost' || h.startsWith('localhost:') || h === '127.0.0.1' || h.startsWith('127.0.0.1:')
  )
}
export function originOk(request) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  if (origin === 'capacitor://localhost') return true
  try { return hostAllowed(new URL(origin).host) } catch { return false }
}

// Reads a small JSON object body, or returns { error: Response }.
export async function readJson(request) {
  const ct = (request.headers.get('content-type') || '').toLowerCase()
  if (!ct.startsWith('application/json')) return { error: json({ error: 'bad_request' }, 415) }
  const len = Number(request.headers.get('content-length') || 0)
  if (len > BODY_MAX) return { error: json({ error: 'bad_request' }, 413) }
  let raw
  try { raw = await request.text() } catch { return { error: json({ error: 'bad_request' }, 400) } }
  if (raw.length > BODY_MAX) return { error: json({ error: 'bad_request' }, 413) }
  let body
  try { body = JSON.parse(raw) } catch { return { error: json({ error: 'bad_request' }, 400) } }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: json({ error: 'bad_request' }, 400) }
  return { body }
}

export function supabaseCreds(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || null
  const key = env.SUPABASE_SERVICE_ROLE_KEY || null
  return url && key ? { url: String(url).replace(/\/+$/, ''), key } : null
}

// Calls a service-role RPC. Returns { ok, status, data } — never throws, never exposes the key.
export async function rpc(creds, name, args, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`${creds.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: creds.key, authorization: `Bearer ${creds.key}` },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    })
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = null }
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    return { ok: false, status: 0, data: null, cls: errClass(e) }
  }
}

// 2Factor SEND (AUTOGEN with our approved template). Returns { ok, session } or { ok:false, status, cls }.
export async function providerSend(env, phone, fetchImpl = fetch) {
  const key = env.TWOFACTOR_API_KEY
  if (!key) return { ok: false, status: 0, cls: 'no_key' }
  try {
    const res = await fetchImpl(`${providerBase(env)}/${encodeURIComponent(key)}/SMS/${phone}/AUTOGEN/${TEMPLATE}`, {
      method: 'GET', signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })
    let data = null
    try { data = await res.json() } catch { data = null }
    const session = data && data.Status === 'Success' && typeof data.Details === 'string' ? data.Details.trim() : ''
    if (res.ok && session && session.length <= 200) return { ok: true, session }
    return { ok: false, status: res.status, cls: 'provider_refused' }
  } catch (e) {
    return { ok: false, status: 0, cls: errClass(e) }
  }
}

// 2Factor VERIFY. Returns { result: 'matched' | 'mismatch' | 'expired' | 'error', status, cls }.
export async function providerVerify(env, session, code, fetchImpl = fetch) {
  const key = env.TWOFACTOR_API_KEY
  if (!key) return { result: 'error', status: 0, cls: 'no_key' }
  try {
    const res = await fetchImpl(`${providerBase(env)}/${encodeURIComponent(key)}/SMS/VERIFY/${encodeURIComponent(session)}/${code}`, {
      method: 'GET', signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })
    let data = null
    try { data = await res.json() } catch { data = null }
    const details = String((data && data.Details) || '').toLowerCase()
    if (details.includes('mismatch')) return { result: 'mismatch', status: res.status }
    if (details.includes('expired')) return { result: 'expired', status: res.status }
    if (res.ok && data && data.Status === 'Success' && details === 'otp matched') return { result: 'matched', status: res.status }
    return { result: 'error', status: res.status, cls: 'provider_unexpected' }
  } catch (e) {
    return { result: 'error', status: 0, cls: errClass(e) }
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
