// Batch 17E end-to-end rehearsal of `npm run morning -- --save` against a FAKE local database (no keys, no ElevenLabs, no real database).
// The fake database behaves like migrations 0070/0073/0074 for the functions the job calls. A voice is "already stored" (as on a day
// where the voice step ran in an earlier try), so the video step must fetch it, build the MP4 with the real ffmpeg and save it.
// Usage: FFMPEG_PATH=<ffmpeg> node scripts/batch17e/e2e-fake.mjs [--out docs/review/batch17e/evidence/e2e-fake-run.txt]
import { createServer } from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d }
const REPORT = resolve(arg('--out', 'docs/review/batch17e/evidence/e2e-fake-run.txt'))
const FF = process.env.FFMPEG_PATH || 'ffmpeg'
const lines = []
const say = (s) => { lines.push(s); console.log(s) }
const sha = (s) => createHash('sha256').update(s).digest('hex')

// a ~12 s tone as the "already stored" voice
const work = mkdtempSync(join(tmpdir(), 'e2e17e-'))
const tone = join(work, 'tone.mp3')
const t = spawnSync(FF, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=12:sample_rate=44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', tone])
if (t.status !== 0) { console.error('cannot make the stand-in voice (is FFMPEG_PATH right?)'); process.exit(1) }

const db = { post: null, calls: [] }
const server = createServer((req, res) => {
  let body = ''
  req.on('data', (d) => (body += d))
  req.on('end', () => {
    const name = req.url.split('/rpc/')[1] || req.url
    let a = {}
    try { a = JSON.parse(body || '{}') } catch { /* ignore */ }
    db.calls.push(name)
    const ok = (o) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)) }
    if (a.p_secret !== 'e2e-secret') return ok({ ok: false, error: 'forbidden' })
    const p = db.post
    if (name === 'morning_post_context') return ok({ ok: true, yesterday: { poll_question_id: null, poll_result_pct: null }, today: { voice_sha256: p && p.voice ? 'abc' : null, has_video: !!(p && p.video) } })
    if (name === 'morning_post_upsert') {
      const changed = !p || p.message !== a.p_message || p.card !== a.p_card_b64
      db.post = { ...(p || {}), message: a.p_message, card: a.p_card_b64, ...(changed ? { video: null } : {}), ...(p && p.message !== a.p_message ? { voice: null } : {}) }
      return ok({ ok: true })
    }
    if (name === 'morning_post_voice_get') return ok({ ok: true, voice_mp3_b64: p ? p.voice : null })
    if (name === 'morning_post_voice_upsert') { db.post.voice = a.p_mp3_b64; return ok({ ok: true }) }
    if (name === 'morning_post_video_upsert') {
      if (!p || !p.card || !p.voice) return ok({ ok: false, error: 'bad_input' })
      db.post.video = a.p_mp4_b64; db.post.meta = a.p_meta
      return ok({ ok: true })
    }
    res.statusCode = 404; ok({ code: 'PGRST202' })
  })
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}`

const runJob = (label, ffmpegPath) => new Promise((resolveRun) => {
  const outDir = join(work, label)
  mkdirSync(outDir, { recursive: true })
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot || '', SUPABASE_URL: url, SUPABASE_ANON_KEY: 'anon-e2e', MORNING_POST_SECRET: 'e2e-secret', FFMPEG_PATH: ffmpegPath, GITHUB_STEP_SUMMARY: join(work, `${label}-summary.md`) }
  const p = spawn(process.execPath, ['scripts/morning/run.mjs', '--fixtures', 'rain-f1', '--save', '--out', outDir], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let out = ''
  p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d))
  p.on('close', (code) => resolveRun({ code, out, outDir, summary: existsSync(env.GITHUB_STEP_SUMMARY) ? readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8') : '' }))
})

let allOk = true
const check = (name, ok, detail) => { allOk = allOk && ok; say(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`) }

// 1. the post exists with a stored voice but no video (the day after the migration, or after an earlier failed try)
// run 0 only creates the post (no voice exists yet, so no video can be made); then the voice appears, as if an earlier try had stored it
db.post = null
await runJob('run0', FF)
db.post.voice = readFileSync(tone).toString('base64')
db.post.video = null
db.calls.length = 0
say('--- run 1: voice already stored, no video, real ffmpeg ---')
let r = await runJob('run1', FF)
const vline = r.out.split('\n').find((l) => l.startsWith('video '))
check('job exits 0', r.code === 0, `exit ${r.code}`)
check('video line printed', !!vline, vline)
check('video stored in the fake database', !!(db.post.video && db.post.video.length > 1000), `${db.post.video ? Math.round(Buffer.from(db.post.video, 'base64').length / 1024) : 0} KB`)
check('the database was asked for the stored voice once', db.calls.filter((c) => c === 'morning_post_voice_get').length === 1)
check('step summary carries the video line', /video saved \(/.test(r.summary), r.summary.trim())
check('report.txt ends with the video line', /video saved \(/.test(readFileSync(join(r.outDir, 'report.txt'), 'utf8')))
check('the mp4 is in the output folder (uploaded as an artifact)', readdirSync(r.outDir).some((f) => /^morning-\d{4}-\d\d-\d\d\.mp4$/.test(f)))
check('no secret, key or base64 in the console output', !/e2e-secret|anon-e2e|[A-Za-z0-9+/]{200}/.test(r.out))

// 2. run again with the video stored and nothing changed: nothing is rebuilt
say('--- run 2: same day again, nothing changed ---')
const callsBefore = db.calls.length
r = await runJob('run2', FF)
const names = db.calls.slice(callsBefore)
check('job exits 0', r.code === 0)
check('"already stored" - no voice fetch, no second video save', /video already stored/.test(r.out) && !names.includes('morning_post_voice_get') && names.filter((c) => c === 'morning_post_video_upsert').length === 0, names.join(','))

// 3. ffmpeg missing: the post is still saved, the job stays green, one line says why
say('--- run 3: ffmpeg missing, no video yet ---')
db.post.video = null
r = await runJob('run3', join(work, 'no-such-ffmpeg'))
check('job exits 0 (green) without ffmpeg', r.code === 0, `exit ${r.code}`)
check('one plain line says ffmpeg is missing', /video skipped: ffmpeg is not installed/.test(r.out) && /video skipped: ffmpeg is not installed/.test(r.summary))
check('the message and card are still saved', !!db.post.message && db.post.message !== 'old' && !!db.post.card)
check('no video was stored', !db.post.video)

// 4. the database does not know the video functions yet (migration 0074 not applied): green, one line
say('--- run 4: old database (no has_video in the context answer) ---')
const realCall = server.listeners('request')[0]
server.removeAllListeners('request')
server.on('request', (req, res) => {
  let b = ''
  req.on('data', (d) => (b += d))
  req.on('end', () => {
    const name = req.url.split('/rpc/')[1]
    res.setHeader('content-type', 'application/json')
    if (name === 'morning_post_context') return res.end(JSON.stringify({ ok: true, yesterday: {}, today: { voice_sha256: 'abc' } }))
    if (name === 'morning_post_upsert') return res.end(JSON.stringify({ ok: true }))
    if (name === 'morning_post_voice_upsert') return res.end(JSON.stringify({ ok: true }))
    res.statusCode = 404; res.end(JSON.stringify({ code: 'PGRST202' }))
  })
})
r = await runJob('run4', FF)
check('job exits 0 on an old database', r.code === 0, `exit ${r.code}`)
check('one line says migration 0074 is missing', /video skipped: migration 0074 missing/.test(r.out))
void realCall

server.close()
say(allOk ? 'ALL E2E CHECKS PASSED' : 'SOME E2E CHECKS FAILED')
mkdirSync(resolve(REPORT, '..'), { recursive: true })
writeFileSync(REPORT, `${lines.join('\n')}\n`)
process.exit(allOk ? 0 : 1)
