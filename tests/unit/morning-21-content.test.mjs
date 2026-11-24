// Batch 21 - the weekly menu for the rotating slot, the kill switch, the review gate, the thin-pool throttle, Monday/Friday pairing.
// Small in-test data objects are used (not the real seeds) so these tests do not change when a person flips a seed to reviewed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pickSlot, pickThrottled, contentOff, mondayOf, SLOT_BY_WEEKDAY, SLOT_BY_WEEKDAY_V2, upcomingItems, THIN_POOL } from '../../scripts/morning/lib/content.js'
import { pickPoll } from '../../scripts/morning/lib/poll.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture, rainFixtureNames } from '../../scripts/morning/fixtures.js'
import { S } from '../../scripts/morning/strings.hi.js'
import { baseline, crlf, FNAMES } from './helpers/morning18.mjs'
import { OLD_DATA_DIR } from './helpers/contentOff.mjs'
import { addDays } from '../../scripts/morning/lib/ist.js'

const MON = '2026-11-09' // a Monday; the week is Mon 9 .. Sun 15 Nov 2026
const DAYS = Array.from({ length: 7 }, (_, i) => addDays(MON, i)) // Mon..Sun
const sch = (n, o = {}) => ({ id: `s${n}`, title_hi: `योजना${n}`, who_hi: `किसान${n}`, deadline: null, source_name: 'स्रोत', verified: true, ...o })
const howto = (n, last = '2026-12-31') => ({ premium_hi: `प्रीमियम${n}`, docs_hi: 'आधार', where_hi: 'बैंक', last_date: last })
const gy = (n, o = {}) => ({ id: `g${n}`, text_hi: `ज्ञान${n}`, reviewed: true, ...o })
const mf = (n, o = {}) => ({ id: `m${n}`, lines_hi: [`तथ्य${n}`], source_name: 'स्रोत', source_url: 'https://x.test', source_date: '2026-10-01', reviewed: true, show_from: '2026-10-01', show_until: '2026-12-31', ...o })
const kh = (n, o = {}) => ({ id: `k${n}`, text_hi: `कहावत${n}`, meaning_hi: `अर्थ${n}`, source_name: 'प्रचलित कहावत', reviewed: true, ...o })
const ev = (n, o = {}) => ({ id: `e${n}`, kind: 'festival', title_hi: `मेला${n}`, date: addDays(MON, 10 + n), scope: 'near', reviewed: true, ...o })
const pool = (f, n = 5) => Array.from({ length: n }, (_, i) => f(i + 1))
const four = (item) => Array.from({ length: 4 }, (_, i) => ({ ...item, id: `${item.id}-${i}` })) // a full pool (4+) is not throttled; identical text keeps the assertion exact
const RICH = () => ({
  schemes: pool((n) => sch(n, { howto: howto(n) })), events: pool(ev, 3), moneyFacts: pool(mf), gyaan: pool(gy), lines: { kahawat: pool(kh) }, tips: [],
})
const summary = { shown: [{ name: 'चना', price: 5600, delta: 10, history: [{ d: 1, p: 5500 }] }] }

test('kill switch: contentOff reads MORNING_CONTENT like districtsOff (any case, spaces trimmed); anything else is on', () => {
  for (const v of ['off', 'OFF', ' off ', 'Off', '\toff\n']) assert.equal(contentOff({ MORNING_CONTENT: v }), true, JSON.stringify(v))
  for (const v of [undefined, '', 'on', 'false', '0', 'offf', 'no']) assert.equal(contentOff(v === undefined ? {} : { MORNING_CONTENT: v }), false, JSON.stringify(v))
})

test('weekday map: Monday scheme, Tuesday upcoming, Wednesday money, Thursday know, Friday howto, Saturday kahawat, Sunday recap; the old map is kept for the OFF switch', () => {
  assert.deepEqual(SLOT_BY_WEEKDAY_V2, { 1: 'scheme', 2: 'upcoming', 3: 'money', 4: 'know', 5: 'howto', 6: 'kahawat', 0: 'recap' })
  assert.deepEqual(SLOT_BY_WEEKDAY, { 1: 'scheme', 2: 'countdown', 3: 'saving', 4: 'gyaan', 5: 'scheme', 6: 'kahawat', 0: 'recap' })
})

test('headings are the exact founder text for all seven days (reviewed in-test data)', () => {
  const HEAD = ['📋 *योजना की खबर*', '⏳ *अब आगे क्या?*', '💰 *पैसे से जुड़ा एक तथ्य*', '❓ *क्या आप जानते हैं?*', '📝 *ऐसे करें आवेदन*', '🗣️ *आज की कहावत*']
  const KIND = ['scheme', 'upcoming', 'money', 'know', 'howto', 'kahawat']
  const data = RICH()
  for (let i = 0; i < 6; i++) {
    const s = pickSlot(DAYS[i], { data, summary, env: {} })
    assert.ok(s, DAYS[i]); assert.equal(s.kind, KIND[i], DAYS[i]); assert.equal(s.lines[0], HEAD[i], DAYS[i])
  }
  assert.equal(S.slotRecap, '📊 *इस हफ़्ते का हाल*') // Sunday is checked end to end in the next test
})

test('Sunday recap is still automatic (a full generate on a Sunday shows the recap heading)', async () => {
  const fx = loadFixture('normal', '2026-11-08')
  const r = await generate({ date: '2026-11-08', data: loadData(OLD_DATA_DIR), loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, nowIso: '2026-11-08T01:00:00Z', env: {} })
  assert.equal(r.model.slot.kind, 'recap'); assert.match(r.message, /📊 \*इस हफ़्ते का हाल\*/)
})

test('formats: scheme news, how-to, money, know (source only when present), kahawat (meaning and bracketed source)', () => {
  const news = sch(1, { news_hi: 'ख़बर', action_hi: 'काम', source_name: 'समाचार', source_date: '2026-10-30' })
  assert.deepEqual(pickSlot(MON, { data: { schemes: four(news) }, env: {} }).lines, ['📋 *योजना की खबर*', 'योजना1 - ख़बर', 'काम', 'स्रोत: समाचार, 30 अक्टूबर'])
  assert.deepEqual(pickSlot(MON, { data: { schemes: four(sch(1)) }, env: {} }).lines, ['📋 *योजना की खबर*', 'योजना1 - किसान1', 'स्रोत: स्रोत'], 'the old form when there is no news')
  const h = pickSlot(addDays(MON, 4), { data: { schemes: four(sch(1, { howto: howto(1), source_date: '2026-10-01' })) }, env: {} })
  assert.deepEqual(h.lines, ['📝 *ऐसे करें आवेदन*', 'योजना1 - प्रीमियम1', 'साथ ले जाएँ: आधार', 'जहाँ: बैंक', 'आख़िरी तारीख़: 31 दिसंबर', 'स्रोत: स्रोत, 1 अक्टूबर'])
  assert.deepEqual(pickSlot(addDays(MON, 2), { data: { moneyFacts: four(mf(1)) }, env: {} }).lines, ['💰 *पैसे से जुड़ा एक तथ्य*', 'तथ्य1', 'स्रोत: स्रोत, 1 अक्टूबर'])
  assert.deepEqual(pickSlot(addDays(MON, 3), { data: { gyaan: pool(gy, 4) }, env: {} }).lines.length, 2, 'no source line when the item has none')
  const withSrc = pickSlot(addDays(MON, 3), { data: { gyaan: pool((n) => gy(n, { source_name: 'सूत्र', source_date: '2026-10-01' }), 4) }, env: {} })
  assert.equal(withSrc.lines.at(-1), 'स्रोत: सूत्र, 1 अक्टूबर')
  const k = pickSlot(addDays(MON, 5), { data: { lines: { kahawat: pool(kh, 4) } }, env: {} })
  assert.equal(k.lines.length, 4); assert.match(k.lines[2], /^मतलब: अर्थ\d$/); assert.equal(k.lines[3], '(प्रचलित कहावत)')
  const noSrc = pickSlot(addDays(MON, 5), { data: { lines: { kahawat: pool((n) => kh(n, { source_name: undefined }), 4) } }, env: {} })
  assert.equal(noSrc.lines.length, 3)
})

test('review gate: unreviewed items never show without --draft; with --draft they show and are listed for the WARNING', () => {
  const data = {
    schemes: [sch(1, { verified: false, howto: howto(1) })], events: [ev(1, { reviewed: false })], moneyFacts: [mf(1, { reviewed: false })],
    gyaan: pool((n) => gy(n, { reviewed: false }), 4), lines: { kahawat: pool((n) => kh(n, { reviewed: false }), 4) },
  }
  for (let i = 0; i < 6; i++) {
    assert.equal(pickSlot(DAYS[i], { data, env: {} }), null, `live ${DAYS[i]}`)
    const d = pickSlot(DAYS[i], { data, draft: true, env: {} })
    assert.ok(d && d.usedUnreviewed.length >= 1, `draft ${DAYS[i]}`)
  }
})

test('review gate end to end: --draft lists the unreviewed ids in the WARNING, a live run lists none', async () => {
  const date = '2026-11-12' // Thursday: know
  const fx = loadFixture('normal', date)
  const loaders = { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }
  const data = { ...loadData(OLD_DATA_DIR), gyaan: pool((n) => gy(n, { reviewed: false }), 4) }
  const live = await generate({ date, data, loaders, nowIso: `${date}T01:00:00Z`, env: {} })
  assert.ok(!live.message.includes('ज्ञान'), 'not shown live'); assert.equal(live.warn, null)
  const draft = await generate({ date, data, loaders, draft: true, nowIso: `${date}T01:00:00Z`, env: {} })
  assert.match(draft.message, /❓ \*क्या आप जानते हैं\?\*\nज्ञान\d/); assert.match(draft.warn, /WARNING: --draft used \d+ UNREVIEWED item\(s\): .*know:g\d/)
})

test('fallback chain: the wanted kind, then upcoming, then no slot', () => {
  const thu = addDays(MON, 3)
  assert.equal(pickSlot(thu, { data: { gyaan: [], events: [ev(1)] }, env: {} }).kind, 'upcoming')
  assert.equal(pickSlot(thu, { data: { gyaan: [], events: [] }, env: {} }), null, 'nothing eligible: no slot, no filler')
  assert.equal(pickSlot(addDays(MON, 1), { data: { events: [] }, env: {} }), null)
})

// ---- upcoming (Tuesday)
test('upcoming: nearest 1-3, soonest first; far scope, past, today and unreviewed are left out; windows count to date_to; place appended', () => {
  const today = addDays(MON, 1)
  const data = {
    events: [
      ev(1, { title_hi: 'दूर', date: addDays(today, 30) }),
      ev(2, { title_hi: 'पास', date: addDays(today, 3) }),
      ev(3, { title_hi: 'आज', date: today }),
      ev(4, { title_hi: 'बीता', date: addDays(today, -2) }),
      ev(5, { title_hi: 'बाहर', date: addDays(today, 2), scope: 'far' }),
      ev(6, { title_hi: 'अनरिव्यू', date: addDays(today, 1), reviewed: false }),
      ev(7, { kind: 'window', title_hi: 'खिड़की', date: addDays(today, -5), date_to: addDays(today, 8) }),
      ev(8, { title_hi: 'मेला', date: addDays(today, 6), date_to: addDays(today, 8), place_hi: 'इंदौर' }),
      ev(9, { kind: 'window', title_hi: 'खत्म आज', date: addDays(today, -5), date_to: today }),
    ],
    schemes: [sch(1, { deadline: addDays(today, 4) })],
  }
  const items = upcomingItems(today, data, false).map((i) => i.id)
  assert.deepEqual(items, ['e2', 's1', 'e8'], 'e2 (3 days), the verified scheme deadline (4), e8 (6); e7 window is 8 days so it is the 4th and cut')
  const lines = pickSlot(today, { data, env: {} }).lines
  assert.equal(lines[0], '⏳ *अब आगे क्या?*')
  assert.equal(lines[1], 'पास: 3 दिन बाद (13 नवंबर)')
  assert.match(lines[2], /^योजना1: 4 दिन बाकी \(14 नवंबर तक\)$/)
  assert.equal(lines[3], 'मेला: 6 दिन बाद (16 नवंबर से 18 नवंबर) · इंदौर')
  const win = upcomingItems(today, { events: [data.events[6]] }, false)[0]
  assert.equal(win.text, `खिड़की: 8 दिन बाकी (${addDays(today, 8).slice(8).replace(/^0/, '')} नवंबर तक)`)
  assert.equal(upcomingItems(today, { events: [data.events[8]] }, false).length, 0, 'a window ending today has 0 days left: not shown')
})

test('upcoming does NOT add the old banner sowing countdown in the new path (it would contradict the irrigated window)', () => {
  const s = pickSlot(addDays(MON, 1), { data: { events: [] }, sowingValidUntil: '2026-11-15', env: {} })
  assert.equal(s, null)
  const old = pickSlot(addDays(MON, 1), { data: { schemes: [], events: [] }, sowingValidUntil: '2026-11-15', env: { MORNING_CONTENT: 'off' } })
  assert.equal(old.kind, 'countdown'); assert.match(old.lines[0], /रबी बुवाई की खिड़की में 5 दिन बाकी/)
})

// ---- money and scheme windows
test('money and scheme show_from / show_until: items outside their window are not eligible', () => {
  const wed = addDays(MON, 2)
  assert.equal(pickSlot(wed, { data: { moneyFacts: four(mf(1, { show_until: addDays(wed, -1) })) }, env: {} }), null)
  assert.equal(pickSlot(wed, { data: { moneyFacts: four(mf(1, { show_from: addDays(wed, 1) })) }, env: {} }), null)
  assert.equal(pickSlot(wed, { data: { moneyFacts: four(mf(1, { show_from: wed, show_until: wed })) }, env: {} }).kind, 'money')
  assert.equal(pickSlot(MON, { data: { schemes: four(sch(1, { show_until: addDays(MON, -1) })) }, env: {} }), null)
  assert.equal(pickSlot(MON, { data: { schemes: four(sch(1, { show_from: addDays(MON, 1) })) }, env: {} }), null)
})

test('a kahawat marked lint_blocked is never shown, even if reviewed', () => {
  const data = { lines: { kahawat: [kh(1, { lint_blocked: true })] } }
  assert.equal(pickSlot(addDays(MON, 5), { data, env: {} }), null)
  assert.equal(pickSlot(addDays(MON, 5), { data, draft: true, env: {} }), null)
})

// ---- thin pool throttle
test('thin-pool throttle: a pool under 4 shows an item at most once in 4 weeks; 4 or more cycles weekly', () => {
  assert.equal(THIN_POOL, 4)
  const weds = Array.from({ length: 12 }, (_, i) => addDays('2026-11-11', 7 * i))
  for (const n of [1, 3, 5]) {
    const data = { moneyFacts: pool((i) => mf(i, { show_until: '2099-12-31' }), n), events: [] }
    const shown = weds.map((d) => pickSlot(d, { data, env: {} })).map((s) => (s ? s.lines[1] : null))
    const weeks = shown.filter(Boolean).length
    if (n < 4) {
      assert.equal(weeks, Math.round((12 / 4) * n), `pool ${n}: ${n} of every 4 weeks show something`)
      for (let w = 0; w + 4 <= 12; w++) { // any 4 consecutive weeks: no item twice
        const win = shown.slice(w, w + 4).filter(Boolean)
        assert.equal(new Set(win).size, win.length, `pool ${n}: repeat inside weeks ${w}..${w + 3}`)
      }
      assert.ok(weeks < 12)
    } else {
      assert.equal(weeks, 12, 'pool of 5 shows every week')
      for (let w = 0; w + 5 <= 12; w++) assert.equal(new Set(shown.slice(w, w + 5)).size, 5, 'all five items in any five weeks')
    }
  }
  const one = weds.filter((d) => pickSlot(d, { data: { moneyFacts: [mf(1, { show_until: '2099-12-31' })], events: [] }, env: {} }))
  assert.equal(one.length, 3, 'a pool of one shows once a month (3 of 12 weeks), never every week')
  assert.equal(pickThrottled([], MON), null)
})

test('thin-pool throttle applies to every kind: know, kahawat and scheme too', () => {
  const kinds = [['know', 3, (n) => ({ gyaan: pool(gy, n) })], ['kahawat', 5, (n) => ({ lines: { kahawat: pool(kh, n) } })], ['scheme', 1, (n) => ({ schemes: pool(sch, n) })]]
  for (const [kind, off, mk] of kinds) {
    const day = DAYS.find((d) => SLOT_BY_WEEKDAY_V2[new Date(`${d}T00:00:00Z`).getUTCDay()] === kind)
    const dates = Array.from({ length: 8 }, (_, i) => addDays(day, 7 * i))
    const got = dates.map((d) => pickSlot(d, { data: { ...mk(1), events: [] }, env: {} })).filter(Boolean)
    assert.equal(got.length, 2, `${kind}: pool of 1 shows 2 of 8 weeks`)
    const got3 = dates.map((d) => pickSlot(d, { data: { ...mk(3), events: [] }, env: {} })).filter(Boolean)
    assert.equal(got3.length, 6, `${kind}: pool of 3 shows 6 of 8 weeks`)
    void off
  }
})

// ---- Monday and Friday match
test('how-to: Monday and Friday of one week show the same scheme (and different weeks may differ)', () => {
  const data = { schemes: pool((n) => sch(n, { howto: howto(n) }), 5), events: [] }
  const seen = new Set()
  for (let w = 0; w < 10; w++) {
    const mon = addDays(MON, 7 * w), fri = addDays(mon, 4)
    assert.equal(mondayOf(fri), mon); assert.equal(mondayOf(addDays(mon, 6)), mon)
    const m = pickSlot(mon, { data, env: {} }), f = pickSlot(fri, { data, env: {} })
    assert.equal(m.kind, 'scheme'); assert.equal(f.kind, 'howto')
    assert.ok(m.lines[1].startsWith(m.scheme.title_hi) && f.lines[1].startsWith(m.scheme.title_hi), `week ${w}: Monday ${m.lines[1]} / Friday ${f.lines[1]}`)
    seen.add(m.scheme.id)
  }
  assert.ok(seen.size > 1)
})

test('how-to is NOT eligible with last_date null, even when reviewed and even with --draft; Friday falls back', () => {
  const data = { schemes: pool((n) => sch(n, { howto: howto(n, null) }), 5), events: [ev(1)] }
  const fri = addDays(MON, 4)
  for (const draft of [false, true]) { const s = pickSlot(fri, { data, draft, env: {} }); assert.equal(s.kind, 'upcoming') }
  assert.equal(pickSlot(fri, { data: { schemes: data.schemes, events: [] }, draft: true, env: {} }), null)
  // a scheme without a howto at all (the Monday scheme has none): no howto Friday
  assert.equal(pickSlot(fri, { data: { schemes: pool(sch, 5), events: [] }, env: {} }), null)
})

// ---- the kill switch on the real fixtures
const gen = async (i, env) => {
  const fx = loadFixture(FNAMES[i - 1])
  return generate({ date: fx.date, data: loadData(OLD_DATA_DIR), nowIso: fx.nowIso, loaders: { weather: fx.weatherLoader, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }, env })
}
test('KILL SWITCH: MORNING_CONTENT=off (also OFF and " off ") gives the byte-identical Batch 18 baseline for F1-F6', async () => {
  assert.equal(FNAMES.length, 6); assert.equal(rainFixtureNames().length, 6)
  for (const v of ['off', 'OFF', ' off ']) {
    for (let i = 1; i <= 6; i++) {
      const r = await gen(i, { MORNING_CONTENT: v })
      assert.equal(crlf(r.message), baseline(i), `F${i} with ${JSON.stringify(v)}`)
      assert.match(r.report, /content: OFF/)
    }
  }
})

test('KILL SWITCH: any other value or unset is the NEW behaviour (and the live gate still blocks every unreviewed seed)', async () => {
  let differs = 0
  for (const v of [undefined, '', 'on', 'false', '0', 'offf']) {
    for (let i = 1; i <= 6; i++) {
      const r = await gen(i, v === undefined ? {} : { MORNING_CONTENT: v })
      assert.ok(!/content: OFF/.test(r.report), `F${i} ${JSON.stringify(v)}`)
      assert.deepEqual(r.violations, [])
      assert.ok(!r.message.includes('मेला') && !r.message.includes('कहावत'))
      if (crlf(r.message) !== baseline(i)) differs++
    }
  }
  assert.ok(differs > 0, 'the old post had the daily sowing countdown; the new path drops it, so some days differ')
})

test('KILL SWITCH: off also ignores the weekday polls, so the poll rotation is exactly the old one', () => {
  const data = loadData(OLD_DATA_DIR)
  const old = data.polls.filter((p) => p.weekday == null)
  for (let i = 0; i < 40; i++) {
    const d = addDays('2026-11-01', i)
    assert.equal(pickPoll(data.polls, d, { weekdays: false }).id, pickPoll(old, d).id, d)
  }
})

test('poll weekday: a poll with weekday is preferred on that weekday (in its window) and left out of the other days', () => {
  const polls = [
    { id: 'a', question_hi: 'क', options_hi: ['1', '2'], from: '01-01', to: '12-31' },
    { id: 'b', question_hi: 'ख', options_hi: ['1', '2'], from: '01-01', to: '12-31' },
    { id: 'm', question_hi: 'म', options_hi: ['1', '2'], from: '11-01', to: '12-15', weekday: 1 },
    { id: 'f', question_hi: 'फ', options_hi: ['1', '2'], from: '11-01', to: '12-31', weekday: 5 },
  ]
  assert.equal(pickPoll(polls, MON).id, 'm')
  assert.equal(pickPoll(polls, addDays(MON, 4)).id, 'f')
  for (let i = 0; i < 30; i++) { const d = addDays('2026-11-02', i); const wd = new Date(`${d}T00:00:00Z`).getUTCDay(); if (wd !== 1 && wd !== 5) assert.ok(['a', 'b'].includes(pickPoll(polls, d).id), d) }
  assert.ok(['a', 'b'].includes(pickPoll(polls, '2026-12-21').id), 'a Monday outside the weekday poll window uses the old rotation')
  // the old rotation, with no weekday polls at all, is unchanged: epochDays % length
  const plain = polls.slice(0, 2)
  for (let i = 0; i < 14; i++) { const d = addDays('2026-11-01', i); assert.equal(pickPoll(plain, d).id, plain[Math.floor(Date.parse(`${d}T00:00:00Z`) / 86400000) % 2].id) }
})

test('the real polls p13 (Monday, PM-किसान) and p14 (Friday, फसल बीमा) exist with short options', () => {
  const polls = JSON.parse(readFileSync('data/morning/polls.json', 'utf8'))
  const p13 = polls.find((p) => p.id === 'p13'), p14 = polls.find((p) => p.id === 'p14')
  assert.equal(p13.weekday, 1); assert.equal(p14.weekday, 5)
  assert.deepEqual([p13.from, p13.to, p14.from, p14.to], ['11-01', '12-15', '11-01', '12-31'])
  assert.deepEqual(p13.options_hi, ['हाँ, आ गया', 'अभी नहीं', 'पता नहीं']); assert.deepEqual(p14.options_hi, ['हाँ', 'अभी नहीं', 'पता नहीं'])
  for (const p of [p13, p14]) { assert.ok(p.options_hi.length >= 2 && p.options_hi.length <= 3); for (const o of p.options_hi) assert.ok([...o].length <= 20, o); assert.ok([...p.question_hi].length <= 100) }
  assert.equal(pickPoll(polls, MON).id, 'p13'); assert.equal(pickPoll(polls, addDays(MON, 4)).id, 'p14')
})

test('Batch 21B poll p15 (Tuesday, when sowing was finished); p02, p03, p13, p14 are unchanged', () => {
  const polls = JSON.parse(readFileSync('data/morning/polls.json', 'utf8'))
  const p = polls.find((x) => x.id === 'p15')
  assert.equal(p.question_hi, 'आपकी रबी की बुवाई कब पूरी हुई?'); assert.deepEqual(p.options_hi, ['अक्तूबर में', 'नवंबर के पहले हफ़्ते में', 'अभी बाकी है'])
  assert.deepEqual([p.yes_label, p.from, p.to, p.weekday], ['बुवाई पूरी हो चुकी', '11-10', '12-31', 2])
  assert.equal(pickPoll(polls, '2026-11-10').id, 'p15'); assert.equal(pickPoll(polls, '2026-11-17').id, 'p15')
  assert.notEqual(pickPoll(polls, '2026-11-11').id, 'p15')
  for (const id of ['p02', 'p03', 'p13', 'p14']) assert.ok(polls.find((x) => x.id === id))
  assert.equal(polls.find((x) => x.id === 'p13').weekday, 1); assert.equal(polls.find((x) => x.id === 'p14').weekday, 5)
  assert.ok(p.options_hi.every((o) => [...o].length <= 24))
})
