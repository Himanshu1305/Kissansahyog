#!/usr/bin/env node
// Batch 15A - one-time fetch of monthly Modal prices 2016-01..2025-10 from the CEDA Agri-Market Data portal
// (Ashoka University; republishes Agmarknet / DMI data). Run by the builder on this machine only; the browser app
// never calls CEDA. Polite: max 2 requests at a time, 3 tries with growing wait, stops if blocked (HTTP 401/403/429).
//   node scripts/fetch-mandi-history.mjs
// Writes data/mandi-history/ceda-monthly-2016-2025.json and prints the verification table.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const BASE = 'https://agmarknet.ceda.ashoka.edu.in'
const STATE_ID = 23 // Madhya Pradesh
const FIRST = '2016-01'
const LAST = '2025-10'
// Every answered request is cached here (outside the repo), so a run that is interrupted by a busy server can simply be
// started again and continues where it stopped; delete the folder to fetch everything fresh.
const CACHE = pathToFileURL(join(tmpdir(), 'ks-ceda-cache') + sep)
mkdirSync(CACHE, { recursive: true })
const OUT = new URL('../data/mandi-history/ceda-monthly-2016-2025.json', import.meta.url)

// our mandi_prices.commodity_en -> CEDA commodity_disp_name (resolved by exact name, ids are only checked)
const CROPS = [
  ['Wheat', 'Wheat', 1], ['Gram', 'Bengal Gram (Gram)(Whole)', 6], ['Lentil', 'Lentil (Masur)(Whole)', 63],
  ['Mustard', 'Mustard', 12], ['Barley', 'Barley (Jau)', 29], ['Soyabean', 'Soyabean', 13],
  ['Moong', 'Green Gram (Moong)(Whole)', 9], ['Urad', 'Black Gram (Urad Beans)(Whole)', 8],
  ['Paddy(Dhan)(Common)', 'Paddy(Dhan)(Common)', 2], ['Maize', 'Maize', 4], ['Garlic', 'Garlic', 25], ['Linseed', 'Linseed', 67],
]
const DISTRICTS = [['Tikamgarh', 424], ['Chhatarpur', 425], ['Panna', 426], ['Sagar', 427], ['Damoh', 428]]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
class Blocked extends Error {}

async function call(path, init) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(BASE + path, init)
      if ([401, 403, 429].includes(res.status)) throw new Blocked(`HTTP ${res.status} on ${path} - the site is blocking us; stopping (not trying to get around it)`)
      const text = await res.text()
      try { return JSON.parse(text) } catch { throw new Error(`HTTP ${res.status}, not JSON (busy server / gateway page)`) } // retried
    } catch (e) {
      if (e instanceof Blocked) throw e
      if (attempt === 3) throw new Error(`${path} failed after 3 tries: ${e.message}`)
      console.error(`  ${path} try ${attempt}: ${e.message}; waiting ${30 * attempt}s`)
      await sleep(30000 * attempt)
    }
  }
}
async function prices(commodity_id, district_id, end) {
  const file = new URL(`c${commodity_id}-d${district_id ?? 'mp'}-${end}.json`, CACHE)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  const res = await call('/api/prices', {
    method: 'POST', headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({ state_id: STATE_ID, commodity_id, district_id, calculation_type: 'm', start_date: '2016-01-01', end_date: end }),
  })
  writeFileSync(file, JSON.stringify(res))
  return res
}

// at most 2 jobs in flight allowed; we use 1 (the server answers slowly and returns HTML error pages when busy)
async function pool(jobs, n = 1) {
  const out = new Array(jobs.length); let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k]() } }))
  return out
}

const today = new Date().toISOString().slice(0, 10)
const commodities = (await call('/api/commodities')).data
const districts = (await call(`/api/districts?state_id=${STATE_ID}`)).data
const states = (await call('/api/states')).data
if (states.find((s) => s.census_state_id === STATE_ID)?.census_state_name !== 'Madhya Pradesh') throw new Error('state 23 is not Madhya Pradesh')
for (const [name, id] of DISTRICTS) {
  const d = districts.find((x) => x.census_district_name === name)
  if (!d || d.census_district_id !== id) throw new Error(`district ${name} is not id ${id}: ${JSON.stringify(d)}`)
}
const ids = {}
for (const [en, disp, expect] of CROPS) {
  const c = commodities.find((x) => x.commodity_disp_name === disp)
  if (!c) throw new Error(`CEDA has no commodity named "${disp}"`)
  if (c.commodity_id !== expect) throw new Error(`"${disp}" has id ${c.commodity_id}, expected ${expect}`)
  ids[en] = c.commodity_id
}

const inRange = (t) => t >= FIRST && t <= LAST
const result = {}
const extra = {} // months after LAST that CEDA also returned (reported, not stored)
for (const [en] of CROPS) {
  console.error(`fetching ${en} ...`)
  const jobs = [() => prices(ids[en], null, today), ...DISTRICTS.map(([, did]) => () => prices(ids[en], did, today))]
  const [state, ...dist] = await pool(jobs)
  const mp = {}
  for (const r of state.data || []) { if (r.p_modal > 0 && inRange(r.t)) mp[r.t] = Math.round(r.p_modal); else if (r.t > LAST) extra[r.t] = 1 }
  const perMonth = {}
  for (const d of dist) for (const r of d.data || []) if (r.p_modal > 0 && inRange(r.t)) (perMonth[r.t] ||= []).push(Number(r.p_modal))
  const division = {}
  for (const [t, arr] of Object.entries(perMonth)) division[t] = { price: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length), districts_reporting: arr.length }
  const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)))
  result[en] = { ceda_commodity: CROPS.find((c) => c[0] === en)[1], ceda_id: ids[en], mp: sortKeys(mp), sagar_division: sortKeys(division) }
}

mkdirSync(new URL('../data/mandi-history/', import.meta.url), { recursive: true })
const doc = {
  source: 'CEDA Agri-Market Data portal (Ashoka University), republishing Agmarknet data of the Directorate of Marketing & Inspection (DMI), Ministry of Agriculture and Farmers Welfare, Government of India',
  url: 'https://agmarknet.ceda.ashoka.edu.in/',
  fetched_on: today, first_month: FIRST, last_month: LAST, unit: 'rupees per quintal, monthly Modal price',
  sagar_division_districts: DISTRICTS.map(([n, id]) => ({ name: n, ceda_id: id })),
  how: 'mp = state-level monthly p_modal rounded to a whole rupee; sagar_division = plain mean of p_modal over the five districts that reported (value > 0) in that month, rounded; missing months are left out, never interpolated',
  commodities: result,
}
writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n')
console.error(`months after ${LAST} returned by CEDA (not stored): ${Object.keys(extra).sort().join(', ') || 'none'}`)

// verification table
const EXPECT = {
  'Wheat': [118, 118, [1616, 5], [2454, 5], 2497, 231162, 237616], 'Gram': [118, 118, [4653, 5], [5286, 4], 5302, 571715, 572745],
  'Lentil': [118, 118, [5067, 4], [6196, 4], 5996, 588624, 578813], 'Mustard': [118, 118, [4906, 5], [5947, 5], 6229, 537653, 546571],
  'Barley': [118, 118, [1256, 2], [2138, 3], 2237, 204362, 208585], 'Soyabean': [118, 118, [4910, 4], [3847, 5], 3912, 480324, 486728],
  'Moong': [94, 101, [5810, 1], [6042, 2], 6636, 473474, 550218], 'Urad': [111, 111, [4971, 5], [5727, 5], 5693, 547697, 542247],
  'Paddy(Dhan)(Common)': [95, 118, [1120, 1], [1801, 3], 2366, 156370, 236271], 'Maize': [94, 118, [1147, 1], [1676, 3], 1641, 194238, 191820],
  'Garlic': [116, 118, [3685, 2], [3408, 3], 3768, 503220, 590328], 'Linseed': [113, 118, [5110, 2], [7141, 2], 7223, 593207, 611981],
}
const sum = (o, f = (x) => x) => Object.values(o).reduce((a, b) => a + f(b), 0)
let allOk = true
const rows = []
for (const [en, e] of Object.entries(EXPECT)) {
  const c = result[en]; const d = c.sagar_division
  const got = [Object.keys(d).length, Object.keys(c.mp).length, [d['2021-03']?.price, d['2021-03']?.districts_reporting], [d['2025-10']?.price, d['2025-10']?.districts_reporting], c.mp['2025-10'], sum(d, (x) => x.price), sum(c.mp)]
  const ok = got[0] === e[0] && got[1] === e[1] && got[2][1] === e[2][1] && Math.abs(got[2][0] - e[2][0]) <= 2 && got[3][1] === e[3][1] && Math.abs(got[3][0] - e[3][0]) <= 2
    && Math.abs(got[4] - e[4]) <= 2 && Math.abs(got[5] - e[5]) <= 60 && Math.abs(got[6] - e[6]) <= 60
  if (!ok) allOk = false
  rows.push({ en, e, got, ok })
}
console.log(JSON.stringify({ allOk, rows }))
if (!allOk) process.exitCode = 3
