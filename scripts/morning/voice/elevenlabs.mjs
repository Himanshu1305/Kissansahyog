// Batch 17A - ElevenLabs text-to-speech for the morning voice note. Never throws into the caller's flow: synthesize()
// returns { ok:true, mp3 } or { ok:false, reason } and the post is saved without voice. The key is read from the
// environment only and is never printed or put into any error text.
export const DEFAULT_VOICE_ID = 'HH8sIQq8WOcER3Nu118i' // Raju
export const DEFAULT_MODEL = 'eleven_multilingual_v2'
export const MIN_BYTES = 20 * 1024
export const MAX_BYTES = 1024 * 1024
export const TIMEOUT_MS = 60000
export const VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true }
// language_code is ignored or refused by multilingual_v2 (ElevenLabs API reference), so it is sent only for these models.
export const LANGUAGE_CODE_MODELS = ['eleven_turbo_v2_5', 'eleven_flash_v2_5', 'eleven_v3']

export function describeError(e, secrets = []) {
  const err = e || {}
  let out = [err.name, err.message, err.cause ? `cause=${err.cause.code ?? err.cause.name ?? ''}` : ''].filter(Boolean).join(' | ')
  out = out.replace(/https?:\/\/\S+/gi, '<url>')
  for (const s of secrets) if (s && String(s).length >= 6) out = out.split(String(s)).join('***')
  return out.slice(0, 300)
}

export function requestBody(text, model) {
  const body = { text, model_id: model, voice_settings: VOICE_SETTINGS }
  if (LANGUAGE_CODE_MODELS.includes(model)) body.language_code = 'hi'
  return body
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// opts: { text, apiKey, voiceId, model, fetchImpl, backoffMs }
export async function synthesize({ text, apiKey, voiceId = DEFAULT_VOICE_ID, model = DEFAULT_MODEL, fetchImpl = fetch, backoffMs = 2000, timeoutMs = TIMEOUT_MS }) {
  if (!apiKey) return { ok: false, reason: 'no ELEVENLABS_API_KEY in the environment' }
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`
  let last = 'no attempt'
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    try {
      const r = await fetchImpl(url, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify(requestBody(text, model)),
        signal: ctl.signal,
      })
      if (r.status === 429 || r.status >= 500) { last = `http ${r.status}`; if (attempt === 0) { await sleep(backoffMs); continue } return { ok: false, reason: `ElevenLabs answered ${last} twice` } }
      if (!r.ok) return { ok: false, reason: `ElevenLabs refused the request (http ${r.status})` }
      const type = String(r.headers?.get?.('content-type') || '').split(';')[0].trim().toLowerCase()
      if (type !== 'audio/mpeg') return { ok: false, reason: `ElevenLabs answered with "${type || 'no content type'}", not audio/mpeg` }
      const mp3 = Buffer.from(await r.arrayBuffer())
      if (mp3.length < MIN_BYTES || mp3.length > MAX_BYTES) return { ok: false, reason: `audio is ${Math.round(mp3.length / 1024)} KB, outside the accepted 20 KB to 1 MB` }
      return { ok: true, mp3 }
    } catch (e) {
      last = describeError(e, [apiKey])
      if (attempt === 0) { await sleep(backoffMs); continue }
      return { ok: false, reason: `could not reach ElevenLabs (${last})` }
    } finally { clearTimeout(timer) }
  }
  return { ok: false, reason: last }
}
