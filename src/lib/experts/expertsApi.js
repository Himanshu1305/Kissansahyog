// Data access for the Expert Consultation Directory (admin-curated, Model A).
// Anon may read ACTIVE experts only (RLS). No writes from the client — experts
// are inserted by an admin via the service role / migrations. No distance
// filtering: an expert's knowledge is available to every user regardless of
// location.
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'

export async function fetchExperts() {
  const { data, error } = await supabase
    .from('experts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw toAppError(error)
  return data || []
}

export async function fetchExpertById(id) {
  const { data, error } = await supabase
    .from('experts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}
