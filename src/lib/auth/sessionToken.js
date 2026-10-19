// Batch 11A — the secret per-login session token (migration 0066).
// Stored next to the profile session (localStorage, same rules: cleared together on logout). Every Supabase
// REST call of the data client carries it as the `x-ks-session` header (read at call time, never baked into
// the client), so actor-based RPCs can check that the caller really is that user once enforcement is on.
// A `not_authenticated` answer from the server fires NOT_AUTH_EVENT; AuthProvider then signs out locally.
export const TOKEN_KEY = 'ks_session_token_v1'
export const SESSION_HEADER = 'x-ks-session'
export const NOT_AUTH_EVENT = 'ks:not-authenticated'

export function getSessionToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null } catch { return null }
}
export function setSessionToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage blocked: the session simply has no token */ }
}

// Wraps a fetch: adds the header (unless the call set its own), and reports `not_authenticated`.
export function withSessionHeader(baseFetch) {
  return async (input, init = {}) => {
    const token = getSessionToken()
    let next = init
    if (token) {
      const headers = new Headers(init.headers || undefined)
      if (!headers.has(SESSION_HEADER)) headers.set(SESSION_HEADER, token)
      next = { ...init, headers }
    }
    const res = await baseFetch(input, next)
    if (res.status >= 400 && res.status < 500 && typeof window !== 'undefined') {
      try {
        if ((await res.clone().text()).includes('not_authenticated')) window.dispatchEvent(new Event(NOT_AUTH_EVENT))
      } catch { /* body not readable: nothing to report */ }
    }
    return res
  }
}
