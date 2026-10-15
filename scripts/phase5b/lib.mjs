// Batch 9 Phase 5B — shared helpers for the web-only persona / listing / contact runs against the
// STAGING website. No emulator. One headless Chromium per script, closed at the end.
//
// Secrets: the shared test password and the persona e-mails/mobiles live ONLY outside the repo in
// C:\Users\usdvi\ks-test-accounts\ (.pw, personas.json). Nothing here prints them; screenshots mask
// password / e-mail / mobile boxes; the repo state file holds ids only.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

export const BASE = 'https://staging.kissansahyog.com'
export const STAGING_REF = 'wzxtqbqlahyahsnoqqva'
export const PROD_REF = 'eltmcznjcqiahqhjvpjg'
export const SECRETS_DIR = process.env.KS_TEST_ACCOUNTS_DIR || 'C:/Users/usdvi/ks-test-accounts'
export const EV = resolve('docs/review/batch9/evidence/phase5b')
export const STATE_FILE = join(EV, 'state.json')
mkdirSync(EV, { recursive: true })

if (new URL(BASE).host !== 'staging.kissansahyog.com') throw new Error('refusing: not the staging host')

export function password() {
  if (process.env.KS_TEST_PW) return process.env.KS_TEST_PW
  return readFileSync(join(SECRETS_DIR, '.pw'), 'utf8').trim()
}
export function personas() {
  return JSON.parse(readFileSync(join(SECRETS_DIR, 'personas.json'), 'utf8'))
}
export function persona(id) {
  const p = personas().find((x) => x.id === id)
  if (!p) throw new Error(`no persona ${id}`)
  return p
}
// Secret-ish values that must never reach a repo file or the terminal.
export function secretValues() {
  const v = [password()]
  for (const p of personas()) v.push(p.email, p.email.toLowerCase(), p.mobile)
  const noise = join(SECRETS_DIR, 'noise.json')
  if (existsSync(noise)) for (const n of JSON.parse(readFileSync(noise, 'utf8'))) { if (n.email) v.push(n.email, n.email.toLowerCase()) ; if (n.mobile) v.push(n.mobile) }
  return v.filter(Boolean)
}
export function scrub(s) {
  let out = String(s)
  for (const v of secretValues()) out = out.split(v).join('«redacted»')
  return out
}
export function log(...a) { console.log(scrub(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '))) }

// ---- town coordinates (from the bundled places seed; the staging places table is the same list) ----
const SEED = JSON.parse(readFileSync(resolve('supabase/seed/sagar_division_places.json'), 'utf8')).places
export function town(name) {
  const p = SEED.find((x) => x.name_en === name)
  if (!p) throw new Error(`no town ${name}`)
  return { lat: Number(p.lat), lng: Number(p.lng), district: p.district, name_hi: p.name_hi, name_en: p.name_en }
}
export function km(a, b) {
  const r = (x) => (x * Math.PI) / 180
  const A = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(A)))
}

// ---- state (repo; ids only) ----
export function loadState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : { personas: {}, listings: [], noise: [], results: [], rows: [] }
}
export function saveState(s) {
  const text = JSON.stringify(s, null, 1)
  for (const v of secretValues()) if (text.includes(v)) throw new Error('refusing to write a secret value into state.json')
  writeFileSync(STATE_FILE, text)
}
export function result(state, r) {
  // r = { area, id, title, status: RAN-PASSED|RAN-FAILED|NOT-RUN|HUMAN-REVIEW, detail, evidence }
  const rec = { at: new Date().toISOString(), ...r, detail: r.detail == null ? null : scrub(typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail)) }
  state.results = state.results.filter((x) => !(x.area === r.area && x.id === r.id))
  state.results.push(rec)
  log(`${r.status}  [${r.area}] ${r.id} ${r.title}${rec.detail ? ' — ' + rec.detail.slice(0, 300) : ''}`)
  return rec
}
export function heartbeat(what) {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  appendFileSync(resolve('docs/review/batch9/HEARTBEAT.log'), `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} | phase5b | ${what}\n`)
}

// ---- browser ----
let _browser = null
export async function browser() {
  if (!_browser) _browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage'] })
  return _browser
}
export async function closeBrowser() { if (_browser) { await _browser.close().catch(() => {}); _browser = null } }

const CONSOLE_ALLOW = [/localhost:\d+/i, /ERR_CONNECTION_REFUSED/i, /img-src/i, /Content Security Policy/i, /favicon/i]

// New phone-sized context. geo = { lat, lng } grants geolocation at that point (device fix).
export async function newPhone({ geo = null, lang = null } = {}) {
  const b = await browser()
  const ctx = await b.newContext({
    viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 KSTEST-phase5b',
    locale: 'hi-IN', timezoneId: 'Asia/Kolkata',
    ...(geo ? { geolocation: { latitude: geo.lat, longitude: geo.lng, accuracy: 30 }, permissions: ['geolocation'] } : {}),
  })
  // Hard guard: nothing may reach production (site or database).
  await ctx.route('**/*', (route) => {
    const u = route.request().url()
    let host = ''
    try { host = new URL(u).host } catch { /* data: etc */ }
    if (u.includes(PROD_REF) || host === 'kissansahyog.com' || host === 'www.kissansahyog.com' || host.endsWith('kissansahyog-prod.pages.dev')) return route.abort()
    return route.continue()
  })
  if (lang) await ctx.addInitScript((l) => { try { if (!localStorage.getItem('ks_lang_v1')) localStorage.setItem('ks_lang_v1', l) } catch { /* */ } }, lang)
  const page = await ctx.newPage()
  page.setDefaultTimeout(25000)
  const diag = { console: [], failed: [], api: [] }
  page.on('console', (m) => { if (m.type() === 'error' && !CONSOLE_ALLOW.some((re) => re.test(m.text()))) diag.console.push(scrub(m.text()).slice(0, 300)) })
  page.on('requestfailed', (r) => { const u = r.url(); if (/supabase\.co|staging\.kissansahyog\.com/.test(u)) diag.failed.push(`${r.method()} ${u.split('?')[0]} ${r.failure()?.errorText || ''}`) })
  page.on('response', (r) => { const u = r.url(); if (/supabase\.co\/(rest|auth|storage)/.test(u)) diag.api.push({ m: r.request().method(), u: u.split('?')[0].replace(/^https:\/\/[^/]+/, ''), s: r.status() }) })
  return { ctx, page, diag }
}

// Screenshot (JPEG, small) with password / e-mail / mobile boxes and the contact sheet masked.
export async function shot(page, dir, name, { full = false, maskContact = true } = {}) {
  const d = join(EV, dir)
  mkdirSync(d, { recursive: true })
  const file = join(d, `${name}.jpg`)
  // Playwright masks are mis-placed on full-page shots, so the values are hidden with CSS instead:
  // password / e-mail / mobile boxes get transparent text, and any element whose own text contains
  // a 10-digit run or an e-mail address is painted over (contact sheet, Post step-3 phone card).
  await page.evaluate(({ maskContact }) => {
    const st = document.createElement('style'); st.id = '__ks_mask'
    st.textContent = 'input[type=password],input[type=email],input[type=tel],#pf_email,#pf_phone,#email,#phone,#f_contact_phone{color:transparent!important;-webkit-text-fill-color:transparent!important;background:#444!important}'
    document.head.appendChild(st)
    const re = /\d{10}|[^\s@]+@[^\s@]+\.[a-z]{2,}/i
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length === 0 && re.test(el.textContent || '') && !/hello@kissansahyog/i.test(el.textContent)) { el.dataset.ksMasked = '1'; el.style.setProperty('background', '#444', 'important'); el.style.setProperty('color', 'transparent', 'important') }
    }
    if (maskContact) for (const el of document.querySelectorAll('[data-testid="contact-sheet"] p')) { el.dataset.ksMasked = '1'; el.style.setProperty('background', '#444', 'important'); el.style.setProperty('color', 'transparent', 'important') }
  }, { maskContact }).catch(() => {})
  await page.screenshot({ path: file, type: 'jpeg', quality: 55, fullPage: full }).catch((e) => log('shot failed', name, String(e.message).split('\n')[0]))
  await page.evaluate(() => {
    document.getElementById('__ks_mask')?.remove()
    for (const el of document.querySelectorAll('[data-ks-masked]')) { el.style.removeProperty('background'); el.style.removeProperty('color'); delete el.dataset.ksMasked }
  }).catch(() => {})
  return file.replace(/\\/g, '/').replace(resolve('.').replace(/\\/g, '/') + '/', '')
}

export async function goto(page, path, settle = 800) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (settle) await page.waitForTimeout(settle)
}

export async function session(page) {
  return page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ks_session_v1') || 'null') } catch { return null } })
}

// ---- auth flows (UI only) ----
export async function pickPlace(page, p) {
  const t = town(p.town)
  await page.fill('[data-testid="place-input"]', p.town)
  await page.waitForSelector('[data-testid="place-suggestions"] button', { timeout: 15000 })
  const btns = page.locator('[data-testid="place-suggestions"] button')
  const n = await btns.count()
  for (let i = 0; i < n; i++) {
    const txt = await btns.nth(i).innerText()
    if ((txt.includes(t.name_en) || txt.includes(t.name_hi)) && (txt.includes(t.district) || txt.includes('सागर') || txt.includes('दमोह') || txt.includes('निवाड़ी') || true)) { await btns.nth(i).click(); break }
  }
  await page.waitForSelector('[data-testid="place-chosen"]', { timeout: 10000 })
  return (await page.locator('[data-testid="place-chosen"]').innerText()).replace(/\s+/g, ' ').trim()
}

export async function fillSignupForm(page, p, pw, { edge = false } = {}) {
  const pad = (v) => (edge ? `  ${v}  ` : v)
  await page.fill('#full_name', pad(p.name))
  await page.fill('#email', pad(p.email))
  await page.fill('#password', pw)
  await page.fill('#phone', p.mobile)
  const placeLabel = await pickPlace(page, p)
  await page.selectOption('#language', p.lang)
  await page.click(p.show ? '[data-testid="visibility-show"]' : '[data-testid="visibility-hidden"]')
  if (p.kisan) {
    const k = p.kisan
    if (k.land_acres) await page.fill('#k_land', k.land_acres)
    if (k.main_crops) await page.fill('#k_crops', k.main_crops)
    if (k.interest_lease) await page.check('[data-testid="k-interest-lease"]')
    if (k.interest_equipment) await page.check('[data-testid="k-interest-equipment"]')
    if (k.whatsapp_opt_in) await page.check('[data-testid="k-whatsapp-optin"]')
    if (k.preferred_mandi) await page.fill('#k_mandi', k.preferred_mandi)
  }
  return placeLabel
}

// Full sign-up through the form. Returns { ok, profileId, autoconfirmSession, error, placeLabel }.
export async function signup(page, p, pw, { edge = false, dir = null } = {}) {
  await goto(page, '/signup')
  const placeLabel = await fillSignupForm(page, p, pw, { edge })
  if (dir) await shot(page, dir, '01-signup-form', { full: true })
  await page.locator('[data-testid="signup-form"] button[type="submit"]').click()
  await page.waitForSelector('[data-testid="disclaimer-accept"]', { timeout: 15000 })
  await page.check('[data-testid="disclaimer-accept"]')
  if (dir) await shot(page, dir, '02-signup-disclaimer')
  const signupResp = page.waitForResponse((r) => r.url().includes('/auth/v1/signup'), { timeout: 30000 }).catch(() => null)
  const regResp = page.waitForResponse((r) => r.url().includes('/rpc/app_register'), { timeout: 40000 }).catch(() => null)
  await page.getByRole('button', { name: /स्वीकार करें और आगे बढ़ें|Accept and continue/ }).click()
  const sr = await signupResp
  let autoconfirmSession = null
  if (sr) { try { const j = await sr.json(); autoconfirmSession = !!(j && (j.access_token || j.session?.access_token)) } catch { /* */ } }
  const rr = await regResp
  let profileId = null, regStatus = rr ? rr.status() : null
  if (rr && rr.ok()) { try { profileId = (await rr.json())?.id || null } catch { /* */ } }
  await page.waitForURL((u) => !/\/signup/.test(u.pathname), { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1200)
  const err = await page.locator('[data-testid="signup-error"]').innerText().catch(() => null)
  const s = await session(page)
  return { ok: !!(s && s.id), profileId: profileId || s?.id || null, autoconfirmSession, signupStatus: sr ? sr.status() : null, regStatus, error: err, placeLabel, url: page.url() }
}

export async function logout(page) {
  await goto(page, '/home', 600)
  const btn = page.getByRole('button', { name: /लॉग आउट|Log out/ }).first()
  if (await btn.count()) await btn.click()
  else await page.evaluate(() => localStorage.removeItem('ks_session_v1'))
  await page.waitForTimeout(1200)
  return !(await session(page))
}

export async function loginEmail(page, email, pw) {
  await goto(page, '/login', 500)
  await page.fill('[data-testid="login-email-form"] #email', email)
  await page.fill('[data-testid="login-email-form"] #password', pw)
  await page.click('[data-testid="login-email-submit"]')
  await Promise.race([
    page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 25000 }),
    page.waitForSelector('[data-testid="login-email-error"], [data-testid="login-email-form"] p.text-red-600', { timeout: 25000 }),
  ]).catch(() => {})
  await page.waitForTimeout(800)
  const err = await page.locator('[data-testid="login-email-error"]').innerText().catch(() => null)
  const s = await session(page)
  return { ok: !!(s && s.id), id: s?.id || null, error: err, url: page.url(), lang: s?.preferred_language }
}

export async function loginPhone(page, mobile) {
  await goto(page, '/login', 500)
  await page.fill('[data-testid="login-phone-form"] #phone', mobile)
  await page.click('[data-testid="login-phone-submit"]')
  await Promise.race([
    page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 25000 }),
    page.waitForSelector('[data-testid="login-phone-error"], [data-testid="login-phone-form"] p.text-red-600', { timeout: 25000 }),
  ]).catch(() => {})
  await page.waitForTimeout(800)
  const err = await page.locator('[data-testid="login-phone-error"]').innerText().catch(() => null)
  const s = await session(page)
  return { ok: !!(s && s.id), id: s?.id || null, error: err, url: page.url(), lang: s?.preferred_language }
}

export async function uiLang(page) {
  return page.evaluate(() => { try { return localStorage.getItem('ks_lang_v1') } catch { return null } })
}
export async function switchLang(page, to) {
  const btn = page.getByRole('button', { name: to === 'en' ? 'EN' : 'हिं', exact: true }).first()
  await btn.click()
  await page.waitForTimeout(1500)
}

// ---- throw-away KSTEST accounts (never KEEP). Stored outside the repo in noise.json. ----
export function noiseList() { const f = join(SECRETS_DIR, 'noise.json'); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [] }
export function saveNoise(list) { writeFileSync(join(SECRETS_DIR, 'noise.json'), JSON.stringify(list, null, 1)) }
// Allocate (not create) a throw-away identity: KSTEST name, @example.com, mobile 00000556NN.
export function newNoise(tag, extra = {}) {
  const list = noiseList()
  const ex = list.find((n) => n.tag === tag)
  if (ex) return ex
  const used = new Set(list.map((n) => n.mobile))
  let i = 1; while (used.has('00000556' + String(i).padStart(2, '0'))) i++
  const n = { tag, name: `KSTEST ${tag} throwaway`, email: `kstest-5b-${tag.toLowerCase()}-${Date.now() % 1000000}@example.com`, mobile: '00000556' + String(i).padStart(2, '0'), town: 'Sagar', district: 'Sagar', lang: 'hi', show: true, kisan: null, ...extra }
  list.push(n); saveNoise(list)
  return n
}
