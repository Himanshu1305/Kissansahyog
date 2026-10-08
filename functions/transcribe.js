// Cloudflare Pages Function — voice-search fallback transcription.
//
//   GET  /transcribe  → { configured: boolean }   (cheap capability probe; NO key leak)
//   POST /transcribe  → { text }                   (multipart 'audio' → Gemini transcription)
//
// Only browsers WITHOUT the Web Speech API ever reach the POST path (Safari/Firefox). The
// Gemini key lives ONLY in this function's env (GEMINI_API_KEY) — never in the browser.
//
// Model + endpoint were verified against Google's live docs (2026-09): the audio-transcription
// model is `gemini-3.5-transcribe`, called via
//   POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent
// with the key in the `x-goog-api-key` header and inline base64 audio in inline_data. The model
// is overridable via the GEMINI_MODEL env var so a future rename needs no code change.
// Supported audio input includes audio/webm (Chrome/Android MediaRecorder default).
//
// Abuse guard (3c-i): a DB-backed per-IP rate limit via the check_transcribe_rate RPC
// (migration 0034) — real persistent state, not an in-memory counter. If Supabase env is not
// configured for the function the guard is skipped (fail-open) but transcription still works;
// this is documented in docs/review.

const DEFAULT_MODEL = 'gemini-3.5-transcribe'
const RATE_MAX = 20 // max transcriptions per IP per window
const RATE_WINDOW_SECONDS = 3600 // 1 hour

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

function supabaseCreds(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || null
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || null
  return url && key ? { url, key } : null
}

// Returns true if allowed, false if rate-limited. Fails OPEN (returns true) when Supabase
// env is absent or the RPC errors — the guard is a basic backstop, not an availability gate.
async function underRateLimit(env, requester) {
  const creds = supabaseCreds(env)
  if (!creds) return true
  try {
    const res = await fetch(`${creds.url}/rest/v1/rpc/check_transcribe_rate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: creds.key, authorization: `Bearer ${creds.key}` },
      body: JSON.stringify({ p_requester: requester, p_max: RATE_MAX, p_window_seconds: RATE_WINDOW_SECONDS }),
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return true
    const allowed = await res.json()
    return allowed !== false
  } catch {
    return true
  }
}

// Abuse guard (Batch 4 item E): only our own pages may POST audio here. Accept a request
// whose Origin/Referer host is kissansahyog.com, www.kissansahyog.com, a
// *.kissansahyog.pages.dev preview host, or localhost/127.0.0.1 (so the preview + local
// tests still work). A request carrying a DISALLOWED host is rejected; a request with no
// Origin and no Referer is allowed (same-origin browsers may omit Origin — never break the
// existing same-origin caller, which is the only legitimate one). No secrets involved.
function hostAllowed(host) {
  if (!host) return false
  const h = host.toLowerCase()
  return (
    h === 'kissansahyog.com' ||
    h === 'www.kissansahyog.com' ||
    h === 'kissansahyog.pages.dev' || h.endsWith('.kissansahyog.pages.dev') ||
    h === 'localhost' || h.startsWith('localhost:') ||
    h === '127.0.0.1' || h.startsWith('127.0.0.1:')
  )
}
function originOk(request) {
  const pick = (v) => { try { return v ? new URL(v).host : null } catch { return null } }
  const oHost = pick(request.headers.get('origin'))
  const rHost = pick(request.headers.get('referer'))
  if (!oHost && !rHost) return true // no cross-origin signal → same-origin; allow
  return hostAllowed(oHost) || (!oHost && hostAllowed(rHost))
}

export async function onRequestGet(context) {
  return json({ configured: !!context.env.GEMINI_API_KEY })
}

export async function onRequestPost(context) {
  const { request, env } = context
  // Reject cross-site callers before doing any work (no key, no audio parse, no quota).
  if (!originOk(request)) return json({ error: 'forbidden_origin' }, 403)
  const key = env.GEMINI_API_KEY
  // Graceful, not broken: no key → the caller hides the mic on unsupported browsers and
  // keeps normal text search. (3d)
  if (!key) return json({ error: 'not_configured' }, 503)

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
  if (!(await underRateLimit(env, ip))) return json({ error: 'rate_limited' }, 429)

  let bytes
  let mime = 'audio/webm'
  try {
    const form = await request.formData()
    const file = form.get('audio')
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'no_audio' }, 400)
    mime = file.type || mime
    const buf = await file.arrayBuffer()
    if (!buf || buf.byteLength === 0) return json({ error: 'no_audio' }, 400)
    if (buf.byteLength > 18 * 1024 * 1024) return json({ error: 'too_large' }, 413) // Gemini inline cap ~20MB
    bytes = new Uint8Array(buf)
  } catch {
    return json({ error: 'bad_request' }, 400)
  }

  // base64-encode the audio for inline_data.
  let b64 = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  b64 = btoa(b64)

  const model = env.GEMINI_MODEL || DEFAULT_MODEL
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const payload = {
    contents: [
      {
        parts: [
          { text: 'Transcribe this spoken audio to plain text. The speaker is speaking Hindi (hi-IN), possibly mixed with common English words. Return ONLY the transcription, with no quotes, labels, or extra commentary.' },
          { inline_data: { mime_type: mime, data: b64 } },
        ],
      },
    ],
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200)
      return json({ error: 'transcribe_failed', status: res.status, detail }, 502)
    }
    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts || []
    const text = parts.map((p) => p.text || '').join('').trim()
    return json({ text })
  } catch (e) {
    return json({ error: 'transcribe_failed', detail: String(e && e.message ? e.message : e).slice(0, 120) }, 502)
  }
}
