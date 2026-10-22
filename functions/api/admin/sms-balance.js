// Cloudflare Pages Function - 2Factor SMS balance for the admin console (Batch 14A).
//   GET /api/admin/sms-balance   header x-ks-session (an admin)  ->  200 { balance, checked_at } | 200 { error: 'unavailable' }
//                                                                    401 { error: 'session_required' }
// The 2Factor key is part of the provider URL: no URL, error text or provider text is ever logged or returned.
import { json, log, errClass, providerBase } from '../../lib/otp-core.js'
import { requireAdmin } from '../../lib/admin-auth.js'

const FN = 'admin/sms-balance'

export async function handleBalance(request, env, deps = {}) {
  const fetchImpl = deps.fetch || fetch
  const auth = await requireAdmin(request, env, { fetchImpl })
  if (!auth.ok) return auth.response
  const key = env.TWOFACTOR_API_KEY
  if (!key) return json({ error: 'unavailable' })
  try {
    const res = await fetchImpl(`${providerBase(env)}/${encodeURIComponent(key)}/BAL/SMS`, { method: 'GET', signal: AbortSignal.timeout(8000) })
    let data = null
    try { data = await res.json() } catch { data = null }
    const n = data && data.Status === 'Success' ? Number(data.Details) : NaN
    if (res.ok && Number.isFinite(n) && n >= 0) return json({ balance: Math.floor(n), checked_at: new Date().toISOString() })
    log(FN, 'provider_refused', { status: res.status })
    return json({ error: 'unavailable' })
  } catch (e) {
    log(FN, 'provider_failed', { cls: errClass(e) })
    return json({ error: 'unavailable' })
  }
}

export async function onRequestGet(context) {
  return handleBalance(context.request, context.env)
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { allow: 'GET, OPTIONS' } })
  return json({ error: 'method_not_allowed' }, 405)
}
