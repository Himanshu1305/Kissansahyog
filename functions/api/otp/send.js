// Cloudflare Pages Function — send a sign-in / sign-up code by SMS (Batch 11A, 2Factor AUTOGEN).
//
//   POST /api/otp/send  { phone: '9xxxxxxxxx', purpose: 'login' | 'register' }
//     → 200 { ok: true, challenge: '<opaque id>', resendAfter: 30 }
//     → 400 { error: 'invalid_phone' | 'bad_request' }      415 / 413 bad content type / body too large
//     → 403 { error: 'forbidden_origin' }
//     → 409 { error: 'phone_exists' }                          (register: the number already has an account)
//     → 429 { error: 'otp_cooldown' | 'otp_too_many', retryAfter: <seconds> }
//     → 503 { error: 'otp_service_busy' | 'otp_unavailable' }  (provider down / not configured — no retry here)
//
// Order: origin + content type + body → strict validation → rate limit (otp_rate_check, which also reserves the
// request) → for 'login' only send when the number may sign in this way; otherwise the SAME 200 answer after a
// similar wait, and no SMS ("decoy", it can never be verified) → 2Factor SEND → store its session id
// server-side (otp_record_send). The 2Factor session id never leaves the server; the browser gets our
// request id as the challenge.
// Env: TWOFACTOR_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secrets); ENVIRONMENT / TWOFACTOR_BASE_URL
// (tests only, see functions/lib/otp-core.js).
import { json, log, last2, originOk, readJson, supabaseCreds, rpc, providerSend, sleep, PHONE_RE, RESEND_AFTER } from '../../lib/otp-core.js'

const FN = 'otp/send'

export async function handleSend(request, env, deps = {}) {
  const fetchImpl = deps.fetch || fetch
  const wait = deps.sleep || sleep
  if (!originOk(request)) return json({ error: 'forbidden_origin' }, 403)
  const { body, error } = await readJson(request)
  if (error) return error
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const purpose = body.purpose
  if (!PHONE_RE.test(phone)) return json({ error: 'invalid_phone' }, 400)
  if (purpose !== 'login' && purpose !== 'register') return json({ error: 'bad_request' }, 400)

  const creds = supabaseCreds(env)
  if (!creds || !env.TWOFACTOR_API_KEY) {
    log(FN, 'not_configured', { cls: !creds ? 'no_supabase' : 'no_key' })
    return json({ error: 'otp_unavailable' }, 503)
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const rc = await rpc(creds, 'otp_rate_check', { p_phone: phone, p_ip: ip, p_purpose: purpose }, fetchImpl)
  if (!rc.ok || !rc.data) {
    log(FN, 'rate_check_failed', { status: rc.status, cls: rc.cls, phone2: last2(phone) })
    return json({ error: 'otp_unavailable' }, 503)
  }
  const r = rc.data
  if (r.ok !== true) {
    if (r.reason === 'phone_exists') return json({ error: 'phone_exists' }, 409)
    const retryAfter = Math.max(1, Math.min(86400, Number(r.retry_after) || RESEND_AFTER))
    return json({ error: r.reason === 'cooldown' ? 'otp_cooldown' : 'otp_too_many', retryAfter }, 429, { 'retry-after': String(retryAfter) })
  }

  if (r.send !== true) {
    // A number that may not sign in by phone: same answer and a similar wait, no SMS.
    await wait(400 + Math.floor(Math.random() * 600))
    return json({ ok: true, challenge: r.request_id, resendAfter: RESEND_AFTER })
  }

  const sent = await providerSend(env, phone, fetchImpl)
  const rec = await rpc(creds, 'otp_record_send', { p_request_id: r.request_id, p_twofactor_session: sent.ok ? sent.session : null }, fetchImpl)
  if (!sent.ok) {
    log(FN, 'provider_failed', { status: sent.status, cls: sent.cls, phone2: last2(phone), purpose })
    return json({ error: 'otp_service_busy' }, 503)
  }
  if (!rec.ok) {
    log(FN, 'record_send_failed', { status: rec.status, cls: rec.cls, phone2: last2(phone) })
    return json({ error: 'otp_unavailable' }, 503)
  }
  return json({ ok: true, challenge: r.request_id, resendAfter: RESEND_AFTER })
}

export async function onRequestPost(context) {
  return handleSend(context.request, context.env)
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } })
  return json({ error: 'method_not_allowed' }, 405)
}
