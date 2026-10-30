// Batch 17A - the voice step of `npm run morning`. Runs AFTER the message is saved, so a changed message (which clears
// the stored voice in the database) is always seen as "no voice yet". Never throws and never blocks the post.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildVoiceScript } from './voiceScript.mjs'
import { synthesize, DEFAULT_VOICE_ID, DEFAULT_MODEL } from './elevenlabs.mjs'
import { rpc } from '../lib/supa.js'

export const MAX_SCRIPT = 2000
export const MAX_MP3_B64 = 1400000

// -> sha256 of the voice script stored for `date`, or null (none, old database, or any failure)
export async function storedVoiceSha({ url, key, secret, date, fetchImpl = fetch }) {
  try {
    const r = await rpc({ url, key, fetchImpl, name: 'morning_post_context', args: { p_secret: secret, p_date: date } })
    return r.body && r.body.ok === true ? (r.body.today && r.body.today.voice_sha256) || null : null
  } catch { return null }
}

// -> { ok, line } ; line is a short English sentence for report.txt and the console
export async function saveVoice({ url, key, secret, date, script, mp3, meta, fetchImpl = fetch }) {
  const b64 = Buffer.from(mp3).toString('base64')
  if (script.length > MAX_SCRIPT || b64.length > MAX_MP3_B64) return { ok: false, line: 'voice not saved: the script or the audio is too large for the database' }
  let r
  try { r = await rpc({ url, key, fetchImpl, name: 'morning_post_voice_upsert', args: { p_secret: secret, p_date: date, p_script: script, p_mp3_b64: b64, p_meta: meta } }) } catch (e) { return { ok: false, line: 'voice not saved: could not reach the database' } }
  const b = r.body
  if (b && b.ok === true) return { ok: true, line: `voice saved (${Math.round(mp3.length / 1024)} KB)` }
  if (r.status === 404 || (b && (b.code === 'PGRST202' || b.code === '42883'))) return { ok: false, line: 'voice not saved: migration 0073 missing' }
  if (b && b.error === 'already_posted') return { ok: false, line: 'voice not saved: the post is already marked as posted' }
  if (b && b.error) return { ok: false, line: `voice not saved: the database said "${b.error}"` }
  return { ok: false, line: `voice not saved: unexpected answer from the database (http ${r.status})` }
}

// opts: { model (compose model), outDir, env, noVoice, callApi (false = write the script only), save: {url,key,secret,date}|null, fetchImpl, backoffMs }
export async function makeVoice({ model, outDir, env = process.env, noVoice = false, callApi = true, save = null, fetchImpl = fetch, backoffMs }) {
  const script = buildVoiceScript(model)
  writeFileSync(join(outDir, 'voice-script.txt'), `${script.text}\n`, 'utf8')
  const head = `voice script: ${script.chars} characters${script.dropped.length ? `, dropped to fit: ${script.dropped.join(', ')}` : ''}`
  const done = (line, extra = {}) => ({ script, line: `${head}; ${line}`, ...extra })
  if (noVoice) return done('voice skipped (--no-voice)')
  if (!callApi) return done('voice audio not made in a local run without --save or --voice (script is in voice-script.txt)')
  const apiKey = env.ELEVENLABS_API_KEY
  if (!apiKey) return done('voice skipped: no ELEVENLABS_API_KEY in the environment')
  if (save) {
    const have = await storedVoiceSha({ ...save, fetchImpl })
    if (have && have === script.sha256) return done('voice already stored for this exact script; no new ElevenLabs call')
  }
  const voiceId = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
  const modelId = env.ELEVENLABS_MODEL || DEFAULT_MODEL
  const res = await synthesize({ text: script.text, apiKey, voiceId, model: modelId, fetchImpl, backoffMs })
  if (!res.ok) return done(`voice skipped: ${res.reason}`)
  writeFileSync(join(outDir, 'voice.mp3'), res.mp3)
  const meta = { model: modelId, voice_id: voiceId, chars: script.chars, sha256: script.sha256, bytes: res.mp3.length, generated_at: new Date().toISOString() }
  if (!save) return done(`voice.mp3 made (${Math.round(res.mp3.length / 1024)} KB)`, { mp3: res.mp3, meta })
  const s = await saveVoice({ ...save, script: script.text, mp3: res.mp3, meta, fetchImpl })
  return done(`voice.mp3 made (${Math.round(res.mp3.length / 1024)} KB); ${s.line}`, { mp3: res.mp3, meta })
}
