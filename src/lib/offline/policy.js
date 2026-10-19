// Batch 8B — offline data policy for the Android app (the website never loads this).
// Every number and list that decides what is kept on the phone lives in this one file.
// The PUBLIC-CACHEABLE / PRIVATE classification comes from docs/review/batch8b/PREFLIGHT.md.

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export const NETWORK_TIMEOUT_MS = 7000 // network first; after this the cached copy is used
export const CACHE_CAP_BYTES = 5 * 1024 * 1024 // total size; oldest entries are dropped first
export const SCHEMA_VERSION = 1 // bump to discard every stored entry after a format change
export const SLOW_LOAD_MS = 10000 // a data section never shows a spinner longer than this

// Public tables read with GET. Anything not listed here is never stored.
export const CACHEABLE_TABLES = [
  'mandi_prices', 'msp_prices', 'weather_cache_v2', 'listings', 'listing_unavailable_dates',
  'crops', 'equipment_types', 'pincodes', 'places', 'village_coordinates',
  'articles', 'cold_storage_public', 'farm_events', 'input_prices', 'kisan_mela',
  'kisan_safalta', 'kisan_sawaal', 'kisan_sawaal_slug_redirects', 'page_faqs',
  'procurement_centres', 'resources', 'sarkari_yojana', 'site_settings', 'videos',
]
// Read-only RPCs that return public data (POST body = the arguments, part of the key).
export const CACHEABLE_RPCS = ['search_listings', 'get_public_feedback', 'recent_crop_reports', 'resolve_active_mela', 'get_carbon_poll_results', 'get_carbon_suggestions_public']
// Direct public fetches made by the app (weather forecast fallback).
export const CACHEABLE_HOSTS = ['api.open-meteo.com']

// Never stored, whatever else matches: user-specific data, contact numbers, auth, writes.
export const PRIVATE_TABLES = ['profiles', 'experts', 'weather_grid_requests', 'login_attempts', 'feedback', 'listing_reports']
export const PRIVATE_RPCS = [
  'get_listing_contact', 'get_my_listings', 'get_my_mela_interests', 'get_availability_nudges',
  'app_login', 'app_login_email', 'app_login_email_guard', 'app_register', 'app_register_phone', 'app_signup', 'app_signup_email',
  'update_profile', 'update_kisan_profile', 'delete_account', 'accept_listing_consents',
  'create_listing_with_location', 'close_listing', 'set_listing_availability', 'set_listing_unavailable',
  'increment_contact_click', 'increment_listing_view', 'cache_weather_cell', 'claim_geocode_slot',
  'next_pending_village', 'resolve_village', 'fail_village', 'log_search_miss', 'log_join_click',
  'set_language', 'set_mela_interest', 'submit_carbon_suggestion', 'vote_carbon_poll',
  'submit_listing_report', 'subscribe_alert',
  // Batch 10G — seller / admin disable and permanent delete (writes and private reads).
  'set_my_listing_disabled', 'delete_my_listing', 'get_my_pending_photo_deletions',
  'admin_set_listing_disabled', 'admin_delete_listing', 'get_admin_listings',
]
export const PRIVATE_PATH_PREFIXES = ['/auth/v1/', '/storage/v1/', '/functions/v1/']

// How old data may be and still be shown offline. Measured on the data's OWN time when it has
// one (weather fetched_at, mandi price_date), otherwise on when it was stored (cachedAt).
export const FRESHNESS = {
  weather_cache_v2: { maxAgeMs: 24 * HOUR, dataTimeField: 'fetched_at' },
  'api.open-meteo.com': { maxAgeMs: 24 * HOUR, dataTimeField: null },
  mandi_prices: { maxAgeMs: 7 * DAY, dataTimeField: 'price_date' },
  listings: { maxAgeMs: 3 * DAY, dataTimeField: null },
  listing_unavailable_dates: { maxAgeMs: 3 * DAY, dataTimeField: null },
  search_listings: { maxAgeMs: 3 * DAY, dataTimeField: null },
}
export const DEFAULT_FRESHNESS = { maxAgeMs: 14 * DAY, dataTimeField: null } // other public reference data

// Which resource a request is for: a table name, 'rpc:<name>' or the host of a direct fetch.
// Returns { resource, cacheable, private }.
export function classify(method, url) {
  let u
  try { u = new URL(url) } catch { return { resource: null, cacheable: false, private: true } }
  const m = String(method || 'GET').toUpperCase()
  if (CACHEABLE_HOSTS.includes(u.host)) return { resource: u.host, cacheable: m === 'GET', private: false }
  if (PRIVATE_PATH_PREFIXES.some((p) => u.pathname.startsWith(p))) return { resource: u.pathname.split('/').slice(0, 3).join('/'), cacheable: false, private: true }
  const rpc = u.pathname.match(/^\/rest\/v1\/rpc\/([A-Za-z0-9_]+)$/)
  if (rpc) {
    const name = rpc[1]
    const priv = !CACHEABLE_RPCS.includes(name) || PRIVATE_RPCS.includes(name)
    return { resource: name, cacheable: m === 'POST' && !priv, private: priv }
  }
  const table = u.pathname.match(/^\/rest\/v1\/([A-Za-z0-9_]+)$/)
  if (table) {
    const name = table[1]
    const priv = !CACHEABLE_TABLES.includes(name) || PRIVATE_TABLES.includes(name)
    return { resource: name, cacheable: m === 'GET' && !priv, private: priv }
  }
  return { resource: u.host, cacheable: false, private: true }
}

export function freshnessFor(resource) {
  return FRESHNESS[resource] || DEFAULT_FRESHNESS
}
