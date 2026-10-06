// Cloudflare Pages Function — GET /geocode?village=<name>&district=<name>
//   or (Batch 2 item B) GET /geocode?q=<free-form MP place> for the cold-storage finder.
//
// Stateless forward-geocoding proxy: it makes the actual Nominatim call so it can set the
// descriptive User-Agent that Nominatim's usage policy requires (browsers cannot set that
// header). It does NOT touch the database — the caller (client geocode worker) enforces the
// 1-request/second rate limit via the DB-backed claim_geocode_slot() RPC BEFORE calling this,
// and writes the result via resolve_village/fail_village. Exactly ONE Nominatim call per
// invocation, so one claimed slot == one outbound call (Part A 2a-i).
const UA = 'Kisan-Sahyog/1.0 (contact: usdvisionai@gmail.com)'
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const village = (url.searchParams.get('village') || '').trim()
  const district = (url.searchParams.get('district') || 'Sagar').trim()
  // `q` is a free-form Madhya Pradesh place search (cold-storage finder); `village`
  // keeps the original Sagar-scoped lookup used by the village geocode worker.
  const free = (url.searchParams.get('q') || '').trim()
  if (!free && !village) return json({ found: false, error: 'village or q required' }, 400)
  const q = free ? `${free}, Madhya Pradesh, India` : `${village}, ${district}, Madhya Pradesh, India`
  const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`
  try {
    const res = await fetch(nomUrl, {
      headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'hi,en' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return json({ found: false, error: `nominatim ${res.status}` })
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length === 0) return json({ found: false })
    const r = arr[0]
    return json({ found: true, lat: Number(r.lat), lng: Number(r.lon), display_name: r.display_name || null })
  } catch (e) {
    return json({ found: false, error: String(e && e.message ? e.message : e).slice(0, 120) })
  }
}
