import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import { getDeviceId } from '../device'

const VOTED_KEY = 'ks_carbon_poll_voted'

export function hasVotedCarbonPoll() {
  try { return !!localStorage.getItem(VOTED_KEY) } catch { return false }
}

export async function voteCarbonPoll(choice) {
  const { error } = await supabase.rpc('vote_carbon_poll', { p_device: getDeviceId(), p_choice: choice })
  if (error) throw toAppError(error)
  try { localStorage.setItem(VOTED_KEY, choice) } catch { /* ignore */ }
}

export async function getCarbonPollResults() {
  const { data, error } = await supabase.rpc('get_carbon_poll_results')
  if (error) throw toAppError(error)
  const out = { yes: 0, no: 0, unsure: 0 }
  for (const r of data || []) out[r.choice] = Number(r.votes) || 0
  return out
}

export async function submitCarbonSuggestion({ name = null, village = null, body }) {
  const { error } = await supabase.rpc('submit_carbon_suggestion', { p_name: name, p_village: village, p_body: body, p_device: getDeviceId() })
  if (error) throw toAppError(error)
}

export async function getCarbonSuggestionsPublic() {
  const { data, error } = await supabase.rpc('get_carbon_suggestions_public', { p_limit: 50 })
  if (error) throw toAppError(error)
  return data || []
}
