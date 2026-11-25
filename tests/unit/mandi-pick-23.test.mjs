// Batch 23 - one rule for the mandi price date and mandi (src/lib/mandi/pickRule.js).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { strings } from '../../src/lib/i18n/strings.js'
import { CROPS } from '../../src/content/crops.js'
import {
  MIN_MANDIS, MIN_CROPS, WATCHDOG_MIN_MANDIS, WATCHDOG_MIN_CROPS, TRACKED_CROPS, pickMandiStep, istToday, dayKind, chooseDisplayDate, resolvePrices, pickMandi, coverageByDate, SAGAR_DIVISION_DISTRICTS,
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

test('display bar is 3 mandis + 7 crops; watchdog floor is 3 mandis + 5 crops; 10 tracked crops, same as crops.js', () => {
  assert.equal(MIN_MANDIS, 3); assert.equal(MIN_CROPS, 7)
  assert.equal(WATCHDOG_MIN_MANDIS, 3); assert.equal(WATCHDOG_MIN_CROPS, 5)
  assert.equal(TRACKED_CROPS.length, 10)
  assert.deepEqual(TRACKED_CROPS, CROPS.map((c) => c.mandi_en))
  assert.deepEqual(SAGAR_DIVISION_DISTRICTS, ['Sagar', 'Damoh', 'Tikamgarh', 'Chhatarpur', 'Panna', 'Niwari'])
})

test('(a) Monday: thin Sunday + full Saturday -> Saturday chosen with Saturday real date', () => {
  const rows = [...thinDay(SUN), ...fullDay(SAT), ...fullDay(FRI)]
  const ch = chooseDisplayDate(rows, MON)
  assert.equal(ch.date, SAT); assert.equal(ch.kind, 'older'); assert.equal(ch.stale, false)
  const r = resolvePrices(rows, MON)
  assert.equal(r.date, SAT)
  assert.ok(r.items.every((i) => i.date === SAT && !i.fallback))
  assert.equal(r.items.length, 10)
})

test('(a2) Monday where Sunday has 6 crops (many mandis, like 22 Nov) and Saturday has 10 -> Saturday', () => {
  const sunday6 = TRACKED_CROPS.slice(0, 6).flatMap((c) => MARKETS.map((m) => row(c, m, SUN)))
  const ch = chooseDisplayDate([...sunday6, ...fullDay(SAT)], MON)
  assert.equal(ch.date, SAT)
  // exactly 7 crops on Sunday is enough, 6 is not
  const sunday7 = TRACKED_CROPS.slice(0, 7).flatMap((c) => MARKETS.map((m) => row(c, m, SUN)))
  assert.equal(chooseDisplayDate([...sunday7, ...fullDay(SAT)], MON).date, SUN)
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

test('a day needs BOTH 3 mandis and 7 crops', () => {
  const fewMandis = TRACKED_CROPS.map((c) => row(c, 'Sagar APMC', SUN)) // 10 crops, 1 mandi
  const fewCrops = TRACKED_CROPS.slice(0, 6).flatMap((c) => MARKETS.map((m) => row(c, m, SUN))) // 6 crops, 6 mandis
  const ok = TRACKED_CROPS.slice(0, 7).flatMap((c) => MARKETS.slice(0, 3).map((m) => row(c, m, SUN))) // exactly 7 and 3
  assert.equal(chooseDisplayDate([...fewMandis, ...fullDay(SAT)], MON).date, SAT)
  assert.equal(chooseDisplayDate([...fewCrops, ...fullDay(SAT)], MON).date, SAT)
  assert.equal(chooseDisplayDate([...ok, ...fullDay(SAT)], MON).date, SUN)
  // crops that are not tracked do not count
  const untracked = ['Apple', 'Banana', 'Cumin', 'Zeera', 'Onion', 'Rice', 'Jowar'].flatMap((c) => MARKETS.map((m) => row(c, m, SUN)))
  assert.equal(chooseDisplayDate([...untracked, ...fullDay(SAT)], MON).date, SAT)
  assert.deepEqual(coverageByDate(ok)[SUN], { rows: 21, mandis: 3, crops: 7 })
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

test('(f) arrivals_tonnes is ignored: null, missing, junk or huge never changes or crashes the pick', () => {
  const mk = (arr) => ['Banda APMC:7100', 'Bina APMC:7300', 'Damoh APMC:7200'].map((x, i) => { const [m, p] = x.split(':'); return row('Gram', m, SAT, Number(p), arr[i] === undefined ? {} : { arrivals_tonnes: arr[i] }) })
  for (const arr of [[], [null, null, null], ['x', undefined, NaN], [9999, 1, 5]]) assert.equal(pickMandi(mk(arr)).market, 'Damoh APMC') // median 7200
  assert.equal(pickMandi([]), null); assert.equal(pickMandi(null), null)
  assert.equal(pickMandi([row('Gram', 'Sagar APMC', SAT, null)]), null)
})

test('(g) the Sagar town mandi beats the median (step b); otherwise the division median (step c); otherwise the global median (step d)', () => {
  const g = (m, p, x = {}) => row('Gram', m, SAT, p, x)
  // b: Sagar APMC reported -> chosen even though it is the dearest and not the median
  const withTown = [g('Banda APMC', 6000), g('Bina APMC', 6100), g('Sagar APMC', 9000), g('Damoh APMC', 6200)]
  assert.deepEqual(pickMandiStep(withTown).step, 'b'); assert.equal(pickMandiStep(withTown).row.market, 'Sagar APMC')
  assert.equal(pickMandi(shuffle(withTown, 4)).market, 'Sagar APMC')
  // "Sagar(F&V) APMC" is a different market and is NOT the town mandi
  assert.equal(pickMandiStep([g('Sagar(F&V) APMC', 100), g('Banda APMC', 200), g('Damoh APMC', 300)]).step, 'c')
  // c: odd count -> the middle price
  const odd = [g('Banda APMC', 6000), g('Bina APMC', 6400), g('Damoh APMC', 6200)]
  assert.deepEqual([pickMandiStep(odd).row.market, pickMandiStep(odd).step], ['Damoh APMC', 'c'])
  // c: even count -> the LOWER of the two middle prices
  const even = [g('Banda APMC', 6000), g('Bina APMC', 6400), g('Damoh APMC', 6200), g('Hata APMC', 6300)]
  assert.equal(pickMandiStep(even).row.market, 'Damoh APMC') // sorted 6000 6200 6300 6400 -> 6200
  // ties: several mandis at the median price -> the lowest name
  const ties = [g('Zzz APMC', 6200), g('Mmm APMC', 6200), g('Aaa APMC', 6200), g('Bbb APMC', 6000), g('Ccc APMC', 6500)]
  assert.equal(pickMandi(ties).market, 'Aaa APMC')
  assert.equal(pickMandi(shuffle(ties, 9)).market, 'Aaa APMC')
  // non-division mandis are ignored while a division mandi reported (even a cheaper or dearer outside one)
  const out = { district: 'Indore', is_local: false }
  const mixed = [g('Aaa Out APMC', 1, out), g('Bbb Out APMC', 99999, out), g('Damoh APMC', 6200), g('Panna APMC', 6400)]
  assert.deepEqual([pickMandiStep(mixed).row.market, pickMandiStep(mixed).step], ['Damoh APMC', 'c'])
  // a division district counts even when the database flag is missing
  assert.equal(pickMandi([g('Niwari APMC', 6700, { district: 'Niwari', is_local: undefined }), g('Aaa Out APMC', 1, out)]).market, 'Niwari APMC')
  // d: nobody in the division -> median of all
  const none = [g('Aaa Out APMC', 100, out), g('Bbb Out APMC', 300, out), g('Ccc Out APMC', 200, out)]
  assert.deepEqual([pickMandiStep(none).row.market, pickMandiStep(none).step], ['Ccc Out APMC', 'd'])
  assert.equal(pickMandiStep(shuffle(none, 2)).row.market, 'Ccc Out APMC')
  assert.equal(pickMandiStep([]), null)
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

test('the real chana case (18 Nov): the division median, one deterministic pick on every load', () => {
  const chana = ['Javera APMC:6500', 'Hata APMC:7200', 'Ajaygarh APMC:7400', 'Banda APMC:6990'].map((x) => { const [m, p] = x.split(':'); return row('Gram', m, '2026-11-18', Number(p)) })
  for (const seed of [1, 2, 3]) assert.equal(pickMandi(shuffle(chana, seed)).market, 'Banda APMC') // sorted 6500 6990 7200 7400 -> lower middle 6990
})

test('resolvePrices reports the step (b, c or d) for every crop it chose', () => {
  const r = resolvePrices(fullDay(SAT), MON)
  assert.ok(r.items.every((i) => i.step === 'b')) // Sagar APMC is in the full day
  const noTown = fullDay(SAT).filter((x) => x.market !== 'Sagar APMC')
  assert.ok(resolvePrices(noTown, MON).items.every((i) => i.step === 'c'))
})

