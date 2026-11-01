// Batch 17A Part B - ElevenLabs call, voice step, cost guard. All with a fake fetch; no network, no real key.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { synthesize, requestBody, describeError, DEFAULT_VOICE_ID } from '../../scripts/morning/voice/elevenlabs.mjs'
import { makeVoice } from '../../scripts/morning/voice/make.mjs'
import { tryModels } from '../../scripts/morning/voice/try.mjs'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'

const KEY = 'sk_FAKE_KEY_1234567890'
const mp3Of = (kb = 60) => Buffer.alloc(kb * 1024, 1)
const audio = (kb = 60, type = 'audio/mpeg') => ({ ok: true, status: 200, headers: { get: () => type }, arrayBuffer: async () => { const b = mp3Of(kb); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) } })
const status = (s) => ({ ok: s < 300, status: s, headers: { get: () => 'application/json' }, arrayBuffer: async () => new ArrayBuffer(0) })
const seq = (...items) => { const calls = []; const f = async (url, init) => { calls.push({ url, init }); const it = items[Math.min(calls.length - 1, items.length - 1)]; if (it instanceof Error) throw it; return it }; f.calls = calls; return f }

test('request: url, header, body, settings; language_code only where supported', async () => {
  const f = seq(audio())
  const r = await synthesize({ text: 'नमस्ते', apiKey: KEY, fetchImpl: f })
  assert.ok(r.ok)
  const c = f.calls[0]
  assert.equal(c.url, `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}?output_format=mp3_44100_64`)
  assert.equal(c.init.headers['xi-api-key'], KEY)
  const body = JSON.parse(c.init.body)
  assert.deepEqual(body, { text: 'नमस्ते', model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true } })
  assert.equal(requestBody('x', 'eleven_v3').language_code, 'hi')
  assert.equal('language_code' in requestBody('x', 'eleven_multilingual_v2'), false)
})

test('one retry on 429 / 5xx, then a clear reason; no retry on 401', async () => {
  const ok = await synthesize({ text: 'x', apiKey: KEY, fetchImpl: seq(status(429), audio()), backoffMs: 1 })
  assert.ok(ok.ok)
  const f5 = seq(status(503), status(503))
  const bad = await synthesize({ text: 'x', apiKey: KEY, fetchImpl: f5, backoffMs: 1 })
  assert.ok(!bad.ok && /503/.test(bad.reason)); assert.equal(f5.calls.length, 2)
  const f4 = seq(status(401))
  const no = await synthesize({ text: 'x', apiKey: KEY, fetchImpl: f4 })
  assert.ok(!no.ok); assert.equal(f4.calls.length, 1)
})

test('bad audio is refused: wrong type, too small, too large', async () => {
  assert.ok(!(await synthesize({ text: 'x', apiKey: KEY, fetchImpl: seq(audio(60, 'text/html')) })).ok)
  assert.ok(!(await synthesize({ text: 'x', apiKey: KEY, fetchImpl: seq(audio(5)) })).ok)
  assert.ok(!(await synthesize({ text: 'x', apiKey: KEY, fetchImpl: seq(audio(1100)) })).ok)
  assert.ok((await synthesize({ text: 'x', apiKey: KEY, fetchImpl: seq(audio(21)) })).ok)
})

test('errors never contain the key or a url', async () => {
  const e = Object.assign(new Error(`failed https://api.elevenlabs.io/x?k=${KEY} using ${KEY}`), { name: 'TypeError' })
  assert.ok(!describeError(e, [KEY]).includes(KEY))
  const r = await synthesize({ text: 'x', apiKey: KEY, fetchImpl: seq(e, e), backoffMs: 1 })
  assert.ok(!r.ok && !JSON.stringify(r).includes(KEY) && !r.reason.includes('http'))
  assert.ok(!(await synthesize({ text: 'x', fetchImpl: seq(audio()) })).ok, 'no key = no call')
})

const model = async () => {
  const fx = loadFixture('normal')
  return (await generate({ date: fx.date, data: loadData(), loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })).model
}
const dir = () => mkdtempSync(join(tmpdir(), 'v17a-'))
const SAVE = { url: 'https://example.invalid', key: 'anon', secret: 'shh-secret', date: '2026-10-25' }
// a fake that plays both ElevenLabs and the two database functions
function fakeWorld({ stored = null, voiceAnswer = { ok: true }, voiceStatus = 200 } = {}) {
  const log = []
  const f = async (url, init) => {
    const u = String(url)
    log.push(u)
    if (u.includes('elevenlabs')) return audio()
    const body = JSON.parse(init.body)
    const name = u.split('/rpc/')[1]
    const res = (b, s = 200) => ({ status: s, text: async () => JSON.stringify(b) })
    if (name === 'morning_post_context') return res({ ok: true, yesterday: {}, today: { voice_sha256: stored } })
    if (name === 'morning_post_voice_upsert') { f.voiceBody = body; return res(voiceAnswer, voiceStatus) }
    return res({}, 404)
  }
  f.log = log
  return f
}

test('voice step: makes voice.mp3, saves it with meta, never puts the key or secret in the report line', async () => {
  const d = dir(), f = fakeWorld()
  const r = await makeVoice({ model: await model(), outDir: d, env: { ELEVENLABS_API_KEY: KEY }, save: SAVE, fetchImpl: f })
  assert.ok(existsSync(join(d, 'voice.mp3')) && existsSync(join(d, 'voice-script.txt')))
  assert.ok(r.line.includes('voice saved'))
  assert.equal(f.voiceBody.p_secret, SAVE.secret)
  assert.equal(f.voiceBody.p_date, SAVE.date)
  assert.equal(f.voiceBody.p_meta.sha256, r.script.sha256)
  assert.ok(!r.line.includes(KEY) && !r.line.includes(SAVE.secret))
  for (const x of readdirSync(d)) assert.ok(!readFileSync(join(d, x)).toString('latin1').includes(KEY))
})

test('cost guard: same script already stored = no ElevenLabs call; different or none = one call', async () => {
  const m = await model()
  const { buildVoiceScript } = await import('../../scripts/morning/voice/voiceScript.mjs')
  const sha = buildVoiceScript(m).sha256
  const same = fakeWorld({ stored: sha })
  const r1 = await makeVoice({ model: m, outDir: dir(), env: { ELEVENLABS_API_KEY: KEY }, save: SAVE, fetchImpl: same })
  assert.ok(r1.line.includes('no new ElevenLabs call')); assert.ok(!same.log.some((u) => u.includes('elevenlabs')))
  const other = fakeWorld({ stored: 'f'.repeat(64) })
  await makeVoice({ model: m, outDir: dir(), env: { ELEVENLABS_API_KEY: KEY }, save: SAVE, fetchImpl: other })
  assert.equal(other.log.filter((u) => u.includes('elevenlabs')).length, 1)
})

test('the post is never blocked: no key, --no-voice, API error, bad audio, migration 0073 missing', async () => {
  const m = await model()
  const run = (o) => makeVoice({ model: m, outDir: dir(), save: SAVE, ...o })
  assert.ok((await run({ env: {}, fetchImpl: fakeWorld() })).line.includes('no ELEVENLABS_API_KEY'))
  assert.ok((await run({ env: { ELEVENLABS_API_KEY: KEY }, noVoice: true, fetchImpl: fakeWorld() })).line.includes('--no-voice'))
  const err = fakeWorld(); const orig = err
  const down = async (u, i) => (String(u).includes('elevenlabs') ? status(500) : orig(u, i))
  assert.ok((await run({ env: { ELEVENLABS_API_KEY: KEY }, fetchImpl: down, backoffMs: 1 })).line.includes('voice skipped'))
  const badAudio = async (u, i) => (String(u).includes('elevenlabs') ? audio(2) : orig(u, i))
  assert.ok((await run({ env: { ELEVENLABS_API_KEY: KEY }, fetchImpl: badAudio })).line.includes('voice skipped'))
  const old = async (u, i) => { if (String(u).includes('morning_post_voice_upsert')) return { status: 404, text: async () => JSON.stringify({ code: 'PGRST202' }) }; return orig(u, i) }
  assert.ok((await run({ env: { ELEVENLABS_API_KEY: KEY }, fetchImpl: old })).line.includes('migration 0073 missing'))
})

test('local run without --save and without --voice writes the script only and makes no call', async () => {
  const d = dir(); const f = fakeWorld()
  const r = await makeVoice({ model: await model(), outDir: d, env: { ELEVENLABS_API_KEY: KEY }, callApi: false, fetchImpl: f })
  assert.equal(f.log.length, 0); assert.ok(existsSync(join(d, 'voice-script.txt')) && !existsSync(join(d, 'voice.mp3'))); assert.ok(r.line.includes('voice-script.txt'))
})

test('voice-try: at most 3 calls, one file per model, no key = no call', async () => {
  const d = dir(); const f = seq(audio())
  const lines = []
  const code = await tryModels({ env: { ELEVENLABS_API_KEY: KEY, ELEVENLABS_TRY_MODELS: 'eleven_multilingual_v2,eleven_v3,a,b,c' }, outDir: d, fetchImpl: f, log: (l) => lines.push(l) })
  assert.equal(code, 0); assert.equal(f.calls.length, 3)
  assert.ok(existsSync(join(d, 'try-eleven_multilingual_v2.mp3')) && existsSync(join(d, 'try-eleven_v3.mp3')))
  assert.ok(lines.join('\n').includes('characters') && !lines.join('\n').includes(KEY))
  const none = seq(audio()); assert.equal(await tryModels({ env: {}, outDir: d, fetchImpl: none, log: () => {} }), 1); assert.equal(none.calls.length, 0)
})
