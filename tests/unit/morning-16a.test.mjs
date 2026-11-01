// Batch 16A - daily morning message generator. Offline: weather and database access are mocked / fixtures.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { istDate, addDays, weekday } from '../../scripts/morning/lib/ist.js'
import { tithiAt } from '../../scripts/morning/lib/tithi.js'
import { pickTasks, sowingOpen } from '../../scripts/morning/lib/workRules.js'
import { chooseDate, summarize, trendHeadline, eligibleCrops } from '../../scripts/morning/lib/mandi.js'
import { mspFor, procurementFor, seasonLabel } from '../../scripts/morning/lib/msp.js'
import { pickSlot, SLOT_BY_WEEKDAY, countdown } from '../../scripts/morning/lib/content.js'
import { pickPoll, yesterdayLine } from '../../scripts/morning/lib/poll.js'
import { compose, lint, tithiLine, KVK_PHONE, HARD_CHARS } from '../../scripts/morning/lib/compose.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { parseOpenMeteo, getForecast, skyGroup } from '../../scripts/morning/lib/weather.js'
import { S } from '../../scripts/morning/strings.hi.js'
import { rainVerdict, toDailyShape } from '../../src/lib/weather/rainVerdict.js'
import { loadFixture, makeRows, FIXTURE_DATE } from '../../scripts/morning/fixtures.js'
import { basketSeries } from '../../src/lib/mandi/basket.js'
import { windowStart } from '../../src/lib/mandi/mspWindow.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { recordResult } from '../../scripts/morning/poll-result.mjs'

const DATA = loadData()
const TODAY = FIXTURE_DATE // 2026-10-25, a Sunday
const YDAY = addDays(TODAY, -1)
// Batch 17B: rain rules read the rain verdict. verdictOf(day) = the verdict from day totals only (no hourly series).
const verdictOf = (d) => rainVerdict({ daily: toDailyShape([d, { ...d, date: addDays(d.date, 1), rainMm: 0, rainProb: 0 }, { ...d, date: addDays(d.date, 2), rainMm: 0, rainProb: 0 }]) })
const pick = (d, ctx = {}) => pickTasks(DATA.workRules, d, { ...ctx, verdict: d ? verdictOf(d) : null })
const day = (o = {}) => ({ date: TODAY, tmin: 18, tmax: 29, rainProb: 10, rainMm: 0, windMax: 10, code: 1, ...o })
const run = (fixture, extra = {}) => {
  const fx = typeof fixture === 'string' ? loadFixture(fixture) : fixture
  return generate({ date: TODAY, data: DATA, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, ...extra })
}

// ---- 4.1 dates
test('IST boundary: 06:00 IST (00:30 UTC) and 00:30 IST next day (19:00 UTC) are the same IST date; 23:59 IST is still the day before', () => {
  assert.equal(istDate(new Date('2026-10-25T00:30:00Z')), '2026-10-25')
  assert.equal(istDate(new Date('2026-10-24T19:00:00Z')), '2026-10-25')
  assert.equal(istDate(new Date('2026-10-24T18:29:00Z')), '2026-10-24')
  assert.equal(addDays('2026-10-25', -1), '2026-10-24')
  assert.equal(weekday('2026-10-25'), 0)
})

// ---- 4.2 tithi: cross-checked with drikpanchang.com (Bhopal, sunrise tithi), see docs/review/batch16a/RECON.md
test('tithi at sunrise matches the published panchang on 6 dates', () => {
  const expect = { '2026-10-24': 13, '2026-10-25': 14, '2026-10-28': 18, '2026-11-05': 26, '2026-11-09': 30, '2026-11-14': 5 }
  for (const [d, n] of Object.entries(expect)) assert.equal(tithiAt(d).n, n, d)
})
test('tithi line: shukla/krishna wording, bold only for ekadashi, purnima, amavasya, never a lunar month name', () => {
  assert.equal(tithiLine(tithiAt('2026-10-25')), 'आज शुक्ल पक्ष की चतुर्दशी')
  assert.equal(tithiLine(tithiAt('2026-11-09')), S.tithiAmavasya)
  assert.equal(tithiLine({ n: 15, paksha: 'shukla', idx: 14 }), S.tithiPoornima)
  assert.equal(tithiLine(tithiAt('2026-11-05')), 'आज *कृष्ण पक्ष की एकादशी*')
  assert.ok(!/कार्तिक|आश्विन/.test(tithiLine(tithiAt('2026-10-25'))))
})

// ---- 4.3 weather
test('weather: parse, hindi sky words, timeout/failure handling (one retry, then null)', async () => {
  const j = { daily: { time: ['2026-10-25', '2026-10-26', '2026-10-27'], temperature_2m_min: [18, 19, 20], temperature_2m_max: [30, 31, 32], precipitation_probability_max: [10, 20, 30], precipitation_sum: [0, 1, 2], wind_speed_10m_max: [8, 9, 10], weather_code: [0, 3, 63] } }
  assert.equal(parseOpenMeteo(j).days.length, 3)
  assert.equal(parseOpenMeteo({}), null)
  assert.equal(S.sky[skyGroup(0)], 'साफ़ आसमान'); assert.equal(S.sky[skyGroup(95)], 'आँधी-बिजली'); assert.equal(S.sky[skyGroup(45)], 'कोहरा')
  let calls = 0
  const flaky = async () => { calls++; if (calls === 1) throw new Error('boom'); return { ok: true, json: async () => j } }
  assert.ok(await getForecast(23.8, 78.7, '2026-10-25', { fetchImpl: flaky }))
  assert.equal(calls, 2)
  calls = 0
  assert.equal(await getForecast(23.8, 78.7, '2026-10-25', { fetchImpl: async () => { calls++; throw new Error('down') } }), null)
  assert.equal(calls, 2)
})

// ---- 4.4 work rules
test('work rules: rain day gives the three rain tasks, in order', () => {
  const r = pick(day({ rainProb: 60, rainMm: 20 }), { sowingOpen: true })
  assert.equal(r.tasks.length, 3); assert.deepEqual(r.fired.slice(0, 3), ['rain_spray', 'rain_cover', 'rain_drain'])
  assert.equal(r.tasks[0], 'दवा-खाद का छिड़काव बारिश रुकने के बाद करें')
  assert.equal(pick(day({ rainMm: 9 })).fired[0], 'rain_spray') // 8 mm for the day also stops spraying (day totals only)
  assert.equal(pick(day({ rainProb: 90, rainMm: 1 })).tasks.length, 0) // a high chance with about 1 mm is not a rain day (Batch 17B)
})
test('work rules: windy, hot and dry, cold, season fallback, none fire, and the three-task cap', () => {
  assert.deepEqual(pick(day({ windMax: 26 })).tasks, ['तेज़ हवा में छिड़काव न करें'])
  assert.deepEqual(pick(day({ tmax: 36, rainProb: 10 })).tasks, ['सिंचाई वाले खेत में नमी जाँचें'])
  assert.equal(pick(day({ tmax: 36, rainMm: 6, rainProb: 60 })).fired.includes('hot_dry'), false) // hot but rain is coming
  assert.deepEqual(pick(day({ tmin: 6 })).fired, ['cold'])
  assert.deepEqual(pick(day(), { sowingOpen: true }).fired, ['sowing_season'])
  assert.equal(pick(day(), { sowingOpen: false }).tasks.length, 0)
  const many = pick(day({ rainProb: 90, rainMm: 30, windMax: 40, tmin: 2 }), { sowingOpen: true })
  assert.equal(many.tasks.length, 3)
  // weather failed: weather rules are skipped, the season rule still works
  assert.deepEqual(pickTasks(DATA.workRules, null, { sowingOpen: true }).fired, ['sowing_season'])
  assert.equal(sowingOpen('2026-10-25', '2026-11-15'), true); assert.equal(sowingOpen('2026-11-15', '2026-11-15'), false); assert.equal(sowingOpen('2026-09-30', '2026-11-15'), false)
})
test('work task texts: generic wording only (no digits, no product names, no doses)', () => {
  for (const r of DATA.workRules.rules) for (const t of r.tasks) assert.ok(!/\d|मि\.ली|ग्राम|किलो|लीटर|यूरिया|डीएपी/.test(t), t)
})

// ---- 4.5 mandi
const FX = loadFixture('normal')
test('mandi: normal day shows up to 4 crops, ordered by mandis reporting, with change and best mandi', () => {
  const pick = chooseDate(FX.rows, YDAY)
  assert.deepEqual(pick, { date: YDAY, isYesterday: true })
  const s = summarize(FX.rows, YDAY)
  assert.equal(s.shown.length, 4)
  for (const it of s.shown) { assert.ok(it.nMandis >= 3); assert.ok(it.delta !== null) }
  assert.ok(s.shown[0].best && s.shown[0].best.price >= s.shown[0].price)
})
test('mandi: parity - the headline price is the latest point of the site\'s own 30-day basket series', () => {
  const s = summarize(FX.rows, YDAY)
  for (const it of s.shown) {
    const site = basketSeries(FX.rows.filter((r) => r.commodity_en === it.crop.mandi_en && r.price_date >= windowStart(30, `${YDAY}T12:00:00Z`) && r.price_date <= YDAY))
    assert.equal(it.price, site.series[site.series.length - 1].price, it.crop.en)
  }
})
test('mandi: missing yesterday falls back to the latest date within 3 days, labelled; nothing within 3 days omits', () => {
  const noY = FX.rows.filter((r) => r.price_date !== YDAY)
  assert.deepEqual(chooseDate(noY, YDAY), { date: addDays(YDAY, -1), isYesterday: false })
  const old = FX.rows.filter((r) => r.price_date <= addDays(YDAY, -3))
  assert.equal(chooseDate(old, YDAY), null)
  assert.equal(chooseDate([], YDAY), null)
})
test('mandi: an outlier (more than 15% in a day) is not shown and is listed as suspect; fewer than 3 mandis skips the crop', () => {
  const rows = FX.rows.map((r) => (r.commodity_en === 'Gram' && r.price_date === YDAY ? { ...r, modal_price: Math.round(r.modal_price * 1.3) } : r))
  const s = summarize(rows, YDAY)
  assert.ok(!s.shown.some((x) => x.crop.en === 'Gram'))
  assert.ok(s.suspect.some((x) => x.crop === 'Gram'))
  const few = FX.rows.filter((r) => !(r.commodity_en === 'Wheat' && r.price_date === YDAY && !['Sagar APMC', 'Khurai APMC'].includes(r.market)))
  const s2 = summarize(few, YDAY)
  assert.ok(!s2.shown.some((x) => x.crop.en === 'Wheat'))
  assert.ok(s2.skipped.some((x) => x.crop === 'Wheat'))
})
test('mandi: eligible crops follow the season; the four rabi crops always qualify', () => {
  const oct = eligibleCrops('2026-10-25').map((c) => c.slug)
  for (const k of ['gehun', 'chana', 'masoor', 'sarson', 'soyabean']) assert.ok(oct.includes(k), k)
  assert.ok(!oct.includes('lahsun'))
  const jul = eligibleCrops('2026-07-10').map((c) => c.slug)
  for (const k of ['gehun', 'chana', 'masoor', 'sarson']) assert.ok(jul.includes(k))
})

// ---- MSP gating
test('MSP: verified entry of the right marketing season only; wrong season or unverified = no comparison', () => {
  assert.equal(seasonLabel('rabi', '2026-10-25'), 'rabi 2026-27'); assert.equal(seasonLabel('kharif', '2026-10-25'), 'kharif 2026-27')
  assert.equal(seasonLabel('rabi', '2027-02-01'), 'rabi 2026-27'); assert.equal(seasonLabel('kharif', '2026-07-01'), 'kharif 2025-26')
  assert.equal(mspFor('Lentil', 'rabi', '2026-10-25', DATA.msp).msp, 7000)
  assert.equal(mspFor('Wheat', 'rabi', '2026-10-25', DATA.msp).msp, 2585) // NOT the 2027-28 value 2610
  assert.equal(mspFor('Lentil', 'rabi', '2026-10-25', []), null)
  assert.equal(mspFor('Lentil', 'rabi', '2026-10-25', [{ crop: 'Lentil', season_label: 'rabi 2027-28', msp: 7390, verified: true }]), null)
  assert.equal(mspFor('Lentil', 'rabi', '2026-10-25', [{ crop: 'Lentil', season_label: 'rabi 2026-27', msp: 7000, verified: false }]), null)
  assert.equal(mspFor('Lentil', 'rabi', '2026-10-25', [{ crop: 'Lentil', season_label: 'rabi 2026-27', msp: 7000 }]), null)
  assert.ok(DATA.msp.every((e) => e.verified === true && e.source_url && /^(kharif|rabi) 20\d\d-\d\d$/.test(e.season_label)))
  assert.ok(!DATA.msp.some((e) => e.season_label.includes('2027-28')))
})
test('MSP lines in the message: gap wording, and the ask-KVK line only when below MSP and no verified window', async () => {
  const r = await run('normal')
  assert.match(r.message, /MSP \(2026-27\) से ₹\d+ नीचे/)
  assert.ok(r.message.includes(`MSP से नीचे है। खरीद की जानकारी KVK सागर (${KVK_PHONE}) या कृषि विभाग से पूछें।`))
  const noMsp = await run('normal', { data: { ...DATA, msp: [] } })
  assert.ok(!noMsp.message.includes('MSP')); assert.ok(!noMsp.message.includes('KVK सागर'))
})
test('procurement line: only with a verified, active window', async () => {
  const win = { crop: 'Gram', state: 'Madhya Pradesh', start: '2026-10-01', end: '2026-12-31', source_url: 'x', verified: true }
  assert.ok(procurementFor('Gram', TODAY, [win]))
  assert.equal(procurementFor('Gram', TODAY, [{ ...win, verified: false }]), null)
  assert.equal(procurementFor('Gram', '2027-01-05', [win]), null)
  assert.equal(procurementFor('Gram', TODAY, [{ ...win, state: 'Punjab' }]), null)
  const r = await run('normal', { data: { ...DATA, procurement: [win] } })
  assert.match(r.message, /सरकारी खरीद चालू: /)
  assert.ok(!r.message.includes('कृषि विभाग से पूछें'))
})

// ---- bhav ka rujhan
test('rujhan: header, one headline crop, separate weather sentence, fixed disclaimer; no prediction words', async () => {
  const up = (n) => Array.from({ length: n }, (_, i) => ({ date: addDays(YDAY, -(n - 1 - i)), price: 5000 + i * 40 }))
  const items = [{ name: 'चना', series: up(5) }, { name: 'गेहूं', series: [{ price: 2600 }, { price: 2610 }, { price: 2600 }] }]
  const top = trendHeadline(items)
  assert.equal(top.item.name, 'चना'); assert.equal(top.direction, 'up')
  assert.equal(trendHeadline([{ name: 'x', series: up(2) }]), null) // fewer than 3 observed days
  const down = trendHeadline([{ name: 'चना', series: [{ price: 5100 }, { price: 5050 }, { price: 5000 }] }])
  assert.equal(down.direction, 'down')
  const r = await run('rainy')
  assert.ok(r.message.includes('📈 *भाव का रुझान*'))
  assert.ok(r.message.includes('(यह रुझान है, पक्की बात नहीं।)'))
  assert.match(r.message, /पिछले 3 दिन (से बढ़ा है|से घटा है|में ऊपर-नीचे रहा है)।/)
  assert.match(r.message, /अगले दो दिन बारिश हो सकती है \(करीब \d+ मिमी तक\)।/)
  assert.ok(!/अंदाज़ा/.test(r.message))
})

// ---- 4.7 rotating slot + review gate
test('weekday rotation: 14 consecutive days follow the table, deterministically; no filler when nothing is usable', async () => {
  const fx = loadFixture('normal')
  const sum = summarize(fx.rows, YDAY)
  const kinds = []
  for (let i = 0; i < 14; i++) {
    const d = addDays('2026-10-26', i) // a Monday
    const a = pickSlot(d, { data: DATA, summary: sum, sowingValidUntil: '2026-11-15' })
    const b = pickSlot(d, { data: DATA, summary: sum, sowingValidUntil: '2026-11-15' })
    assert.deepEqual(a, b)
    kinds.push(a ? a.kind : null)
  }
  // Reviewed content only: schemes/tips/gyaan/kahawat have no reviewed items, so those weekdays fall back to the countdown.
  const exp = { 1: 'countdown', 2: 'countdown', 3: 'countdown', 4: 'countdown', 5: 'countdown', 6: 'countdown', 0: 'recap' }
  kinds.forEach((k, i) => assert.equal(k, exp[weekday(addDays('2026-10-26', i))], `day ${i}`))
  assert.deepEqual(SLOT_BY_WEEKDAY, { 1: 'scheme', 2: 'countdown', 3: 'saving', 4: 'gyaan', 5: 'scheme', 6: 'kahawat', 0: 'recap' })
  // after the sowing window and with nothing else usable the slot is omitted, not filled
  assert.equal(pickSlot('2026-12-01', { data: DATA, summary: null, sowingValidUntil: '2026-11-15' }), null)
})
test('review gate: unreviewed items are excluded by default and used with --draft, which prints a WARNING in the report only', async () => {
  const wed = '2026-10-28', thu = '2026-10-29'
  assert.equal(pickSlot(wed, { data: DATA, sowingValidUntil: '2026-11-15' }).kind, 'countdown')
  const d = pickSlot(wed, { draft: true, data: DATA, sowingValidUntil: '2026-11-15' })
  assert.equal(d.kind, 'saving'); assert.equal(d.usedUnreviewed.length, 1)
  assert.equal(pickSlot(thu, { draft: true, data: DATA, sowingValidUntil: '2026-11-15' }).kind, 'gyaan')
  const r = await generate({ date: wed, draft: true, data: DATA, loaders: { weather: async () => loadFixture('normal').weather, mandi: async () => ({ rows: loadFixture('normal').rows, flag: 'f' }) } })
  assert.match(r.report, /^WARNING: --draft used/)
  assert.ok(!r.message.includes('WARNING'))
  assert.ok(r.report.includes('unreviewed items used: saving:'))
  const clean = await generate({ date: wed, data: DATA, loaders: { weather: async () => null, mandi: async () => { throw new Error('x') } } })
  assert.ok(!clean.report.startsWith('WARNING'))
})
test('scheme slot: unverified schemes never shown; a verified one with a deadline in 45 days is, with its source', () => {
  const sch = [{ id: 's1', title_hi: 'योजना क', who_hi: 'किसान', deadline: '2026-11-20', source_name: 'pmfby.gov.in', verified: true }]
  const s = pickSlot('2026-10-26', { data: { ...DATA, schemes: sch }, sowingValidUntil: '2026-11-15' })
  assert.equal(s.kind, 'scheme'); assert.ok(s.lines.join('\n').includes('स्रोत: pmfby.gov.in')); assert.ok(s.lines.join('\n').includes('25 दिन बाकी'))
  assert.equal(pickSlot('2026-10-26', { data: { ...DATA, schemes: [{ ...sch[0], verified: false }] }, sowingValidUntil: '2026-11-15' }).kind, 'countdown')
  assert.equal(countdown('2026-10-25', '2026-11-15', []).text, 'रबी बुवाई की खिड़की में 21 दिन बाकी')
})

// ---- 4.8 poll
test('poll: deterministic by date, season-aware; yesterday result goes in the greeting block; the CLI helper validates', async () => {
  assert.equal(pickPoll(DATA.polls, '2026-10-25').id, pickPoll(DATA.polls, '2026-10-25').id)
  assert.ok(DATA.polls.length === 12)
  assert.notEqual(pickPoll(DATA.polls, '2026-10-25').id, 'p06b')
  assert.deepEqual(yesterdayLine({ question_id: 'p01', pct: 63.6 }, DATA.polls), { pct: 64, label: 'सिंचाई हो गई' })
  assert.equal(yesterdayLine(null, DATA.polls), null)
  const res = { '2026-10-24': { question_id: 'p01', pct: 64 } }
  const r = await generate({ date: TODAY, data: { ...DATA, pollResults: res }, loaders: { weather: async () => null, mandi: async () => ({ rows: [], flag: 'f' }) } })
  assert.ok(r.message.includes('कल 64% साथियों ने "सिंचाई हो गई" कहा'))
  assert.ok(r.message.indexOf('कल 64%') < r.message.indexOf('🗳️'))
  assert.deepEqual(recordResult({}, '2026-10-24', '64')['2026-10-24'].pct, 64)
  assert.throws(() => recordResult({}, '2026-10-24', '140')); assert.throws(() => recordResult({}, 'nope', '5'))
  assert.ok(r.poll.includes('1. ') && r.poll.startsWith(S.pollFileTitle))
})

// ---- section 5 size caps and drop order
test('message size: normal day under the 1200 target; over the hard limit drops in the documented order, never mid-sentence', async () => {
  const r = await run('normal')
  assert.ok(r.message.length <= 1200, String(r.message.length))
  const fat = { ...r.model, slot: { kind: 'x', lines: ['📘 *x*', 'बहुत लंबी बात '.repeat(60).trim()], usedUnreviewed: [] }, tasks: ['एक काम '.repeat(8).trim(), 'दो काम '.repeat(8).trim(), 'तीन काम '.repeat(8).trim()] }
  const c = compose(fat)
  assert.deepEqual(c.dropped.slice(0, 1), ['slot'])
  assert.ok(c.text.length <= HARD_CHARS || c.dropped.length === 5)
  const huge = compose({ ...r.model, slot: fat.slot, tasks: Array(3).fill('काम '.repeat(120).trim()) })
  assert.deepEqual(huge.dropped, ['slot', 'weatherNext', 'rujhan', 'task3', 'crop4'])
  assert.ok(huge.text.endsWith(S.closing2)) // the closing is always whole
})

// ---- section 6 lint
test('lint: every banned phrase is caught; the fixed disclaimer is allowed; standalone जी and a wrong greeting are caught', () => {
  const ok = `${S.greeting}\n(यह रुझान है, पक्की बात नहीं।)`
  assert.deepEqual(lint(ok), [])
  for (const w of ['बेचें', 'बेच दें', 'बेचना', 'खरीदें', 'रोककर रखें', 'रुकें', 'बढ़ेगा', 'घटेगा', 'गिरेगा', 'चढ़ेगा', 'गारंटी', 'मुफ़्त', 'pilot', 'Under review', 'समीक्षाधीन']) assert.ok(lint(`${S.greeting}\n${w}`).length, w)
  assert.ok(lint(`${S.greeting}\nराम जी नमस्ते`).length)
  assert.deepEqual(lint(`${S.greeting}\nजीवन अच्छा है, जीरा सस्ता है`), [])
  assert.ok(lint('🙏 *सीताराम किसान भाइयो-बहनो जी!*').length)
  assert.ok(lint(`${S.greeting}\nफ़ोन 9876543210`).length)
  assert.ok(lint(`${S.greeting}\n${'क'.repeat(1501)}`).length)
})
test('every fixture and the live-shaped message pass the lint, start with the exact greeting and contain no जी', async () => {
  for (const f of ['normal', 'rainy', 'missing-mandi', 'no-weather']) {
    const r = await run(f)
    assert.deepEqual(r.violations, [], f)
    assert.equal(r.message.split('\n')[0], '🙏 *सीताराम किसान भाइयो-बहनो!*')
    assert.ok(!/(^|[\s,।!?(*])जी($|[\s,।!?)*])/.test(r.message))
    assert.ok(!r.message.includes('USD Vision') && !/Kisan Sahyog Team/.test(r.message))
  }
})
test('no phone number other than the site\'s KVK constant, and the constant is read from the site strings', async () => {
  assert.equal(KVK_PHONE, strings.res_card_offices_1.hi.match(/\d{5}-\d{6}/)[0])
  for (const f of ['normal', 'rainy']) { const m = (await run(f)).message; assert.deepEqual([...m.matchAll(/\d{5}-\d{6}|\b\d{10}\b/g)].map((x) => x[0]).filter((x) => x !== KVK_PHONE), []) }
})

// ---- failure behaviour
test('weather failure omits the weather lines and weather tasks; mandi failure says so; both failing is flagged', async () => {
  const nw = await run('no-weather')
  assert.ok(!nw.message.includes('आज सागर')); assert.ok(nw.message.includes('🛒')); assert.equal(nw.haveWeather, false)
  const nm = await run('missing-mandi')
  assert.ok(nm.message.includes('मंडी के ताज़ा आँकड़े अभी नहीं आए')); assert.ok(!nm.message.includes('भाव का रुझान'))
  const none = await generate({ date: TODAY, data: DATA, loaders: { weather: async () => { throw new Error('x') }, mandi: async () => { throw new Error('y') } } })
  assert.equal(none.haveWeather, false); assert.equal(none.haveMandi, false)
  assert.ok(none.report.includes('mandi: OMITTED'))
})

// ---- strings live in one file; no hard-coded Hindi in logic files
test('no Devanagari text in the logic files (only comments); every phrase lives in scripts/morning/strings.hi.js', () => {
  const dir = new URL('../../scripts/morning/lib/', import.meta.url)
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && x !== 'lintWords.js')) {
    const code = readFileSync(new URL(f, dir), 'utf8').split(/\r?\n/).map((l) => l.replace(/\s\/\/.*$/, '').replace(/^\s*\/\/.*$/, '')).join('\n')
    assert.ok(!/[ऀ-ॿ]/.test(code), `${f} has Devanagari outside comments`)
  }
})

// ---- data files
test('data files: no unverified MSP, festivals only verified, tips cite a site file, 12 gyaan items, parseable', () => {
  assert.ok(DATA.tips.every((t) => t.site_ref)); assert.equal(DATA.gyaan.length, 12)
  assert.ok(DATA.gyaan.every((g) => g.reviewed === false))
  assert.ok(DATA.lines.blessing.every((b) => b.reviewed === true))
  const all = JSON.stringify([DATA.tips, DATA.gyaan, DATA.lines, DATA.polls, DATA.workRules])
  assert.ok(!lintHits(all))
})
function lintHits(s) { return ['बेचें', 'खरीदें', 'बढ़ेगा', 'घटेगा', 'मुफ़्त', 'गारंटी'].some((w) => s.includes(w)) }
