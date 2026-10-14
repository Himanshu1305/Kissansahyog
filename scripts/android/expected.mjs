// Batch 8A — the facts the Android tests assert against. Changing a value here changes what
// "pass" means, so every entry says why it is what it is.

// Batch 8B — which app flavour this run tests (scripts/test-android.sh --flavor sets KS_FLAVOR):
//   prod           com.kissansahyog.app          "Kisan Sahyog"            ks-production.apk
//   staging        com.kissansahyog.app.staging  "Kisan Sahyog (Staging)"  ks-staging.apk
//   staging-local  same app id as staging, API on http://localhost:8788       ks-staging-local.apk
export const FLAVOR = process.env.KS_FLAVOR || 'prod'
if (!['prod', 'staging', 'staging-local'].includes(FLAVOR)) throw new Error(`KS_FLAVOR must be prod, staging or staging-local (got ${FLAVOR})`)
export const IS_STAGING = FLAVOR !== 'prod'
export const APK_NAME = { prod: 'ks-production.apk', staging: 'ks-staging.apk', 'staging-local': 'ks-staging-local.apk' }[FLAVOR]
export const PKG = IS_STAGING ? 'com.kissansahyog.app.staging' : 'com.kissansahyog.app'
export const PROD_PKG = 'com.kissansahyog.app'
export const STAGING_PKG = 'com.kissansahyog.app.staging'
export const ACTIVITY = `${PKG}/com.kissansahyog.app.MainActivity`
export const APP_LABEL = IS_STAGING ? 'Kisan Sahyog (Staging)' : 'Kisan Sahyog'
export const VERSION_NAME = '0.1.0'
export const VERSION_CODE = '1'
export const MIN_SDK = '24'
export const TARGET_SDK = '36'
export const APP_URL = 'https://localhost'

// T2 — the APK must declare EXACTLY these permissions (anything extra or missing fails).
export const PERMISSIONS = {
  'android.permission.INTERNET': 'live data from Supabase / weather / the site\'s server functions',
  'android.permission.ACCESS_NETWORK_STATE': 'offline banner: without it the WebView always reports navigator.onLine = true; also required by @capacitor/network',
  'android.permission.ACCESS_COARSE_LOCATION': '"Share my location"',
  'android.permission.ACCESS_FINE_LOCATION': '"Share my location" (the page asks for a high-accuracy fix)',
  'android.permission.RECORD_AUDIO': 'voice search fallback records audio',
  'android.permission.MODIFY_AUDIO_SETTINGS': 'Capacitor 8 requests it together with RECORD_AUDIO for getUserMedia audio and denies the request unless both are granted (BridgeWebChromeClient.onPermissionRequest)',
  [`${PKG}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`]: 'added automatically by androidx.core (signature-level, app-private); not a user-facing permission',
}

// T3 — same rules as scripts/check-prod-env.mjs --dist, plus secrets that must never ship.
export const PROD_REF = 'eltmcznjcqiahqhjvpjg'
export const STAGING_REF = 'wzxtqbqlahyahsnoqqva'
export const STAGING_HOST = 'staging.kissansahyog.com'
// Each must occur 0 times in the packaged web assets. 'sb_secret' is matched as a KEY
// (sb_secret_ + key body): supabase-js itself contains the bare prefix in its key-type check
// (e.startsWith('sb_secret_')), which is not a secret. That literal count is still recorded.
export const FORBIDDEN = [
  { label: 'service_role', re: /service_role/g },
  { label: 'GEMINI_API_KEY', re: /GEMINI_API_KEY/g },
  { label: 'sb_secret key (sb_secret_<key>)', re: /sb_secret_[A-Za-z0-9_-]{10,}/g },
]

// T5 — routes that must render in the app.
export const ROUTES = ['/', '/browse', '/bazaar', '/mausam', '/msp', '/yojana', '/sawaal', '/search', '/about', '/privacy', '/terms', '/contact', '/login', '/cold-storage', '/kisan-mela']
export const INVALID_ROUTE = '/ks-this-page-does-not-exist'
export const ERROR_BOUNDARY_TEXT = 'This page could not open' // strings.error_page_title.en

// T5 — console.error allowlist. Each entry: a pattern and the reason it is tolerated.
export const CONSOLE_ALLOWLIST = [
  {
    // The app calls the live site's server functions cross-origin. Until functions/_middleware.js
    // is deployed (this batch does not deploy) the live site sends no CORS header, so the WebView
    // blocks the answer and logs it. The app handles it (mic button hidden, etc.).
    pattern: /kissansahyog\.com\/(transcribe|geocode|geo|api\/feedback)/,
    reason: 'cross-origin call to the site\'s own server function — blocked until the CORS middleware is deployed (needs deploy)',
  },
]

// T17 — relative fetch() targets that are files bundled inside the app, not server functions.
export const RELATIVE_FETCH_ALLOWLIST = ['/search-index.json', '/images/']

// T7 / T10 / T13 — a real place in the pilot area, used as the visitor's location.
export const TEST_PLACE = { lat: 23.8388, lng: 78.7378, label: 'Sagar' }
export const LOCATION_KEYS = ['ks_location_v1', 'ks_location_share_declined', 'ks_location_cleared']
