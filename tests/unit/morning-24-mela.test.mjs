// Batch 24 - the "किसान मेला" section (its own heading, any weekday) and today's festival greeting from the approved events.
// Uses the REAL data/morning/events.json for the founder's cases and small in-test data for the gates.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { melaItems, pickMela, festivalToday, upcomingItems, MELA_WINDOW_DAYS, MELA_MAX } from '../../scripts/morning/lib/content.js'
import { compose, lint, HARD_CHARS, DROP_STEPS } from '../../scripts/morning/lib/compose.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture } from '../../scripts/morning/fixtures.js'
import { S } from '../../scripts/morning/strings.hi.js'

const DATA = loadData()
const day = async (date, { env = {}, draft = false, data = DATA } = {}) => {
  const fx = loadFixture('normal', date)
  return generate({ date, draft, data, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, nowIso: `${date}T01:00:00Z`, env })
}
const fair = (n, o = {}) => ({ id: `f${n}`, kind: 'fair', title_hi: `मेला${n}`, date: '2027-01-09', date_to: '2027-01-11', place_hi: 'इंदौर', scope: 'near', reviewed: true, ...o })

test('24 Nov 2026 (Tuesday): the fairs have their own heading, in Hindi, soonest first; the upcoming list no longer holds them; festival greeting shows', async () => {
  const r = await day('2026-11-24')
  const lines = r.message.split('\n')
  const i = lines.indexOf(S.slotMela)
  assert.ok(i > 0, 'the heading is there')
  assert.equal(lines[i + 1], 'भारत एग्री टेक: 46 दिन बाद (9 जनवरी से 11 जनवरी) · इंदौर')
  assert.equal(lines[i + 2], 'फार्म-टेक इंडिया: 82 दिन बाद (14 फ़रवरी से 16 फ़रवरी) · भोपाल')
  const up = lines.indexOf(S.slotUpcoming)
  assert.ok(up > 0 && up < i, 'the upcoming list comes first and its text has no fair')
  assert.ok(!lines.slice(up, i).some((l) => /भारत एग्री|फार्म-टेक|Agri Tech|Farm-Tech/.test(l)))
  assert.ok(r.message.includes('🎉 आज *कार्तिक पूर्णिमा* है'))
  assert.ok(r.report.includes('festival: कार्तिक पूर्णिमा (from events.json)'))
  assert.ok(r.report.includes('mela: 2 shown (fair-bharat-agri-tech, fair-farmtech-bhopal)'))
  assert.deepEqual(lint(r.message), []); assert.ok(r.message.length <= HARD_CHARS)
})

test('the fair section shows on EVERY weekday, not only Tuesday', async () => {
  for (const d of ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30']) {
    const r = await day(d)
    assert.ok(r.message.includes(S.slotMela), d); assert.deepEqual(lint(r.message), [], d); assert.ok(r.message.length <= HARD_CHARS, d)
  }
})

test('window: shown from 90 days before the first day, running on the day, gone the day after the last day', () => {
  const data = { events: [fair(1)] }
  assert.equal(MELA_WINDOW_DAYS, 90)
  assert.equal(melaItems('2026-10-11', data, false).length, 1, '90 days before')
  assert.equal(melaItems('2026-10-10', data, false).length, 0, '91 days before')
  assert.equal(melaItems('2027-01-08', data, false)[0].text, 'मेला1: 1 दिन बाद (9 जनवरी से 11 जनवरी) · इंदौर')
  assert.equal(melaItems('2027-01-09', data, false)[0].text, 'मेला1: आज चल रहा है (11 जनवरी तक) · इंदौर')
  assert.equal(melaItems('2027-01-11', data, false)[0].text, 'मेला1: आज चल रहा है (11 जनवरी तक) · इंदौर')
  assert.equal(melaItems('2027-01-12', data, false).length, 0)
  const one = { events: [fair(2, { date_to: undefined, date: '2027-01-09' })] }
  assert.equal(melaItems('2027-01-01', one, false)[0].text, 'मेला2: 8 दिन बाद (9 जनवरी) · इंदौर')
})

test('at most 2 lines, nearest first; far and unreviewed fairs never show without --draft; --draft shows unreviewed and lists them', () => {
  const data = { events: [fair(1, { date: '2027-01-20', date_to: '2027-01-21' }), fair(2, { date: '2027-01-10' }), fair(3, { date: '2027-01-15' }), fair(4, { scope: 'far' }), fair(5, { reviewed: false })] }
  assert.equal(MELA_MAX, 2)
  assert.deepEqual(melaItems('2027-01-05', data, false).map((x) => x.id), ['f2', 'f3'])
  assert.ok(!melaItems('2027-01-05', data, false).some((x) => ['f4', 'f5'].includes(x.id)))
  const m = pickMela('2027-01-05', { draft: true, data: { events: [fair(5, { reviewed: false })] }, env: {} })
  assert.deepEqual(m.usedUnreviewed, ['f5']); assert.equal(m.lines[0], S.slotMela)
  assert.equal(pickMela('2027-01-05', { data: { events: [fair(5, { reviewed: false })] }, env: {} }), null)
})

test('upcoming list never holds a fair any more; festivals and windows still show', () => {
  const data = { events: [fair(1), { id: 'w', kind: 'window', title_hi: 'खिड़की', date: '2026-12-01', date_to: '2027-01-05', scope: 'near', reviewed: true }, { id: 'v', kind: 'festival', title_hi: 'पर्व', date: '2026-12-10', scope: 'near', reviewed: true }] }
  assert.deepEqual(upcomingItems('2026-11-24', data, false).map((x) => x.id), ['w', 'v'])
})

test('festival from events.json: only the day itself, reviewed and near; festivals.json still wins; far (Chhath) never', () => {
  assert.equal(festivalToday('2026-11-24', DATA, false).festival.name_hi, 'कार्तिक पूर्णिमा')
  assert.equal(festivalToday('2026-11-23', DATA, false), null)
  assert.equal(festivalToday('2026-11-15', DATA, true), null, 'Chhath is far, even with --draft')
  assert.equal(festivalToday('2026-11-08', DATA, false).festival.name_hi, 'दीपावली')
})

test('over the hard limit: the fair section is the LAST thing dropped, and the report names it', async () => {
  const r = await day('2026-11-24')
  const big = { ...r.model, tasks: ['क'.repeat(700), 'ख'.repeat(700), 'ग'.repeat(700)] }
  const c = compose(big)
  assert.equal(c.dropped[c.dropped.length - 1], 'mela')
  assert.deepEqual(c.dropped, [...DROP_STEPS, 'mela'], 'the old order first, the fair section last')
  assert.ok(!c.text.includes(S.slotMela))
  const ok = compose(r.model)
  assert.ok(ok.text.includes(S.slotMela) && !ok.dropped.includes('mela'), 'a normal day keeps it')
})

test('KILL SWITCH MORNING_CONTENT=off: no fair section, no festival from events.json (the old post)', async () => {
  const r = await day('2026-11-24', { env: { MORNING_CONTENT: 'off' } })
  assert.ok(!r.message.includes(S.slotMela)); assert.ok(!r.message.includes('कार्तिक पूर्णिमा'))
  assert.ok(r.report.includes('mela: OFF')); assert.ok(r.report.includes('festival: none'))
  assert.equal(pickMela('2026-11-24', { data: DATA, env: { MORNING_CONTENT: ' OFF ' } }), null)
})

test('the card and the voice read the rotating slot only: the fair section is not in model.slot', async () => {
  const r = await day('2026-11-24')
  assert.ok(r.model.mela && r.model.mela.ids.length === 2)
  assert.ok(!r.model.slot || !r.model.slot.lines.join('\n').includes(S.slotMela))
})

test('data: the two near fairs have Hindi titles and keep their English name in name_en; every fair has name_en', () => {
  const byId = Object.fromEntries(DATA.events.map((e) => [e.id, e]))
  assert.equal(byId['fair-bharat-agri-tech'].title_hi, 'भारत एग्री टेक'); assert.equal(byId['fair-bharat-agri-tech'].name_en, 'Bharat Agri Tech')
  assert.equal(byId['fair-farmtech-bhopal'].title_hi, 'फार्म-टेक इंडिया'); assert.equal(byId['fair-farmtech-bhopal'].name_en, 'Farm-Tech India')
  for (const e of DATA.events.filter((x) => x.kind === 'fair')) assert.ok(e.name_en, e.id)
})
