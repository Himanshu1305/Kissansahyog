// Batch 21 - the seeded data files, the MSP news check, message length, workflow, Hindi-only rule, rehearsal tool, card and voice with the new slot kinds.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { lint, compose, DROP_STEPS, HARD_CHARS, TARGET_CHARS, KVK_PHONE } from '../../scripts/morning/lib/compose.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { S } from '../../scripts/morning/strings.hi.js'
import { FIXTURE_CROP_HI, loadFixture } from '../../scripts/morning/fixtures.js'
import { weekday, addDays, isIsoDate } from '../../scripts/morning/lib/ist.js'
import { fileCounts, statusRows, main as statusMain } from '../../scripts/morning/content-status.mjs'
import { buildVoiceScript } from '../../scripts/morning/voice/voiceScript.mjs'
import { cardData, renderCard } from '../../scripts/morning/card/render.mjs'
import { districtLoader, crlf } from './helpers/morning18.mjs'
import { OLD_DATA_DIR } from './helpers/contentOff.mjs'

const j = (f) => JSON.parse(readFileSync(`data/morning/${f}`, 'utf8'))
const DATA = loadData()
const OLD = loadData(OLD_DATA_DIR) // the seeds exactly as delivered, before the founder approved them (gate tests use this)
const oldJ = (f) => JSON.parse(readFileSync(new URL(f, OLD_DATA_DIR), 'utf8'))
const EVENTS = j('events.json'), CAL = j('crop-calendar.json'), MONEY = j('money-facts.json'), GYAAN = j('gyaan.json'), SCHEMES = j('scheme-calendar.json'), LINES = j('lines.json')

// every Hindi/English text string of the new seeds, with an owner id (the placeholders for strings that are not shown are skipped)
function seededStrings() {
  const out = []
  const add = (file, id, field, t) => { if (typeof t === 'string' && t.trim()) out.push({ file, id, field, text: t }) }
  for (const e of EVENTS) { add('events', e.id, 'title_hi', e.title_hi); add('events', e.id, 'place_hi', e.place_hi) }
  for (const e of CAL.static) add('crop-calendar', e.id, 'text_hi', e.text_hi)
  for (const e of CAL.stages) add('crop-calendar', e.id, 'label_hi', e.label_hi)
  add('crop-calendar', 'rain_hold', 'text_hi', CAL.rain_hold.text_hi)
  for (const m of MONEY) m.lines_hi.forEach((l, i) => add('money-facts', m.id, `lines_hi[${i}]`, l))
  for (const g of GYAAN.filter((x) => x.id.startsWith('k'))) add('gyaan', g.id, 'text_hi', g.text_hi)
  for (const s of SCHEMES.filter((x) => ['pm-kisan-24', 'pmfby-rabi'].includes(x.id))) {
    for (const f of ['title_hi', 'who_hi', 'news_hi', 'action_hi']) add('scheme-calendar', s.id, f, s[f])
    for (const f of ['premium_hi', 'docs_hi', 'where_hi']) add('scheme-calendar', s.id, `howto.${f}`, s.howto && s.howto[f])
  }
  for (const k of LINES.kahawat) { add('lines', k.id, 'text_hi', k.text_hi); add('lines', k.id, 'meaning_hi', k.meaning_hi) }
  return out
}
const asLine = (t) => lint(`${S.greeting}\n${t}`) // the real lint: banned words, standalone जी, phone numbers other than the KVK constant

test('seeds: EVERY seeded string passes the existing lint (banned words, no "जी", no phone numbers); lint_blocked is set exactly where it does not', () => {
  const strs = seededStrings()
  assert.ok(strs.length > 60, `${strs.length} strings`)
  const bad = new Map()
  for (const s of strs) { const v = asLine(s.text); if (v.length) bad.set(`${s.file}:${s.id}`, v) }
  const flagged = new Set([...LINES.kahawat.filter((k) => k.lint_blocked === true).map((k) => `lines:${k.id}`)])
  assert.deepEqual([...bad.keys()].sort(), [...flagged].sort(), `lint failures: ${JSON.stringify([...bad])}`)
  assert.ok(!/\b\d{10}\b/.test(JSON.stringify([EVENTS, CAL, MONEY, SCHEMES, LINES]).replace(KVK_PHONE, '')), 'no phone-number-like digits')
})

test('seeds: no string is duplicated, and no line is longer than 140 characters (an over-long seed must be flagged too_long and is then not eligible)', () => {
  const strs = seededStrings()
  const seen = new Map()
  for (const s of strs) { const k = s.text.trim(); assert.ok(!seen.has(k), `duplicate text "${k.slice(0, 30)}" in ${s.file}:${s.id} and ${seen.get(k)}`); seen.set(k, `${s.file}:${s.id}`) }
  const long = strs.filter((s) => [...s.text].length > 140)
  for (const s of long) { const e = CAL.static.find((x) => x.id === s.id); assert.ok(e && e.too_long === true, `${s.file}:${s.id} is ${[...s.text].length} characters and not flagged too_long`) }
  assert.deepEqual(long.map((s) => s.id), [], 'every seed is within 140 characters')
  const sample = [...'x'.repeat(30)].length; assert.ok(sample > 0)
})

test('seeds: every new item has a source_name and source_url (kahawat: a source_name), and a date or a number', () => {
  const hasNum = (o) => /\d/.test(JSON.stringify(o))
  for (const e of EVENTS) { assert.ok(e.source_name && /^https?:\/\//.test(e.source_url), e.id); assert.ok(isIsoDate(e.date), e.id) }
  for (const e of [...CAL.stages, ...CAL.static]) { assert.ok(e.source_name && /^https?:\/\//.test(e.source_url), e.id) }
  assert.ok(isIsoDate(CAL.sowing_dates.from) && isIsoDate(CAL.sowing_dates.to) && CAL.sowing_dates.basis)
  for (const e of CAL.static) assert.ok(isIsoDate(e.from) && isIsoDate(e.to) && e.to >= e.from && /\d/.test(e.text_hi), e.id)
  assert.ok(CAL.rain_hold.source_name && CAL.rain_hold.source_url)
  for (const m of MONEY) { assert.ok(m.source_name && /^https?:\/\//.test(m.source_url) && isIsoDate(m.source_date), m.id); assert.ok(hasNum(m.lines_hi)) }
  const k01 = GYAAN.find((g) => g.id === 'k01'); assert.ok(k01.source_name && /^https?:\/\//.test(k01.source_url) && isIsoDate(k01.source_date) && hasNum(k01.text_hi))
  for (const id of ['pm-kisan-24', 'pmfby-rabi']) { const s = SCHEMES.find((x) => x.id === id); assert.ok(s.source_name && /^https?:\/\//.test(s.source_url), id) }
  assert.ok(isIsoDate(SCHEMES.find((x) => x.id === 'pm-kisan-24').source_date))
  for (const k of LINES.kahawat) assert.ok(k.source_name, k.id)
})

test('seeds as DELIVERED (snapshot before the founder approved them) were all unreviewed; the old 3 schemes and 12 gyaan items were as they were', () => {
  const EVENTS = oldJ('events.json'), CAL = oldJ('crop-calendar.json'), MONEY = oldJ('money-facts.json'), GYAAN = oldJ('gyaan.json'), SCHEMES = oldJ('scheme-calendar.json'), LINES = oldJ('lines.json')
  for (const [name, items] of [['events', EVENTS], ['crop-calendar', [CAL.sowing_dates, ...CAL.stages, ...CAL.static, CAL.rain_hold]], ['money-facts', MONEY], ['kahawat', LINES.kahawat]]) assert.ok(items.every((x) => x.reviewed === false), name)
  assert.ok(GYAAN.every((g) => g.reviewed === false)); assert.ok(SCHEMES.every((s) => s.verified === false))
  assert.deepEqual(SCHEMES.slice(0, 3).map((s) => s.id), ['pm-kisan', 'pmfby', 'kcc'])
  assert.equal(GYAAN.filter((g) => /^g\d\d$/.test(g.id)).length, 12)
  assert.equal(LINES.kahawat.length, 12); assert.ok(LINES.kahawat.every((k) => k.wording_checked === false && k.meaning_hi && k.when_hi))
  assert.equal(LINES.kahawat.find((k) => k.id === 'k12').note, 'reviewer to decide: may read as advice')
})

test('events: valid ISO dates, date_to >= date, scope near/far, Chhath and the far fairs are far; Indore and MP are near; weekdays printed', (t) => {
  const far = ['ev-chhath', 'fair-global-agrotech', 'fair-agri-agro-agra', 'fair-kisan-agri-pune'], near = ['fair-bharat-agri-tech', 'fair-farmtech-bhopal']
  for (const e of EVENTS) {
    assert.ok(['festival', 'window', 'fair', 'deadline'].includes(e.kind), e.id); assert.ok(isIsoDate(e.date), e.id); assert.ok(['near', 'far'].includes(e.scope), e.id)
    if (e.date_to) { assert.ok(isIsoDate(e.date_to), e.id); assert.ok(e.date_to >= e.date, `${e.id}: date_to before date`) }
    t.diagnostic(`${e.id}: ${e.date}${e.date_to ? `..${e.date_to}` : ''} is a ${S.weekdays[weekday(e.date)]}`)
  }
  for (const id of far) assert.equal(EVENTS.find((e) => e.id === id).scope, 'far', id)
  for (const id of near) assert.equal(EVENTS.find((e) => e.id === id).scope, 'near', id)
  assert.equal(EVENTS.find((e) => e.id === 'ev-devuthani').date, '2026-11-20'); assert.match(EVENTS.find((e) => e.id === 'ev-devuthani').note, /differ by a day/)
  const w = EVENTS.find((e) => e.id === 'win-wheat-late'); assert.deepEqual([w.kind, w.date, w.date_to, w.title_hi], ['window', '2026-12-01', '2027-01-05', 'गेहूं की देर से बुवाई']); assert.ok(!EVENTS.some((e) => e.id === 'win-wheat-timely'), 'no timely-sowing countdown')
  const crops = ['गेहूं', 'सरसों']
  for (const c of crops) assert.ok(Object.values(FIXTURE_CROP_HI).includes(c), c) // the site's own spellings
  assert.ok(!seededStrings().some((s) => /गेहुँ|सरसोँ|तारीख(?!़)/.test(s.text)), 'the draft spellings (गेहुँ, सरसोँ, तारीख) are not used')
})

test('MSP news: each claimed rise equals the new 2027-28 MSP minus the 2026-27 value in msp-reference.json (fails loudly on a mismatch)', () => {
  const HI_TO_EN = Object.fromEntries(Object.entries(FIXTURE_CROP_HI).map(([en, hi]) => [hi, en]))
  const ref = Object.fromEntries(j('msp-reference.json').entries.filter((e) => e.season_label === 'rabi 2026-27' && e.verified === true).map((e) => [e.crop, e.msp]))
  const m01 = MONEY.find((m) => m.id === 'm01')
  const newMsp = {}
  for (const [name, num] of m01.lines_hi[1].matchAll(/(गेहूं|चना|मसूर|सरसों) ([\d,]+)/g).map((m) => [m[1], m[2]])) newMsp[HI_TO_EN[name]] = Number(num.replace(/,/g, ''))
  assert.deepEqual(Object.keys(newMsp).sort(), ['Gram', 'Lentil', 'Mustard', 'Wheat'])
  assert.deepEqual(newMsp, { Wheat: 2610, Gram: 5958, Lentil: 7390, Mustard: 6613 })
  const text = GYAAN.find((g) => g.id === 'k01').text_hi
  const claimed = {}
  for (const name of Object.keys(HI_TO_EN)) { const m = text.match(new RegExp(`${name}[^+]*\\+₹(\\d+)`)); if (m && ['Wheat', 'Gram', 'Lentil', 'Mustard'].includes(HI_TO_EN[name])) claimed[HI_TO_EN[name]] = Number(m[1]) }
  assert.deepEqual(Object.keys(claimed).sort(), ['Gram', 'Lentil', 'Mustard', 'Wheat'])
  for (const crop of Object.keys(newMsp)) assert.equal(claimed[crop], newMsp[crop] - ref[crop], `${crop}: claimed +${claimed[crop]}, but ${newMsp[crop]} - ${ref[crop]} = ${newMsp[crop] - ref[crop]}`)
  const rises = Object.entries(claimed).sort((a, b) => b[1] - a[1])
  assert.equal(rises[0][0], 'Mustard'); assert.equal(rises.at(-1)[0], 'Wheat'); assert.match(text, /सरसों सबसे ज़्यादा/); assert.match(text, /गेहूं सबसे कम/)
  assert.equal(m01.source_date, '2026-10-01')
})

test('the PM-किसान and फसल बीमा seeds: window, who_hi for card and voice, and the missing last date is null', () => {
  const pm = SCHEMES.find((s) => s.id === 'pm-kisan-24'), fb = SCHEMES.find((s) => s.id === 'pmfby-rabi')
  assert.equal(pm.who_hi, 'पात्र किसान परिवार'); assert.deepEqual([pm.show_from, pm.show_until, pm.source_date], ['2026-11-01', '2026-11-30', '2026-10-30'])
  assert.match(pm.news_hi, /24वीं किस्त 30 अक्तूबर/); assert.equal(fb.title_hi, 'प्रधानमंत्री फसल बीमा योजना'); assert.equal(fb.who_hi, 'फसल बीमा चाहने वाले किसान')
  assert.equal(fb.howto.last_date, '2026-12-31'); assert.equal(fb.verified, true) /* Batch 28: approved by the founder 2026-11-27 on one source */; assert.equal(fb.howto.where_hi, 'बैंक या CSC')
})

// ---- length
test('length: the worst case (6 districts, 4 crops, longest slot, 3 tasks) stays within 1500 and the drop order is unchanged', async () => {
  assert.deepEqual(DROP_STEPS, ['slot', 'weatherNext', 'rujhan', 'task3', 'crop4']); assert.equal(TARGET_CHARS, 1200); assert.equal(HARD_CHARS, 1500)
  const long = (n) => `${'वाक्य '.repeat(Math.ceil(n / 6))}`.slice(0, n)
  const data = {
    ...DATA,
    lines: { ...DATA.lines, kahawat: [1, 2, 3, 4].map((n) => ({ id: `kx${n}`, text_hi: long(130), meaning_hi: long(130), source_name: long(60), reviewed: true })) },
    cropCalendar: { ...CAL, sowing_dates: { ...CAL.sowing_dates, reviewed: true }, stages: CAL.stages.map((x) => ({ ...x, reviewed: true })), static: [{ id: 'sx', from: '2026-10-01', to: '2026-12-31', text_hi: long(140), reviewed: true }] },
  }
  const fx = loadFixture('rain-f4')
  const r = await generate({ date: fx.date, data, nowIso: fx.nowIso, env: {}, loaders: { weather: fx.weatherLoader, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }), districts: districtLoader('heavy') } })
  assert.equal(r.model.slot.kind, 'kahawat'); assert.equal(r.model.tasks.length, 3); assert.equal(r.model.districts.length, 6); assert.ok(r.model.slot.lines.join('\n').length > 300, 'the slot is long')
  assert.ok(r.message.length <= HARD_CHARS, `${r.message.length} characters`); assert.deepEqual(r.violations, [])
  const order = ['districts', ...DROP_STEPS]
  assert.deepEqual(r.compose.dropped, order.slice(0, r.compose.dropped.length), `dropped in the documented order: ${r.compose.dropped}`)
  // force the whole chain: a model so long that every step is needed, still in order
  const huge = { ...r.model, slot: { kind: 'kahawat', lines: ['x', long(1200)], usedUnreviewed: [] } }
  const c = compose(huge); assert.deepEqual(c.dropped, order.slice(0, c.dropped.length)); assert.ok(c.dropped.includes('slot'))
})

test('length: the seven sample days with every seed shown (--draft) are within 1500 characters and pass lint', async () => {
  for (let i = 0; i < 7; i++) {
    const date = addDays('2026-11-08', i)
    const fx = loadFixture('normal', date)
    const r = await generate({ date, draft: true, data: DATA, nowIso: `${date}T01:00:00Z`, env: {}, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
    assert.ok(r.message.length <= HARD_CHARS, `${date}: ${r.message.length}`); assert.deepEqual(r.violations, [], date)
  }
})

// ---- workflow
test('workflow: exactly one MORNING_CONTENT line, right after MORNING_DISTRICTS; the four cron lines and everything else are unchanged', () => {
  const y = crlf(readFileSync('.github/workflows/morning-post.yml', 'utf8')).split('\n')
  const idx = y.findIndex((l) => l.includes('MORNING_DISTRICTS'))
  assert.equal(y.filter((l) => l.includes('MORNING_CONTENT')).length, 1)
  assert.equal(y[idx + 1], '          MORNING_CONTENT: ${{ vars.MORNING_CONTENT }}')
  assert.deepEqual(y.filter((l) => l.includes('cron:')), ["    - cron: '37 19 * * *'   # 01:07 IST", "    - cron: '47 20 * * *'   # 02:17 IST", "    - cron: '47 21 * * *'   # 03:17 IST", "    - cron: '37 22 * * *'   # 04:07 IST"])
  try { // against the Batch 20 merge, when the history is there: only that one line differs
    const before = crlf(execFileSync('git', ['show', 'b41e568:.github/workflows/morning-post.yml'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).split('\n')
    assert.deepEqual(y.filter((l, i) => i !== idx + 1), before)
  } catch (e) { if (e.name === 'AssertionError') throw e }
})

// ---- Hindi only in strings.hi.js and data files
test('Hindi lives only in strings.hi.js and data/morning/*.json: none in the logic files (extended to content.js, workRules.js, poll.js and the new tool)', () => {
  for (const f of ['scripts/morning/lib/content.js', 'scripts/morning/lib/workRules.js', 'scripts/morning/lib/poll.js', 'scripts/morning/lib/compose.js', 'scripts/morning/lib/generate.js', 'scripts/morning/content-status.mjs', 'scripts/morning/poll-result.mjs']) {
    const code = readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
    assert.ok(!/[ऀ-ॿ]/.test(code), `${f} has Devanagari outside comments`)
  }
  for (const k of ['slotUpcoming', 'slotMoney', 'slotKnow', 'slotHowto', 'upcomingWindow', 'upcomingEvent', 'upcomingEventRange', 'schemeNews', 'schemeAction', 'sourceWithDate', 'howtoPremium', 'howtoCarry', 'howtoWhere', 'howtoLast']) assert.ok(S[k], k)
  assert.equal(S.slotUpcoming, '⏳ *अब आगे क्या?*'); assert.equal(S.slotMoney, '💰 *पैसे से जुड़ा एक तथ्य*'); assert.equal(S.slotKnow, '❓ *क्या आप जानते हैं?*'); assert.equal(S.slotHowto, '📝 *ऐसे करें आवेदन*')
  assert.equal(S.upcomingWindow, '{title}: {days} दिन बाकी ({date} तक)'); assert.equal(S.upcomingEvent, '{title}: {days} दिन बाद ({date})'); assert.equal(S.upcomingEventRange, '{title}: {days} दिन बाद ({date} से {date2})')
  assert.equal(S.schemeNews, '{title} - {news}'); assert.equal(S.schemeAction, '{action}'); assert.equal(S.sourceWithDate, 'स्रोत: {source}, {date}')
  assert.equal(S.howtoCarry, 'साथ ले जाएँ: {docs}'); assert.equal(S.howtoWhere, 'जहाँ: {where}'); assert.equal(S.howtoLast, 'आख़िरी तारीख़: {date}')
  assert.ok(/["' ]जी["' ,]/.test(readFileSync('scripts/morning/strings.hi.js', 'utf8').replace(/\/\/.*$/gm, '')) === false)
})

// ---- the rehearsal tool
test('npm run morning:content: counts per data file and a day table with BLOCKED markers; read-only, fixture weather only', async () => {
  const counts = fileCounts(OLD)
  const byName = Object.fromEntries(counts.map((c) => [c.name, c]))
  assert.deepEqual([byName['events.json'].total, byName['events.json'].reviewed, byName['events.json'].unreviewed], [13, 0, 13])
  assert.equal(byName['crop-calendar.json'].total, 7); assert.equal(byName['lines.json (kahawat)'].total, 12); assert.equal(byName['gyaan.json'].total, 13)
  const rows = await statusRows({ from: '2026-11-09', days: 7, data: OLD, env: {} })
  assert.equal(rows.length, 7); assert.deepEqual(rows.map((r) => r.date), Array.from({ length: 7 }, (_, i) => addDays('2026-11-09', i)))
  for (const r of rows) assert.match(r.task, r.date < '2026-11-15' ? /fallback:sowing_season \[BLOCKED \(unreviewed\): calendar:(irr\d|s0\d)\]/ : /none \[BLOCKED \(unreviewed\): calendar:(irr\d|s0\d)\]/, 'the old sowing rule runs only until the banner date (15 Nov)')
  assert.ok(rows[1].slot.includes('BLOCKED (unreviewed:') && rows[1].slot.includes('upcoming'))
  assert.match(rows[4].slot, /^none \[BLOCKED \(unreviewed: .*\): upcoming\]$/, 'Friday: the how-to is not even offered as a draft (last date unknown)')
  const reviewed = { ...OLD, events: EVENTS.map((e) => ({ ...e, reviewed: true })), cropCalendar: { ...CAL, sowing_dates: { ...CAL.sowing_dates, reviewed: true }, stages: CAL.stages.map((x) => ({ ...x, reviewed: true })), static: CAL.static.map((x) => ({ ...x, reviewed: true })), rain_hold: { ...CAL.rain_hold, reviewed: true } } }
  const ok = await statusRows({ from: '2026-11-10', days: 1, data: reviewed, env: {} })
  assert.match(ok[0].task, /^calendar:(irr\d|s0\d)$/); assert.equal(ok[0].slot, 'upcoming')
  const lines = []; const log = console.log; console.log = (...a) => lines.push(a.join(' '))
  try { await statusMain(['--from', '2026-11-09', '--days', '2'], {}) } finally { console.log = log }
  assert.ok(lines.some((l) => l.startsWith('events.json')) && lines.some((l) => l.startsWith('2026-11-10')))
  await assert.rejects(() => statusMain(['--from', 'nope']), /bad --from/); await assert.rejects(() => statusMain(['--days', '0']), /bad --days/)
})

test('npm run morning -- --draft --fixtures normal --date 2026-11-11 still works and never needs the network', () => {
  const out = mkdtempSync(join(tmpdir(), 'morning21-'))
  const res = execFileSync(process.execPath, ['scripts/morning/run.mjs', '--draft', '--fixtures', 'normal', '--date', '2026-11-11', '--no-image', '--out', out], { encoding: 'utf8', env: { ...process.env, MORNING_CONTENT: '' } })
  assert.ok(existsSync(join(out, 'message.txt'))); const m = readFileSync(join(out, 'message.txt'), 'utf8')
  assert.ok(m.startsWith(S.greeting)); assert.deepEqual(lint(m), []); assert.ok(typeof res === 'string')
  assert.match(m, /⏳ \*अब आगे क्या\?\*/, 'one money fact shows once in 4 weeks (not on 11 Nov), so Wednesday falls back to the upcoming list')
})

// ---- card and voice with the new slot kinds
let browser
after(async () => { if (browser) await browser.close() })
const rev = (a) => a.map((x) => ({ ...x, reviewed: true }))
const four = (item) => Array.from({ length: 4 }, (_, i) => ({ ...item, id: `${item.id}-${i}` })) // a full pool is not throttled
const pmNews = SCHEMES.find((s) => s.id === 'pm-kisan-24'), pmfby = SCHEMES.find((s) => s.id === 'pmfby-rabi')
const withData = (over) => ({
  ...DATA, schemes: [], events: rev(EVENTS), moneyFacts: [], gyaan: [], lines: { ...DATA.lines, kahawat: [] },
  cropCalendar: { ...CAL, sowing_dates: { ...CAL.sowing_dates, reviewed: true }, stages: CAL.stages.map((x) => ({ ...x, reviewed: true })), static: CAL.static.map((x) => ({ ...x, reviewed: true })), rain_hold: { ...CAL.rain_hold, reviewed: true } }, ...over,
})
const CASES = [
  ['news (Mon)', 'scheme', '2026-11-09', { schemes: four({ ...pmNews, verified: true }) }],
  ['scheme, old form (Mon)', 'scheme', '2026-12-07', { schemes: four({ ...pmfby, verified: true }) }],
  ['upcoming (Tue)', 'upcoming', '2026-11-10', {}],
  ['money (Wed)', 'money', '2026-11-11', { moneyFacts: four({ ...MONEY[0], reviewed: true }) }],
  ['know (Thu)', 'know', '2026-11-12', { gyaan: four({ ...GYAAN.find((g) => g.id === 'k01'), reviewed: true }) }],
  ['howto (Fri)', 'howto', '2026-12-04', { schemes: four({ ...pmfby, verified: true }) }], // Batch 28: the real pmfby-rabi entry, with its real last date (31 Dec); the dates are inside its 45-day window
  ['kahawat (Sat)', 'kahawat', '2026-11-14', { lines: { ...DATA.lines, kahawat: rev(LINES.kahawat) } }],
]
for (const [label, kind, date, over] of CASES) {
  test(`card and voice with the new slot kind: ${label}: the card does not overflow and the voice script is unchanged`, async () => {
    browser ||= await chromium.launch()
    const fx = loadFixture('normal', date)
    const r = await generate({ date, data: withData(over), nowIso: `${date}T01:00:00Z`, env: {}, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }), districts: districtLoader('all-dry') } })
    assert.equal(r.model.slot.kind, kind)
    const card = cardData(r.model)
    assert.ok(card.scheme && card.scheme.body, 'the card has its info box')
    const { overflow } = await renderCard(card, { browser })
    assert.deepEqual(overflow, [])
    const withSlot = buildVoiceScript(r.model), without = buildVoiceScript({ ...r.model, slot: null })
    if (kind === 'scheme') assert.match(withSlot.text, /आज की योजना है/)
    else assert.equal(withSlot.text, without.text, 'a new kind does not change the voice script (no speech, no new length)')
    assert.equal(withSlot.sha256 === without.sha256, kind !== 'scheme')
  })
}

test('card data: know and kahawat fill the tip box exactly as gyaan and kahawat did; upcoming, money and howto leave the card as it was', () => {
  const m = { slot: { kind: 'know', lines: ['h', 'ज्ञान का वाक्य', 'स्रोत'] }, tasks: ['काम एक', 'काम दो'], districts: null, weather: null, mandi: null, date: '2026-11-12' }
  assert.equal(cardData(m).tip.body, 'ज्ञान का वाक्य'); assert.equal(cardData({ ...m, slot: { kind: 'kahawat', lines: ['h', 'कहावत', 'मतलब'] } }).tip.body, 'कहावत')
  const none = cardData({ ...m, slot: null })
  for (const kind of ['upcoming', 'money', 'howto']) { const c = cardData({ ...m, slot: { kind, lines: ['h', 'x'] } }); assert.deepEqual([c.scheme, c.tip], [none.scheme, none.tip], kind) }
})
