// Batch 17C - the daily morning post must be ready before 05:00 IST: the cheap "is today's post complete?" check and the workflow shape.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync } from 'node:fs'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decide, parseCheckFirst } from '../../scripts/morning/check-complete.mjs'
import { istDate } from '../../scripts/morning/lib/ist.js'

const SCRIPT = new URL('../../scripts/morning/check-complete.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const WF = readFileSync(new URL('../../.github/workflows/morning-post.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const NOW = new Date('2026-10-31T22:40:00Z') // 04:10 IST on 1 Nov
const ENV = { SUPABASE_URL: 'https://x.example', SUPABASE_ANON_KEY: 'anon-key-123', MORNING_POST_SECRET: 'secret-abc', ELEVENLABS_API_KEY: 'el-key' }
const reply = (status, body) => async () => ({ ok: status < 400, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) })
const counting = (impl) => { const f = async (...a) => { f.calls.push(a); return impl(...a) }; f.calls = []; return f }
const sched = (over = {}) => ({ eventName: 'schedule', checkFirst: false, env: ENV, now: NOW, ...over })

test('complete: voice hash present -> true, names the IST date, never the secret', async () => {
  const f = counting(reply(200, { ok: true, today: { voice_sha256: 'abc123' } }))
  const r = await decide({ ...sched(), fetchImpl: f })
  assert.equal(r.complete, true)
  assert.match(r.summary, /^Skipped: today's post \(2026-11-01\) is already complete \(voice present\)\.$/)
  assert.equal(f.calls.length, 1)
  assert.ok(!r.summary.includes('secret-abc') && !r.summary.includes('anon-key-123'))
})

test('no voice -> false', async () => {
  for (const today of [{ voice_sha256: null }, { voice_sha256: '' }, {}, null]) {
    const r = await decide({ ...sched(), fetchImpl: reply(200, { ok: true, today }) })
    assert.equal(r.complete, false)
    assert.match(r.summary, /^Running: no voice stored for 2026-11-01 yet\.$/)
  }
})

test('failures fail open: forbidden, 500, bad JSON, network error', async () => {
  for (const f of [reply(200, { ok: false, error: 'forbidden' }), reply(500, 'boom'), reply(200, 'not json {'), async () => { throw new Error('ECONNRESET') }]) {
    const r = await decide({ ...sched(), fetchImpl: f })
    assert.equal(r.complete, false)
    assert.match(r.summary, /^Running: /)
  }
})

test('timeout -> false (the request is aborted)', async () => {
  const f = (url, opts) => new Promise((_, rej) => { opts.signal.addEventListener('abort', () => rej(new Error('aborted'))) })
  const t0 = Date.now()
  const r = await decide({ ...sched(), fetchImpl: f, timeoutMs: 40 })
  assert.equal(r.complete, false)
  assert.ok(Date.now() - t0 < 2000)
})

test('empty ELEVENLABS key -> false without calling the database', async () => {
  for (const k of ['', undefined, '   ']) {
    const f = counting(reply(200, { ok: true, today: { voice_sha256: 'abc' } }))
    const r = await decide({ ...sched({ env: { ...ENV, ELEVENLABS_API_KEY: k } }), fetchImpl: f })
    assert.equal(r.complete, false)
    assert.equal(f.calls.length, 0)
  }
})

test('missing database settings -> false without calling', async () => {
  const f = counting(reply(200, { ok: true, today: { voice_sha256: 'abc' } }))
  const r = await decide({ ...sched({ env: { ...ENV, MORNING_POST_SECRET: '' } }), fetchImpl: f })
  assert.equal(r.complete, false)
  assert.equal(f.calls.length, 0)
})

test('normal manual run: no database call at all, answer false', async () => {
  const f = counting(reply(200, { ok: true, today: { voice_sha256: 'abc' } }))
  const r = await decide({ eventName: 'workflow_dispatch', checkFirst: false, env: ENV, now: NOW, fetchImpl: f })
  assert.equal(f.calls.length, 0)
  assert.equal(r.complete, false)
})

test('manual run with check_first ON behaves like a scheduled try', async () => {
  const f = counting(reply(200, { ok: true, today: { voice_sha256: 'abc' } }))
  const r = await decide({ eventName: 'workflow_dispatch', checkFirst: true, env: ENV, now: NOW, fetchImpl: f })
  assert.equal(f.calls.length, 1)
  assert.equal(r.complete, true)
})

test('the request asks morning_post_context for today (IST) with the secret in the body only', async () => {
  const f = counting(reply(200, { ok: true, today: {} }))
  await decide({ ...sched(), fetchImpl: f })
  const [url, opts] = f.calls[0]
  assert.equal(url, 'https://x.example/rest/v1/rpc/morning_post_context')
  assert.deepEqual(JSON.parse(opts.body), { p_secret: 'secret-abc', p_date: '2026-11-01' })
})

test('all four cron times fall on the same IST date as the morning they serve', () => {
  const crons = [...WF.matchAll(/- cron: '(\d+) (\d+) \* \* \*'/g)].map((m) => ({ min: +m[1], hour: +m[2] }))
  assert.equal(crons.length, 4)
  for (const c of crons) {
    const run = new Date(Date.UTC(2026, 9, 31, c.hour, c.min)) // 31 Oct UTC evening
    assert.equal(istDate(run), '2026-11-01', `cron ${c.hour}:${c.min} UTC`)
  }
})

// ---- workflow text ----
test('workflow: exactly four crons at the agreed UTC times, each commented with its IST time, none at minute 0 or 30', () => {
  const lines = WF.split('\n').filter((l) => /^\s*- cron:/.test(l))
  assert.equal(lines.length, 4)
  const want = [['37', '19', '01:07'], ['47', '20', '02:17'], ['47', '21', '03:17'], ['37', '22', '04:07']]
  lines.forEach((l, i) => {
    const m = l.match(/- cron: '(\d+) (\d+) \* \* \*'\s*#.*?(\d\d:\d\d) IST/)
    assert.ok(m, l)
    assert.deepEqual([m[1], m[2], m[3]], want[i])
    assert.ok(+m[1] !== 0 && +m[1] !== 30)
    assert.ok(+m[2] >= 19 && +m[2] <= 22)
  })
})

test('workflow: manual run with check_first (boolean, default false), concurrency unchanged', () => {
  assert.match(WF, /workflow_dispatch:\n\s+inputs:\n\s+check_first:\n(?:\s+.*\n)*?\s+type: boolean\n(?:\s+.*\n)*?\s+default: false/)
  assert.match(WF, /concurrency:\n  group: morning-post\n  cancel-in-progress: false\n/)
})

test('workflow: the check step is the first step after checkout and every later step is guarded', () => {
  const steps = WF.split(/\n      - (?=\S)/).slice(1) // each step text
  assert.match(steps[0], /^uses: actions\/checkout@v4/)
  assert.match(steps[1], /id: check\b/)
  assert.match(steps[1], /node scripts\/morning\/check-complete\.mjs/)
  assert.ok(!/^\s*if:/m.test(steps[1]), 'the check step always runs')
  assert.match(steps[1], /CHECK_FIRST: \$\{\{ inputs\.check_first \}\}/)
  assert.match(steps[1], /GITHUB_EVENT_NAME: \$\{\{ github\.event_name \}\}/)
  assert.ok(steps.length >= 7)
  for (const s of steps.slice(3)) {
    const guard = s.split('\n').filter((l) => /^\s+if:/.test(l)).join(' ')
    assert.ok(guard.includes("steps.check.outputs.complete != 'true'"), `guard missing: ${s.split(String.fromCharCode(10))[0]}`)
  }
  assert.ok(WF.indexOf('check-complete.mjs') < WF.indexOf('npm ci'))
  assert.ok(WF.indexOf('check-complete.mjs') < WF.indexOf('playwright install'))
})

test('workflow: continue-on-error on the check, crash notice right after it, missing/empty output means run', () => {
  const steps = WF.split(/\n {6}- (?=\S)/).slice(1)
  assert.match(steps[1], /continue-on-error: true/)
  assert.match(steps[2], /if: steps\.check\.outcome == 'failure'/)
  assert.match(steps[2], /The check step crashed, so the full job ran\./)
  assert.match(steps[2], />> "\$GITHUB_STEP_SUMMARY"/)
  // every guard is "!= 'true'", which is TRUE for a missing or empty output, so the job runs
  for (const s of steps.slice(3)) assert.match(s, /if: (always\(\) && \()?steps\.check\.outputs\.complete != 'true'/)
  const art = steps.find((s) => /upload-artifact/.test(s))
  assert.match(art, /if: always\(\) && \(steps\.check\.outputs\.complete != 'true'\)/)
  for (const s of steps.slice(3)) assert.ok(!/== 'true'/.test(s.replace(/steps\.check\.outcome == 'failure'/g, '')), 'no step may run only when complete is true')
})

test('CHECK_FIRST parsing: true, false, empty (scheduled runs have no inputs)', () => {
  assert.equal(parseCheckFirst('true'), true)
  assert.equal(parseCheckFirst('TRUE'), true)
  assert.equal(parseCheckFirst('false'), false)
  assert.equal(parseCheckFirst(''), false)
  assert.equal(parseCheckFirst(undefined), false)
})

// ---- end to end against a local fake server ----
test('end to end: real script, local fake server, writes GITHUB_OUTPUT and GITHUB_STEP_SUMMARY', async () => {
  const hits = []
  const server = createServer((req, res) => {
    let b = ''
    req.on('data', (d) => (b += d))
    req.on('end', () => { hits.push({ url: req.url, body: b }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: true, today: { voice_sha256: 'deadbeef' } })) })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const dir = mkdtempSync(join(tmpdir(), 'chk17c-'))
  const run = (env) => new Promise((resolve) => {
    const p = spawn(process.execPath, [SCRIPT], { env: { PATH: process.env.PATH, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d))
    p.on('close', (code) => resolve({ code, out }))
  })
  const base = { SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_ANON_KEY: 'anon-key-123', MORNING_POST_SECRET: 'secret-abc', ELEVENLABS_API_KEY: 'el-key', GITHUB_EVENT_NAME: 'schedule', CHECK_FIRST: 'false' }
  try {
    const o1 = join(dir, 'out1'), s1 = join(dir, 'sum1')
    const r1 = await run({ ...base, GITHUB_OUTPUT: o1, GITHUB_STEP_SUMMARY: s1 })
    assert.equal(r1.code, 0)
    assert.equal(readFileSync(o1, 'utf8').trim(), 'complete=true')
    assert.match(readFileSync(s1, 'utf8'), /Skipped: today's post \(\d{4}-\d\d-\d\d\) is already complete \(voice present\)\./)
    assert.equal(hits.length, 1)
    assert.ok(hits[0].url.endsWith('/rest/v1/rpc/morning_post_context'))
    assert.ok(!r1.out.includes('secret-abc') && !r1.out.includes('anon-key-123') && !r1.out.includes('deadbeef'))

    const o2 = join(dir, 'out2'), s2 = join(dir, 'sum2')
    const r2 = await run({ ...base, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_OUTPUT: o2, GITHUB_STEP_SUMMARY: s2 })
    assert.equal(r2.code, 0)
    assert.equal(readFileSync(o2, 'utf8').trim(), 'complete=false')
    assert.equal(hits.length, 1, 'a normal manual run makes no database call')

    const o3 = join(dir, 'out3')
    const r3 = await run({ ...base, SUPABASE_URL: 'http://127.0.0.1:1', GITHUB_OUTPUT: o3, GITHUB_STEP_SUMMARY: join(dir, 'sum3') })
    assert.equal(r3.code, 0, 'a broken check never fails the job')
    assert.equal(readFileSync(o3, 'utf8').trim(), 'complete=false')
  } finally { server.close() }
})

// ---- data freshness: the date the post is built for, at each of the four early times ----
import { tithiAt, sunriseSagar } from '../../scripts/morning/lib/tithi.js'
import { daysBetween } from '../../scripts/morning/lib/ist.js'
import { sowingOpen } from '../../scripts/morning/lib/workRules.js'
import { BANNERS } from '../../src/content/kamPani.js'

const CRON_UTC = [[19, 37], [20, 47], [21, 47], [22, 37]]
for (const day of ['2026-10-31', '2026-09-30', '2026-11-14']) { // evening-UTC start; includes the 1 Oct sowing opening and the day before the banner ends
  test(`IST date, tithi and sowing days left come from the IST date at all four cron times (UTC evening of ${day})`, () => {
    const [y, m, d] = day.split('-').map(Number)
    const ist = istDate(new Date(Date.UTC(y, m - 1, d, 19, 37)))
    const utcDate = day
    assert.notEqual(ist, utcDate, 'the IST date is the next calendar day')
    for (const [h, min] of CRON_UTC) {
      const at = new Date(Date.UTC(y, m - 1, d, h, min))
      const date = istDate(at)
      assert.equal(date, ist, `${h}:${min} UTC`)
      // tithi: computed at Sagar sunrise OF the IST date (sunrise falls on that IST date), not the UTC date
      const t = tithiAt(date)
      assert.equal(t.n, tithiAt(ist).n)
      assert.equal(istDate(sunriseSagar(date)), date)
      assert.equal(istDate(t.sunrise), ist)
      // sowing days left: counted from the IST date
      const left = daysBetween(date, BANNERS.sowing.validUntil)
      assert.equal(left, daysBetween(ist, BANNERS.sowing.validUntil))
      assert.equal(daysBetween(utcDate, BANNERS.sowing.validUntil), left + 1, 'using the UTC date would be one day off')
      assert.equal(sowingOpen(date, BANNERS.sowing.validUntil), date >= `${date.slice(0, 4)}-10-01` && date < BANNERS.sowing.validUntil)
    }
  })
}

// ---- report.txt gets two freshness lines; message, card text and voice script stay byte-for-byte the same ----
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'
import { buildVoiceScript } from '../../scripts/morning/voice/voiceScript.mjs'
import { cardData } from '../../scripts/morning/card/render.mjs'

test('report has "mandi date used" and "weather cache age"; message and voice script identical to the 17D evidence', async () => {
  const D = loadData()
  const rd = (f) => readFileSync(new URL(`../../docs/review/batch17d/evidence/${f}`, import.meta.url), 'utf8')
  for (const [fixture, label] of [['rain-f1', 'f1-dry'], ['rain-f2', 'f2-real-30oct'], ['rain-f3', 'f3-rain-soon'], ['rain-f4', 'f4-heavy'], ['rain-f5', 'f5'], ['rain-f6', 'f6']]) {
    const fx = loadFixture(fixture)
    const res = await generate({ date: fx.date, data: D, nowIso: fx.nowIso, loaders: { weather: fx.weatherLoader, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
    assert.equal(res.message, rd(`message-after-${label}.txt`), `${label} message`)
    assert.equal(`${buildVoiceScript(res.model).text}\n`, readFileSync(new URL(`../../docs/review/batch17b/evidence/voice-script-${label}.txt`, import.meta.url), "utf8").replace(/\r\n/g, '\n'), `${label} voice script`)
    assert.match(res.report, /\nmandi date used: .+\n/)
    assert.match(res.report, /\nweather cache age: .+\n/)
    assert.ok(cardData(res.model), 'card data builds')
  }
})
