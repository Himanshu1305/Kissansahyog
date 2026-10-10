// Kisan Mela data access. Anon reads only approved + active rows (RLS). Submissions INSERT
// via the anon client but RLS forces moderation_status='pending' + submitted_by_user=true, so
// they are invisible until an admin approves. Interest writes go through owner-scoped RPCs.
import { supabase } from '../supabaseClient'
import { toAppError, AppError } from '../errors'
import { normalizeState } from '../../content/states.js'
import { indiaToday, melaStatus, sortMelasForDisplay } from './melaStatus.js'

export const MELA_TAGS = ['seeds', 'machinery', 'livestock', 'horticulture', 'scheme_scientist', 'general']

// Public list — approved + active only (RLS also enforces this server-side).
export async function fetchMelas() {
  const { data, error } = await supabase
    .from('kisan_mela')
    .select('id,name_hi,name_en,organizer_name,venue,address,state,district,latitude,longitude,event_date_start,event_date_end,is_date_confirmed,expected_period,category_tags,highlights_hi,highlights_en,contact_name,contact_number,source_url,source_urls,last_checked_date')
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .is('merged_into', null)
    .order('event_date_start', { ascending: true, nullsFirst: false })
  if (error) throw toAppError(error)
  return data || []
}

// A few upcoming melas for the homepage teaser (approved + active, soonest first).
export async function fetchUpcomingMelas(limit = 3) {
  const todayIso = indiaToday()
  const { data, error } = await supabase
    .from('kisan_mela')
    .select('id,name_hi,name_en,venue,state,district,latitude,longitude,event_date_start,event_date_end,is_date_confirmed,expected_period,category_tags,source_url')
    .eq('is_active', true)
    .eq('moderation_status', 'approved')
    .is('merged_into', null)
    .order('event_date_start', { ascending: true, nullsFirst: false })
  if (error) throw toAppError(error)
  // Homepage is deliberately dated-only: expected-period rows belong in the full calendar.
  return sortMelasForDisplay((data || []).filter((m) => melaStatus(m, todayIso) !== 'undated' && melaStatus(m, todayIso) !== 'ended'), { today: todayIso }).slice(0, limit)
}

// Submit a Mela for admin review. Never visible until approved (RLS enforces pending).
// A user submission may have no source URL — store a sentinel the admin replaces with a real
// one before approving (the strict source-URL rule is the human moderation gate here, not insert).
export async function submitMela(payload) {
  const name_hi = (payload.name_hi || '').trim()
  const venue = (payload.venue || '').trim()
  // Fold to canonical at entry (1b). The form uses a canonical dropdown, so this is defense-in-depth;
  // keep the raw value if somehow unmappable rather than blocking the submission.
  const state = normalizeState(payload.state) || (payload.state || '').trim()
  if (!name_hi) throw new AppError('mela_name_required')
  if (!venue) throw new AppError('mela_venue_required')
  if (!state) throw new AppError('mela_state_required')
  const tags = Array.isArray(payload.category_tags) ? payload.category_tags.filter((t) => MELA_TAGS.includes(t)) : []
  const row = {
    name_hi,
    name_en: (payload.name_en || '').trim() || null,
    organizer_name: (payload.organizer_name || '').trim() || null,
    venue,
    address: (payload.address || '').trim() || null,
    state,
    district: (payload.district || '').trim() || null,
    event_date_start: payload.event_date_start || null,
    event_date_end: payload.event_date_end || null,
    is_date_confirmed: !!payload.event_date_start && !payload.date_unknown,
    expected_period: payload.date_unknown ? ((payload.expected_period || '').trim() || null) : null,
    category_tags: tags,
    contact_name: (payload.contact_name || '').trim() || null,
    contact_number: (payload.contact_number || '').trim() || null,
    source_url: (payload.source_url || '').trim() || 'user-submission',
    submitted_by_user: true,
    moderation_status: 'pending',
  }
  const { error } = await supabase.from('kisan_mela').insert(row)
  if (error) throw toAppError(error)
  return true
}

// Owner-scoped interest toggle (trust-based auth: actor id passed to a SECURITY DEFINER RPC).
export async function setMelaInterest(actorId, melaId, interested) {
  const { error } = await supabase.rpc('set_mela_interest', { p_actor_id: actorId, p_mela_id: melaId, p_interested: interested })
  if (error) throw toAppError(error)
  return true
}

// Resolve a (possibly merged-away) Mela id to its ACTIVE survivor id, following merged_into (3e).
// Used when a shared /kisan-mela?mela=<id> link points at a row that was merged into another.
export async function resolveActiveMela(melaId) {
  if (!melaId) return null
  const { data, error } = await supabase.rpc('resolve_active_mela', { p_id: melaId })
  if (error) return null
  return data || null
}

export async function getMyMelaInterests(actorId) {
  if (!actorId) return []
  const { data, error } = await supabase.rpc('get_my_mela_interests', { p_actor_id: actorId })
  if (error) return []
  return data || []
}
