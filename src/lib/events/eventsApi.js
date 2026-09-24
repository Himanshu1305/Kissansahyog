// KVK / agriculture events (Phase 7). Public read exposes only active, future
// events (RLS). Helpers for the /info list and the homepage hero "within 7 days".
import { supabase } from '../supabaseClient'

export async function fetchUpcomingEvents(withinDays = 30) {
  const { data, error } = await supabase
    .from('farm_events').select('*').order('event_date', { ascending: true })
  if (error) return []
  const max = new Date(); max.setDate(max.getDate() + withinDays)
  const maxStr = max.toISOString().slice(0, 10)
  return (data || []).filter((e) => e.event_date <= maxStr)
}

export const eventTitle = (e, lang) => (lang === 'hi' ? (e.title_hi || e.title_en) : (e.title_en || e.title_hi)) || ''

// Weekday label for a date, via i18n wday_* keys (0=Sun..6=Sat).
export const eventWeekdayKey = (dateStr) => `wday_${new Date(dateStr).getDay()}`
