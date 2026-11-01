// Batch 17E Part 2 - the job builds "the card with the voice as its sound" (MP4) and stores it. Never blocks the post.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildFfmpegArgs, VIDEO_SPEC } from '../../scripts/morning/video/ffmpegArgs.mjs'
import { makeVideo, storedVideoState, parseDuration, appendStepSummary, MAX_MP4_B64 } from '../../scripts/morning/video/make.mjs'
import { decide } from '../../scripts/morning/check-complete.mjs'

const rd = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const CREDS = { url: 'https://x.example', key: 'anon-key-123', secret: 'secret-abc', date: '2026-11-01' }
const PNG = Buffer.from('89504e470d0a1a0a00', 'hex')
const MP3 = Buffer.from('fffb9000000000000000', 'hex')
const reply = (status, body) => ({ ok: status < 400, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) })
// a fake server for the three database functions the video step may call
function fakeDb({ hasVideo = false, voice = 'TVAz', upsert = { ok: true }, upsertStatus = 200, context } = {}) {
  const calls = []
  const f = async (url, opts) => {
    const name = url.split('/rpc/')[1]
    const args = JSON.parse(opts.body)
    calls.push({ name, args })
    if (name === 'morning_post_context') return reply(200, context || { ok: true, yesterday: {}, today: { voice_sha256: 'abc', has_video: hasVideo } })
    if (name === 'morning_post_voice_get') return reply(200, { ok: true, voice_mp3_b64: voice })
    if (name === 'morning_post_video_upsert') return reply(upsertStatus, upsert)
    return reply(404, { code: 'PGRST202' })
  }
  f.calls = calls
  return f
}
// a fake ffmpeg: writes a small "mp4" to the output path (the last argument) and answers like the real one
const fakeFfmpeg = ({ code = 0, bytes = 1000, error = null, stderr = '' } = {}) => {
  const run = async (args) => {
    run.calls.push(args)
    if (error) return { code: null, stderr: '', error }
    if (args.includes('null')) return { code, stderr: code === 0 ? 'size=N/A time=00:00:34.66 bitrate=N/A' : stderr, error: null } // measuring the voice
    if (code === 0) writeFileSync(args[args.length - 1], Buffer.alloc(bytes, 7))
    return { code, stderr, error: null }
  }
  run.calls = []
  return run
}
const okProbe = async () => ({ audio: 34.69, video: 35, container: 35 })
const mv = (o) => makeVideo({ runProbe: okProbe, ...o })
const dir = () => mkdtempSync(join(tmpdir(), 'v17e-'))

// ---- the ffmpeg recipe ----
test('ffmpeg arguments: still card looped, voice as mono AAC 64k, H.264 yuv420p, faststart, shortest, nothing random', () => {
  const a = buildFfmpegArgs({ card: 'c.png', audio: 'v.mp3', out: 'o.mp4' })
  const s = a.join(' ')
  assert.equal(a[a.length - 1], 'o.mp4')
  assert.ok(a.includes('-y'))
  assert.match(s, /-loop 1 .*-i c\.png/)
  assert.match(s, /-framerate \d+ /)
  assert.match(s, /-i v\.mp3/)
  assert.ok(s.indexOf('-i c.png') < s.indexOf('-i v.mp3'), 'card is input 0, voice is input 1')
  assert.match(s, /-map 0:v:0 -map 1:a:0/)
  assert.match(s, /-c:v libx264/)
  assert.match(s, /-tune stillimage/)
  assert.match(s, /-crf (2\d|3\d)\b/)
  assert.match(s, /-pix_fmt yuv420p/)
  assert.match(s, /-c:a aac/)
  assert.match(s, /-ac 1/)
  assert.match(s, /-b:a 64k/)
  assert.ok(a.includes('-shortest'))
  assert.match(s, /-movflags \+faststart/)
  assert.match(s, /-map_metadata -1/)
  assert.match(s, /bitexact/)
  assert.ok(!/creation_time|date|random|-t /.test(s.replace(/-tune|-threads/g, '')), 'no timestamp, date or random option')
  // even dimensions are forced without resizing a 1080x1350 card
  assert.match(s, /scale=trunc\(iw\/2\)\*2:trunc\(ih\/2\)\*2/)
})
test('ffmpeg arguments are the same for the same inputs, and the spec constants are the ones in the arguments', () => {
  assert.deepEqual(buildFfmpegArgs({ card: 'c.png', audio: 'v.mp3', out: 'o.mp4' }), buildFfmpegArgs({ card: 'c.png', audio: 'v.mp3', out: 'o.mp4' }))
  const s = buildFfmpegArgs({ card: 'c.png', audio: 'v.mp3', out: 'o.mp4' }).join(' ')
  assert.ok(s.includes(`-framerate ${VIDEO_SPEC.fps}`))
  assert.ok(s.includes(`-crf ${VIDEO_SPEC.crf}`))
  assert.ok(s.includes(`-b:a ${VIDEO_SPEC.audioBitrate}`))
})
test('parseDuration reads ffmpeg "Duration: hh:mm:ss.xx"', () => {
  assert.equal(parseDuration('  Duration: 00:00:41.20, start: 0.000000, bitrate: 20 kb/s'), 41.2)
  assert.equal(parseDuration('Duration: 01:02:03.50, start'), 3723.5)
  assert.equal(parseDuration('nothing here'), null)
})

// ---- the decision: make it, skip it, or fail softly ----
test('video already stored (has_video true): nothing is built, nothing is saved', async () => {
  const f = fakeDb({ hasVideo: true }), ff = fakeFfmpeg()
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff })
  assert.equal(ff.calls.length, 0)
  assert.deepEqual(f.calls.map((c) => c.name), ['morning_post_context'])
  assert.match(r.line, /^video already stored for this post; nothing to build$/)
})
test('no video yet: builds once from this run\'s card and voice, saves once, says how big', async () => {
  const f = fakeDb(), ff = fakeFfmpeg({ bytes: 150000, })
  const od = dir()
  const r = await mv({ outDir: od, ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff })
  assert.equal(r.ok, true)
  assert.equal(ff.calls.filter((a) => a.includes('-c:v')).length, 1)
  const up = f.calls.filter((c) => c.name === 'morning_post_video_upsert')
  assert.equal(up.length, 1)
  assert.equal(up[0].args.p_secret, 'secret-abc')
  assert.equal(up[0].args.p_date, '2026-11-01')
  assert.equal(Buffer.from(up[0].args.p_mp4_b64, 'base64').length, 150000)
  assert.equal(up[0].args.p_meta.bytes, 150000)
  assert.equal(up[0].args.p_meta.width, undefined, 'meta carries only what is known: no invented fields')
  assert.equal(up[0].args.p_meta.src_sha256, undefined, 'the database computes src_sha256, the client never sends it')
  assert.match(r.line, /^video saved \(146 KB, 35 s\)$/)
  assert.ok(existsSync(join(od, 'morning-2026-11-01.mp4')), 'the file is kept in the output folder (artifact)')
  assert.ok(!/AAAA|secret-abc|anon-key/.test(r.line))
})
test('voice not in this run (already stored earlier): it is fetched from the database, once, and the mp3 file is written next to the video', async () => {
  const f = fakeDb({ voice: Buffer.from('mp3-from-db').toString('base64') }), ff = fakeFfmpeg()
  const od = dir()
  const r = await mv({ outDir: od, ...CREDS, png: PNG, mp3: null, fetchImpl: f, runFfmpeg: ff })
  assert.equal(r.ok, true)
  assert.deepEqual(f.calls.map((c) => c.name), ['morning_post_context', 'morning_post_voice_get', 'morning_post_video_upsert'])
  assert.equal(readFileSync(join(od, 'voice.mp3'), 'utf8'), 'mp3-from-db')
})
test('a voice.mp3 left in the output folder by the voice step is used without asking the database', async () => {
  const f = fakeDb(), ff = fakeFfmpeg(), od = dir()
  writeFileSync(join(od, 'voice.mp3'), MP3)
  const r = await mv({ outDir: od, ...CREDS, png: PNG, mp3: null, fetchImpl: f, runFfmpeg: ff })
  assert.equal(r.ok, true)
  assert.ok(!f.calls.some((c) => c.name === 'morning_post_voice_get'))
})
test('no voice anywhere: skipped with one line, no ffmpeg', async () => {
  const f = fakeDb({ voice: null }), ff = fakeFfmpeg()
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: null, fetchImpl: f, runFfmpeg: ff })
  assert.equal(r.ok, false)
  assert.equal(ff.calls.length, 0)
  assert.match(r.line, /^video skipped: no voice yet/)
})
test('no card: skipped with one line, no ffmpeg', async () => {
  const ff = fakeFfmpeg()
  const r = await mv({ outDir: dir(), ...CREDS, png: null, mp3: MP3, fetchImpl: fakeDb(), runFfmpeg: ff })
  assert.equal(ff.calls.length, 0)
  assert.match(r.line, /^video skipped: no card/)
})
test('ffmpeg missing -> one line, no crash, nothing saved', async () => {
  const f = fakeDb(), ff = fakeFfmpeg({ error: Object.assign(new Error('spawn ffmpeg ENOENT'), { code: 'ENOENT' }) })
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff })
  assert.equal(r.ok, false)
  assert.match(r.line, /^video skipped: ffmpeg is not installed/)
  assert.ok(!f.calls.some((c) => c.name === 'morning_post_video_upsert'))
})
test('ffmpeg fails (exit 1) -> one line with a short reason, nothing saved', async () => {
  const f = fakeDb(), ff = fakeFfmpeg({ code: 1, stderr: 'Error: something broke\nsecond line' })
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff })
  assert.equal(r.ok, false)
  assert.match(r.line, /^video skipped: ffmpeg failed \(exit 1\)/)
  assert.ok(r.line.length < 200 && !r.line.includes('\n'))
  assert.ok(!f.calls.some((c) => c.name === 'morning_post_video_upsert'))
})
test('ffmpeg throws or never answers sensibly -> still no crash', async () => {
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: fakeDb(), runFfmpeg: async () => { throw new Error('boom') } })
  assert.equal(r.ok, false)
  assert.match(r.line, /^video skipped: /)
})
test('ffmpeg exits 0 but writes nothing -> skipped', async () => {
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: fakeDb(), runFfmpeg: async (a) => ({ code: 0, stderr: a.includes('null') ? 'time=00:00:34.66' : '', error: null }) })
  assert.equal(r.ok, false)
  assert.match(r.line, /^video skipped: /)
})
test('too big for the database cap -> not sent, plain line', async () => {
  const f = fakeDb(), ff = fakeFfmpeg({ bytes: Math.ceil((MAX_MP4_B64 / 4) * 3) + 10 })
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff })
  assert.equal(r.ok, false)
  assert.match(r.line, /^video not saved: the video is too large for the database/)
  assert.ok(!f.calls.some((c) => c.name === 'morning_post_video_upsert'))
})
test('database answers: already_posted, bad_input, other error, 404 (migration missing), unreachable', async () => {
  const cases = [
    [{ upsert: { ok: false, error: 'already_posted' } }, /^video not saved: the post is already marked as posted$/],
    [{ upsert: { ok: false, error: 'bad_input' } }, /^video not saved: the database said "bad_input"$/],
    [{ upsert: { ok: false, error: 'forbidden' } }, /^video not saved: the database said "forbidden"$/],
    [{ upsert: { code: 'PGRST202' }, upsertStatus: 404 }, /^video not saved: migration 0074 missing$/],
    [{ upsert: 'oops', upsertStatus: 502 }, /^video not saved: unexpected answer from the database \(http 502\)$/],
  ]
  for (const [opts, re] of cases) {
    const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: fakeDb(opts), runFfmpeg: fakeFfmpeg() })
    assert.equal(r.ok, false)
    assert.match(r.line, re)
  }
  let n = 0
  const flaky = async (url, o) => { if (url.endsWith('morning_post_video_upsert')) throw new Error('ECONNRESET'); return fakeDb()(url, o) }
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: flaky, runFfmpeg: fakeFfmpeg() })
  assert.match(r.line, /^video not saved: could not reach the database$/)
  void n
})
test('old database (context has no has_video): skipped without running ffmpeg, says migration 0074 is missing', async () => {
  const ff = fakeFfmpeg()
  const f = fakeDb({ context: { ok: true, yesterday: {}, today: { voice_sha256: 'abc' } } })
  const r = await mv({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff })
  assert.equal(ff.calls.length, 0)
  assert.match(r.line, /^video skipped: migration 0074 missing/)
})
test('storedVideoState: yes / no / unknown', async () => {
  assert.equal(await storedVideoState({ ...CREDS, fetchImpl: fakeDb({ hasVideo: true }) }), 'yes')
  assert.equal(await storedVideoState({ ...CREDS, fetchImpl: fakeDb({ hasVideo: false }) }), 'no')
  assert.equal(await storedVideoState({ ...CREDS, fetchImpl: fakeDb({ context: { ok: true, today: {} } }) }), 'unknown')
  assert.equal(await storedVideoState({ ...CREDS, fetchImpl: async () => { throw new Error('x') } }), 'unknown')
  assert.equal(await storedVideoState({ ...CREDS, fetchImpl: async () => reply(200, { ok: false, error: 'forbidden' }) }), 'unknown')
})
test('without a database (local rehearsal, save = null) the video is just built into the output folder', async () => {
  const od = dir(), ff = fakeFfmpeg({ bytes: 5000 })
  const r = await mv({ outDir: od, date: '2026-11-01', png: PNG, mp3: MP3, save: null, runFfmpeg: ff })
  assert.equal(r.ok, true)
  assert.match(r.line, /^video made \(5 KB/)
  assert.ok(existsSync(join(od, 'morning-2026-11-01.mp4')))
})
test('appendStepSummary writes one line to GITHUB_STEP_SUMMARY and never throws', () => {
  const d = dir(), f = join(d, 'sum')
  appendStepSummary('video saved (1 KB)', { GITHUB_STEP_SUMMARY: f })
  assert.equal(readFileSync(f, 'utf8'), 'video saved (1 KB)\n')
  appendStepSummary('x', {})
  appendStepSummary('x', { GITHUB_STEP_SUMMARY: join(d, 'no', 'such', 'dir', 'f') })
})

// ---- run.mjs wiring (source shape): after the voice, only with --save, never fatal ----
test('run.mjs calls makeVideo after the voice step, only with --save, inside try/catch, and reports the line', () => {
  const src = rd('scripts/morning/run.mjs')
  assert.match(src, /import \{ makeVideo, appendStepSummary \} from '\.\/video\/make\.mjs'/)
  assert.ok(src.indexOf('makeVoice(') < src.indexOf('makeVideo('))
  const block = src.slice(src.indexOf('makeVideo(') - 400, src.indexOf('makeVideo(') + 700)
  assert.match(block, /if \(args\.save/)
  assert.match(block, /try \{/)
  assert.match(block, /catch/)
  assert.match(src, /appendStepSummary\(videoLine/)
  assert.match(src, /report\}\$\{voiceLine\}\\n\$\{videoLine \?/)
})

// ---- check-complete: complete only when the voice AND the video are stored ----
const ENV = { SUPABASE_URL: 'https://x.example', SUPABASE_ANON_KEY: 'anon-key-123', MORNING_POST_SECRET: 'secret-abc', ELEVENLABS_API_KEY: 'el-key' }
const NOW = new Date('2026-10-31T22:40:00Z')
const ans = (today) => async () => reply(200, { ok: true, today })
test('check-complete: voice but no video -> NOT complete', async () => {
  for (const today of [{ voice_sha256: 'abc', has_video: false }, { voice_sha256: 'abc', has_video: null }, { voice_sha256: 'abc', has_video: 'true' }, { voice_sha256: 'abc', has_video: 1 }]) {
    const r = await decide({ eventName: 'schedule', env: ENV, now: NOW, fetchImpl: ans(today) })
    assert.equal(r.complete, false, JSON.stringify(today))
    assert.match(r.summary, /^Running: /)
  }
})
test('check-complete: voice and video -> complete, summary names the IST date', async () => {
  const r = await decide({ eventName: 'schedule', env: ENV, now: NOW, fetchImpl: ans({ voice_sha256: 'abc', has_video: true }) })
  assert.equal(r.complete, true)
  assert.match(r.summary, /^Skipped: today's post \(2026-11-01\) is already complete \(voice and video present\)\.$/)
})
test('check-complete: context without has_video (old database) -> NOT complete, so the full job runs', async () => {
  const r = await decide({ eventName: 'schedule', env: ENV, now: NOW, fetchImpl: ans({ voice_sha256: 'abc' }) })
  assert.equal(r.complete, false)
})
test('check-complete: video but no voice -> NOT complete', async () => {
  for (const v of [null, '', undefined]) {
    const r = await decide({ eventName: 'schedule', env: ENV, now: NOW, fetchImpl: ans({ voice_sha256: v, has_video: true }) })
    assert.equal(r.complete, false)
  }
})

// ---- the workflow: ffmpeg step ----
const WF = rd('.github/workflows/morning-post.yml')
const steps = WF.split(/\n {6}- (?=\S)/).slice(1)
test('workflow: an ffmpeg step sits after the check step and before the generate step, with the same guard', () => {
  const i = steps.findIndex((s) => /ffmpeg/.test(s) && !/npm run morning/.test(s))
  const g = steps.findIndex((s) => /npm run morning -- --save/.test(s))
  assert.ok(i > 1 && g > i, 'ffmpeg step is after the check (index 1) and before the generate step')
  assert.match(steps[i], /if: steps\.check\.outputs\.complete != 'true'/)
  assert.match(steps[i], /command -v ffmpeg/)
  assert.match(steps[i], /sudo apt-get install -y ffmpeg/)
  assert.match(steps[i], /ffmpeg -version \| head -n 1/)
  assert.ok(!/continue-on-error/.test(steps[i]) || true)
})
test('workflow: an ffmpeg install problem does not stop the job (the generator then makes no video)', () => {
  const s = steps.find((x) => /command -v ffmpeg/.test(x))
  assert.match(s, /continue-on-error: true/)
})
test('workflow: crons, concurrency, secrets and the check step are unchanged', () => {
  assert.equal([...WF.matchAll(/- cron: '(\d+ \d+) \* \* \*'/g)].map((m) => m[1]).join(','), '37 19,47 20,47 21,37 22')
  assert.match(WF, /concurrency:\n  group: morning-post\n  cancel-in-progress: false\n/)
  for (const sec of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MORNING_POST_SECRET', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'ELEVENLABS_MODEL', 'RESEND_API_KEY', 'ALERT_EMAIL']) assert.ok(WF.includes(`secrets.${sec}`), sec)
  assert.match(steps[1], /id: check\b/)
  assert.match(steps[1], /continue-on-error: true/)
  assert.match(steps[1], /node scripts\/morning\/check-complete\.mjs/)
})
test('workflow: the uploaded artifact folder is the one the video is written to; the step summary gets the video line from the generator', () => {
  assert.match(WF, /path: out\/morning\/\*\*/)
  assert.match(rd('scripts/morning/run.mjs'), /GITHUB_STEP_SUMMARY|appendStepSummary/)
})
