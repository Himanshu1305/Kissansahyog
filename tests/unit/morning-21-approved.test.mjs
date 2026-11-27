// Batch 21D - what the founder approved on 2026-11-10 is live-eligible; the exceptions are still blocked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pickSlot } from '../../scripts/morning/lib/content.js'
import { pickCalendarLine } from '../../scripts/morning/lib/workRules.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { lint } from '../../scripts/morning/lib/compose.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'
import { addDays, weekday } from '../../scripts/morning/lib/ist.js'
import { S } from '../../scripts/morning/strings.hi.js'

const DATA = loadData()
const j = (f) => JSON.parse(readFileSync(`data/morning/${f}`, 'utf8'))
const AP = 'founder, 2026-11-10'
const live = (date, over = {}) => pickSlot(date, { data: DATA, env: {}, ...over })

test('approved: calendar (sowing_dates, irr1-irr3, s01, s02, rain_hold), near events, m01, k01 and g01-g12, pm-kisan-24, kcc, 11 kahawats', () => {
  const c = DATA.cropCalendar
  for (const x of [c.sowing_dates, ...c.stages, ...c.static, c.rain_hold]) { assert.equal(x.reviewed, true); assert.equal(x.approved_by, AP) }
  assert.deepEqual([...c.stages.map((x) => x.id), ...c.static.map((x) => x.id)], ['irr1', 'irr2', 'irr3', 's01', 's02'])
  for (const e of DATA.events) { assert.equal(e.reviewed, e.scope === 'near', e.id); assert.equal(e.approved_by, e.scope === 'near' ? AP : undefined) }
  assert.equal(DATA.events.filter((e) => e.scope === 'near').length, 9); assert.equal(DATA.events.filter((e) => e.scope === 'far').length, 4)
  assert.equal(DATA.moneyFacts[0].reviewed, true)
  for (const g of DATA.gyaan) { assert.equal(g.reviewed, true, g.id); assert.equal(g.approved_by, AP) }
  assert.equal(DATA.gyaan.length, 13)
  const sv = Object.fromEntries(DATA.schemes.map((s) => [s.id, s.verified]))
  assert.deepEqual(sv, { 'pm-kisan': false, pmfby: false, kcc: true, 'pm-kisan-24': true, 'pmfby-rabi': true })
  const kh = DATA.lines.kahawat
  assert.equal(kh.length, 12)
  for (const k of kh) { if (k.id === 'k06') continue; assert.equal(k.reviewed, true, k.id); assert.equal(k.wording_checked, true, k.id); assert.equal(k.approved_by, AP) }
})

test('the exceptions: pm-kisan and pmfby stay unverified (pmfby-rabi was approved 2026-11-27, Batch 28); the OCR kahawat k06 stays unreviewed', () => {
  for (const id of ['pm-kisan', 'pmfby']) assert.equal(DATA.schemes.find((s) => s.id === id).verified, false, id)
  const k6 = DATA.lines.kahawat.find((k) => k.id === 'k06')
  assert.match(k6.text_hi, /^उत्तर चमकै बीजुरी/); assert.equal(k6.reviewed, false); assert.equal(k6.wording_checked, false)
  assert.deepEqual(j('tips.json').map((t) => t.reviewed), [false, false, false, false])
})

test('KCC and Bharat Agri Tech facts as researched; KCC text has no limit figure and no banned word', () => {
  const k = DATA.schemes.find((s) => s.id === 'kcc')
  assert.equal(k.news_hi, 'फसल कर्ज़ KCC से 7% ब्याज पर; समय पर चुकाने पर 3% की छूट, यानी 4%'); assert.equal(k.action_hi, 'अपने बैंक या सहकारी समिति से KCC के बारे में पूछें')
  assert.deepEqual([k.source_name, k.source_date, k.last_checked, k.verified], ['पीआईबी (भारत सरकार)', '2026-03-30', '2026-11-10', true]); assert.match(k.source_url, /PRID=2246855/)
  assert.deepEqual([k.title_hi, k.who_hi], ['किसान क्रेडिट कार्ड', 'खेती करने वाले किसान'])
  const all = JSON.stringify([k.news_hi, k.action_hi, k.title_hi, k.who_hi])
  assert.ok(!/गारंटी|लाख|3 lakh/.test(all)); assert.deepEqual(lint(`${S.greeting}\n${k.news_hi}\n${k.action_hi}`), [])
  assert.match(k.note, /limit is NOT shown/)
  const b = DATA.events.find((e) => e.id === 'fair-bharat-agri-tech')
  assert.deepEqual([b.date, b.date_to, b.place_hi, b.source_url, b.scope], ['2027-01-09', '2027-01-11', 'इंदौर', 'https://bharatagritech.org', 'near']); assert.match(b.note, /8th edition, 9-11 Jan 2027/)
})

test('live gate with the approvals: every weekday has what it should on a real sample week (no --draft)', () => {
  const days = Array.from({ length: 7 }, (_, i) => addDays('2026-11-11', i)) // Wed 11 .. Tue 17
  const kinds = days.map((d) => { const s = live(d); return s ? s.kind : 'none' })
  console.log(`slots 11-17 Nov: ${kinds.join(', ')}`)
  assert.equal(live('2026-11-12').kind, 'know'); assert.equal(live('2026-11-14').kind, 'kahawat'); assert.equal(live('2026-11-17').kind, 'upcoming')
  assert.ok(live('2026-11-12').usedUnreviewed.length === 0 && live('2026-11-17').usedUnreviewed.length === 0)
  // Monday: two verified schemes (pm-kisan-24, kcc) = a thin pool, shown 2 weeks in 4; other weeks fall back to the upcoming list
  const mondays = Array.from({ length: 8 }, (_, i) => live(addDays('2026-11-16', 7 * i))).filter((x) => x && x.kind === 'scheme')
  assert.ok(mondays.length >= 2 && mondays.length < 8, 'a thin pool: some Mondays show a scheme, the others fall back (pm-kisan-24 leaves the pool after 30 Nov)'); assert.ok(mondays.every((m) => ['pm-kisan-24', 'kcc', 'pmfby-rabi'].includes(m.scheme.id)))
})

test('Batch 28: the Friday how-to shows the approved pmfby-rabi last date (31 Dec 2026) on the Fridays up to it, and never after it', () => {
  for (const d of ['2026-11-27', '2026-12-04', '2026-12-11', '2026-12-18', '2026-12-25']) { const s = live(d); assert.ok(s && s.kind === 'howto', d); assert.ok(s.lines.join('\n').includes('31 दिसंबर'), d); assert.deepEqual(s.usedUnreviewed, [], d) }
  for (const d of ['2027-01-01', '2027-01-08', '2027-01-15']) { const s = live(d); assert.ok(!s || s.kind !== 'howto', d) }
})

test('the unconfirmed kahawat never shows; the unverified pm-kisan and pmfby never show on a Monday', () => {
  for (let i = 0; i < 60; i++) {
    const sat = live(addDays('2026-11-14', 7 * i)); if (sat && sat.kind === 'kahawat') assert.ok(!sat.lines.join('\n').includes('उत्तर चमकै'), 'k06')
    const mon = live(addDays('2026-11-16', 7 * i)); if (mon && mon.kind === 'scheme') assert.ok(mon.scheme.id !== 'pm-kisan' && mon.scheme.id !== 'pmfby', mon.scheme.id)
  }
})

test('the calendar line is eligible live on 2026-12-02 and works after the banner date; tasks come from calendar:irrN or a static line', async () => {
  for (const d of ['2026-12-02', '2026-12-05', '2027-01-10']) { const l = pickCalendarLine(DATA.cropCalendar, d); assert.ok(l, d); assert.equal(l.unreviewed, false) }
  const date = '2026-11-14', fx = loadFixture('normal', date)
  const r = await generate({ date, data: DATA, nowIso: `${date}T01:00:00Z`, env: {}, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
  assert.equal(r.taskSource, 'calendar:irr1'); assert.match(r.message, /बोई गेहूं की पहली सिंचाई का समय अब है/); assert.equal(r.warn, null); assert.deepEqual(r.violations, [])
})

test('all seven sample live posts (11-17 Nov, gate on) pass lint and are under 1500 characters', async () => {
  for (let i = 0; i < 7; i++) {
    const date = addDays('2026-11-11', i), fx = loadFixture('normal', date)
    const r = await generate({ date, data: DATA, nowIso: `${date}T01:00:00Z`, env: {}, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
    assert.deepEqual(r.violations, [], date); assert.ok(r.message.length <= 1500, date); assert.equal(r.warn, null, date); assert.equal(weekday(date) >= 0, true)
  }
})
