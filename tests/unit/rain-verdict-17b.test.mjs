// Batch 17B Defect C - one rain verdict for /mausam and the morning post. Fixtures F1-F6 (scripts/morning/fixtures/rain-*.json).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as RV from '../../src/lib/weather/rainVerdict.js'
import { actionWindows, sprayWindow, harvestWindow, irrigationWindow, nextRain, imdClass } from '../../src/lib/weather/weatherRules.js'
import { getRainAlert, classifyDay } from '../../src/lib/weather/rainAlert.js'
import { bannerText, todayTotalText } from '../../src/lib/weather/rainBanner.js'
import { trimToNow } from '../../src/lib/weather/freshness.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { generate, loadData } from '../../scripts/morning/lib/generate.js'
import { loadFixture, rainFixtureNames } from '../../scripts/morning/fixtures.js'
import { loadWeather, weatherFromCacheRow, SAGAR_GRID_KEY } from '../../scripts/morning/lib/weather.js'
import { weatherPhrase, dayPhrase } from '../../scripts/morning/lib/weatherLine.js'
import { cardData } from '../../scripts/morning/card/render.mjs'
import { buildVoiceScript, isSpeakable, VOICE_TARGET, VOICE_HARD_MAX } from '../../scripts/morning/voice/voiceScript.mjs'
import { S } from '../../scripts/morning/strings.hi.js'
import { findRepeats, assertNoRepeats } from './helpers/repeatedWords.mjs'

const DATA = loadData()
const en = (k) => strings[k].en
const hi = (k) => strings[k].hi
const names = rainFixtureNames()
const run = async (name) => {
  const fx = loadFixture(name)
  const res = await generate({ date: fx.date, data: DATA, nowIso: fx.nowIso, loaders: { weather: fx.weatherLoader, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
  return { fx, res }
}
// what the SITE shows for the same fixture: the cached cell cut to "now" (as the page does), or - when the cell is too old - the direct daily numbers
function siteCell(fx) {
  const j = fx.json
  const usable = !!weatherFromCacheRow(j.cache, j.date, Date.parse(j.nowIso))
  const direct = j.direct ? j.direct.daily.time.map((date, i) => ({ date, precip_mm: j.direct.daily.precipitation_sum[i], precip_prob: j.direct.daily.precipitation_probability_max[i], wind_max: j.direct.daily.wind_speed_10m_max[i], weathercode: j.direct.daily.weather_code[i] })) : null
  const base = usable ? j.cache : { hourly: [], daily: direct || j.cache.daily, fetched_at: j.nowIso }
  return trimToNow(base, Date.parse(j.nowIso))
}

test('the six fixtures exist', () => assert.equal(names.length, 6))

test('thresholds are exactly the agreed defaults, as named constants in the one file', () => {
  assert.deepEqual([RV.DRY_BELOW_MM, RV.LIGHT_MIN_MM, RV.MODERATE_MIN_MM, RV.HEAVY_MIN_MM, RV.PROB_SHOWN_MIN_MM], [1, 2.5, 15.6, 64.5, 2.5])
  assert.deepEqual([RV.SPRAY_STOP_MM_6H, RV.SPRAY_STOP_WIND_KMH, RV.SPRAY_CAUTION_MM_24H, RV.SPRAY_CAUTION_WIND_KMH], [2, 15, 2.5, 10])
  assert.deepEqual([RV.HARVEST_STOP_MM_48H, RV.HARVEST_CAUTION_MM_72H], [5, 2.5])
  const src = readFileSync('src/lib/weather/rainVerdict.js', 'utf8')
  for (const c of ['DRY_BELOW_MM', 'LIGHT_MIN_MM', 'MODERATE_MIN_MM', 'HEAVY_MIN_MM', 'PROB_SHOWN_MIN_MM', 'SPRAY_STOP_MM_6H', 'HARVEST_STOP_MM_48H']) assert.match(src, new RegExp(`export const ${c} = `))
})
test('classify: IMD classes, a trace is not rain', () => {
  const c = RV.classify
  assert.deepEqual([c(0), c(0.9), c(1), c(2.4), c(2.5), c(15.5), c(15.6), c(64.4), c(64.5), c(200)], ['dry', 'dry', 'drizzle', 'drizzle', 'light', 'light', 'moderate', 'moderate', 'heavy', 'heavy'])
  assert.ok(!RV.showsProb(2.4) && RV.showsProb(2.5))
})
test('no rain statement is derived outside rainVerdict.js: /mausam, rules, alert and the morning code use it', () => {
  const m = readFileSync('src/screens/Mausam.jsx', 'utf8')
  assert.ok(m.includes("from '../lib/weather/rainVerdict'") && !/\bnextRain\b/.test(m) && !/precip_mm\s*[<>]/.test(m))
  assert.ok(m.includes('data-testid="mausam-rain-banner"'))
  const r = readFileSync('src/lib/weather/weatherRules.js', 'utf8')
  assert.ok(r.includes('rainVerdict') && !/rain24 > 0|rain72 > 0|rain6 >= 2/.test(r))
  assert.ok(readFileSync('src/lib/weather/rainAlert.js', 'utf8').includes('LIGHT_MIN_MM'))
  for (const f of ['scripts/morning/lib/workRules.js', 'scripts/morning/lib/compose.js', 'scripts/morning/lib/weatherLine.js', 'scripts/morning/lib/generate.js']) assert.ok(readFileSync(f, 'utf8').includes('rainVerdict'), f)
  assert.ok(!/rain_prob_gte|rain_mm_gte|rain_prob_lt/.test(readFileSync('data/morning/work-rules.json', 'utf8')))
})

// ---- F1 .. F6: the verdict itself
test('F1 dry day: dry, no chance shown, spraying ok, harvest ok', async () => {
  const { res } = await run('rain-f1')
  const v = res.model.verdict
  assert.equal(v.level, 'dry'); assert.equal(v.source, 'cache'); assert.equal(v.hasHourly, true)
  assert.deepEqual([v.mm48h, v.mm72h, v.nextRainInHours, v.spray.status, v.harvest.status], [0, 0, null, 'ok', 'ok'])
})
test('F2 the real 30 Oct case: 80% chance and 1 mm earlier today is DRY for the rest of today; no percentage, no postponed spraying', async () => {
  const { fx, res } = await run('rain-f2')
  const v = res.model.verdict
  assert.equal(v.level, 'dry'); assert.equal(v.mmRestOfToday, 0); assert.equal(v.showProb, false); assert.equal(v.todayTotalMm, 1); assert.equal(v.todayTotalLevel, 'drizzle')
  assert.equal(v.spray.status, 'ok'); assert.equal(v.nextRainInHours, null)
  assert.ok(!/संभावना\s*\d+%/.test(res.message))
  assert.ok(!/छिड़काव कल पर टालें/.test(res.message))
  assert.ok(res.message.includes('आज बारिश नहीं'))
  // the same cell on /mausam: banner says no more rain, spraying ok, badge says it is today's total
  const c = siteCell(fx); const sv = RV.rainVerdict({ hourly: c.hourly, daily: c.daily })
  assert.equal(bannerText(sv, en).text, 'No more rain expected in the next 48 hours'); assert.equal(bannerText(sv, hi).text, 'अगले 48 घंटे और बारिश नहीं')
  assert.equal(todayTotalText(sv, en), "Today's total: very light rain (1 mm)")
  assert.equal(actionWindows(c.hourly, c.daily).spray.status, 'ok')
  assert.equal(sprayWindow(c.hourly).status, 'ok')
})
test('F3 real rain: light with the chance shown, spraying stop, harvest stop; card says postpone, /mausam says stop', async () => {
  const { fx, res } = await run('rain-f3')
  const v = res.model.verdict
  assert.equal(v.level, 'light'); assert.equal(v.showProb, true); assert.equal(v.probPct, 90); assert.equal(v.mm6h, 8)
  assert.deepEqual([v.spray.status, v.harvest.status, v.nextRainInHours], ['stop', 'stop', 1])
  assert.ok(res.message.includes('हल्की बारिश संभव, संभावना 90% (करीब 8 मिमी)'))
  assert.ok(res.model.tasks.includes('दवा-खाद का छिड़काव कल पर टालें'))
  const cd = cardData(res.model)
  assert.ok([cd.scheme?.body, cd.tip?.body, cd.weather.line2].join('|').includes('छिड़काव कल पर टालें'))
  const c = siteCell(fx); assert.equal(actionWindows(c.hourly, c.daily).spray.status, 'stop'); assert.equal(actionWindows(c.hourly, c.daily).harvest.status, 'stop')
  assert.equal(bannerText(RV.rainVerdict({ hourly: c.hourly, daily: c.daily }), en).kind, 'rain')
})
test('F4 heavy rain day: heavy, warning wording, harvest stop, drain task', async () => {
  const { res } = await run('rain-f4')
  const v = res.model.verdict
  assert.equal(v.level, 'heavy'); assert.equal(v.harvest.status, 'stop'); assert.equal(v.spray.status, 'stop')
  assert.ok(res.message.includes('भारी बारिश की चेतावनी'))
  assert.ok(res.model.tasks.includes('खेत से पानी निकलने की नाली साफ़ रखें'))
})
test('F5 stale cache: the generator falls back to direct Open-Meteo daily data and says so in report.txt', async () => {
  const { fx, res } = await run('rain-f5')
  assert.deepEqual(fx.calls, ['cache', 'direct'])
  assert.equal(res.model.weather.source, 'open-meteo-direct'); assert.equal(res.model.verdict.source, 'open-meteo-direct'); assert.equal(res.model.verdict.hasHourly, false)
  assert.ok(res.report.includes('weather source: open-meteo-direct (cache stale/missing)'))
  assert.equal(res.model.verdict.level, 'drizzle') // 1.2 mm with a 60% chance: drizzle, no percentage
  assert.ok(!/संभावना\s*\d+%/.test(res.message))
})
test('F6 daily-only data: the verdict still works, the level comes from the day total', async () => {
  const { res } = await run('rain-f6')
  const v = res.model.verdict
  assert.equal(v.hasHourly, false); assert.equal(v.level, 'light'); assert.equal(v.mmRestOfToday, 6); assert.equal(v.nextRainInHours, null)
  assert.equal(v.harvest.status, 'stop'); assert.equal(v.spray.status, 'caution')
  assert.ok(res.report.includes('weather source: cache'))
})
test('the cache (fresh) is read with the public anon key from the Sagar cell; no service-role key in the weather loader', async () => {
  const fx = loadFixture('rain-f1'); const seen = []
  const w = await loadWeather({ url: 'https://x.test', key: 'ANON', lat: 1, lon: 2, date: fx.date, nowMs: Date.parse(fx.nowIso), fetchImpl: async (u, o) => { seen.push({ u: String(u), h: o && o.headers }); return { ok: true, status: 200, json: async () => [fx.json.cache] } } })
  assert.equal(w.source, 'cache'); assert.equal(seen.length, 1)
  assert.ok(seen[0].u.startsWith('https://x.test/rest/v1/weather_cache_v2?') && seen[0].u.includes(`grid_key=eq.${SAGAR_GRID_KEY}`)); assert.equal(SAGAR_GRID_KEY, '23.8_78.7')
  assert.equal(seen[0].h.apikey, 'ANON'); assert.equal(seen[0].h.Authorization, 'Bearer ANON')
  assert.ok(!/service.?role/i.test(readFileSync('scripts/morning/lib/weather.js', 'utf8')))
})
test('weather unavailable (cache and direct both fail): the post is still made, weather omitted, nothing throws', async () => {
  const fx = loadFixture('rain-f1')
  const res = await generate({ date: fx.date, data: DATA, nowIso: fx.nowIso, loaders: { weather: () => loadWeather({ url: 'https://x.test', key: 'K', lat: 1, lon: 2, date: fx.date, fetchImpl: async () => { throw new Error('down') }, retries: 0 }), mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
  assert.equal(res.haveWeather, false); assert.ok(res.report.includes('weather: OMITTED') && res.report.includes('weather source: none')); assert.ok(res.message.length > 100)
  assert.ok(!res.message.includes('☁️ *आज सागर:*'))
})
test('a cache row older than 8 hours, or one that does not start today, is not used', () => {
  const j = loadFixture('rain-f1').json; const now = Date.parse(j.nowIso)
  assert.ok(weatherFromCacheRow(j.cache, j.date, now))
  assert.equal(weatherFromCacheRow({ ...j.cache, fetched_at: new Date(now - 9 * 3600000).toISOString() }, j.date, now), null)
  assert.equal(weatherFromCacheRow(j.cache, '2026-11-05', now), null)
  assert.equal(weatherFromCacheRow(null, j.date, now), null)
})

// ---- the one sentence
test('the weather sentence: dry / drizzle / light+ wording, one rain word, chance only from 2.5 mm', () => {
  const mk = (mm, prob) => RV.rainVerdict({ daily: [{ date: '2026-10-31', precip_mm: mm, precip_prob: prob, weathercode: 63 }] })
  assert.equal(weatherPhrase(mk(0, 80), 63).text, 'बादल, आज बारिश नहीं')           // a rain code with no rain: plain cloud, no rain word of its own
  assert.equal(weatherPhrase(mk(1, 80), 80).text, 'हल्की बूँदाबाँदी संभव (करीब 1 मिमी)')
  assert.equal(weatherPhrase(mk(8, 80), 80).text, 'हल्की बारिश संभव, संभावना 80% (करीब 8 मिमी)')
  assert.equal(weatherPhrase(mk(20, 90), 61).text, 'मध्यम बारिश संभव, संभावना 90% (करीब 20 मिमी)')
  assert.equal(weatherPhrase(mk(70, 100), 65).text, 'भारी बारिश की चेतावनी, संभावना 100% (करीब 70 मिमी)')
  assert.ok(!/\d+%/.test(weatherPhrase(mk(2.4, 99), 61).text))
  assert.equal(dayPhrase(mk(0, 90).days[0]).text, 'बारिश नहीं')
  assert.ok(S.wx.dry.includes('{sky}'))
})

// ---- /mausam rules
test('spraying rules: stop / caution / ok exactly as agreed (a trace is ok)', () => {
  const hrs = (f) => Array.from({ length: 24 }, (_, i) => ({ time: `2026-10-31T${String(i).padStart(2, '0')}:00`, precip_mm: 0, wind_kmh: 5, precip_prob: 0, ...f(i) }))
  assert.equal(sprayWindow(hrs(() => ({ precip_mm: 0.1 }))).status, 'ok')                                   // 2.4 mm over 24 h of traces is ok
  assert.equal(sprayWindow(hrs((i) => (i === 10 ? { precip_mm: 2.5 } : {}))).status, 'caution')             // 2.5 mm in 24 h
  assert.equal(sprayWindow(hrs((i) => (i === 3 ? { precip_mm: 2 } : {}))).status, 'stop')                   // 2 mm in the next 6 h
  assert.equal(sprayWindow(hrs((i) => (i === 3 ? { wind_kmh: 16 } : {}))).status, 'stop')
  assert.equal(sprayWindow(hrs((i) => (i === 3 ? { wind_kmh: 12 } : {}))).status, 'caution')
  assert.equal(sprayWindow(hrs((i) => (i === 3 ? { precip_mm: 1.9 } : {}))).status, 'ok')
})
test('harvest rules: stop at 5 mm in 48 h, caution at 2.5 mm in 72 h, a trace is ok', () => {
  const d = (a, b, c) => [{ date: '2026-10-31', precip_mm: a }, { date: '2026-11-01', precip_mm: b }, { date: '2026-11-02', precip_mm: c }]
  assert.equal(harvestWindow(d(0.4, 0.4, 0.4)).status, 'ok')
  assert.equal(harvestWindow(d(0, 0, 2.5)).status, 'caution')
  assert.equal(harvestWindow(d(2.5, 2.5, 0)).status, 'stop')
})
test('irrigation: adequate soil is a green "No irrigation needed now", not an orange Caution; real cautions stay', () => {
  const daily = (mm, et0) => [{ date: '2026-10-31', precip_mm: mm, et0, soil_moisture: 0.28 }, { date: '2026-11-01', precip_mm: 0, et0 }]
  assert.deepEqual(irrigationWindow([], daily(0, 3)), { status: 'ok', reasonKey: 'aw_irrig_none' })
  assert.equal(en('aw_irrig_none'), 'No irrigation needed now'); assert.equal(hi('aw_irrig_none'), 'सिंचाई की ज़रूरत नहीं')
  assert.equal(irrigationWindow([{ time: '2026-10-31T10:00', soil_moisture: 0.4, precip_mm: 0 }], daily(0, 3)).status, 'ok') // wet soil: nothing to do either
  assert.equal(irrigationWindow([], daily(12, 3)).status, 'stop')
  const dry = [{ date: '2026-10-31', precip_mm: 3, et0: 3, soil_moisture: 0.15 }, { date: '2026-11-01', precip_mm: 0 }]
  assert.equal(irrigationWindow([], dry).status, 'caution')                       // dry field, rain coming: wait for it
  assert.equal(irrigationWindow([], [{ date: '2026-10-31', precip_mm: 0, et0: 6, soil_moisture: 0.15 }]).reasonKey, 'aw_irrig_ok')
})
test('nextRain agrees with the verdict: scattered traces under 1 mm are not "rain in 3 hours"', () => {
  const h = (i, mm) => ({ time: `2026-10-31T${String(i).padStart(2, '0')}:00`, precip_mm: mm })
  assert.equal(nextRain(Array.from({ length: 12 }, (_, i) => h(i, i === 3 ? 0.6 : 0))), null)
  const real = Array.from({ length: 12 }, (_, i) => h(i, i === 3 || i === 4 ? 2 : 0))
  assert.deepEqual([nextRain(real).inHours, nextRain(real).mm], [3, 4])
})
test('badge and banner never contradict: total so far today vs the next 48 hours, in both languages', () => {
  const v = RV.rainVerdict({ hourly: Array.from({ length: 24 }, (_, i) => ({ time: `2026-10-31T${String(i).padStart(2, '0')}:00`, precip_mm: 0 })), daily: [{ date: '2026-10-31', precip_mm: 1.5 }, { date: '2026-11-01', precip_mm: 0 }, { date: '2026-11-02', precip_mm: 0 }] })
  assert.equal(RV.bannerKind(v), 'none_more'); assert.equal(imdClass(v.todayTotalMm).level, 'green')
  assert.equal(todayTotalText(v, en), "Today's total: very light rain (1.5 mm)"); assert.equal(todayTotalText(v, hi), 'आज का कुल: बहुत हल्की बारिश (1.5 मिमी)')
  const dry = RV.rainVerdict({ daily: [{ date: '2026-10-31', precip_mm: 0.4 }, { date: '2026-11-01', precip_mm: 0 }] })
  assert.equal(todayTotalText(dry, en), null); assert.equal(bannerText(dry, en).text, en('mausam_no_rain_48')); assert.equal(imdClass(0.4), null)
})
test('rain strip (Homepage) uses the same classes: 2.5 mm triggers, a trace does not', () => {
  assert.equal(getRainAlert([{ precipitation_sum: 2.4 }, { precipitation_sum: 0 }]), null)
  assert.ok(getRainAlert([{ precipitation_sum: 2.5 }, { precipitation_sum: 0 }]))
  assert.equal(classifyDay(0.9), null); assert.equal(classifyDay(15.5).level, 'light'); assert.equal(classifyDay(15.6).level, 'moderate'); assert.equal(classifyDay(64.5).level, 'heavy')
})
test('every new string has Hindi and English', () => {
  for (const k of ['aw_spray_caution_rain', 'aw_spray_caution_wind', 'aw_irrig_none', 'rv_banner_none_more', 'rv_banner_drizzle', 'rv_today_total', 'rv_level_drizzle', 'rv_level_light', 'rv_level_moderate', 'rv_level_heavy']) assert.ok(strings[k].hi && strings[k].en, k)
})

// ---- consistency: every fixture through the site rules AND the morning generator; rain statements never contradict
test('consistency over F1-F6: site and morning post agree; no "no rain" with "rain possible" or "postpone spraying" for the same window', async () => {
  const POSTPONE = /छिड़काव कल पर टालें/
  const RAIN_POSSIBLE = /बारिश संभव|बारिश हो सकती है|बूँदाबाँदी|बारिश की चेतावनी/
  for (const name of names) {
    const { fx, res } = await run(name)
    const v = res.model.verdict
    const c = siteCell(fx)
    const sv = RV.rainVerdict({ hourly: c.hourly, daily: c.daily })
    const site = actionWindows(c.hourly, c.daily)
    // the same verdict numbers on both sides
    assert.equal(sv.level, v.level, `${name} level`); assert.equal(sv.mm48h, v.mm48h, `${name} mm48h`)
    assert.equal(site.spray.status, v.spray.status, `${name} spray`); assert.equal(site.harvest.status, v.harvest.status, `${name} harvest`)
    const card = cardData(res.model)
    const cardText = [card.weather.line1, card.weather.line2, card.scheme && card.scheme.body, card.tip && card.tip.body].filter(Boolean).join(' | ')
    const voice = buildVoiceScript(res.model).text
    const todayLine = res.message.split('\n').find((l) => l.includes('आज सागर')) || ''
    // today's window: "no rain" and "rain possible" never together; a dry or drizzle day shows no percentage
    for (const t of [todayLine, card.weather.line1]) {
      assert.ok(!(/आज बारिश नहीं/.test(t) && RAIN_POSSIBLE.test(t)), `${name}: no rain together with rain possible: ${t}`)
      if (v.level === 'dry') assert.ok(/आज बारिश नहीं/.test(t) && !RAIN_POSSIBLE.test(t), `${name}: dry day wording: ${t}`)
      if (v.level === 'dry' || v.level === 'drizzle') assert.ok(!/\d+%/.test(t), `${name}: percentage on a dry/drizzle day: ${t}`)
      if (v.level !== 'dry') assert.ok(!/आज बारिश नहीं/.test(t), `${name}: says no rain on a ${v.level} day`)
    }
    if (v.level === 'dry' || v.level === 'drizzle') assert.ok(!/प्रतिशत/.test(voice.split('।').slice(0, 2).join('।')), `${name}: percentage in the voice on a dry/drizzle day`)
    // postponed spraying only when the spraying window says stop (rain), everywhere, the site included
    const stopByRain = v.spray.status === 'stop' && v.spray.reasonKey === 'aw_spray_stop_rain'
    for (const [label, t] of [['message', res.message], ['card', cardText], ['voice', voice]]) {
      if (!stopByRain) assert.ok(!POSTPONE.test(t), `${name}: ${label} says postpone while spraying is ${v.spray.status}`)
    }
    if (stopByRain) { assert.ok(POSTPONE.test(res.message), `${name} message`); assert.ok(POSTPONE.test(cardText), `${name} card`); assert.equal(site.spray.status, 'stop') }
    // banner and card agree on the 48-hour picture
    const kind = bannerText(sv, en).kind
    if (kind === 'none' || kind === 'none_more') assert.equal(v.windows.h48.level, 'dry', `${name} banner says dry`)
    // the spraying sentence appears once on the card
    const hits = [card.scheme && card.scheme.body, card.tip && card.tip.body, card.weather.line2].filter((x) => x && x.includes('छिड़काव')).length
    assert.ok(hits <= 1, `${name}: spraying sentence shown ${hits} times on the card`)
  }
})

test('repeated-word guard: message, card lines and voice script of every fixture (and the old fixtures) have no repeated word', async () => {
  for (const name of names) {
    const { res } = await run(name)
    assertNoRepeats(assert, res.message, `${name} message`)
    const card = cardData(res.model)
    const lines = [card.weather.line1, card.weather.line2, ...card.weather.days.map((d) => d.rain), card.scheme && card.scheme.body, card.tip && card.tip.body, card.scheme && card.scheme.title, card.tip && card.tip.title].filter(Boolean)
    for (const l of lines) assertNoRepeats(assert, l, `${name} card line`)
    assertNoRepeats(assert, buildVoiceScript(res.model).text, `${name} voice`)
  }
  for (const n of ['normal', 'rainy', 'missing-mandi']) {
    const fx = loadFixture(n)
    const res = await generate({ date: fx.date, data: DATA, loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
    assertNoRepeats(assert, res.message, `${n} message`)
  }
})
test('the guard itself catches a repeat (so a pass means something)', () => {
  assert.ok(findRepeats('हल्की बारिश, बारिश हो सकती है (संभावना 80%)').length >= 1)
  assert.equal(findRepeats('आज बारिश बारिश नहीं')[0].kind, 'consecutive')
  assert.equal(findRepeats('कल: हल्की बारिश · परसों: बारिश नहीं').length, 0)
  assert.equal(findRepeats('भाव पाँच हज़ार छह सौ रुपये, जो सोलह रुपये ऊपर है').length, 0)
  assert.equal(findRepeats('दवा का छिड़काव और खाद का छिड़काव टालें').length, 1)
})

// ---- voice
test('voice: natural opening for every level, 450-750 characters, spoken characters only, numbers as words', async () => {
  const opening = { 'rain-f1': 'सागर में आज आसमान में कुछ बादल रहेंगे', 'rain-f2': 'सागर में आज आसमान में बादल छाए रहेंगे', 'rain-f3': 'सागर में आज हल्की बारिश हो सकती है', 'rain-f4': 'सागर में आज भारी बारिश की चेतावनी है' }
  for (const name of names) {
    const { res } = await run(name)
    const s = buildVoiceScript(res.model)
    assert.ok(s.chars >= VOICE_TARGET[0] && s.chars <= VOICE_TARGET[1] && s.chars <= VOICE_HARD_MAX, `${name} ${s.chars} chars`)
    assert.ok(isSpeakable(s.text) && !/\d/.test(s.text), name)
    assert.ok(!s.text.includes('सागर के मौसम का हाल'), `${name} stiff opening`)
    const key = Object.keys(opening).find((k) => name.startsWith(k)); if (key) assert.ok(s.text.includes(opening[key]), `${name}: ${opening[key]}`)
  }
})
test('voice regenerates only when the spoken text changed: same input gives the same hash; a changed weather sentence changes it', async () => {
  const a = buildVoiceScript((await run('rain-f1')).res.model); const b = buildVoiceScript((await run('rain-f1')).res.model); const c = buildVoiceScript((await run('rain-f3')).res.model)
  assert.equal(a.sha256, b.sha256); assert.notEqual(a.sha256, c.sha256)
  assert.ok(readFileSync('scripts/morning/voice/make.mjs', 'utf8').includes('have === script.sha256'))
})
test('report.txt names the weather source for every run', async () => {
  for (const name of names) assert.match((await run(name)).res.report, /weather source: (cache|open-meteo-direct \(cache stale\/missing\))/)
})
