// Batch 17E - the video step of `npm run morning --save`: card.png + voice.mp3 -> morning-YYYY-MM-DD.mp4 (ffmpeg), stored with
// morning_post_video_upsert. Runs AFTER the message, card and voice are saved. NEVER throws and never blocks the post:
// every problem is one plain line for report.txt and the step summary. Never logs keys, the secret, base64 or raw bytes.
import { spawn } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildFfmpegArgs, videoSeconds, VIDEO_SPEC } from './ffmpegArgs.mjs'
import { rpc } from '../lib/supa.js'

export const MAX_MP4_B64 = 3000000 // the database cap in morning_post_video_upsert

// Runs ffmpeg. -> { code, stderr (last ~4 KB), error }. FFMPEG_PATH may point at a specific binary.
export function spawnFfmpeg(args, { bin = process.env.FFMPEG_PATH || 'ffmpeg', timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    let p
    try { p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] }) } catch (error) { return resolve({ code: null, stderr: '', error }) }
    let stderr = ''
    const timer = setTimeout(() => { try { p.kill('SIGKILL') } catch { /* gone */ } }, timeoutMs)
    p.stderr.on('data', (d) => { stderr = (stderr + d).slice(-4000) })
    p.on('error', (error) => { clearTimeout(timer); resolve({ code: null, stderr, error }) })
    p.on('close', (code) => { clearTimeout(timer); resolve({ code, stderr, error: null }) })
  })
}

// "Duration: 00:00:41.20," -> 41.2 ; null when absent
export function parseDuration(text) {
  const m = /Duration:\s*(\d+):(\d\d):(\d\d(?:\.\d+)?)/.exec(String(text || ''))
  return m ? Math.round((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 100) / 100 : null
}

// the LAST "time=hh:mm:ss.xx" of an ffmpeg run -> seconds ; null when absent. `ffmpeg -i voice.mp3 -f null -` ends with the real decoded length.
export function parseLastTime(text) {
  const all = [...String(text || '').matchAll(/time=(\d+):(\d\d):(\d\d(?:\.\d+)?)/g)]
  if (!all.length) return null
  const m = all[all.length - 1]
  return Math.round((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 100) / 100
}

// Runs ffprobe. -> { code, stdout, error }. FFPROBE_PATH may point at a specific binary.
export function spawnFfprobe(args, { bin = process.env.FFPROBE_PATH || 'ffprobe', timeoutMs = 60000 } = {}) {
  return new Promise((resolve) => {
    let p
    try { p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'ignore'] }) } catch (error) { return resolve({ code: null, stdout: '', error }) }
    let stdout = ''
    const timer = setTimeout(() => { try { p.kill('SIGKILL') } catch { /* gone */ } }, timeoutMs)
    p.stdout.on('data', (d) => { stdout = (stdout + d).slice(-20000) })
    p.on('error', (error) => { clearTimeout(timer); resolve({ code: null, stdout, error }) })
    p.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, error: null }) })
  })
}

const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null)
// The finished video's three lengths -> { audio, video, container } (seconds) or null when they cannot be read.
// ffprobe first; with no ffprobe on the machine, ffmpeg gives the container length and the decoded audio length (video = container).
export async function probeDurations(path, { runFfprobe = spawnFfprobe, runFfmpeg = spawnFfmpeg } = {}) {
  const r = await runFfprobe(['-v', 'error', '-show_entries', 'stream=codec_type,duration:format=duration', '-of', 'json', path])
  if (r && !r.error && r.code === 0) {
    try {
      const j = JSON.parse(r.stdout)
      const st = (t) => (j.streams || []).find((x) => x.codec_type === t)
      const container = r2(Number(j.format && j.format.duration))
      if (container == null) return null
      return { container, audio: r2(Number(st('audio') && st('audio').duration)) ?? container, video: r2(Number(st('video') && st('video').duration)) ?? container }
    } catch { return null }
  }
  const a = await runFfmpeg(['-hide_banner', '-i', path])
  const container = parseDuration(a && a.stderr)
  if (container == null) return null
  const d = await runFfmpeg(['-hide_banner', '-i', path, '-map', '0:a', '-f', 'null', '-'])
  return { container, video: container, audio: parseLastTime(d && d.stderr) ?? container }
}

export function appendStepSummary(line, env = process.env) {
  try { if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`) } catch { /* never block the post */ }
}

// -> { state: 'yes'|'no'|'unknown', why?: 'old'|'error' }
async function videoState({ url, key, secret, date, fetchImpl = fetch }) {
  try {
    const r = await rpc({ url, key, fetchImpl, name: 'morning_post_context', args: { p_secret: secret, p_date: date } })
    if (!r.body || r.body.ok !== true) return { state: 'unknown', why: 'error' }
    const hv = r.body.today && r.body.today.has_video
    if (hv === true) return { state: 'yes' }
    if (hv === false) return { state: 'no' }
    return { state: 'unknown', why: 'old' } // an older database does not report has_video at all
  } catch { return { state: 'unknown', why: 'error' } }
}
export async function storedVideoState(opts) { return (await videoState(opts)).state }

async function fetchStoredVoice({ url, key, secret, date, fetchImpl = fetch }) {
  try {
    const r = await rpc({ url, key, fetchImpl, name: 'morning_post_voice_get', args: { p_secret: secret, p_date: date } })
    const b64 = r.body && r.body.ok === true ? r.body.voice_mp3_b64 : null
    return typeof b64 === 'string' && b64.length > 0 ? Buffer.from(b64, 'base64') : null
  } catch { return null }
}

async function saveVideo({ url, key, secret, date, b64, meta, fetchImpl = fetch }) {
  let r
  try { r = await rpc({ url, key, fetchImpl, name: 'morning_post_video_upsert', args: { p_secret: secret, p_date: date, p_mp4_b64: b64, p_meta: meta } }) } catch { return { ok: false, line: 'video not saved: could not reach the database' } }
  const b = r.body
  if (b && b.ok === true) return { ok: true }
  if (r.status === 404 || (b && (b.code === 'PGRST202' || b.code === '42883'))) return { ok: false, line: 'video not saved: migration 0074 missing' }
  if (b && b.error === 'already_posted') return { ok: false, line: 'video not saved: the post is already marked as posted' }
  if (b && b.error) return { ok: false, line: `video not saved: the database said "${String(b.error).slice(0, 40)}"` }
  return { ok: false, line: `video not saved: unexpected answer from the database (http ${r.status})` }
}

const kb = (n) => Math.round(n / 1024)
const ffmpegStartLine = (e) => (e.code === 'ENOENT' ? 'video skipped: ffmpeg is not installed on this machine' : `video skipped: ffmpeg could not start (${String(e.code || e.message).slice(0, 40)})`)
const ffmpegFailLine = (res, extra) => `video skipped: ffmpeg failed (exit ${res.code === null ? 'none - timed out' : res.code})${extra}${lastLine(res.stderr) ? `: ${lastLine(res.stderr).slice(0, 100)}` : ''}`
const lastLine = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean).pop() || ''

// opts: { outDir, date, png (Buffer|null), mp3 (Buffer|null), url, key, secret (all three = also use the database; omit them or pass
//         save: null = build the file only, a local rehearsal), fetchImpl, runFfmpeg, runProbe (path -> {audio, video, container} | null),
//         force: true = a manual run: build and overwrite even when a video is already stored }
// -> { ok, line }. Never throws.
export async function makeVideo(opts) {
  try { return await build(opts) } catch (e) { return { ok: false, line: `video skipped: ${String((e && e.message) || e).slice(0, 100)}` } }
}

async function build({ outDir, date, png = null, mp3 = null, url, key, secret, save, force = false, fetchImpl = fetch, runFfmpeg = spawnFfmpeg, runProbe }) {
  const db = save === null ? null : (save || (url && key && secret ? { url, key, secret } : null))
  const d = date || (db && db.date)
  if (db && !force) { // a manual run (force) always rebuilds and overwrites; scheduled tries keep the cheap "already stored" skip
    const st = await videoState({ ...db, date: d, fetchImpl })
    if (st.state === 'yes') return { ok: true, line: 'video already stored for this post; nothing to build' }
    if (st.state === 'unknown') return { ok: false, line: st.why === 'old' ? 'video skipped: migration 0074 missing (the database does not report has_video)' : 'video skipped: could not read the video state from the database' }
  }
  const cardPath = join(outDir, 'card.png'), voicePath = join(outDir, 'voice.mp3'), outPath = join(outDir, `morning-${d}.mp4`)
  if (png && png.length) writeFileSync(cardPath, png)
  if (!existsSync(cardPath)) return { ok: false, line: 'video skipped: no card' }
  let voice = mp3 && mp3.length ? mp3 : null
  if (!voice && existsSync(voicePath)) voice = readFileSync(voicePath)
  if (!voice && db) voice = await fetchStoredVoice({ ...db, date: d, fetchImpl })
  if (!voice) return { ok: false, line: 'video skipped: no voice yet (nothing to put under the card)' }
  writeFileSync(voicePath, voice)

  // 1. the REAL decoded length of the voice (the mp3 header can say something else)
  const m = await runFfmpeg(['-hide_banner', '-i', voicePath, '-f', 'null', '-'])
  if (m.error) return { ok: false, line: ffmpegStartLine(m.error) }
  if (m.code !== 0) return { ok: false, line: ffmpegFailLine(m, ' while measuring the voice') }
  const decoded = parseLastTime(m.stderr)
  const seconds = videoSeconds(decoded)
  if (seconds == null) return { ok: false, line: 'video skipped: could not measure the length of the voice' }
  const probe = runProbe || ((p) => probeDurations(p, { runFfmpeg }))

  // 2. build with an explicit -t, check the three lengths, rebuild once (stricter), otherwise save nothing
  const near = (x) => Number.isFinite(x) && Math.abs(x - decoded) <= 0.5
  const gone = () => { try { unlinkSync(outPath) } catch { /* nothing to remove */ } }
  let size = 0, lens = null
  for (const strict of [false, true]) {
    gone()
    const res = await runFfmpeg(buildFfmpegArgs({ card: cardPath, audio: voicePath, out: outPath, seconds, strict }))
    if (res.error) return { ok: false, line: ffmpegStartLine(res.error) }
    if (res.code !== 0) return { ok: false, line: ffmpegFailLine(res, '') }
    size = 0
    try { size = statSync(outPath).size } catch { /* no file */ }
    if (!size) return { ok: false, line: 'video skipped: ffmpeg finished but made no file' }
    lens = await probe(outPath)
    if (!lens) { gone(); return { ok: false, line: 'video skipped: could not read the length of the finished video' } }
    if (near(lens.audio) && near(lens.video) && near(lens.container)) break
    if (strict) {
      gone()
      const s1 = (x) => `${Math.round(x * 10) / 10} s`
      return { ok: false, line: `video skipped: durations do not match (audio ${s1(decoded)}, video ${s1(Math.max(lens.video, lens.container))})` }
    }
  }
  const secs = lens.container
  const desc = `${kb(size)} KB, ${Math.round(secs * 10) / 10} s`
  if (!db) return { ok: true, line: `video made (${desc})` }

  const b64 = readFileSync(outPath).toString('base64')
  if (b64.length > MAX_MP4_B64) return { ok: false, line: `video not saved: the video is too large for the database (${kb(size)} KB; the limit is about ${kb(MAX_MP4_B64 * 0.75)} KB)` }
  const meta = { bytes: size, duration_s: secs, fps: VIDEO_SPEC.fps, crf: VIDEO_SPEC.crf }
  const s = await saveVideo({ ...db, date: d, b64, meta, fetchImpl })
  return s.ok ? { ok: true, line: `video saved (${desc})` } : { ok: false, line: s.line }
}
