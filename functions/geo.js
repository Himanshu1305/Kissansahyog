// Cloudflare Pages Function — GET /geo
//
// Returns the requesting client's edge geolocation (Cloudflare's request.cf object) as JSON,
// so the SPA can offer a silent, pre-permission city guess (Phase 2). This is the project's
// FIRST Pages Function; the existing `npx wrangler pages deploy dist` picks up a top-level
// functions/ directory automatically and routes this file at /geo.
//
// No PII is stored anywhere — the value is read from the edge request and returned to the
// same client that made the request. `cf` is absent in local dev / some edge contexts, in
// which case city is null and the client falls through cleanly to manual pincode (Phase 2d).
export function onRequest(context) {
  const cf = context.request.cf || {}
  const body = {
    city: cf.city || null,
    region: cf.region || null,
    country: cf.country || null,
    latitude: cf.latitude != null ? Number(cf.latitude) : null,
    longitude: cf.longitude != null ? Number(cf.longitude) : null,
  }
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
