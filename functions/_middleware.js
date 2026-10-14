// Cloudflare Pages middleware — CORS for the Android app (Batch 8A).
//
// The app (Capacitor) serves its bundled pages from https://localhost (Android) or
// capacitor://localhost (iOS), so its calls to this site's server functions
// (/api/feedback, /geocode, /transcribe, /geo) are cross-origin. For EXACTLY those two
// origins — never "*" — this:
//   • answers the CORS preflight (OPTIONS) with 204, and
//   • adds Access-Control-Allow-Origin (that same origin) to the function's response.
// Every other request (the website itself, any other origin, no Origin at all) passes
// straight through with nothing added, so the website behaves exactly as before.
//
// public/_routes.json limits Functions to the four function paths, so this middleware does
// not run (or bill) for the site's static pages.
//
// The functions' own origin checks are unchanged: transcribe.js and api/feedback.js already
// accept the host "localhost" (both app origins have that host) and reject other sites.
export const APP_ORIGINS = ['https://localhost', 'capacitor://localhost']
const ALLOW_METHODS = 'GET, POST, OPTIONS'
const ALLOW_HEADERS = 'content-type'

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOW_METHODS,
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function onRequest(context) {
  const { request } = context
  const origin = request.headers.get('origin')
  if (!origin || !APP_ORIGINS.includes(origin)) return context.next()

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })

  const upstream = await context.next()
  // Copy: a response returned by fetch() has immutable headers.
  const response = new Response(upstream.body, upstream)
  for (const [name, value] of Object.entries(corsHeaders(origin))) {
    if (name === 'Vary') response.headers.append('Vary', value)
    else response.headers.set(name, value)
  }
  return response
}
