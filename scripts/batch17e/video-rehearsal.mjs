// Batch 17E rehearsal of the video recipe with the REAL ffmpeg - no keys, no database, no ElevenLabs.
// The voice here is a generated ~40 s sine tone (NOT the ElevenLabs voice); the card is a saved sample card.
// Usage: FFMPEG_PATH=<ffmpeg> FFPROBE_PATH=<ffprobe> node scripts/batch17e/video-rehearsal.mjs [--out docs/review/batch17e/evidence] [--card path.png] [--seconds 40.37]
// Writes: rehearsal-report.txt, ffprobe-*.txt, frame-first.png, frame-last.png, decode-test.txt (and the mp4 itself in a temp folder).
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, copyFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { makeVideo } from '../morning/video/make.mjs'
import { buildFfmpegArgs } from '../morning/video/ffmpegArgs.mjs'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d }
const FF = process.env.FFMPEG_PATH || 'ffmpeg', FP = process.env.FFPROBE_PATH || 'ffprobe'
const OUT = resolve(arg('--out', 'docs/review/batch17e/evidence'))
const CARD = resolve(arg('--card', 'docs/review/batch17b/evidence/card-f1-dry.png'))
const SECONDS = arg('--seconds', '40.37')
mkdirSync(OUT, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'reh17e-'))
const log = []
const say = (s) => { log.push(s); console.log(s) }
const run = (bin, args) => { const r = spawnSync(bin, args, { encoding: 'utf8' }); return { code: r.status, out: r.stdout || '', err: r.stderr || '' } }
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

// 1. a ~40 s mono mp3 made from a sine tone (stand-in for the voice)
const mp3 = join(work, 'voice.mp3')
let r = run(FF, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=220:duration=${SECONDS}:sample_rate=44100`, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', mp3])
if (r.code !== 0) { console.error(r.err); process.exit(1) }
say(`voice stand-in: sine tone, ${SECONDS} s, mono mp3 64k (NOT the ElevenLabs voice)`)
say(`card: ${CARD} (${statSync(CARD).size} bytes)`)
say(`ffmpeg: ${run(FF, ['-version']).out.split('\n')[0]}`)

// 2. build with the production module (makeVideo) in local mode
const dir = join(work, 'out'); mkdirSync(dir)
const res = await makeVideo({ outDir: dir, date: '2026-11-01', png: readFileSync(CARD), mp3: readFileSync(mp3), save: null })
say(`makeVideo -> ${res.line}`)
const mp4 = join(dir, 'morning-2026-11-01.mp4')
if (!res.ok) process.exit(1)
copyFileSync(mp4, join(OUT, 'rehearsal.mp4'))
say(`size: ${statSync(mp4).size} bytes = ${(statSync(mp4).size / 1048576).toFixed(2)} MB (limit 1.5 MB); base64 length ${Math.ceil(statSync(mp4).size / 3) * 4} (database cap 3,000,000)`)

// 3. ffprobe
const probe = run(FP, ['-v', 'error', '-show_format', '-show_streams', mp4])
writeFileSync(join(OUT, 'ffprobe-full.txt'), probe.out)
const short = run(FP, ['-v', 'error', '-show_entries', 'stream=index,codec_name,profile,pix_fmt,width,height,r_frame_rate,avg_frame_rate,duration,bit_rate,channels,sample_rate,color_space,color_primaries,color_transfer,color_range:format=format_name,duration,size,bit_rate', '-of', 'default=nw=0', mp4])
writeFileSync(join(OUT, 'ffprobe-summary.txt'), short.out)
const kv = {}
for (const line of probe.out.split('\n')) { const m = /^(\w+)=(.*)$/.exec(line); if (m) (kv[m[1]] ??= []).push(m[2]) }
const mp3dur = Number(run(FP, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).out)
const fmtDur = Number(probe.out.match(/\[FORMAT\][\s\S]*?duration=([\d.]+)/)[1])
const streams = probe.out.split('[/STREAM]').filter((s) => s.includes('[STREAM]'))
const v = streams.find((s) => /codec_type=video/.test(s)), a = streams.find((s) => /codec_type=audio/.test(s))
const g = (s, k) => (new RegExp(`\\n${k}=(.*)`).exec(s) || [])[1]
const checks = []
const check = (name, ok, detail) => { checks.push(ok); say(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`) }
check('video codec h264 (libx264)', g(v, 'codec_name') === 'h264', g(v, 'codec_name'))
check('pixel format yuv420p', g(v, 'pix_fmt') === 'yuv420p', g(v, 'pix_fmt'))
const cardDims = run(FP, ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', CARD]).out.trim()
check('dimensions equal the card and are even', `${g(v, 'width')},${g(v, 'height')}` === cardDims && g(v, 'width') % 2 === 0 && g(v, 'height') % 2 === 0, `${g(v, 'width')}x${g(v, 'height')} (card ${cardDims})`)
check('audio AAC mono', g(a, 'codec_name') === 'aac' && g(a, 'channels') === '1', `${g(a, 'codec_name')} ${g(a, 'channels')} ch ${g(a, 'sample_rate')} Hz`)
const abr = Number(g(a, 'bit_rate'))
check('audio about 64 kbps', abr > 56000 && abr < 72000, `${abr} bit/s`)
check('duration within 0.3 s of the voice', Math.abs(fmtDur - mp3dur) <= 0.3, `video file ${fmtDur} s, voice ${mp3dur} s, video stream ${g(v, 'duration')} s`)
check('size comfortably under 1.5 MB', statSync(mp4).size < 1.5 * 1048576, `${(statSync(mp4).size / 1024).toFixed(0)} KB`)
const bytes = readFileSync(mp4)
const moov = bytes.indexOf('moov'), mdat = bytes.indexOf('mdat')
check('faststart (moov before mdat)', moov > -1 && mdat > -1 && moov < mdat, `moov at ${moov}, mdat at ${mdat}`)
check('no date or timestamp tags (the only tag text is the fixed string encoder=Lavc libx264)', !/creation_time|date=|\b20\d\d-\d\d-\d\d/i.test(probe.out), 'checked ffprobe output')

// 4. first and last frame against the card
const first = join(OUT, 'frame-first.png'), last = join(OUT, 'frame-last.png')
run(FF, ['-v', 'error', '-y', '-i', mp4, '-frames:v', '1', first])
run(FF, ['-v', 'error', '-y', '-sseof', '-1.5', '-i', mp4, '-update', '1', '-frames:v', '1', last])
const psnr = (p) => { const x = run(FF, ['-hide_banner', '-i', p, '-i', CARD, '-lavfi', 'psnr', '-f', 'null', '-']); const m = /average:([\d.inf]+)/.exec(x.err); return m ? m[1] : '?' }
const pf = psnr(first), pl = psnr(last)
writeFileSync(join(OUT, 'frame-compare.txt'), `PSNR first frame vs card: ${pf} dB\nPSNR last frame vs card: ${pl} dB\n(higher is closer; above 30 dB is visually the same picture; x264 at crf 30 is lossy so it is never bit-identical)\n`)
check('first frame equals the card (PSNR >= 30 dB)', Number(pf) >= 30 || pf === 'inf', `${pf} dB`)
check('last frame equals the card (PSNR >= 30 dB)', Number(pl) >= 30 || pl === 'inf', `${pl} dB`)

// 5. full decode test: prints nothing when the file is clean
const dec = run(FF, ['-v', 'error', '-i', mp4, '-f', 'null', '-'])
writeFileSync(join(OUT, 'decode-test.txt'), `command: ffmpeg -v error -i morning-2026-11-01.mp4 -f null -\nexit code: ${dec.code}\noutput (empty = clean):\n${dec.err}${dec.out}\n`)
check('full decode prints nothing', dec.code === 0 && dec.err.trim() === '' && dec.out.trim() === '', `exit ${dec.code}, ${dec.err.length} chars of output`)

// 6. same inputs -> the same bytes
const again = join(work, 'again.mp4')
run(FF, buildFfmpegArgs({ card: CARD, audio: mp3, out: again }))
check('same inputs give the same file (bit-identical)', sha(again) === sha(mp4), sha(mp4).slice(0, 16))

say(checks.every(Boolean) ? 'ALL REHEARSAL CHECKS PASSED' : 'SOME REHEARSAL CHECKS FAILED')
writeFileSync(join(OUT, 'rehearsal-report.txt'), `${log.join('\n')}\n`)
process.exit(checks.every(Boolean) ? 0 : 1)
