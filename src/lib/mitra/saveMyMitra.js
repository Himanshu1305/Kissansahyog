// Batch 20 - save the Mitra a new person chose, right after registering. BEST EFFORT, by design:
//   * called once, only when a Mitra was chosen (never for "None");
//   * one retry on a network error; any other answer is final;
//   * never throws, never shows an error, and never keeps the next screen waiting more than about one second
//     (the call carries on in the background after that);
//   * on failure it logs a console warning with NO personal data (no id, no name, no number).
// `rpc` is supabase.rpc bound to the client (injected so this file can be tested without a browser).
export const MITRA_WAIT_MS = 1000

const isNetworkError = (err) => {
  if (!err) return false
  const m = String(err.message || err).toLowerCase()
  return !err.code && (/fetch|network|timeout|abort/.test(m) || err.status === 0 || err.status === undefined)
}

export async function saveMyMitra(rpc, profileId, mitraId, { waitMs = MITRA_WAIT_MS, warn = (...a) => console.warn(...a) } = {}) {
  if (!profileId || !mitraId) return 'skipped'
  const call = async () => {
    const res = await rpc('set_my_mitra', { p_actor_id: profileId, p_mitra_id: mitraId })
    if (res && res.error) throw res.error
    return res?.data?.status || 'ok'
  }
  const work = (async () => {
    try {
      return await call()
    } catch (err) {
      if (isNetworkError(err)) {
        try { return await call() } catch { /* fall through to the warning */ }
      }
      warn('[kissan-mitra] the helper choice could not be saved')
      return 'failed'
    }
  })()
  let timer
  const limit = new Promise((resolve) => { timer = setTimeout(() => resolve('pending'), waitMs) })
  try { return await Promise.race([work, limit]) } finally { clearTimeout(timer) }
}
