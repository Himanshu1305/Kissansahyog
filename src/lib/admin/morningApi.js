// Batch 16B - data access for /admin/morning. Every call is a SECURITY DEFINER function that checks the acting admin
// itself (migration 0070); the anon key alone reads nothing. No analytics, no extra tracking.
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import { answerOrThrow } from './morningLogic'

async function call(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw toAppError(error)
  return answerOrThrow(data)
}

export const getMorningPost = (actor, date) => call('morning_post_get', { p_actor: actor, p_date: date }).then((r) => r.post)
export const getMorningHistory = (actor, days = 14) => call('morning_post_history', { p_actor: actor, p_days: days }).then((r) => r.rows)
export const markMorningPosted = (actor, date, posted) => call('morning_post_mark_posted', { p_actor: actor, p_date: date, p_posted: !!posted })
export const setMorningPollResult = (actor, date, pct) => call('morning_post_set_poll_result', { p_actor: actor, p_date: date, p_pct: pct })
