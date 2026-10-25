import { scrubDetails } from './consoleRules.js'

// Batch 14A - withLog(action, targetType, fn, describe, logRpc): returns fn wrapped so that, ONLY after it succeeded, the
// console records the action in the admin action log (admin_log_console_action). `describe(args, result)` returns
// { id, details } with small non-personal facts only (scrubbed here and again by the SQL). If logging fails the action
// still succeeded: a quiet window event 'ks:admin-log-failed' is raised and nothing is thrown.
export const LOG_FAILED_EVENT = 'ks:admin-log-failed'
export function makeWithLog(action, targetType, fn, describe = () => ({}), logRpc) {
  return async (actorId, ...args) => {
    const result = await fn(actorId, ...args)
    try {
      const d = describe(args, result) || {}
      await logRpc('admin_log_console_action', {
        p_actor: actorId, p_action: action, p_target_type: targetType,
        p_target_id: d.id == null ? null : String(d.id), p_details: scrubDetails(d.details || {}),
      })
    } catch {
      try { if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOG_FAILED_EVENT)) } catch { /* no window */ }
    }
    return result
  }
}
