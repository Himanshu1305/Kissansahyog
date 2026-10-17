#!/usr/bin/env node
// Batch 10A — Task G1 (tests) and G2 (screenshots). STAGING database only, headless Chromium, one test at a time.
//   node --env-file=.env scripts/batch10a/tests.mjs --base http://127.0.0.1:4185 --old-base http://127.0.0.1:4186 [--only T1,T2,...]
//   node --env-file=.env scripts/batch10a/tests.mjs --base http://127.0.0.1:4185 --only CLEANUP
// --skip-post: T5 runs only the old-listing render check (no new rows)
// --base     = local preview of the NEW (release-10a) build, built with `vite build --mode staging`
// --old-base = local preview of the PRE-10A build (tag pre-10a-start), same staging database (only T5 uses it)
// Every listing it creates has a village name starting "KSTEST 10A" (ids in evidence/created-rows-10a.json);
// the one sign-up uses a phone in the reserved e2e range 90000xxxxx (profile + auth user removed by CLEANUP).
// Results: docs/review/batch10a/evidence/results-g1.json; screenshots: evidence/g1/ and evidence/screens/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as T from '../fix9b/lib9b.mjs'
import {
  EQUIPMENT_TAGS, EQUIPMENT_TYPE_DEFAULT_TAGS, SPEC_FIELDS,
  equipmentSpecFields, equipmentSpecMessage,
} from '../../src/lib/listings/catalog.js'

const argv = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null }
const ONLY = argv('--only')?.split(',') || null
const NEW = T.BASE
const OLD = (argv('--old-base') || 'http://127.0.0.1:4186').replace(/\/$/, '')
if (new URL(OLD).host !== '127.0.0.1:4186') throw new Error(`refusing old base ${OLD}`)
if (!/^http:\/\/127\.0\.0\.1:4185$/.test(NEW)) throw new Error(`run with --base http://127.0.0.1:4185 (got ${NEW})`)
const RUN = Date.now().toString(36).slice(-5)
const EV = resolve('docs/review/batch10a/evidence'); mkdirSync(EV, { recursive: true })
const RESULTS = join(EV, 'results-g1.json')
const CREATED = join(EV, 'created-rows-10a.json')
const SUCCESS = /आपकी लिस्टिंग जुड़ गई|Your listing has been posted/
const OFFER_PID = 'P7'
const village = (id) => `KSTEST 10A ${id} ${RUN}`.slice(0, 80)
const RARE = EQUIPMENT_TAGS.find((x) => x.value === 'rare_emergency')

// ---------- results / rows (never secrets) ----------
const loadResults = () => (existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, 'utf8')) : [])
function record(r) {
  const all = loadResults().filter((x) => x.id !== r.id)
  const rec = { at: new Date().toISOString(), base: r.base || NEW, ...r, detail: r.detail == null ? null : JSON.parse(T.scrub(JSON.stringify(r.detail))) }
  all.push(rec)
  const text = JSON.stringify(all, null, 1)
  if (T.scrub(text) !== text) throw new Error('refusing to write a secret into results')
  writeFileSync(RESULTS, text)
  T.log(`${r.status}  ${r.id}${rec.detail ? ' — ' + JSON.stringify(rec.detail).slice(0, 400) : ''}`)
}
async function run(id, fn) {
  try { record({ id, ...(await fn()) }) } catch (e) { record({ id, status: 'RAN-FAILED', detail: { error: T.scrub(String(e.message || e).split('\n')[0].slice(0, 300)) } }) }
}
const loadCreated = () => (existsSync(CREATED) ? JSON.parse(readFileSync(CREATED, 'utf8')) : { listings: [], users: [] })
function remember(kind, item) {
  const all = loadCreated()
  if (!all[kind].some((x) => x.id === item.id)) all[kind].push({ ...item, at: new Date().toISOString() })
  writeFileSync(CREATED, JSON.stringify(all, null, 1))
}

// Screenshot with phone numbers / e-mails / password painted over (same idea as fix9b/fix9c shot()).
async function shot(page, rel, { full = false } = {}) {
  const file = join(EV, rel); mkdirSync(resolve(file, '..'), { recursive: true })
  await page.evaluate(() => {
    if (!document.getElementById('__ks_mask')) {
      const st = document.createElement('style'); st.id = '__ks_mask'
      st.textContent = 'input[type=password],input[type=email],input[type=tel],#phone,#email,#password,#f_contact_phone{color:transparent!important;-webkit-text-fill-color:transparent!important;background:#444!important}'
      document.head.appendChild(st)
    }
    const re = /\d{10}|[^\s@]+@[^\s@]+\.[a-z]{2,}/i
    for (const el of document.querySelectorAll('body *')) if (el.children.length === 0 && re.test(el.textContent || '') && !/hello@kissansahyog/i.test(el.textContent)) { el.style.setProperty('background', '#444', 'important'); el.style.setProperty('color', 'transparent', 'important') }
  }).catch(() => {})
  await page.screenshot({ path: file, type: 'jpeg', quality: 60, fullPage: full }).catch(() => {})
  return `evidence/${rel.replace(/\\/g, '/')}`
}

// ---------- browser helpers (explicit base so one run can drive both builds) ----------
async function go(page, base, path, settle = 800) {
  await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (settle) await page.waitForTimeout(settle)
}
async function login(page, base, mobile) {
  await go(page, base, '/login', 500)
  await page.fill('[data-testid="login-phone-form"] #phone', mobile)
  await page.click('[data-testid="login-phone-submit"]')
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(800)
  const s = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ks_session_v1') || 'null') } catch { return null } })
  return !!s?.id
}
async function phone({ pid = OFFER_PID, base = NEW, lang = 'hi', width = 412, height = 915, loggedIn = true } = {}) {
  const p = T.persona(pid)
  const t = T.town(p.town)
  const ph = await T.newPhone({ lang, width, height, geo: { lat: t.lat + 0.003, lng: t.lng + 0.003 } })
  const errors = []
  ph.page.on('pageerror', (e) => errors.push(`pageerror: ${String(e.message || e).slice(0, 200)}`))
  ph.page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`) })
  if (loggedIn && !(await login(ph.page, base, p.mobile))) throw new Error(`login failed for ${pid}`)
  return { ...ph, p, errors }
}
let TYPE_IDS = null
async function typeIds() {
  if (!TYPE_IDS) TYPE_IDS = Object.fromEntries((await T.stagingSql('select id, name_en from public.equipment_types')).map((r) => [r.name_en, r.id]))
  return TYPE_IDS
}
// NEW build: source on step 1. OLD build: source at the bottom of step 2 (default farmer, nothing to click).
async function toStep2(page, { base = NEW, category = 'equipment', type = 'offer', source = 'farmer', typeName = null } = {}) {
  await go(page, base, '/post', 600)
  if (base === NEW) await page.click(`[data-testid="post-source-${source}"]`)
  await page.click(`[data-testid="post-cat-${category}"]`)
  await page.click(`[data-testid="post-type-${type}"]`)
  await page.click('[data-testid="post-next"]')
  if (base === NEW) await page.waitForSelector('[data-testid="post-source-block"]', { state: 'detached', timeout: 20000 })
  else { await page.waitForSelector('[data-testid="post-source-farmer"]', { timeout: 20000 }); if (source === 'vendor') await page.click('[data-testid="post-source-vendor"]') }
  await page.waitForSelector('[id^="f_"]', { timeout: 20000 })
  if (typeName) { await page.selectOption('#f_equipment_type_id', String((await typeIds())[typeName])); await page.waitForTimeout(250) }
}
function goodValue(f) {
  if (f.dropdown) return 'Swaraj'
  if (f.kind === 'year') return '2022'
  if (f.kind === 'int') return '9'
  if (f.kind === 'gt' || f.kind === 'ge') return f.key === 'power_hp' ? '45' : f.key === 'spec_flight_minutes' ? '20' : '12'
  return `KSTEST ${f.key.replace('spec_', '')}`
}
async function fillSpecs(page, name, { skip = [], values = {} } = {}) {
  for (const f of equipmentSpecFields(name)) {
    if (skip.includes(f.key)) continue
    const v = values[f.key] ?? goodValue(f)
    if (f.dropdown) await page.selectOption('#f_brand', v)
    else await page.fill(`#f_${f.key}`, v)
  }
  if (await page.locator('#f_rate_amount').count()) await page.fill('#f_rate_amount', '800')
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
async function byVillage(v) {
  const [r] = await T.stagingSql(`select count(*)::int n, array_agg(id::text) ids, (array_agg(details))[1] details from public.listings where village_name = '${v.replace(/'/g, "''")}'`)
  for (const id of r.ids || []) remember('listings', { id, village: v })
  return { n: r.n, ids: r.ids || [], details: r.details }
}
const msg = (name, field, l = 'hi') => equipmentSpecMessage({ field, reason: 'required' }, name, l)
const rarePressed = (page) => page.getByRole('button', { name: RARE.hi, exact: true }).getAttribute('aria-pressed')

// =====================================================================================================
// T1 — who-posting is the first control of the Post form; vendor -> contact-consent box on step 3, farmer
// (non-provider category bhusa) -> no box. Nothing is submitted.
// =====================================================================================================
async function T1() {
  await run('T1|who-posting-first', async () => {
    const ph = await phone()
    try {
      const { page } = ph
      await go(page, NEW, '/post', 800)
      const info = await page.evaluate(() => {
        const block = document.querySelector('[data-testid="post-source-block"]')
        const step = block?.parentElement
        const first = step?.querySelector('button, a[href], input, select, textarea')
        const before = (sel) => { const el = document.querySelector(sel); return !!(el && block && (block.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) }
        const r = (sel) => document.querySelector(sel)?.getBoundingClientRect()
        return {
          first_control: first?.getAttribute('data-testid') || first?.tagName,
          block_first_child_of_step: step?.firstElementChild === block,
          before_categories: before('[data-testid="post-cat-equipment"]'),
          before_type: before('[data-testid="post-type-offer"]'),
          farmer_selected_by_default: document.querySelector('[data-testid="post-source-farmer"]')?.getAttribute('aria-pressed') === 'true',
          btn_heights: [r('[data-testid="post-source-farmer"]')?.height, r('[data-testid="post-source-vendor"]')?.height].map(Math.round),
          btn_widths: [r('[data-testid="post-source-farmer"]')?.width, r('[data-testid="post-source-vendor"]')?.width].map(Math.round),
        }
      })
      const evidence = await shot(page, 'g1/T1-post-step1-top.jpg')
      const pass = info.first_control === 'post-source-farmer' && info.block_first_child_of_step && info.before_categories && info.before_type && info.farmer_selected_by_default && info.btn_heights.every((h) => h >= 48) && Math.abs(info.btn_widths[0] - info.btn_widths[1]) <= 1
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: info, evidence }
    } finally { await ph.ctx.close() }
  })
  for (const source of ['vendor', 'farmer']) {
    await run(`T1|contact-consent-${source}`, async () => {
      const ph = await phone()
      try {
        const { page } = ph
        await toStep2(page, { category: 'bhusa', type: 'offer', source })
        // fill step 2 generically (no submit) then go to step 3
        const { fillStep2 } = await import('../phase5b/listings.mjs')
        await fillStep2(page, 'KSTEST 10A T1 (never submitted)')
        await page.click('[data-testid="post-next"]')
        await page.waitForSelector('[data-testid="post-submit"]', { timeout: 20000 })
        const box = await page.locator('[data-testid="contact-consent-box"]').count()
        const evidence = await shot(page, `g1/T1-step3-${source}.jpg`, { full: true })
        const pass = source === 'vendor' ? box === 1 : box === 0
        return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { source, category: 'bhusa/offer', contact_consent_box: box, submitted: false }, evidence }
      } finally { await ph.ctx.close() }
    })
  }
}

// =====================================================================================================
// T2 — equipment offer form: rows at 412 / stack at 360; empty Year/HP block (placeholder is not a value);
// tags directly under the type; Drone pre-ticks rare_emergency; untick sticks (type change, step 3 and back).
// A Drone offer is posted with the pre-ticked tag (used by T3's filter check).
// =====================================================================================================
async function layout(page) {
  return page.evaluate(() => {
    const b = (id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null }
    const p = { year: b('f_year'), hp: b('f_power_hp'), out: b('f_output_per_hour'), unit: b('f_output_unit') }
    const same = (a, c) => !!(a && c) && Math.abs(a.y - c.y) <= 2 && c.x > a.x + a.w - 2
    const stacked = (a, c) => !!(a && c) && c.y >= a.y + a.h && Math.abs(a.x - c.x) <= 2
    const fontPx = parseFloat(getComputedStyle(document.getElementById('f_year')).fontSize)
    return { ...p, year_hp_same_row: same(p.year, p.hp), out_unit_same_row: same(p.out, p.unit), year_hp_stacked: stacked(p.year, p.hp), out_unit_stacked: stacked(p.out, p.unit), no_sideways_scroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, input_font_px: fontPx }
  })
}
async function T2() {
  for (const width of [412, 360]) {
    await run(`T2|rows-${width}`, async () => {
      const ph = await phone({ width })
      try {
        const { page } = ph
        await toStep2(page, { typeName: 'Tractor' })
        const L = await layout(page)
        const evidence = await shot(page, `g1/T2-tractor-${width}.jpg`, { full: true })
        const pass = (width === 412 ? L.year_hp_same_row && L.out_unit_same_row : L.year_hp_stacked && L.out_unit_stacked) && L.no_sideways_scroll && L.input_font_px >= 16
        return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: L, evidence }
      } finally { await ph.ctx.close() }
    })
  }
  await run('T2|empty-year-hp-block', async () => {
    const ph = await phone()
    try {
      const { page } = ph
      const out = {}
      let pass = true
      for (const key of ['year', 'power_hp']) {
        await toStep2(page, { typeName: 'Tractor' })
        await fillSpecs(page, 'Tractor', { skip: [key] })
        const placeholder = await page.getAttribute(`#f_${key}`, 'placeholder')
        const value = await page.inputValue(`#f_${key}`)
        const r = await tryContinue(page)
        const inline = await page.locator(`#f_${key}`).locator('xpath=..').locator('p.text-red-600').innerText().catch(() => '')
        const want = msg('Tractor', key)
        out[key] = { placeholder, value_empty: value === '', blocked: !r.atStep3, visible_error: r.alert, inline_error: inline, expected: want }
        pass &&= !!placeholder && value === '' && !r.atStep3 && r.alert === want && inline === want
        await shot(page, `g1/T2-empty-${key}-blocked.jpg`)
      }
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: out }
    } finally { await ph.ctx.close() }
  })
  await run('T2|tags-under-type', async () => {
    const ph = await phone()
    try {
      const { page } = ph
      await toStep2(page, { typeName: 'Tractor' })
      const info = await page.evaluate((rareLabel) => {
        const typeField = document.getElementById('f_equipment_type_id').closest('div.mb-2')
        const next = typeField?.nextElementSibling
        const btn = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === rareLabel)
        const specs = document.querySelector('[data-testid="equipment-specs"]')
        return { next_sibling_holds_tags: !!(next && btn && next.contains(btn)), tags_before_specs: !!(btn && specs && (btn.compareDocumentPosition(specs) & Node.DOCUMENT_POSITION_FOLLOWING)), tractor_tags_pressed: [...(next?.querySelectorAll('button[aria-pressed="true"]') || [])].length }
      }, RARE.hi)
      const evidence = await shot(page, 'g1/T2-tags-under-type.jpg')
      const pass = info.next_sibling_holds_tags && info.tags_before_specs && info.tractor_tags_pressed === 0 && (EQUIPMENT_TYPE_DEFAULT_TAGS.Tractor || []).length === 0
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: info, evidence }
    } finally { await ph.ctx.close() }
  })
  await run('T2|drone-preticks-and-untick-sticks', async () => {
    const ph = await phone()
    try {
      const { page } = ph
      const ids = await typeIds()
      const s = {}
      await toStep2(page, { typeName: 'Drone' })
      s.drone_pick = await rarePressed(page)
      await shot(page, 'g1/T2-drone-preticked.jpg')
      await page.selectOption('#f_equipment_type_id', String(ids.Tractor)); await page.waitForTimeout(200)
      s.untouched_drone_to_tractor = await rarePressed(page)
      await page.selectOption('#f_equipment_type_id', String(ids.Drone)); await page.waitForTimeout(200)
      s.untouched_back_to_drone = await rarePressed(page)
      await page.getByRole('button', { name: RARE.hi, exact: true }).click()
      s.after_untick = await rarePressed(page)
      await page.selectOption('#f_equipment_type_id', String(ids.Tractor)); await page.waitForTimeout(200)
      s.touched_to_tractor = await rarePressed(page)
      await page.selectOption('#f_equipment_type_id', String(ids.Drone)); await page.waitForTimeout(200)
      s.touched_back_to_drone = await rarePressed(page)
      await fillSpecs(page, 'Drone')
      const go3 = await tryContinue(page)
      s.reached_step3 = go3.atStep3
      if (go3.atStep3) { await page.locator('main button.h-11.w-11').first().click().catch(() => {}); await page.waitForTimeout(600) }
      s.back_on_step2 = (await page.locator('#f_equipment_type_id').count()) === 1
      s.after_step3_and_back = await rarePressed(page).catch(() => null)
      const evidence = await shot(page, 'g1/T2-drone-unticked-sticks.jpg')
      const pass = s.drone_pick === 'true' && s.untouched_drone_to_tractor === 'false' && s.untouched_back_to_drone === 'true' && s.after_untick === 'false' && s.touched_to_tractor === 'false' && s.touched_back_to_drone === 'false' && s.reached_step3 && s.back_on_step2 && s.after_step3_and_back === 'false'
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: s, evidence }
    } finally { await ph.ctx.close() }
  })
  await run('T2|drone-posted-with-preticked-tag', async () => {
    const ph = await phone()
    try {
      const { page } = ph
      await toStep2(page, { typeName: 'Drone' })
      await fillSpecs(page, 'Drone')
      const go3 = await tryContinue(page)
      const vname = village('T2 Drone')
      const ok = go3.atStep3 ? await postFromStep3(page, vname) : false
      const c = await byVillage(vname)
      const d = c.details || {}
      const pass = ok && c.n === 1 && JSON.stringify(d.equipment_tags) === '["rare_emergency"]' && !('__tags_touched' in d) && d.spec_version === 1
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { posted: ok, listings: c.n, saved_tags: d.equipment_tags ?? null, has_tags_touched_flag: '__tags_touched' in d, spec_version: d.spec_version ?? null, id: c.ids[0] || null }, evidence: await shot(page, 'g1/T2-drone-posted.jpg') }
    } finally { await ph.ctx.close() }
  })
}

// =====================================================================================================
// T3 — Browse: equipment chips above the sort row and results; a tag filters (tap + etag deep link);
// tapping the selected chip clears; other categories show no chips.
// =====================================================================================================
async function T3() {
  await run('T3|browse-equipment-chips', async () => {
    const ph = await phone()
    try {
      const { page } = ph
      await go(page, NEW, '/browse?cat=equipment', 2500)
      await page.waitForSelector('[data-testid="listing-card"]', { timeout: 25000 }).catch(() => {})
      const sortLabel = 'नज़दीकी पहले'
      const pos = await page.evaluate((sortText) => {
        const chips = document.querySelector('[data-testid="equipment-tag-filters"]')?.getBoundingClientRect()
        const cats = document.querySelector('[data-testid="browse-cats"]')?.getBoundingClientRect()
        const sortBtn = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === sortText)?.getBoundingClientRect()
        const card = [...document.querySelectorAll('[data-testid="listing-card"]')].find((e) => !e.closest('section'))?.getBoundingClientRect()
        const teaser = document.querySelector('section [data-testid="listing-card"]')?.getBoundingClientRect()
        const chipH = [...document.querySelectorAll('[data-testid^="etag-chip-"]')].map((b) => Math.round(b.getBoundingClientRect().height))
        return { chips_top: chips && Math.round(chips.top), chips_bottom: chips && Math.round(chips.bottom), cats_bottom: cats && Math.round(cats.bottom), sort_top: sortBtn && Math.round(sortBtn.top), first_card_top: card && Math.round(card.top), first_teaser_top: teaser && Math.round(teaser.top), chip_heights: chipH, first_chip: document.querySelector('[data-testid="equipment-tag-filters"] button')?.getAttribute('data-testid') }
      }, sortLabel)
      // result cards only: the "popular" teaser strip (section) is per category and is not tag-filtered (pre-10a behaviour)
      const resultTexts = () => page.$$eval('[data-testid="listing-card"]', (els) => els.filter((e) => !e.closest('section')).map((e) => e.innerText))
      const teasers = () => page.$$eval('[data-testid="listing-card"]', (els) => els.filter((e) => e.closest('section')).length)
      const allCards = (await resultTexts()).length
      const evidence = await shot(page, 'g1/T3-browse-equipment.jpg')
      await page.click(`[data-testid="etag-chip-${RARE.value}"]`); await page.waitForTimeout(800)
      const pressed = await page.getAttribute(`[data-testid="etag-chip-${RARE.value}"]`, 'aria-pressed')
      const cardTexts = await resultTexts()
      const teasersWithFilter = await teasers()
      const filteredOk = cardTexts.length >= 1 && cardTexts.every((t) => t.includes(RARE.hi))
      const hasOurDrone = cardTexts.some((t) => t.includes('ड्रोन') && t.includes('KSTEST'))
      await shot(page, 'g1/T3-browse-rare-filter.jpg')
      await page.click(`[data-testid="etag-chip-${RARE.value}"]`); await page.waitForTimeout(800)
      const cleared = (await page.getAttribute('[data-testid="etag-chip-all"]', 'aria-pressed')) === 'true' && (await resultTexts()).length === allCards
      await go(page, NEW, `/browse?cat=equipment&etag=${RARE.value}`, 2500)
      await page.waitForSelector('[data-testid="listing-card"]', { timeout: 25000 }).catch(() => {})
      const deepPressed = await page.getAttribute(`[data-testid="etag-chip-${RARE.value}"]`, 'aria-pressed')
      const deepTexts = await resultTexts()
      const deepOk = deepPressed === 'true' && deepTexts.length === cardTexts.length && deepTexts.every((t) => t.includes(RARE.hi))
      const pass = pos.chips_top >= pos.cats_bottom && pos.chips_bottom <= pos.sort_top && (pos.first_card_top == null || pos.chips_bottom <= pos.first_card_top) && (pos.first_teaser_top == null || pos.chips_bottom <= pos.first_teaser_top) && hasOurDrone && pos.first_chip === 'etag-chip-all' && pos.chip_heights.every((h) => h >= 44) && pressed === 'true' && filteredOk && cardTexts.length <= allCards && cleared && deepOk && ph.errors.filter((e) => e.startsWith('pageerror')).length === 0
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { ...pos, result_cards_all: allCards, result_cards_rare: cardTexts.length, popular_teasers_not_tag_filtered: teasersWithFilter, every_rare_card_shows_tag: filteredOk, our_drone_in_rare: hasOurDrone, chip_pressed: pressed, tap_selected_clears: cleared, deep_link_pressed: deepPressed, deep_link_cards: deepTexts.length, errors: ph.errors.slice(0, 3) }, evidence }
    } finally { await ph.ctx.close() }
  })
  await run('T3|no-chips-other-categories', async () => {
    const ph = await phone()
    try {
      const { page } = ph
      await go(page, NEW, '/browse?cat=equipment', 1500)
      const cats = await page.$$eval('[data-testid="browse-cats"] [data-testid^="chip-"]', (els) => els.map((e) => e.getAttribute('data-testid').slice(5)))
      const out = {}
      for (const c of cats) {
        await page.click(`[data-testid="chip-${c}"]`); await page.waitForTimeout(400)
        out[c] = await page.locator('[data-testid="equipment-tag-filters"]').count()
      }
      const pass = out.equipment === 1 && Object.entries(out).every(([c, n]) => (c === 'equipment' ? n === 1 : n === 0)) && cats.length >= 5
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { chips_block_per_category: out } }
    } finally { await ph.ctx.close() }
  })
}

// =====================================================================================================
// T4 — Signup: one page, no #language, no farmer block; unticked acknowledgment refused with no request;
// a NEW staging test user (phone 90000xxxxx) registers with the box ticked and lands logged in.
// =====================================================================================================
async function T4() {
  const testPhone = `90000${String(Date.now() % 100000).padStart(5, '0')}`
  const email = `kstest-10a-${testPhone}@example.com`
  await run('T4|signup-one-page-and-register', async () => {
    const ph = await phone({ loggedIn: false, lang: 'en' })
    try {
      const { page } = ph
      const reqs = []
      page.on('request', (r) => { if (/\/auth\/v1\/signup|\/rpc\/app_register/.test(r.url())) reqs.push(r.url().includes('signup') ? 'auth/signup' : 'rpc/app_register') })
      await go(page, NEW, '/signup', 1000)
      const s = {
        language_dropdown: await page.locator('#language').count(),
        farmer_block_fields: await page.locator('[id^="k_"]').count(),
        all_on_one_page: (await page.locator('#full_name').isVisible()) && (await page.locator('[data-testid="disclaimer-accept"]').count()) === 1 && (await page.locator('[data-testid="signup-form"] button[type="submit"]').count()) === 1,
        visibility_ticked_by_default: await page.isChecked('[data-testid="visibility-show"]'),
      }
      await page.fill('#full_name', 'KSTEST 10A Signup')
      await page.fill('#phone', testPhone)
      await page.fill('#email', email)
      await page.fill('#password', `Kstest-10a-${RUN}`)
      await page.fill('[data-testid="place-input"]', 'Khur')
      await page.waitForSelector('[data-testid="place-suggestions"] button', { timeout: 15000 })
      await page.locator('[data-testid="place-suggestions"] button').first().click()
      await page.waitForSelector('[data-testid="place-chosen"]', { timeout: 10000 })
      // unticked acknowledgment -> refused, no request
      await page.click('[data-testid="signup-form"] button[type="submit"]'); await page.waitForTimeout(1200)
      s.unticked_error = (await page.locator('[data-testid="signup-error"]').innerText().catch(() => '')).trim()
      s.unticked_requests = reqs.length
      s.unticked_still_on_signup = /\/signup/.test(new URL(page.url()).pathname)
      await shot(page, 'g1/T4-signup-unticked-refused.jpg', { full: true })
      // ticked -> registers and lands logged in
      await page.check('[data-testid="disclaimer-accept"]')
      const regResp = page.waitForResponse((r) => r.url().includes('/rpc/app_register'), { timeout: 40000 }).catch(() => null)
      await page.click('[data-testid="signup-form"] button[type="submit"]')
      const rr = await regResp
      await page.waitForURL((u) => !/\/signup/.test(u.pathname), { timeout: 25000 }).catch(() => {})
      await page.waitForTimeout(1500)
      const sess = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ks_session_v1') || 'null') } catch { return null } })
      s.register_status = rr ? rr.status() : null
      s.landed_on = new URL(page.url()).pathname
      s.logged_in = !!sess?.id
      if (sess?.id) remember('users', { id: sess.id, phone_prefix: '90000', note: 'T4 signup' })
      const [prof] = sess?.id ? await T.stagingSql(`select preferred_language, (consents #>> '{details_visibility,choice}') vis from public.profiles where id='${sess.id}'`).catch(() => [{}]) : [{}]
      s.profile = prof || null
      const evidence = await shot(page, 'g1/T4-signup-landed.jpg')
      const pass = s.language_dropdown === 0 && s.farmer_block_fields === 0 && s.all_on_one_page && s.visibility_ticked_by_default && s.unticked_error === 'You must accept the notice to continue.' && s.unticked_requests === 0 && s.unticked_still_on_signup && s.logged_in && !/\/signup/.test(s.landed_on)
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: s, evidence }
    } finally { await ph.ctx.close() }
  })
}

// =====================================================================================================
// T5 — Tractor and Thresher offers with the SAME inputs through the NEW build and the PRE-10A build: the saved
// details are identical (except volatile keys); numbers as numbers; spec_version 1; no __tags_touched.
// Old listings without specs still render on Browse / detail without errors.
// =====================================================================================================
const VOLATILE = new Set(['photo_urls', 'client_request_id', 'request_id'])
async function postSame(base, name) {
  const ph = await phone({ base })
  try {
    const { page } = ph
    await toStep2(page, { base, typeName: name })
    await fillSpecs(page, name)
    await page.fill('#f_output_per_hour', '1.5')
    await page.selectOption('#f_rental_basis', 'per_hour')
    const go3 = await tryContinue(page)
    const vname = village(`T5 ${base === NEW ? 'NEW' : 'OLD'} ${name}`)
    const ok = go3.atStep3 ? await postFromStep3(page, vname) : false
    const c = await byVillage(vname)
    await shot(page, `g1/T5-${base === NEW ? 'new' : 'old'}-${name}.jpg`)
    return { ok, n: c.n, id: c.ids[0] || null, details: c.details || {}, blocked: go3.atStep3 ? null : go3.alert, errors: ph.errors.filter((e) => e.startsWith('pageerror')) }
  } finally { await ph.ctx.close() }
}
async function T5() {
  for (const name of process.argv.includes('--skip-post') ? [] : ['Tractor', 'Thresher']) {
    await run(`T5|details-equal-${name}`, async () => {
      const a = await postSame(NEW, name)
      const b = await postSame(OLD, name)
      const keysA = Object.keys(a.details).filter((k) => !VOLATILE.has(k)).sort()
      const keysB = Object.keys(b.details).filter((k) => !VOLATILE.has(k)).sort()
      const diffs = [...new Set([...keysA, ...keysB])].filter((k) => JSON.stringify(a.details[k]) !== JSON.stringify(b.details[k])).map((k) => ({ key: k, new: a.details[k] ?? '(absent)', old: b.details[k] ?? '(absent)' }))
      const numeric = ['year', 'power_hp', 'output_per_hour'].filter((k) => k in a.details)
      const numbersOk = numeric.every((k) => typeof a.details[k] === 'number' && typeof b.details[k] === 'number')
      const pass = a.ok && b.ok && a.n === 1 && b.n === 1 && JSON.stringify(keysA) === JSON.stringify(keysB) && diffs.length === 0 && numbersOk && a.details.spec_version === 1 && !('__tags_touched' in a.details) && JSON.stringify(a.details.equipment_tags) === '[]'
      return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { new_id: a.id, old_id: b.id, posted: { new: a.ok, old: b.ok }, blocked: { new: a.blocked, old: b.blocked }, keys_new: keysA, keys_old: keysB, value_diffs: diffs, numbers_as_numbers: numbersOk, numeric_keys: numeric, spec_version: a.details.spec_version ?? null, tags_new: a.details.equipment_tags ?? null, tags_touched_flag: '__tags_touched' in a.details, page_errors: [...a.errors, ...b.errors].slice(0, 3), details_new: a.details } }
    })
  }
  await run('T5|old-listing-renders', async () => {
    const rows = await T.stagingSql(`select id, village_name, details->>'is_tanker' tanker from public.listings where category='equipment' and listing_type='offer' and status='active' and expires_at > now() and not (details ? 'spec_version') order by coalesce(village_name like 'KSTEST-KEEP%', false) desc, created_at limit 2`)
    const ph = await phone()
    const out = {}
    try {
      const { page } = ph
      await go(page, NEW, '/browse?cat=equipment', 2500)
      await page.waitForSelector('[data-testid="listing-card"]', { timeout: 25000 }).catch(() => {})
      const texts = await page.$$eval('[data-testid="listing-card"]', (els) => els.map((e) => e.innerText))
      for (const r of rows) { const v = r.village_name || ''; out[r.id] = { village_kstest_keep: /KSTEST-KEEP/.test(v), card_on_browse: !!v && texts.some((t) => t.includes(v.slice(0, 18))) } }
      await shot(page, 'g1/T5-old-browse.jpg')
      for (const r of rows) {
        const before = ph.errors.length
        await go(page, NEW, `/listing/${r.id}`, 1500)
        await page.waitForSelector('dl', { timeout: 20000 })
        out[r.id].detail_rows = await page.locator('dl > div').count()
        out[r.id].spec_rows = await page.locator('dl > div[data-spec]').count()
        out[r.id].errors = ph.errors.slice(before)
        await shot(page, `g1/T5-old-detail-${r.id.slice(0, 8)}.jpg`, { full: true })
      }
    } finally { await ph.ctx.close() }
    const vals = Object.values(out)
    const pass = rows.length >= 1 && vals.every((x) => x.detail_rows >= 2 && x.spec_rows === 0 && x.errors.length === 0) && vals.some((x) => x.card_on_browse)
    return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { checked: rows.length, listings: out } }
  })
}

// =====================================================================================================
// SCREENS (G2) — Hindi and English at 360 and 412: Post top, equipment form (Tractor, Thresher offer),
// Browse equipment with chips, Signup.
// =====================================================================================================
async function SCREENS() {
  const made = []
  for (const lang of ['hi', 'en']) {
    for (const width of [360, 412]) {
      await run(`G2|${lang}-${width}`, async () => {
        const ph = await phone({ lang, width, height: 800 })
        const out = {}
        try {
          const { page } = ph
          const sw = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
          await go(page, NEW, '/post', 1000)
          made.push(await shot(page, `screens/post-top-${lang}-${width}.jpg`)); out.post_top_no_hscroll = await sw()
          for (const name of ['Tractor', 'Thresher']) {
            await toStep2(page, { typeName: name })
            made.push(await shot(page, `screens/equipment-${name.toLowerCase()}-offer-${lang}-${width}.jpg`, { full: true })); out[`${name}_no_hscroll`] = await sw()
          }
          await go(page, NEW, '/browse?cat=equipment', 2500)
          await page.waitForSelector('[data-testid="listing-card"]', { timeout: 20000 }).catch(() => {})
          made.push(await shot(page, `screens/browse-equipment-${lang}-${width}.jpg`)); out.browse_no_hscroll = await sw()
        } finally { await ph.ctx.close() }
        const lo = await phone({ lang, width, height: 800, loggedIn: false })
        try {
          await go(lo.page, NEW, '/signup', 1200)
          made.push(await shot(lo.page, `screens/signup-${lang}-${width}.jpg`, { full: true })); out.signup_no_hscroll = await lo.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)
        } finally { await lo.ctx.close() }
        return { status: Object.values(out).every(Boolean) ? 'RAN-PASSED' : 'RAN-FAILED', detail: out }
      })
    }
  }
}

// =====================================================================================================
// CLEANUP — delete ONLY what this script recorded: "KSTEST 10A …" listings (+ their pending village names)
// and the test user(s) in the reserved 90000xxxxx range (profile, then the auth user). KSTEST-KEEP untouched.
// =====================================================================================================
async function CLEANUP() {
  const c = loadCreated()
  const ids = [...new Set(c.listings.map((r) => r.id).filter((x) => /^[0-9a-f-]{36}$/.test(x)))]
  const list = ids.map((x) => `'${x}'`).join(',') || "'00000000-0000-0000-0000-000000000000'"
  const found = await T.stagingSql(`select id, village_name from public.listings where id in (${list})`)
  const bad = found.filter((r) => !String(r.village_name).startsWith('KSTEST 10A ') || /KEEP/i.test(r.village_name))
  if (bad.length) throw new Error(`REFUSED: rows that are not KSTEST 10A rows: ${bad.map((r) => r.id)}`)
  const keepBefore = (await T.stagingSql(`select count(*)::int n from public.listings where village_name like 'KSTEST-KEEP%'`))[0].n
  const del = await T.stagingSql(`with d as (delete from public.listings where id in (${list}) and village_name like 'KSTEST 10A %' returning 1) select count(*)::int n from d`)
  const vc = await T.stagingSql(`with d as (delete from public.village_coordinates where village_name like 'KSTEST 10A %' and status = 'pending' returning 1) select count(*)::int n from d`)
  const uids = [...new Set(c.users.map((u) => u.id).filter((x) => /^[0-9a-f-]{36}$/.test(x)))]
  let profilesDeleted = 0, authDeleted = 0
  for (const id of uids) {
    const [p] = await T.stagingSql(`select phone, email from public.profiles where id='${id}'`)
    if (p && !String(p.phone || '').replace(/\D/g, '').slice(-10).startsWith('90000')) throw new Error(`REFUSED: user ${id} is not in the reserved test range`)
    const l = await T.stagingSql(`with d as (delete from public.listings where user_id='${id}' returning 1) select count(*)::int n from d`)
    const pd = await T.stagingSql(`with d as (delete from public.profiles where id='${id}' returning 1) select count(*)::int n from d`)
    // the profile id is not the auth user id: remove the auth user by its (unique, test-only) e-mail
    const em = String(p?.email || '').toLowerCase()
    const ad = /^kstest-10a-90000\d{5}@example\.com$/.test(em) ? await T.stagingSql(`with d as (delete from auth.users where lower(email)='${em}' returning 1) select count(*)::int n from d`) : [{ n: 0 }]
    profilesDeleted += pd[0].n; authDeleted += ad[0].n
    if (l[0].n) T.log(`also removed ${l[0].n} listing(s) of the test user`)
  }
  // leftovers from an earlier CLEANUP run whose profile is already gone (test-only e-mail pattern)
  const orphan = await T.stagingSql(`with d as (delete from auth.users u where u.email ~ '^kstest-10a-90000[0-9]{5}@example\.com$' and not exists (select 1 from public.profiles p where lower(p.email)=lower(u.email)) returning 1) select count(*)::int n from d`)
  authDeleted += orphan[0].n
  const left10a = (await T.stagingSql(`select count(*)::int n from public.listings where village_name like 'KSTEST 10A %'`))[0].n
  const leftUsers = (await T.stagingSql(`select count(*)::int n from public.profiles where phone like '%90000%' and email like 'kstest-10a-%'`))[0].n
  const keepAfter = (await T.stagingSql(`select count(*)::int n from public.listings where village_name like 'KSTEST-KEEP%'`))[0].n
  const out = { at: new Date().toISOString(), listings_recorded: ids.length, listings_deleted: del[0].n, test_village_names_deleted: vc[0].n, test_users_recorded: uids.length, profiles_deleted: profilesDeleted, auth_users_deleted: authDeleted, kstest_10a_listings_left: left10a, kstest_10a_users_left: leftUsers, kstest_10a_auth_users_left: (await T.stagingSql(`select count(*)::int n from auth.users where email like 'kstest-10a-%'`))[0].n, kstest_keep_listings_before: keepBefore, kstest_keep_listings_after: keepAfter }
  T.log(JSON.stringify(out))
  writeFileSync(join(EV, 'cleanup-10a.json'), JSON.stringify(out, null, 1))
}

const SUITES = { T1, T2, T3, T4, T5, SCREENS, CLEANUP }
for (const [k, fn] of Object.entries(SUITES)) {
  if (ONLY ? !ONLY.includes(k) : k === 'CLEANUP') continue
  T.log(`--- ${k} ---`)
  await fn()
}
await T.closeBrowser()
