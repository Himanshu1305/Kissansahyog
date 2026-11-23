// Batch 23 - one rule for the mandi price date and mandi (src/lib/mandi/pickRule.js).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { strings } from '../../src/lib/i18n/strings.js'
import { CROPS } from '../../src/content/crops.js'
import {
  MIN_MANDIS, MIN_CROPS, TRACKED_CROPS, istToday, dayKind, chooseDisplayDate, resolvePrices, pickMandi, coverageByDate, SAGAR_DIVISION_DISTRICTS,
} from '../../src/lib/mandi/pickRule.js'
import { priceStaleness } from '../../src/lib/mandi/staleness.js'
import { tickerRows } from '../../src/lib/mandi/tickerRows.js'

// Mon 23 Nov 2026 is "today" in most tests. Sat 21, Sun 22 (a real week from production).
const MON = '2026-11-23', SUN = '2026-11-22', SAT = '2026-11-21', FRI = '2026-11-20'
const MARKETS = ['Banda APMC', 'Bina APMC', 'Damoh APMC', 'Khurai APMC', 'Sagar APMC', 'Panna APMC']
const row = (commodity_en, market, price_date, modal_price = 3000, extra = {}) => ({ commodity_en, commodity_hi: commodity_en, market, district: 'Sagar', modal_price, price_date, is_local: true, ...extra })
// a full day: every tracked crop at every market
const fullDay = (date, price = 3000) => TRACKED_CROPS.flatMap((c, i) => MARKETS.map((m, j) => row(c, m, date, price + i * 10 + j)))
// a thin day: 2 crops, 2 mandis
const thinDay = (date) => ['Wheat', 'Maize'].flatMap((c) => ['Sagar APMC', 'Damoh APMC'].map((m) => row(c, m, date, 2500)))
const shuffle = (a, seed = 7) => { const r = [...a]; let x = seed; for (let i = r.length - 1; i > 0; i--) { x = (x * 1103515245 + 12345) & 0x7fffffff; const j = x % (i + 1); [r[i], r[j]] = [r[j], r[i]] } return r }

test('thresholds are 3 mandis and 5 crops; 10 tracked crops, same as crops.js', () => {
  assert.equal(MIN_MANDIS, 3); assert.equal(MIN_CROPS, 5)
  assert.equal(TRACKED_CROPS.length, 10)
  assert.deepEqual(TRACKED_CROPS, CROPS.map((c) => c.mandi_en))
  assert.deepEqual(SAGAR_DIVISION_DISTRICTS, ['Sagar', 'Damoh', 'Tikamgarh', 'Chhatarpur', 'Panna', 'Niwari'])
})

test('(a) Monday: thin Sunday + full Saturday -> Saturday chosen with Saturday real date', () => {
  const rows = [...thinDay(SUN), ...fullDay(SAT), ...fullDay(FRI)]
  const ch = chooseDisplayDate(rows, MON)
  assert.equal(ch.date, SAT)
  assert.equal(ch.kind, 'older')
  assert.equal(ch.stale, false)
  const r = resolvePrices(rows, MON)
  assert.equal(r.date, SAT)
  assert.ok(r.items.every((i) => i.date === SAT && !i.fallback))
  assert.equal(r.items.length, 10)
})

test('(b) India time: 00:30 IST Monday is Monday; 23:30 IST Sunday is Sunday', () => {
  assert.equal(istToday(new Date('2026-11-22T19:00:00Z')), MON) // 00:30 IST Monday, UTC is still Sunday
  assert.equal(istToday(new Date('2026-11-22T18:00:00Z')), SUN) // 23:30 IST Sunday
  assert.equal(istToday(new Date('2026-11-23T05:20:00Z')), MON)
  // the label follows the same IST day, whatever the device's own time zone
  assert.equal(priceStaleness(MON, new Date('2026-11-22T19:00:00Z')), 'today')
  assert.equal(priceStaleness(SUN, new Date('2026-11-22T19:00:00Z')), 'yesterday')
  assert.equal(priceStaleness(SUN, new Date('2026-11-22T18:00:00Z')), 'today')
  // and the choice: at 00:30 IST Monday there is no Monday row yet, Sunday (full here) is "yesterday"
  const rows = fullDay(SUN)
  assert.equal(chooseDisplayDate(rows, istToday(new Date('2026-11-22T19:00:00Z'))).kind, 'yesterday')
  assert.equal(chooseDisplayDate(rows, istToday(new Date('2026-11-22T18:00:00Z'))).kind, 'today')
})

test('(c) yesterday full -> yesterday, labelled the existing Hindi / English words', () => {
  const ch = chooseDisplayDate(fullDay(SUN), MON)
  assert.equal(ch.date, SUN); assert.equal(ch.kind, 'yesterday'); assert.equal(ch.stale, false)
  assert.equal(strings.mandi_price_yesterday.hi, 'कल का भाव')
  assert.equal(strings.mandi_price_yesterday.en, "Yesterday's price")
  assert.equal(strings.mandi_price_older.hi, 'पिछला भाव')
  assert.equal(strings.mandi_price_today.hi, 'आज का भाव')
  for (const k of ['mandi_price_today', 'mandi_view_today', 'msp_snapshot_h_static', 'msp_today_h_static']) { assert.ok(strings[k].hi && strings[k].en, k) }
  assert.equal(dayKind(MON, MON), 'today'); assert.equal(dayKind(FRI, MON), 'older')
})

test('today full -> today', () => {
  const ch = chooseDisplayDate([...fullDay(MON), ...fullDay(SUN)], MON)
  assert.equal(ch.date, MON); assert.equal(ch.kind, 'today')
})

test('a day needs BOTH 3 mandis and 5 crops', () => {
  const fewMandis = TRACKED_CROPS.map((c) => row(c, 'Sagar APMC', SUN)) // 10 crops, 1 mandi
  const fewCrops = TRACKED_CROPS.slice(0, 4).flatMap((c) => MARKETS.map((m) => row(c, m, SUN))) // 4 crops, 6 mandis
  const ok = TRACKED_CROPS.slice(0, 5).flatMap((c) => MARKETS.slice(0, 3).map((m) => row(c, m, SUN))) // exactly 5 and 3
  assert.equal(chooseDisplayDate([...fewMandis, ...fullDay(SAT)], MON).date, SAT)
  assert.equal(chooseDisplayDate([...fewCrops, ...fullDay(SAT)], MON).date, SAT)
  assert.equal(chooseDisplayDate([...ok, ...fullDay(SAT)], MON).date, SUN)
  // crops that are not tracked do not count
  const untracked = ['Apple', 'Banana', 'Cumin', 'Zeera', 'Onion'].flatMap((c) => MARKETS.map((m) => row(c, m, SUN)))
  assert.equal(chooseDisplayDate([...untracked, ...fullDay(SAT)], MON).date, SAT)
  assert.deepEqual(coverageByDate(ok)[SUN], { rows: 15, mandis: 3, crops: 5 })
})

test('(d) nothing decent in 7 days -> newest date with rows, marked stale; no rows -> null', () => {
  const rows = [...thinDay(SUN), ...thinDay(FRI)]
  const ch = chooseDisplayDate(rows, MON)
  assert.equal(ch.date, SUN); assert.equal(ch.stale, true)
  // a decent day older than 7 days does not count
  const old = chooseDisplayDate([...thinDay(SUN), ...fullDay('2026-11-10')], MON)
  assert.equal(old.date, SUN); assert.equal(old.stale, true)
  assert.equal(chooseDisplayDate([], MON), null)
  assert.equal(resolvePrices([], MON).date, null)
  // rows dated after today are ignored
  assert.equal(chooseDisplayDate([...fullDay('2026-11-24'), ...fullDay(SAT)], MON).date, SAT)
})

test('(e) same crop + date: identical mandi and price on every code path, in any input order', () => {
  const base = [...thinDay(SUN), ...fullDay(SAT), ...fullDay(FRI)]
  const ref = resolvePrices(base, MON)
  for (const seed of [1, 2, 3, 4, 5, 99]) {
    const rows = shuffle(base, seed)
    const r = resolvePrices(rows, MON) // /msp all-crops table path (fetchMandiSnapshot)
    assert.deepEqual(r.items.map((i) => [i.crop, i.row.market, i.row.modal_price, i.date]), ref.items.map((i) => [i.crop, i.row.market, i.row.modal_price, i.date]))
    const strip = tickerRows(shuffle(r.items.map((i) => i.row), seed + 10)) // homepage strip path (tickerRows on the chosen rows)
    for (const s of strip) { const m = r.items.find((i) => i.row.commodity_en === s.commodity_en); assert.equal(s.market, m.row.market); assert.equal(s.modal_price, m.row.modal_price) }
    // the strip run on ALL rows of the day (not only the chosen ones) also agrees
    const stripAll = tickerRows(shuffle(rows.filter((x) => x.price_date === SAT), seed + 20))
    for (const s of stripAll) assert.equal(s.market, ref.items.find((i) => i.row.commodity_en === s.commodity_en).row.market)
  }
})

test('(f) arrivals_tonnes null, missing or junk never crashes and falls to the name tie-break', () => {
  const rows = [row('Gram', 'Sagar APMC', SAT, 7000, { arrivals_tonnes: null }), row('Gram', 'Banda APMC', SAT, 7100), row('Gram', 'Damoh APMC', SAT, 7200, { arrivals_tonnes: 'x' }), row('Gram', 'Bina APMC', SAT, 7300, { arrivals_tonnes: undefined })]
  assert.equal(pickMandi(rows).market, 'Banda APMC')
  assert.equal(pickMandi(shuffle(rows, 3)).market, 'Banda APMC')
  assert.equal(pickMandi([]), null); assert.equal(pickMandi(null), null)
  assert.equal(pickMandi([row('Gram', 'Sagar APMC', SAT, null)]), null)
})

test('(g) a Sagar-division mandi beats a bigger non-Sagar one; the largest arrivals wins among division mandis', () => {
  const outside = { district: 'Indore', is_local: false, in_sagar_division: false }
  const big = row('Gram', 'Aaa Outside APMC', SAT, 9000, { ...outside, arrivals_tonnes: 5000 })
  const small = row('Gram', 'Zzz Damoh APMC', SAT, 6900, { district: 'Damoh', arrivals_tonnes: 3 })
  assert.equal(pickMandi([big, small]).market, 'Zzz Damoh APMC')
  const bigger = row('Gram', 'Mmm Panna APMC', SAT, 6800, { district: 'Panna', arrivals_tonnes: 40 })
  assert.equal(pickMandi([big, small, bigger]).market, 'Mmm Panna APMC')
  assert.equal(pickMandi(shuffle([big, small, bigger], 5)).market, 'Mmm Panna APMC')
  // a division district counts even when the database flag is missing
  const byDistrict = row('Gram', 'Niwari APMC', SAT, 6700, { district: 'Niwari', is_local: undefined })
  assert.equal(pickMandi([big, byDistrict]).market, 'Niwari APMC')
})

test('(h) a crop missing on the chosen date shows its OWN last price with its OWN date', () => {
  const rows = [...fullDay(SAT).filter((r) => r.commodity_en !== 'Urad'), ...fullDay(FRI), ...thinDay(SUN)]
  const r = resolvePrices(rows, MON)
  assert.equal(r.date, SAT)
  const urad = r.items.find((i) => i.crop === 'Urad')
  assert.equal(urad.date, FRI); assert.equal(urad.fallback, true); assert.equal(urad.row.price_date, FRI)
  assert.ok(r.items.filter((i) => i.crop !== 'Urad').every((i) => i.date === SAT && !i.fallback))
  // a crop with no price anywhere is reported missing, never invented
  const none = resolvePrices(fullDay(SAT).filter((x) => x.commodity_en !== 'Garlic'), MON)
  assert.deepEqual(none.missing, ['Garlic'])
  assert.equal(none.items.length, 9)
})

test('the real chana case: one deterministic pick, not whatever Postgres returned first', () => {
  // 18 Nov production rows (all division): lowest name wins; arrivals are empty in production
  const chana = ['Javera APMC:6500', 'Hata APMC:7200', 'Ajaygarh APMC:7400', 'Banda APMC:6990'].map((x) => { const [m, p] = x.split(':'); return row('Gram', m, '2026-11-18', Number(p)) })
  for (const seed of [1, 2, 3]) assert.equal(pickMandi(shuffle(chana, seed)).market, 'Ajaygarh APMC')
})
