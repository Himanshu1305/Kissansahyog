#!/usr/bin/env node
// Batch 9C — equipment spec fields: browser + API tests, STAGING only. The cases are GENERATED from the
// catalog table (src/lib/listings/catalog.js), so they cannot drift from the code.
//   node --env-file=.env scripts/fix9c/tests.mjs --base http://localhost:4173 --only C11,C4
//   node --env-file=.env scripts/fix9c/tests.mjs --base https://staging.kissansahyog.com --only C2,C3 --types Tractor,Drone
// One headless Chromium, one test at a time. Every listing it creates has a village name starting
// "KSTEST 9C" (ids kept in evidence/fix9c/created-rows.json for the clean-up). Results:
// evidence/fix9c/results-<local|deployed>.json; screenshots: evidence/fix9c/<label>/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as T from '../fix9b/lib9b.mjs'
import { fillStep2, testJpeg } from '../phase5b/listings.mjs'
import {
  EQUIPMENT_SPECS, OUTPUT_UNITS, TRACTOR_BRANDS, SPEC_FIELDS,
  equipmentSpecFields, equipmentSpecMessage, optionLabel,
} from '../../src/lib/listings/catalog.js'

const argv = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null }
const ONLY = argv('--only')?.split(',') || null
const TYPES = argv('--types')?.split(',') || Object.keys(EQUIPMENT_SPECS)
const FIELDS = argv('--fields')?.split(',') || null
const RUN = Date.now().toString(36).slice(-5)
const EV = resolve('docs/review/batch9/evidence/fix9c'); mkdirSync(EV, { recursive: true })
const LABEL = T.LABEL
const SUCCESS = /आपकी लिस्टिंग जुड़ गई|Your listing has been posted/
const OFFER_PID = 'P7'
const village = (id) => `KSTEST 9C ${id} ${RUN}`.slice(0, 80)
const slug = (s) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ---------- results / rows / screenshots (own files; never secrets) ----------
const RESULTS = join(EV, `results-${LABEL}.json`)
const CREATED = join(EV, 'created-rows.json')
const loadResults = () => (existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, 'utf8')) : [])
function record(r) {
  const all = loadResults().filter((x) => x.id !== r.id)
  const rec = { at: new Date().toISOString(), base: T.BASE, ...r, detail: r.detail == null ? null : JSON.parse(T.scrub(JSON.stringify(r.detail))) }
  all.push(rec)
  const text = JSON.stringify(all, null, 1)
  if (T.scrub(text) !== text) throw new Error('refusing to write a secret into results')
  writeFileSync(RESULTS, text)
  T.log(`${r.status}  ${r.id}${rec.detail ? ' — ' + JSON.stringify(rec.detail).slice(0, 300) : ''}`)
}
function remember(ids, note) {
  const all = existsSync(CREATED) ? JSON.parse(readFileSync(CREATED, 'utf8')) : []
  for (const id of ids.filter(Boolean)) if (!all.some((x) => x.id === id)) all.push({ id, note, base: LABEL, at: new Date().toISOString() })
  writeFileSync(CREATED, JSON.stringify(all, null, 1))
}
async function shot(page, name, { full = false } = {}) {
  const dir = join(EV, LABEL); mkdirSync(dir, { recursive: true })
  await page.evaluate(() => {
    if (document.getElementById('__ks_mask')) return
    const st = document.createElement('style'); st.id = '__ks_mask'
    st.textContent = 'input[type=tel],#phone{color:transparent!important;-webkit-text-fill-color:transparent!important;background:#444!important}'
    document.head.appendChild(st)
    const re = /\d{10}|[^\s@]+@[^\s@]+\.[a-z]{2,}/i
    for (const el of document.querySelectorAll('body *')) if (el.children.length === 0 && re.test(el.textContent || '') && !/hello@kissansahyog/i.test(el.textContent)) { el.style.setProperty('background', '#444', 'important'); el.style.setProperty('color', 'transparent', 'important') }
  }).catch(() => {})
  await page.screenshot({ path: join(dir, `${name}.jpg`), type: 'jpeg', quality: 50, fullPage: full }).catch(() => {})
  return `evidence/fix9c/${LABEL}/${name}.jpg`
}
function heartbeat(what) {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0')
  writeFileSync(resolve('docs/review/batch9/HEARTBEAT_FIX9C.log'), `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} | tests(${LABEL}) ${what}\n`, { flag: 'a' })
}
async function run(id, fn) {
  if (loadResults().some((x) => x.id === id && x.status === 'RAN-PASSED') && process.argv.includes('--resume')) return
  try { record({ id, ...(await fn()) }) } catch (e) { record({ id, status: 'RAN-FAILED', detail: { error: String(e.message || e).split('\n')[0].slice(0, 300) } }) }
}

// ---------- staging lookups ----------
const TYPE_IDS = Object.fromEntries((await T.stagingSql('select id, name_en from public.equipment_types')).map((r) => [r.name_en, r.id]))
async function byVillage(v) {
  const [r] = await T.stagingSql(`select count(*)::int n, array_agg(id::text) ids, (array_agg(details))[1] details from public.listings where village_name = '${v.replace(/'/g, "''")}'`)
  return { n: r.n, ids: r.ids || [], details: r.details }
}

// ---------- values generated from the catalog ----------
function goodValue(f) {
  if (f.dropdown) return 'Swaraj'
  if (f.kind === 'year') return '2022'
  if (f.kind === 'int') return '9'
  if (f.kind === 'gt' || f.kind === 'ge') return f.key === 'power_hp' ? '45' : f.key === 'spec_flight_minutes' ? '20' : '12'
  return `KSTEST ${f.key.replace('spec_', '')}`
}
function offerDetails(name, { skip = null, over = {}, spec = true } = {}) {
  const d = { equipment_type_id: TYPE_IDS[name], is_tanker: name === 'Water tanker', rental_basis: 'per_hour', rate_amount: 'KSTEST 800', available_now: true, available_from: null, available_to: null, equipment_tags: [] }
  if (spec) d.spec_version = 1
  for (const f of equipmentSpecFields(name)) if (f.key !== skip) d[f.key] = f.kind === 'text' ? goodValue(f) : Number(goodValue(f))
  return { ...d, ...over }
}

// ---------- browser helpers ----------
async function phoneFor(pid, opts = {}) {
  const p = T.persona(pid)
  const t = T.town(p.town)
  const ph = await T.newPhone({ lang: opts.lang || 'hi', geo: { lat: t.lat + 0.003, lng: t.lng + 0.003 }, ...opts })
  const errors = []
  ph.page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)))
  const lr = await T.loginPhone(ph.page, p.mobile)
  if (!lr.ok) throw new Error(`login failed for ${pid}`)
  return { ...ph, p, errors }
}
async function toStep2(page, type = 'offer', typeName = 'Tractor') {
  await T.goto(page, '/post', 600)
  await page.click('[data-testid="post-cat-equipment"]')
  await page.click(`[data-testid="post-type-${type}"]`)
  await page.click('[data-testid="post-next"]')
  await page.waitForSelector('#f_equipment_type_id', { timeout: 20000 })
  await page.selectOption('#f_equipment_type_id', String(TYPE_IDS[typeName]))
  await page.waitForTimeout(250)
}
async function fillSpecs(page, name, { skip = null, values = {} } = {}) {
  for (const f of equipmentSpecFields(name)) {
    if (f.key === skip) continue
    const v = values[f.key] ?? goodValue(f)
    if (f.dropdown) await page.selectOption('#f_brand', v)
    else await page.fill(`#f_${f.key}`, v)
  }
  if (await page.locator('#f_rate_amount').count()) await page.fill('#f_rate_amount', 'KSTEST 800')
}
async function tryContinue(page) {
  await page.click('[data-testid="post-next"]')
  await page.waitForTimeout(500)
  const atStep3 = (await page.locator('[data-testid="post-submit"]').count()) > 0
  const alert = atStep3 ? '' : await page.locator('[role="alert"]').first().innerText().catch(() => '')
  return { atStep3, alert: alert.trim() }
}
async function postFromStep3(page, vname) {
  await page.waitForSelector('[data-testid="post-submit"]', { timeout: 20000 })
  await page.fill('#f_asset_village', vname)
  await page.click('[data-testid="post-location-current"]')
  await page.waitForSelector('[data-testid="post-location-coords"]', { timeout: 20000 }).catch(() => {})
  for (const cb of await page.locator('input[type="checkbox"]:visible').all()) {
    if ((await cb.getAttribute('data-testid')) === 'wide-visibility-checkbox') continue
    if (!(await cb.isChecked())) await cb.check()
  }
  await page.click('[data-testid="post-submit"]')
  return page.getByText(SUCCESS).first().waitFor({ timeout: 45000 }).then(() => true).catch(() => false)
}
// Detail page: rows carrying data-spec, the seller note, page errors.
async function readDetail(page, id) {
  await T.goto(page, `/listing/${id}`, 900)
  await page.waitForSelector('dl', { timeout: 20000 })
  const rows = await page.$$eval('dl > div', (els) => els.map((e) => ({ spec: e.getAttribute('data-spec'), label: e.querySelector('dt')?.innerText.trim(), value: e.querySelector('dd')?.innerText.trim() })))
  const note = await page.locator('[data-testid="spec-seller-note"]').innerText().catch(() => null)
  return { rows, note }
}
const lang = 'hi'
const msg = (name, field, reason = 'required', l = lang) => equipmentSpecMessage({ field, reason }, name, l)

// =====================================================================================================
// C11 — server enforcement through the API (bypassing the form), every mandatory field of every type
// =====================================================================================================
async function apiCreate(details, tag) {
  const p = T.persona(OFFER_PID)
  const vname = village(`API ${tag}`)
  const r = await T.rpc('create_listing_with_location', { p_actor_id: p.profileId, p_listing_type: 'offer', p_category: 'equipment', p_details: details, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: vname, p_rules_agreed: true, p_client_request_id: crypto.randomUUID(), p_contact_consent: false })
  if (r.ok && r.json?.id) remember([r.json.id], `C11 ${tag}`)
  return r
}
async function C11() {
  heartbeat('C11 start')
  for (const name of TYPES) {
    await run(`C11|${name}|valid`, async () => {
      const r = await apiCreate(offerDetails(name), `${name} valid`)
      return { status: r.ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { http: r.status, saved_spec_version: r.json?.details?.spec_version ?? null, error: r.ok ? null : r.text.slice(0, 160) } }
    })
    for (const f of equipmentSpecFields(name)) {
      if (FIELDS && !FIELDS.includes(f.key)) continue
      await run(`C11|${name}|${f.key}`, async () => {
        const r = await apiCreate(offerDetails(name, { skip: f.key }), `${name} no ${f.key}`)
        const want = `equipment_spec_invalid:${f.key}:required`
        return { status: !r.ok && r.text.includes(want) ? 'RAN-PASSED' : 'RAN-FAILED', detail: { http: r.status, refused_with: r.ok ? 'ACCEPTED (wrong)' : (r.json?.message || r.text).slice(0, 120), expected: want } }
      })
    }
  }
  // the same field present but blank / whitespace counts as missing
  await run('C11|blank-values', async () => {
    const r1 = await apiCreate(offerDetails('Tractor', { over: { model: '   ' } }), 'blank model')
    const r2 = await apiCreate(offerDetails('Harvester', { over: { spec_crop: '' } }), 'blank crop')
    const pass = !r1.ok && r1.text.includes('equipment_spec_invalid:model:required') && !r2.ok && r2.text.includes('equipment_spec_invalid:spec_crop:required')
    return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { blank_model: r1.status, blank_crop: r2.status } }
  })
  for (const name of TYPES.filter((n) => EQUIPMENT_SPECS[n].brandDropdown)) {
    await run(`C11|${name}|brand_other`, async () => {
      const bad = await apiCreate(offerDetails(name, { over: { brand: 'other' } }), `${name} other brand no text`)
      const good = await apiCreate(offerDetails(name, { over: { brand: 'other', brand_other: 'KSTEST Brand' } }), `${name} other brand text`)
      const pass = !bad.ok && bad.text.includes('equipment_spec_invalid:brand_other:required') && good.ok
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { without_text: bad.status, with_text: good.status } }
    })
  }
  await run('C11|ranges', async () => {
    const yearMax = new Date().getFullYear() + 1
    const cases = [
      ['Tractor', { year: 1985 }, 'year:range'], ['Tractor', { year: 3000 }, 'year:range'], ['Tractor', { year: 'abc' }, 'year:range'], ['Tractor', { year: yearMax + 1 }, 'year:range'],
      ['Tractor', { power_hp: 0 }, 'power_hp:range'], ['Tractor', { power_hp: 600 }, 'power_hp:range'], ['Tractor', { power_hp: '4O' }, 'power_hp:range'],
      ['Seed Drill', { spec_rows: 0 }, 'spec_rows:range'], ['Seed Drill', { spec_rows: 2.5 }, 'spec_rows:range'], ['Drone', { spec_tank_litres: 0 }, 'spec_tank_litres:range'], ['Drone', { spec_flight_minutes: 'x' }, 'spec_flight_minutes:range'],
    ]
    const out = {}
    let pass = true
    for (const [name, over, want] of cases) {
      const r = await apiCreate(offerDetails(name, { over }), `${name} range ${JSON.stringify(over)}`)
      const ok = !r.ok && r.text.includes(`equipment_spec_invalid:${want}`)
      out[`${name} ${JSON.stringify(over)}`] = ok ? 'refused' : `WRONG (${r.status})`
      pass &&= ok
    }
    for (const [name, over] of [['Other', { power_hp: 0 }], ['Tractor', { year: 1990 }], ['Tractor', { year: yearMax }], ['Tractor', { power_hp: 500 }]]) {
      const r = await apiCreate(offerDetails(name, { over }), `${name} edge ${JSON.stringify(over)}`)
      out[`${name} ${JSON.stringify(over)}`] = r.ok ? 'accepted' : `WRONG (${r.status})`
      pass &&= r.ok
    }
    return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: out }
  })
  await run('C11|older-app-no-spec_version', async () => {
    // exactly what the older APK / cached website sends: no spec_version, no spec fields, 12 parameters
    const p = T.persona(OFFER_PID)
    const d = offerDetails('Tractor', { spec: false }); for (const f of equipmentSpecFields('Tractor')) delete d[f.key]
    const r = await T.rpc('create_listing_with_location', { p_actor_id: p.profileId, p_listing_type: 'offer', p_category: 'equipment', p_details: d, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: village('API old app'), p_rules_agreed: true })
    if (r.json?.id) remember([r.json.id], 'C11 old app')
    return { status: r.ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { http: r.status } }
  })
  await run('C11|trolley-tanker-and-requirement', async () => {
    const tr = await apiCreate(offerDetails('Trolley'), 'Trolley no specs')
    const tk = await apiCreate(offerDetails('Water tanker', { over: { capacity_litres: 5000 } }), 'Tanker no specs')
    const p = T.persona(OFFER_PID)
    const rq = await T.rpc('create_listing_with_location', { p_actor_id: p.profileId, p_listing_type: 'requirement', p_category: 'equipment', p_details: { equipment_type_id: TYPE_IDS.Tractor, spec_version: 1, available_now: true }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: village('API requirement'), p_rules_agreed: true, p_client_request_id: crypto.randomUUID() })
    if (rq.json?.id) remember([rq.json.id], 'C11 requirement')
    return { status: tr.ok && tk.ok && rq.ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { trolley: tr.status, tanker: tk.status, requirement_without_specs: rq.status } }
  })
}

// =====================================================================================================
// C1 (+ C2, C3b) — for EVERY mandatory field of every type: blocked when only that field is empty
// (message names it), then filled -> the post succeeds. The last case of a type checks the detail page.
// =====================================================================================================
async function C1() {
  const ph = await phoneFor(OFFER_PID)
  try {
    for (const name of TYPES) {
      heartbeat(`C1 ${name}`)
      const fields = equipmentSpecFields(name).filter((f) => !FIELDS || FIELDS.includes(f.key))
      let lastId = null
      for (const f of fields) {
        const id = `C1|${name}|${f.key}`
        await run(id, async () => {
          const { page } = ph
          await toStep2(page, 'offer', name)
          await fillSpecs(page, name, { skip: f.key })
          const blocked = await tryContinue(page)
          const want = msg(name, f.key)
          const inline = await page.locator(`#f_${f.key}`).locator('xpath=..').locator('p.text-red-600').innerText().catch(() => '')
          const evidence = await shot(page, `C1-${slug(name)}-${f.key}-blocked`)
          if (f.dropdown) await page.selectOption('#f_brand', goodValue(f)); else await page.fill(`#f_${f.key}`, goodValue(f))
          const after = await tryContinue(page)
          const vname = village(`C1 ${slug(name)} ${f.key}`)
          const ok = after.atStep3 ? await postFromStep3(page, vname) : false
          const c = await byVillage(vname); remember(c.ids, id); lastId = c.ids[0] || lastId
          const saved = c.details || {}
          const pass = !blocked.atStep3 && blocked.alert === want && inline === want && after.atStep3 && ok && c.n === 1 && saved.spec_version === 1 && String(saved[f.key]) === String(f.kind === 'text' ? goodValue(f) : Number(goodValue(f))) && !('output_per_hour' in saved)
          return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { blocked: !blocked.atStep3, message: blocked.alert, message_ok: blocked.alert === want, inline_under_field: inline === want, posted_after_fill: ok, listings: c.n, saved_value: saved[f.key] ?? null }, evidence }
        })
      }
      // C3b: every C1 post above left output per hour empty and still posted
      const c1 = loadResults().filter((r) => r.id.startsWith(`C1|${name}|`))
      if (!FIELDS) record({ id: `C3b|${name}`, status: c1.length && c1.every((r) => r.detail?.posted_after_fill) ? 'RAN-PASSED' : 'RAN-FAILED', detail: { posts_with_output_empty: c1.filter((r) => r.detail?.posted_after_fill).length, of: c1.length } })
      if (lastId && (!FIELDS || process.argv.includes('--c2'))) {
        await run(`C2|${name}`, async () => {
          const { rows, note } = await readDetail(ph.page, lastId)
          const want = equipmentSpecFields(name).map((f) => ({ key: f.key, label: f.label.hi, value: f.dropdown ? optionLabel(TRACTOR_BRANDS, goodValue(f), 'hi') : f.key === 'power_hp' ? `${goodValue(f)} HP` : goodValue(f) }))
          const missing = want.filter((w) => !rows.some((r) => r.spec === w.key && r.label === w.label && r.value === w.value))
          const evidence = await shot(ph.page, `C2-${slug(name)}-detail`, { full: true })
          const pass = missing.length === 0 && note?.includes('विक्रेता द्वारा दी गई जानकारी') && !rows.some((r) => r.spec === 'output_per_hour') && ph.errors.length === 0
          return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { listing: lastId, spec_rows: rows.filter((r) => r.spec).length, missing, seller_note: !!note, output_row_absent: !rows.some((r) => r.spec === 'output_per_hour'), page_errors: ph.errors.slice(0, 3) }, evidence }
        })
      }
    }
  } finally { await ph.ctx.close() }
}

// C3 — output filled: the type's unit is pre-selected and shown with the number on the detail page.
async function C3() {
  const ph = await phoneFor(OFFER_PID)
  try {
    for (const name of TYPES) {
      await run(`C3|${name}`, async () => {
        const { page } = ph
        await toStep2(page, 'offer', name)
        await fillSpecs(page, name)
        const preselected = await page.inputValue('#f_output_unit')
        await page.fill('#f_output_per_hour', '1.5')
        let unitText = optionLabel(OUTPUT_UNITS, EQUIPMENT_SPECS[name].unit, 'hi')
        if (EQUIPMENT_SPECS[name].unit === 'other') {
          const blocked = await tryContinue(page) // "other" unit needs its text once output is filled
          if (blocked.atStep3 || blocked.alert !== msg(name, 'output_unit_other')) return { status: 'RAN-FAILED', detail: { other_unit_text_not_required: blocked } }
          unitText = 'KSTEST गड्ढे'
          await page.fill('#f_output_unit_other', unitText)
        }
        const go = await tryContinue(page)
        const vname = village(`C3 ${slug(name)}`)
        const ok = go.atStep3 ? await postFromStep3(page, vname) : false
        const c = await byVillage(vname); remember(c.ids, `C3 ${name}`)
        const { rows } = c.ids[0] ? await readDetail(page, c.ids[0]) : { rows: [] }
        const out = rows.find((r) => r.spec === 'output_per_hour')
        const evidence = await shot(page, `C3-${slug(name)}-output`, { full: true })
        const pass = preselected === EQUIPMENT_SPECS[name].unit && ok && c.n === 1 && out?.value === `1.5 ${unitText}` && out?.label === SPEC_FIELDS.output_per_hour.label.hi
        return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { preselected_unit: preselected, expected_unit: EQUIPMENT_SPECS[name].unit, posted: ok, shown: out?.value ?? null }, evidence }
      })
    }
  } finally { await ph.ctx.close() }
}

// C4 — invalid year / HP are blocked (Tractor), and "Other" accepts HP 0.
async function C4() {
  const ph = await phoneFor(OFFER_PID)
  try {
    await run('C4|year-and-hp', async () => {
      const { page } = ph
      const out = {}
      let pass = true
      for (const [key, v] of [['year', '1985'], ['year', '3000'], ['year', 'abc'], ['power_hp', '0'], ['power_hp', '600'], ['power_hp', '4O']]) {
        await toStep2(page, 'offer', 'Tractor')
        await fillSpecs(page, 'Tractor', { values: { [key]: v } })
        const r = await tryContinue(page)
        const want = msg('Tractor', key, 'range')
        const ok = !r.atStep3 && r.alert === want
        out[`${key}=${v}`] = ok ? 'blocked' : `WRONG: ${r.atStep3 ? 'went on' : r.alert}`
        pass &&= ok
        await shot(page, `C4-tractor-${key}-${slug(v)}`)
      }
      await toStep2(page, 'offer', 'Other')
      await fillSpecs(page, 'Other', { values: { power_hp: '0' } })
      const hint = await page.locator('#f_power_hp').locator('xpath=..').innerText()
      const z = await tryContinue(page)
      out['Other HP=0'] = z.atStep3 ? 'accepted' : `WRONG: ${z.alert}`
      out['Other hint shown'] = hint.includes('इंजन न हो तो 0 लिखें')
      pass &&= z.atStep3 && out['Other hint shown']
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: out, evidence: await shot(page, 'C4-other-hp0-accepted') }
    })
  } finally { await ph.ctx.close() }
}

// C5 — tractor-type brand dropdown; "Other brand" needs the text box. Other types: brand is free text.
async function C5() {
  const ph = await phoneFor(OFFER_PID)
  try {
    for (const name of TYPES.filter((n) => EQUIPMENT_SPECS[n].brandDropdown)) {
      await run(`C5|${name}`, async () => {
        const { page } = ph
        await toStep2(page, 'offer', name)
        const tag = await page.locator('#f_brand').evaluate((e) => e.tagName)
        const options = await page.$$eval('#f_brand option', (os) => os.map((o) => o.value).filter(Boolean))
        const labels = await page.$$eval('#f_brand option', (os) => os.map((o) => o.textContent))
        await fillSpecs(page, name, { values: { brand: 'other' } })
        const boxShown = await page.locator('#f_brand_other').isVisible()
        const blocked = await tryContinue(page)
        const evidence = await shot(page, `C5-${slug(name)}-other-brand-blocked`)
        await page.fill('#f_brand_other', 'KSTEST Brand')
        const go = await tryContinue(page)
        const vname = village(`C5 ${slug(name)}`)
        const ok = go.atStep3 ? await postFromStep3(page, vname) : false
        const c = await byVillage(vname); remember(c.ids, `C5 ${name}`)
        const { rows } = c.ids[0] ? await readDetail(page, c.ids[0]) : { rows: [] }
        const shown = rows.find((r) => r.spec === 'brand')?.value
        const pass = tag === 'SELECT' && JSON.stringify(options) === JSON.stringify(TRACTOR_BRANDS.map((b) => b.value)) && labels.includes('मैसी फर्ग्यूसन') && boxShown && !blocked.atStep3 && blocked.alert === msg(name, 'brand_other') && ok && c.details?.brand === 'other' && c.details?.brand_other === 'KSTEST Brand' && shown === 'KSTEST Brand'
        return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { dropdown: tag === 'SELECT', brands: options.length, other_box_shown: boxShown, blocked_without_text: !blocked.atStep3, message: blocked.alert, posted_with_text: ok, detail_shows: shown ?? null }, evidence }
      })
    }
    await run('C5|free-text-for-other-types', async () => {
      const { page } = ph
      const out = {}
      for (const name of TYPES.filter((n) => !EQUIPMENT_SPECS[n].brandDropdown)) {
        await toStep2(page, 'offer', name)
        out[name] = await page.locator('#f_brand').evaluate((e) => `${e.tagName}:${e.getAttribute('inputmode') || ''}`)
      }
      return { status: Object.values(out).every((v) => v === 'INPUT:') ? 'RAN-PASSED' : 'RAN-FAILED', detail: out }
    })
  } finally { await ph.ctx.close() }
}

// C6 — requirements: nothing forced; optional min HP saved and shown.
async function C6() {
  const ph = await phoneFor('P2')
  try {
    for (const [name, minHp] of [['Tractor', null], ['Harvester', '40'], ['Seed Drill', '35']]) {
      await run(`C6|${name}`, async () => {
        const { page } = ph
        await toStep2(page, 'requirement', name)
        const specBox = await page.locator('[data-testid="equipment-specs"]').count()
        const minField = await page.locator('#f_min_hp').count()
        const minInputMode = minField ? await page.getAttribute('#f_min_hp', 'inputmode') : null
        if (minHp) await page.fill('#f_min_hp', minHp)
        const go = await tryContinue(page)
        const vname = village(`C6 ${slug(name)}`)
        const ok = go.atStep3 ? await postFromStep3(page, vname) : false
        const c = await byVillage(vname); remember(c.ids, `C6 ${name}`)
        const { rows } = c.ids[0] ? await readDetail(page, c.ids[0]) : { rows: [] }
        const row = rows.find((r) => r.spec === 'min_hp')
        const evidence = await shot(page, `C6-${slug(name)}-requirement`, { full: true })
        const pass = specBox === 0 && minField === 1 && minInputMode === 'decimal' && go.atStep3 && ok && c.n === 1 && (minHp ? c.details?.min_hp === Number(minHp) && row?.value === `${minHp} HP` : !('min_hp' in (c.details || {})) && !row) && !('spec_version' in (c.details || {}))
        return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { offer_spec_fields_hidden: specBox === 0, min_hp_field: minField === 1, nothing_forced: go.atStep3, posted: ok, saved_min_hp: c.details?.min_hp ?? null, shown: row?.value ?? null }, evidence }
      })
    }
    await run('C6|drone-requirement-has-no-min-hp', async () => {
      await toStep2(ph.page, 'requirement', 'Drone')
      const n = await ph.page.locator('#f_min_hp').count()
      return { status: n === 0 ? 'RAN-PASSED' : 'RAN-FAILED', detail: { min_hp_field: n } }
    })
  } finally { await ph.ctx.close() }
}

// C7 — Trolley and Water tanker forms are unchanged, and they post without specs.
async function C7() {
  const ph = await phoneFor(OFFER_PID)
  const BEFORE = { Trolley: ['f_equipment_type_id', 'f_rental_basis', 'f_rate_amount'], 'Water tanker': ['f_equipment_type_id', 'f_capacity_litres', 'f_tanker_vehicle', 'f_water_use', 'f_water_source', 'f_rate_per_trip', 'f_rate_per_1000l', 'f_service_radius_km'] }
  try {
    for (const name of ['Trolley', 'Water tanker']) {
      await run(`C7|${name}`, async () => {
        const { page } = ph
        await toStep2(page, 'offer', name)
        const ids = await page.$$eval('[id^="f_"]', (els) => els.map((e) => e.id))
        const specBox = await page.locator('[data-testid="equipment-specs"]').count()
        if (name === 'Water tanker') await page.fill('#f_capacity_litres', '5000'); else await page.fill('#f_rate_amount', 'KSTEST 500')
        const go = await tryContinue(page)
        const vname = village(`C7 ${slug(name)}`)
        const ok = go.atStep3 ? await postFromStep3(page, vname) : false
        const c = await byVillage(vname); remember(c.ids, `C7 ${name}`)
        const evidence = await shot(page, `C7-${slug(name)}-posted`)
        const specKeys = Object.keys(c.details || {}).filter((k) => Object.keys(SPEC_FIELDS).includes(k))
        const pass = JSON.stringify(ids) === JSON.stringify(BEFORE[name]) && specBox === 0 && ok && c.n === 1 && specKeys.length === 0
        return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { fields: ids, same_as_before: JSON.stringify(ids) === JSON.stringify(BEFORE[name]), spec_fields_shown: specBox, posted: ok, spec_keys_saved: specKeys }, evidence }
      })
    }
  } finally { await ph.ctx.close() }
}

// C8 — equipment listings posted before this change still render (detail + card), no errors.
async function C8() {
  await run('C8|older-listings', async () => {
    const rows = await T.stagingSql(`select id, details->>'is_tanker' tanker from public.listings where category='equipment' and status='active' and expires_at > now() and not (details ? 'spec_version') and created_at < now() - interval '2 hours' order by (details->>'is_tanker') nulls last, created_at limit 4`)
    const ph = await T.newPhone({ lang: 'hi' })
    const errors = []; ph.page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)))
    const out = {}
    try {
      for (const r of rows) {
        const { rows: dl, note } = await readDetail(ph.page, r.id)
        out[r.id] = { rows: dl.length, spec_rows: dl.filter((x) => x.spec).length, seller_note: !!note, tanker: r.tanker === 'true' }
        await shot(ph.page, `C8-old-${r.id.slice(0, 8)}`, { full: true })
      }
    } finally { await ph.ctx.close() }
    const pass = rows.length >= 2 && Object.values(out).every((x) => x.rows >= 2 && x.spec_rows === 0 && !x.seller_note) && errors.length === 0
    return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { checked: rows.length, listings: out, page_errors: errors.slice(0, 3) } }
  })
}

// C9 — Hindi + English labels at 360 px, normal and large font; number keyboard; card line not cut;
// the lowest spec box is not hidden behind the keyboard (short screen = screen with keyboard open).
async function C9() {
  for (const l of ['hi', 'en']) {
    for (const fontScale of [1, 1.3]) {
      await run(`C9|form-${l}-font${fontScale}`, async () => {
        const ph = await phoneFor(OFFER_PID, { lang: l, width: 360, height: 760, fontScale })
        try {
          const { page } = ph
          await toStep2(page, 'offer', 'Harvester')
          const out = { labels: {}, inputmode: {}, tap_height: {} }
          for (const f of equipmentSpecFields('Harvester')) {
            const lab = await page.locator(`label[for="f_${f.key}"]`).innerText()
            out.labels[f.key] = lab.includes(f.label[l])
            out.inputmode[f.key] = (await page.getAttribute(`#f_${f.key}`, 'inputmode')) || 'text'
            out.tap_height[f.key] = Math.round((await page.locator(`#f_${f.key}`).boundingBox()).height)
          }
          out.no_sideways_scroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
          const evidence = await shot(page, `C9-form-${l}-360-font${fontScale}`, { full: true })
          const numericOk = equipmentSpecFields('Harvester').every((f) => (f.kind === 'text') === (out.inputmode[f.key] === 'text') && (f.kind === 'text' || out.inputmode[f.key] === 'decimal'))
          const pass = Object.values(out.labels).every(Boolean) && numericOk && Object.values(out.tap_height).every((h) => h >= 44) && out.no_sideways_scroll && ph.errors.length === 0
          return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: out, evidence }
        } finally { await ph.ctx.close() }
      })
    }
  }
  await run('C9|keyboard-short-screen', async () => {
    const ph = await phoneFor(OFFER_PID, { width: 360, height: 420 })
    try {
      const { page } = ph
      await toStep2(page, 'offer', 'Drone')
      const out = {}
      for (const key of ['spec_flight_minutes', 'output_per_hour', 'rate_amount']) {
        // focus as a tap does, starting from the top of the page; the browser itself must bring it into view
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.evaluate((k) => document.getElementById(`f_${k}`).focus(), key)
        await page.waitForTimeout(400)
        const bb = await page.locator(`#f_${key}`).boundingBox()
        out[key] = bb && bb.y >= 0 && bb.y + bb.height <= 420
        await page.keyboard.type('12')
      }
      const evidence = await shot(page, 'C9-keyboard-short-screen')
      return { status: Object.values(out).every(Boolean) ? 'RAN-PASSED' : 'RAN-FAILED', detail: { visible_when_focused_in_420px_high_screen: out }, evidence }
    } finally { await ph.ctx.close() }
  })
  for (const l of ['hi', 'en']) {
    await run(`C9|card-line-${l}`, async () => {
      const ph = await phoneFor(OFFER_PID, { lang: l, width: 360, height: 760, fontScale: 1.3 })
      try {
        const { page } = ph
        // a listing of this run with a long, complete spec line (C3 Harvester: brand, model, year, HP, output)
        await T.goto(page, '/my', 1500)
        await page.waitForSelector('[data-testid="listing-card"]', { timeout: 20000 })
        const cards = await page.$$eval('[data-testid="equipment-spec-line"]', (els) => els.map((e) => ({ text: e.innerText, cut: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 || getComputedStyle(e).textOverflow === 'ellipsis' || getComputedStyle(e).whiteSpace === 'nowrap', right: Math.round(e.getBoundingClientRect().right) })))
        const withOutput = cards.find((c) => /1\.5/.test(c.text)) || cards[0]
        const evidence = await shot(page, `C9-card-${l}-360-font1.3`)
        const pass = cards.length > 0 && cards.every((c) => !c.cut && c.right <= 360) && !!withOutput && /HP/.test(withOutput.text)
        return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { spec_lines: cards.length, example: withOutput?.text ?? null, any_cut: cards.some((c) => c.cut || c.right > 360) }, evidence }
      } finally { await ph.ctx.close() }
    })
  }
}

// C11UI — the form's check is bypassed (the request is changed in flight): the server refuses and the
// phone shows the same message the form would have shown.
async function C11UI() {
  await run('C11UI|server-message-in-app', async () => {
    const ph = await phoneFor(OFFER_PID)
    try {
      const { page } = ph
      await toStep2(page, 'offer', 'Tractor')
      await fillSpecs(page, 'Tractor')
      await tryContinue(page)
      await page.route('**/rest/v1/rpc/create_listing_with_location', async (route) => {
        const body = JSON.parse(route.request().postData())
        delete body.p_details.model
        await route.continue({ postData: JSON.stringify(body) })
      })
      const vname = village('C11UI')
      await postFromStep3(page, vname)
      await page.waitForTimeout(1500)
      const alert = await page.locator('[role="alert"]').first().innerText().catch(() => '')
      const c = await byVillage(vname)
      const evidence = await shot(page, 'C11UI-server-refusal-message')
      const want = msg('Tractor', 'model')
      return { status: alert.trim() === want && c.n === 0 ? 'RAN-PASSED' : 'RAN-FAILED', detail: { shown: alert.trim(), expected: want, listings_created: c.n }, evidence }
    } finally { await ph.ctx.close() }
  })
}

// C10 — one post in each of the other 10 categories (not equipment): nothing else broke.
async function C10() {
  const REG = [['labor', 'offer'], ['drone_didi', 'offer'], ['bhusa', 'offer'], ['agri_inputs', 'offer'], ['building_materials', 'offer'], ['warehouse', 'offer'], ['greenhouse', 'offer'], ['jugaad', 'offer'], ['transport', 'offer'], ['land', 'requirement']]
  const ph = await phoneFor(OFFER_PID)
  try {
    for (const [cat, type] of REG) {
      await run(`C10|${cat}`, async () => {
        const { page } = ph
        const vname = village(`C10 ${cat}`)
        await T.goto(page, '/post', 800)
        await page.click(`[data-testid="post-cat-${cat}"]`)
        await page.click(`[data-testid="post-type-${type}"]`)
        await page.click('[data-testid="post-next"]')
        await page.waitForSelector('[data-testid="post-source-farmer"]', { timeout: 20000 })
        await page.waitForTimeout(400)
        await fillStep2(page, `KSTEST 9C C10 ${RUN}`, vname)
        if (cat === 'jugaad') { await page.setInputFiles('input[type="file"]', { name: 'kstest-9c.jpg', mimeType: 'image/jpeg', buffer: await testJpeg('KSTEST 9C') }); await page.waitForTimeout(500) }
        await page.click('[data-testid="post-next"]')
        await page.waitForSelector('[data-testid="post-submit"]', { timeout: 20000 })
        if (cat === 'transport') { await page.fill('#f_transport_from', vname); await page.fill('#f_transport_to', `${vname} to Damoh`) } else await page.fill('#f_asset_village', vname)
        await page.click('[data-testid="post-location-current"]')
        await page.waitForSelector('[data-testid="post-location-coords"]', { timeout: 20000 }).catch(() => {})
        for (const cb of await page.locator('input[type="checkbox"]:visible').all()) {
          if ((await cb.getAttribute('data-testid')) === 'wide-visibility-checkbox') continue
          if (!(await cb.isChecked())) await cb.check()
        }
        await page.click('[data-testid="post-submit"]')
        const ok = await page.getByText(SUCCESS).first().waitFor({ timeout: 45000 }).then(() => true).catch(() => false)
        const c = await byVillage(vname); remember(c.ids, `C10 ${cat}`)
        let rendered = false
        if (c.ids[0]) { const d = await readDetail(page, c.ids[0]).catch(() => null); rendered = !!d && d.rows.length > 0 }
        const evidence = await shot(page, `C10-${cat}`)
        return { status: ok && c.n === 1 && rendered ? 'RAN-PASSED' : 'RAN-FAILED', detail: { posted: ok, listings: c.n, detail_renders: rendered }, evidence }
      })
    }
  } finally { await ph.ctx.close() }
}

const SUITES = { C11, C11UI, C4, C5, C1, C3, C6, C7, C8, C9, C10 }
for (const [k, fn] of Object.entries(SUITES)) {
  if (ONLY && !ONLY.includes(k)) continue
  heartbeat(`suite ${k} start`)
  await fn()
  heartbeat(`suite ${k} done`)
}
await T.closeBrowser()
