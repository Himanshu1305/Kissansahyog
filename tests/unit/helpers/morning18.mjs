// Shared by the Batch 18 tests: run the real generator on a rain fixture (F1-F6) with a district scenario.
import { readFileSync } from 'node:fs'
import { generate, loadData } from '../../../scripts/morning/lib/generate.js'
import { loadDistrictsWeather } from '../../../scripts/morning/lib/weather.js'
import { DISTRICTS } from '../../../scripts/morning/lib/districts.js'
import { loadFixture, rainFixtureNames, districtScenario } from '../../../scripts/morning/fixtures.js'
import { S } from '../../../scripts/morning/strings.hi.js'

export const DATA = loadData()
export const FNAMES = rainFixtureNames()
export const crlf = (t) => t.replace(/\r\n/g, '\n')
export const baseline = (i) => crlf(readFileSync(`docs/review/batch18/evidence/baseline-F${i}.txt`, 'utf8')).replace(/\n$/, '')
export const districtLoader = (scenario, o = {}) => (date) => {
  const sc = districtScenario(scenario)
  return loadDistrictsWeather({ districts: DISTRICTS, url: 'https://fixture.invalid', key: 'k', date, nowMs: sc.nowMs, fetchImpl: sc.fetchImpl, pauseMs: 0, sleep: async () => {}, ...o })
}
// i = 1..6 (F1..F6). scenario null = no district loader at all (the old behaviour).
export async function run(i, scenario, { env = {}, loader = null, limitMs } = {}) {
  const fx = loadFixture(FNAMES[i - 1])
  const loaders = { weather: fx.weatherLoader, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }
  if (loader) loaders.districts = loader
  else if (scenario) loaders.districts = districtLoader(scenario)
  return generate({ date: fx.date, data: DATA, nowIso: fx.nowIso, loaders, env, ...(limitMs ? { districtLimitMs: limitMs } : {}) })
}
// removes the district block (heading .. closing line) and its blank separator
export const withoutSection = (m) => crlf(m).split('\n\n').filter((b) => !b.startsWith(S.districtHeading)).join('\n\n')
export const sectionOf = (m) => crlf(m).split('\n\n').find((b) => b.startsWith(S.districtHeading)) || null
