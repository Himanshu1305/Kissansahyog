// Batch 14A - shared admin check for Pages Functions under /api/admin/*.
// Reads the x-ks-session header, asks the database (service role, same pattern as otp-core.js) whether that session
// belongs to a live, unblocked admin and returns { ok, userId, role, isSuper } or a ready JSON error answer.
// It ALWAYS needs a valid session, whatever the session_enforced switch says. Batch 14B reuses it.
import { json, supabaseCreds, rpc, errClass } from './otp-core.js'

export async function requireAdmin(request, env, { needSuper = false, fetchImpl = fetch } = {}) {
  const token = request.headers.get('x-ks-session') || ''
  if (token.length < 32 || token.length > 200) return { ok: false, response: json({ error: 'session_required' }, 401) }
  const creds = supabaseCreds(env)
  if (!creds) return { ok: false, response: json({ error: 'unavailable' }, 503) }
  const r = await rpc(creds, 'ks_session_admin', { p_token: token }, fetchImpl)
  if (!r.ok) return { ok: false, response: json({ error: 'unavailable' }, 503) }
  const d = r.data
  if (!d || !d.user_id) return { ok: false, response: json({ error: 'session_required' }, 401) }
  const isSuper = d.role === 'super'
  if (needSuper && !isSuper) return { ok: false, response: json({ error: 'super_required' }, 403) }
  return { ok: true, userId: d.user_id, role: d.role, isSuper }
}
export { errClass }
