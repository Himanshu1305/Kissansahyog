// Cloudflare Pages Function — check the 6-digit code (Batch 11A, 2Factor VERIFY).
//
//   POST /api/otp/verify  { challenge: '<id from /api/otp/send>', code: '123456', phone: '9xxxxxxxxx' }
//     → 200 { ok: true, ticket: '<single-use, 10 minutes>' }   then app_login_otp / app_register_phone_otp
//     → 400 { error: 'otp_wrong', attemptsLeft } | { error: 'otp_expired' } | { error: 'otp_code_format' | 'invalid_phone' | 'bad_request' }
//     → 403 { error: 'forbidden_origin' }      415 / 413 bad content type / body too large
//     → 429 { error: 'otp_too_many' }          (5 attempts per code)
//     → 503 { error: 'otp_service_busy' | 'otp_unavailable' }
//
// The phone is sent again so the server can bind the ticket to it (only a peppered hash of the number is kept
// with the OTP request). Every attempt is counted BEFORE the provider is asked (otp_record_verify).
import { json, log, last2, originOk, readJson, supabaseCreds, rpc, providerVerify, PHONE_RE, CODE_RE, UUID_RE } from '../../lib/otp-core.js'

const FN = 'otp/verify'

export async function handleVerify(request, env, deps = {}) {
  const fetchImpl = deps.fetch || fetch
  if (!originOk(request)) return json({ error: 'forbidden_origin' }, 403)
  const { body, error } = await readJson(request)
  if (error) return error
  const challenge = typeof body.challenge === 'string' ? body.challenge.trim().toLowerCase() : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  if (!UUID_RE.test(challenge)) return json({ error: 'bad_request' }, 400)
  if (!PHONE_RE.test(phone)) return json({ error: 'invalid_phone' }, 400)
  if (!CODE_RE.test(code)) return json({ error: 'otp_code_format' }, 400)

  const creds = supabaseCreds(env)
  if (!creds || !env.TWOFACTOR_API_KEY) {
    log(FN, 'not_configured', { cls: !creds ? 'no_supabase' : 'no_key' })
    return json({ error: 'otp_unavailable' }, 503)
  }

  const rv = await rpc(creds, 'otp_record_verify', { p_request_id: challenge, p_phone: phone }, fetchImpl)
  if (!rv.ok || !rv.data) {
    log(FN, 'record_verify_failed', { status: rv.status, cls: rv.cls, phone2: last2(phone) })
    return json({ error: 'otp_unavailable' }, 503)
  }
  const v = rv.data
  if (v.ok !== true) {
    if (v.reason === 'too_many') return json({ error: 'otp_too_many' }, 429)
    return json({ error: 'otp_expired' }, 400)
  }
  const attemptsLeft = Math.max(0, Number(v.attempts_left) || 0)
  // A decoy (no SMS was sent) can never match.
  if (!v.session) return json({ error: 'otp_wrong', attemptsLeft }, 400)

  const pv = await providerVerify(env, v.session, code, fetchImpl)
  if (pv.result === 'mismatch') return json({ error: 'otp_wrong', attemptsLeft }, 400)
  if (pv.result === 'expired') return json({ error: 'otp_expired' }, 400)
  if (pv.result !== 'matched') {
    log(FN, 'provider_failed', { status: pv.status, cls: pv.cls, phone2: last2(phone) })
    return json({ error: 'otp_service_busy' }, 503)
  }

  const it = await rpc(creds, 'otp_issue_ticket', { p_request_id: challenge, p_phone: phone }, fetchImpl)
  if (!it.ok || !it.data) {
    log(FN, 'issue_ticket_failed', { status: it.status, cls: it.cls, phone2: last2(phone) })
    return json({ error: 'otp_unavailable' }, 503)
  }
  if (it.data.ok !== true || typeof it.data.ticket !== 'string') return json({ error: 'otp_expired' }, 400)
  return json({ ok: true, ticket: it.data.ticket })
}

export async function onRequestPost(context) {
  return handleVerify(context.request, context.env)
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } })
  return json({ error: 'method_not_allowed' }, 405)
}
