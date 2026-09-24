// Pest/disease "recently reported" aggregation for the homepage banner (Phase 6).
// Calls the recent_crop_reports RPC (published Q&A with crop+symptom_tag in the
// last N days, groups with count >= min). Framed as "recently asked", not an alert.
import { supabase } from '../supabaseClient'

export async function fetchPestReports(days = 14, min = 2) {
  const { data, error } = await supabase.rpc('recent_crop_reports', { p_days: days, p_min: min })
  if (error) return []
  return data || []
}
