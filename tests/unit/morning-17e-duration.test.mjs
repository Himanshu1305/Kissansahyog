// Batch 17E fix - the video must never outrun the voice (phone test of run #14: voice 34.7 s, video 64.5 s).
// Cause: `-shortest` with a looped still image does not stop the video on every ffmpeg version (CI had 8.0.1; locally 6.0 and 7.1 overrun, 6.1.1 does not).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, existsSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import * as av from '../../scripts/morning/video/ffmpegArgs.mjs'
import * as mk from '../../scripts/morning/video/make.mjs'

const rd = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const CREDS = { url: 'https://x.example', key: 'anon-key-123', secret: 'secret-abc', date: '2026-11-01' }
const PNG = Buffer.from('89504e470d0a1a0a00', 'hex')
const MP3 = Buffer.from('fffb9000000000000000', 'hex')
const reply = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) })
function fakeDb({ hasVideo = false } = {}) {
  const calls = []
  const f = async (url, opts) => {
    const name = url.split('/rpc/')[1]
    calls.push({ name, args: JSON.parse(opts.body) })
    if (name === 'morning_post_context') return reply(200, { ok: true, today: { voice_sha256: 'abc', has_video: hasVideo } })
    if (name === 'morning_post_voice_get') return reply(200, { ok: true, voice_mp3_b64: 'TVAz' })
    if (name === 'morning_post_video_upsert') return reply(200, { ok: true })
    return reply(404, { code: 'PGRST202' })
  }
  f.calls = calls
  return f
}
// fake ffmpeg: a "measure the voice" call (decode to null) answers with a final time=; a build call writes a file.
const fakeFfmpeg = ({ decoded = '00:00:34.66' } = {}) => {
  const run = async (args) => {
    run.calls.push(args)
    if (args.includes('null')) return { code: 0, stderr: `${decoded.startsWith('0') ? 'size=N/A time=00:00:12.00 bitrate=N/A\n' : ''}size=N/A time=${decoded} bitrate=N/A speed=600x`, error: null }
    writeFileSync(args[args.length - 1], Buffer.alloc(2000, 7))
    return { code: 0, stderr: '', error: null }
  }
  run.calls = []
  return run
}
const builds = (ff) => ff.calls.filter((a) => a.includes('-c:v'))
const dir = () => mkdtempSync(join(tmpdir(), 'v17e-dur-'))
const probeOf = (...answers) => { const p = async () => answers[Math.min(p.n++, answers.length - 1)]; p.n = 0; return p }

// ---- recipe: explicit length ----
test('videoSeconds rounds the measured voice length UP by at most 0.05 s', () => {
  assert.equal(av.videoSeconds(34.66), 34.7)
  assert.equal(av.videoSeconds(34.7), 34.7)
  assert.equal(av.videoSeconds(10.001), 10.05)
  for (const x of [0.01, 5.123, 34.66, 41.2, 59.99, 61.01]) { const y = av.videoSeconds(x); assert.ok(y >= x && y - x <= 0.05 + 1e-9, String(x)) }
  assert.equal(av.videoSeconds(NaN), null)
  assert.equal(av.videoSeconds(0), null)
  assert.equal(av.videoSeconds(-3), null)
})
test('ffmpeg arguments: with a measured length they carry an explicit output -t INSTEAD of -shortest; every other setting is unchanged', () => {
  const a = av.buildFfmpegArgs({ card: 'c.png', audio: 'v.mp3', out: 'o.mp4', seconds: 34.7 })
  const i = a.indexOf('-t')
  assert.ok(i > 0, '-t present')
  assert.equal(a[i + 1], '34.7')
  assert.ok(i > a.indexOf('v.mp3'), '-t is an OUTPUT option (after the inputs)')
  assert.equal(a[a.length - 1], 'o.mp4')
  assert.ok(!a.includes('-shortest'), '-shortest is what failed (and cut the audio with -t on ffmpeg 6.0)')
  assert.ok(!a.includes('-frames:v'))
  const base = av.buildFfmpegArgs({ card: 'c.png', audio: 'v.mp3', out: 'o.mp4' })
  assert.ok(!base.includes('-t') && base.includes('-shortest'), 'without seconds the old recipe is untouched')
  assert.deepEqual(a.filter((x, k) => k !== i && k !== i + 1), base.filter((x) => x !== '-shortest'), 'only -t <seconds> replaced -shortest')
})
test('ffmpeg arguments: the strict (second) attempt ALSO limits the looped card at its input', () => {
  const a = av.buildFfmpegArgs({ card: 'c.png', audio: 'v.mp3', out: 'o.mp4', seconds: 34.7, strict: true })
  const first = a.indexOf('-i')
  const inputT = a.indexOf('-t')
  assert.ok(inputT > 0 && inputT < first, 'input-side -t comes before the first -i')
  assert.equal(a[inputT + 1], '34.7')
  assert.equal(a.lastIndexOf('-t') > first, true, 'and the output -t is still there')
  assert.ok(!a.includes('-shortest'))
})
test('parseLastTime takes the LAST time= of an ffmpeg decode', () => {
  assert.equal(mk.parseLastTime('x time=00:00:01.00 y\nx time=00:00:34.66 bitrate'), 34.66)
  assert.equal(mk.parseLastTime('time=01:00:00.50'), 3600.5)
  assert.equal(mk.parseLastTime('time=N/A nothing'), null)
})

// ---- make.mjs: measure, build with -t, verify, rebuild once, never save a bad video ----
test('the decoded voice length is measured first and the build gets -t (rounded up); the saved line shows the container seconds', async () => {
  const f = fakeDb(), ff = fakeFfmpeg()
  const r = await mk.makeVideo({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff, runProbe: probeOf({ audio: 34.69, video: 35, container: 35 }) })
  assert.equal(r.ok, true, r.line)
  const m = ff.calls.findIndex((a) => a.includes('null')), b = ff.calls.findIndex((a) => a.includes('-c:v'))
  assert.ok(m >= 0 && m < b, 'measured before building')
  assert.equal(builds(ff).length, 1)
  assert.equal(builds(ff)[0][builds(ff)[0].indexOf('-t') + 1], '34.7')
  assert.match(r.line, /^video saved \(2 KB, 35 s\)$/)
  assert.equal(f.calls.filter((c) => c.name === 'morning_post_video_upsert').length, 1)
})
test('all three durations within 0.5 s of the voice -> saved; any one off by more than 0.5 s -> not', async () => {
  const ok = await mk.makeVideo({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: fakeDb(), runFfmpeg: fakeFfmpeg(), runProbe: probeOf({ audio: 34.2, video: 35.1, container: 35.1 }) })
  assert.equal(ok.ok, true, ok.line)
  for (const bad of [{ audio: 34.69, video: 64.5, container: 64.5 }, { audio: 34.69, video: 35.5, container: 35.5 }, { audio: 33.9, video: 34.5, container: 34.5 }, { audio: 34.69, video: 34.5, container: 64.5 }]) {
    const f = fakeDb()
    const r = await mk.makeVideo({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: fakeFfmpeg(), runProbe: probeOf(bad) })
    assert.equal(r.ok, false, JSON.stringify(bad))
    assert.ok(!f.calls.some((c) => c.name === 'morning_post_video_upsert'), 'a bad video is never stored')
  }
})
test('mismatch then good: rebuilt ONCE (strict), then saved', async () => {
  const f = fakeDb(), ff = fakeFfmpeg()
  const r = await mk.makeVideo({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff, runProbe: probeOf({ audio: 34.69, video: 64.5, container: 64.5 }, { audio: 34.69, video: 35, container: 35 }) })
  assert.equal(r.ok, true, r.line)
  assert.equal(builds(ff).length, 2)
  const firstI = (a) => a.indexOf('-i')
  assert.ok(builds(ff)[0].indexOf('-t') > firstI(builds(ff)[0]), 'first try: output -t only')
  assert.ok(builds(ff)[1].indexOf('-t') < firstI(builds(ff)[1]), 'second try: the card input is limited too')
  assert.match(r.line, /^video saved \(/)
  assert.equal(f.calls.filter((c) => c.name === 'morning_post_video_upsert').length, 1)
})
test('mismatch twice: rebuilt once, then skipped with the plain line, nothing stored, the bad file removed', async () => {
  const f = fakeDb(), ff = fakeFfmpeg(), od = dir()
  const r = await mk.makeVideo({ outDir: od, ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: ff, runProbe: probeOf({ audio: 34.69, video: 64.5, container: 64.5 }) })
  assert.equal(r.ok, false)
  assert.equal(builds(ff).length, 2, 'exactly one rebuild, no loop')
  assert.equal(r.line, 'video skipped: durations do not match (audio 34.7 s, video 64.5 s)')
  assert.ok(!f.calls.some((c) => c.name === 'morning_post_video_upsert'))
  assert.ok(!existsSync(join(od, 'morning-2026-11-01.mp4')), 'the bad file is not left in the artifact folder')
})
test('voice length cannot be measured -> skipped, nothing built', async () => {
  const ff = fakeFfmpeg({ decoded: 'N/A' })
  const r = await mk.makeVideo({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: fakeDb(), runFfmpeg: ff, runProbe: probeOf({ audio: 1, video: 1, container: 1 }) })
  assert.equal(r.ok, false)
  assert.match(r.line, /^video skipped: could not measure the length of the voice/)
  assert.equal(builds(ff).length, 0)
})
test('probe gives nothing -> skipped (never stored unchecked)', async () => {
  const f = fakeDb()
  const r = await mk.makeVideo({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f, runFfmpeg: fakeFfmpeg(), runProbe: probeOf(null) })
  assert.equal(r.ok, false)
  assert.match(r.line, /^video skipped: could not read the length of the finished video/)
  assert.ok(!f.calls.some((c) => c.name === 'morning_post_video_upsert'))
})

// ---- manual runs always rebuild ----
test('force: a stored video does NOT stop the build and it is overwritten; without force it is still skipped', async () => {
  const probe = { audio: 34.69, video: 35, container: 35 }
  const f1 = fakeDb({ hasVideo: true }), ff1 = fakeFfmpeg()
  const a = await mk.makeVideo({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f1, runFfmpeg: ff1, runProbe: probeOf(probe), force: true })
  assert.equal(a.ok, true, a.line)
  assert.match(a.line, /^video saved \(/)
  assert.equal(f1.calls.filter((c) => c.name === 'morning_post_video_upsert').length, 1)
  const f2 = fakeDb({ hasVideo: true }), ff2 = fakeFfmpeg()
  const b = await mk.makeVideo({ outDir: dir(), ...CREDS, png: PNG, mp3: MP3, fetchImpl: f2, runFfmpeg: ff2, runProbe: probeOf(probe) })
  assert.match(b.line, /^video already stored/)
  assert.equal(ff2.calls.length, 0)
})
test('run.mjs passes force only for MORNING_FORCE_VIDEO=true', () => {
  assert.match(rd('scripts/morning/run.mjs'), /force: process\.env\.MORNING_FORCE_VIDEO === 'true'/)
})
const WF = rd('.github/workflows/morning-post.yml')
const steps = WF.split(/\n {6}- (?=\S)/).slice(1)
test('workflow: the generate step sets MORNING_FORCE_VIDEO true for manual runs with check_first off, and never true otherwise', () => {
  const g = steps.find((s) => /npm run morning -- --save/.test(s))
  const m = /MORNING_FORCE_VIDEO: \$\{\{ (.+?) \}\}/.exec(g)
  assert.ok(m, 'env var present on the generate step')
  // evaluate the GitHub expression the way Actions does (&& / || on strings and booleans)
  const ev = (event, checkFirst) => Function('github', 'inputs', `return (${m[1]})`)({ event_name: event }, { check_first: checkFirst })
  assert.equal(ev('workflow_dispatch', false), 'true')
  assert.notEqual(ev('workflow_dispatch', true), 'true', 'a manual run with check_first ON behaves like a scheduled try')
  assert.notEqual(ev('schedule', undefined), 'true')
  assert.notEqual(ev('schedule', false), 'true')
  assert.ok(!/MORNING_FORCE_VIDEO/.test(steps[1]), 'the check step does not know about it')
})
test('workflow: check step, crons, concurrency and secrets are untouched by this fix', () => {
  assert.equal([...WF.matchAll(/- cron: '(\d+ \d+) \* \* \*'/g)].map((m) => m[1]).join(','), '37 19,47 20,47 21,37 22')
  assert.match(WF, /concurrency:\n  group: morning-post\n  cancel-in-progress: false\n/)
  assert.match(steps[1], /CHECK_FIRST: \$\{\{ inputs\.check_first \}\}/)
  for (const sec of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MORNING_POST_SECRET', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'ELEVENLABS_MODEL', 'RESEND_API_KEY', 'ALERT_EMAIL']) assert.ok(WF.includes(`secrets.${sec}`), sec)
})

// ---- the real ffmpeg (skipped when none is configured): the reproduction ----
// Set FFMPEG_PATH (and FFPROBE_PATH) and run once per ffmpeg you have. The old recipe overran on 6.0 (43 s) and 7.1 (52 s) for a 34.7 s voice; 6.1.1 did not.
const FF = process.env.FFMPEG_PATH, FP = process.env.FFPROBE_PATH || 'ffprobe'
const hasFf = !!FF && spawnSync(FF, ['-version']).status === 0
test('REAL ffmpeg: a 34.7 s mp3 with an ID3 tag (the shape ElevenLabs returns) gives a video as long as the voice, not 43-70 s', { skip: !hasFf && 'set FFMPEG_PATH to run' }, async () => {
  const od = dir(), mp3 = join(od, 'voice.mp3')
  const g = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=44100:duration=34.7', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', '-id3v2_version', '3', mp3])
  assert.equal(g.status, 0)
  copyFileSync(new URL('../../docs/review/batch17b/evidence/card-f1-dry.png', import.meta.url), join(od, 'card.png'))
  const r = await mk.makeVideo({ outDir: od, date: '2026-11-01', mp3: readFileSync(mp3), save: null })
  assert.equal(r.ok, true, r.line)
  const out = spawnSync(FP, ['-v', 'error', '-show_entries', 'stream=codec_type,duration:format=duration', '-of', 'default=nw=1', join(od, 'morning-2026-11-01.mp4')], { encoding: 'utf8' }).stdout || ''
  const all = [...out.matchAll(/duration=([0-9.]+)/g)].map((m) => Number(m[1]))
  assert.equal(all.length, 3, out) // video stream, audio stream, container
  for (const d of all) assert.ok(Math.abs(d - 34.7) <= 0.5, `duration ${d} is not within 0.5 s of the voice (34.7 s)\n${out}`)
})
test('REAL ffmpeg: the OLD recipe (no -t) is longer than the voice on this ffmpeg (documents the bug; passes either way, prints the numbers)', { skip: !hasFf && 'set FFMPEG_PATH to run' }, () => {
  const od = dir(), mp3 = join(od, 'voice.mp3'), card = join(od, 'card.png'), out = join(od, 'old.mp4')
  spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=44100:duration=34.7', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', '-id3v2_version', '3', mp3])
  copyFileSync(new URL('../../docs/review/batch17b/evidence/card-f1-dry.png', import.meta.url), card)
  const b = spawnSync(FF, av.buildFfmpegArgs({ card, audio: mp3, out }))
  assert.equal(b.status, 0)
  const d = Number(/duration=([0-9.]+)/.exec(spawnSync(FP, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1', out], { encoding: 'utf8' }).stdout)[1])
  console.log(`# old recipe on this ffmpeg: video ${d} s for a 34.7 s voice`)
  assert.ok(d >= 34.5)
})
