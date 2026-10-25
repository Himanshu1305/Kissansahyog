// Cloudflare Pages Function — which sign-in rules are on (Batch 11A).
//
//   GET /api/otp/config  → 200 { otp_required: boolean, session_enforced: boolean }   (cached 60 s)
//                        → 503 { error: 'unavailable' }  (the app then asks the database directly)
//
// Reads get_auth_flags() (a public, read-only function). Kept in this isolate's memory for 60 s and sent
// with Cache-Control max-age=60, so a flag change reaches everybody within about a minute.
import { json, log, supabaseCreds, rpc } from '../../lib/otp-core.js'

const TTL_MS = 60_000
let cache = { at: 0, value: null }

export function _resetCache() { cache = { at: 0, value: null } }

export async function handleConfig(env, deps = {}) {
  const now = (deps.now || Date.now)()
  if (cache.value && now - cache.at < TTL_MS) return json(cache.value, 200, { 'cache-control': 'public, max-age=60' })
  const creds = supabaseCreds(env)
  if (!creds) {
    log('otp/config', 'not_configured', { cls: 'no_supabase' })
    return json({ error: 'unavailable' }, 503)
  }
  const r = await rpc(creds, 'get_auth_flags', {}, deps.fetch || fetch)
  if (!r.ok || !r.data || typeof r.data !== 'object') {
    log('otp/config', 'flags_failed', { status: r.status, cls: r.cls })
    return json({ error: 'unavailable' }, 503)
  }
  const value = { otp_required: r.data.otp_required === true, session_enforced: r.data.session_enforced === true }
  cache = { at: now, value }
  return json(value, 200, { 'cache-control': 'public, max-age=60' })
}

export async function onRequestGet(context) {
  return handleConfig(context.env)
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { allow: 'GET, OPTIONS' } })
  return json({ error: 'method_not_allowed' }, 405)
}
