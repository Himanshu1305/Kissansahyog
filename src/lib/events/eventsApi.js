// KVK / agriculture events (Phase 7). Public read exposes only active, future
// events (RLS). Helpers for the /info list and the homepage hero "within 7 days".
import { supabase } from '../supabaseClient'

export function indiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function fetchUpcomingEvents(withinDays = 30) {
  const today = indiaDateString()
  const maxStr = addDays(today, withinDays)
  const { data, error } = await supabase
    .from('farm_events').select('*').gte('event_date', today).order('event_date', { ascending: true })
  if (error) return []
  return (data || []).filter((e) => e.event_date >= today && e.event_date <= maxStr)
}

export const eventTitle = (e, lang) => (lang === 'hi' ? (e.title_hi || e.title_en) : (e.title_en || e.title_hi)) || ''

// Weekday label for a date, via i18n wday_* keys (0=Sun..6=Sat).
export const eventWeekdayKey = (dateStr) => `wday_${new Date(dateStr).getDay()}`
