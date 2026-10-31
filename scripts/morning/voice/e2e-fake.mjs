// Dev proof (Batch 17A): a full `--save` run on the fixture day with a FAKE ElevenLabs and a FAKE database. Nothing leaves this
// computer. Prints the voice script and the exact payloads of the two RPCs (secret hidden, base64 shortened), then runs a second
// time to show that an unchanged script makes no second ElevenLabs call.   node scripts/morning/voice/e2e-fake.mjs [outDir] [fixture, e.g. rain-f2]
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { main } from '../run.mjs'
import { isSpeakable } from './voiceScript.mjs'

const SECRET = 'fake-secret-for-the-proof', KEY = 'sk_FAKE_ELEVENLABS_KEY'
process.env.SUPABASE_URL = 'https://fake.invalid'; process.env.SUPABASE_ANON_KEY = 'fake-anon'; process.env.MORNING_POST_SECRET = SECRET; process.env.ELEVENLABS_API_KEY = KEY

const show = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'string' && x.length > 120 ? `<${x.length} chars>` : x === SECRET ? '<secret hidden>' : x)))
let storedScript = null, apiCalls = 0
const mp3 = Buffer.alloc(48 * 1024, 7)
globalThis.fetch = async (url, init) => {
  const u = String(url)
  if (u.includes('elevenlabs.io')) {
    apiCalls++
    console.log(`[fake ElevenLabs] POST ${u.split('?')[0].replace(/text-to-speech\/.*/, 'text-to-speech/<voice>')}?output_format=mp3_44100_64  header xi-api-key: <hidden>  body.model_id=${JSON.parse(init.body).model_id}`)
    return { ok: true, status: 200, headers: { get: () => 'audio/mpeg' }, arrayBuffer: async () => mp3.buffer.slice(mp3.byteOffset, mp3.byteOffset + mp3.length) }
  }
  const name = u.split('/rpc/')[1]
  const args = JSON.parse(init.body)
  const res = (b) => ({ status: 200, text: async () => JSON.stringify(b) })
  if (name === 'morning_post_context') { console.log(`[fake database] morning_post_context ${JSON.stringify(show(args))}`); return res({ ok: true, yesterday: {}, today: { voice_sha256: storedScript ? createHash('sha256').update(storedScript, 'utf8').digest('hex') : null } }) }
  if (name === 'morning_post_upsert') { console.log(`[fake database] morning_post_upsert ${JSON.stringify(show(args))}`); return res({ ok: true }) }
  if (name === 'morning_post_voice_upsert') { storedScript = args.p_script; console.log(`[fake database] morning_post_voice_upsert ${JSON.stringify(show(args))}`); return res({ ok: true }) }
  return { status: 404, text: async () => '{}' }
}

const out = resolve(process.argv[2] || join('out', 'e2e-17a'))
const orig = console.log
console.log('=== run 1 (no voice stored yet) ===')
await main(['--fixtures', process.argv[3] || 'normal', '--save', '--out', out])
const script = readFileSync(join(out, 'voice-script.txt'), 'utf8').trim()
console.log('\n--- voice-script.txt ---\n' + script + '\n---')
console.log(`characters: ${script.length}; only Devanagari letters and the marks । , ! ? : ${isSpeakable(script)}; digits: ${/[0-9]/.test(script)}; ElevenLabs calls so far: ${apiCalls}`)
console.log('\n=== run 2 (same message, voice already stored) ===')
await main(['--fixtures', process.argv[3] || 'normal', '--save', '--out', out])
console.log(`ElevenLabs calls in total: ${apiCalls} (must be 1)`)
console.log(`report.txt last line: ${readFileSync(join(out, 'report.txt'), 'utf8').trim().split('\n').pop()}`)
console.log(`secret/key found in any output file: ${['message.txt', 'poll.txt', 'report.txt', 'voice-script.txt'].some((f) => { const t = readFileSync(join(out, f), 'utf8'); return t.includes(SECRET) || t.includes(KEY) })}`)
void orig
