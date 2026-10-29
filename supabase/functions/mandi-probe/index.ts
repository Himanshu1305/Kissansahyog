// Batch 16E probe (staging only, deleted after the test): can an Edge Function in Mumbai reach data.gov.in?
// One request, returns only the status or error cause, the newest Arrival_Date, region info and elapsed ms. Never the key.
const RESOURCE = '35985678-0d79-46b4-9ed6-6f13308a1d24'

function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b)
  let d = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return d === 0
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  const expected = Deno.env.get('CRON_SECRET') ?? ''
  if (!expected || !sameSecret(req.headers.get('x-cron-secret') ?? '', expected)) return json({ ok: false, error: 'forbidden' }, 403)
  const key = Deno.env.get('DATA_GOV_IN_API_KEY') ?? ''
  const region = { SB_REGION: Deno.env.get('SB_REGION') ?? null, DENO_REGION: Deno.env.get('DENO_REGION') ?? null, requested: req.headers.get('x-region') }
  const url = `https://api.data.gov.in/resource/${RESOURCE}?format=json&limit=1&filters[State]=Madhya%20Pradesh&filters[District]=Sagar&filters[Commodity]=Wheat&sort[Arrival_Date]=desc&api-key=${encodeURIComponent(key)}`
  const t0 = Date.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    const body = await res.json().catch(() => null)
    return json({ ok: res.ok, status: res.status, newest_arrival_date: body?.records?.[0]?.Arrival_Date ?? null, ...region, ms: Date.now() - t0 })
  } catch (e) {
    const err = e as { name?: string; cause?: { code?: string } }
    return json({ ok: false, status: null, error: err?.cause?.code ?? err?.name ?? 'error', ...region, ms: Date.now() - t0 })
  }
})
