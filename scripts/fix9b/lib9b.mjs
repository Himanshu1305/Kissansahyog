// Batch 9B — test helpers (staging only). One headless Chromium, phone-sized contexts, one at a time.
// Base URL: --base http://localhost:4173 (local preview of the new build, staging database) or
// https://staging.kissansahyog.com (deployed). Anything that points at production is aborted.
// Persona logins come from C:\Users\usdvi\ks-test-accounts\ (never printed: see scrub()).
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'
import { stagingSql } from './stagingSql.mjs'
import { persona as personaSecret, scrub, town } from '../phase5b/lib.mjs'

export { scrub, town, stagingSql }
export const PROD_REF = 'eltmcznjcqiahqhjvpjg'
export const SUPA = process.env.VITE_SUPABASE_URL
export const ANON = process.env.VITE_SUPABASE_ANON_KEY
export const EV = resolve('docs/review/batch9/evidence/fix9b')
mkdirSync(EV, { recursive: true })

const argBase = (() => { const i = process.argv.indexOf('--base'); return i > 0 ? process.argv[i + 1] : 'http://localhost:4173' })()
export const BASE = argBase.replace(/\/$/, '')
{
  const h = new URL(BASE).host
  if (!['localhost:4173', '127.0.0.1:4173', 'staging.kissansahyog.com'].includes(h)) throw new Error(`refusing base ${BASE}`)
}
export const LABEL = BASE.includes('staging.kissansahyog.com') ? 'deployed' : 'local'

const P5B = JSON.parse(readFileSync(resolve('docs/review/batch9/evidence/phase5b/state.json'), 'utf8')).personas
export function persona(id) {
  const s = personaSecret(id)
  return { id, mobile: s.mobile, town: s.town, lang: s.lang, profileId: P5B[id].profileId || P5B[id].id }
}

export function log(...a) { console.log(scrub(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '))) }
export function heartbeat(what) {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0')
  appendFileSync(resolve('docs/review/batch9/HEARTBEAT_FIX9B.log'), `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} tests(${LABEL}) ${what}\n`)
}

// ---- results + created rows (ids only) ----
const RESULTS = join(EV, `results-${LABEL}.json`)
const CREATED = join(EV, 'created-rows.json')
export function loadResults() { return existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, 'utf8')) : [] }
export function record(r) {
  const all = loadResults().filter((x) => x.id !== r.id)
  const rec = { at: new Date().toISOString(), base: BASE, ...r, detail: r.detail == null ? null : JSON.parse(scrub(JSON.stringify(r.detail))) }
  all.push(rec)
  const text = JSON.stringify(all, null, 1)
  if (scrub(text) !== text) throw new Error('refusing to write a secret into results')
  writeFileSync(RESULTS, text)
  log(`${r.status}  ${r.id} ${r.title}${rec.detail ? ' — ' + JSON.stringify(rec.detail).slice(0, 400) : ''}`)
}
export function rememberRows(ids, note) {
  const all = existsSync(CREATED) ? JSON.parse(readFileSync(CREATED, 'utf8')) : []
  for (const id of ids.filter(Boolean)) if (!all.some((x) => x.id === id)) all.push({ id, note, base: LABEL, at: new Date().toISOString() })
  writeFileSync(CREATED, JSON.stringify(all, null, 1))
}

// ---- browser ----
let _b = null
export async function browser() { if (!_b) _b = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage'] }); return _b }
export async function closeBrowser() { if (_b) { await _b.close().catch(() => {}); _b = null } }

export async function newPhone({ lang = 'hi', width = 412, height = 915, geo = null, fontScale = 1 } = {}) {
  const b = await browser()
  const ctx = await b.newContext({
    viewport: { width, height }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 KSTEST-fix9b',
    locale: 'hi-IN', timezoneId: 'Asia/Kolkata', serviceWorkers: 'block',
    ...(geo ? { geolocation: { latitude: geo.lat, longitude: geo.lng, accuracy: 30 }, permissions: ['geolocation'] } : {}),
  })
  await ctx.route('**/*', (route) => {
    const u = route.request().url()
    let host = ''
    try { host = new URL(u).host } catch { /* data: */ }
    if (u.includes(PROD_REF) || host === 'kissansahyog.com' || host === 'www.kissansahyog.com' || host.endsWith('kissansahyog-prod.pages.dev')) return route.abort()
    return route.fallback()
  })
  await ctx.addInitScript(({ l, fs }) => {
    try { localStorage.setItem('ks_lang_v1', l) } catch { /* */ }
    if (fs !== 1) document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${Math.round(fs * 100)}%` })
  }, { l: lang, fs: fontScale })
  const page = await ctx.newPage()
  page.setDefaultTimeout(25000)
  const net = { rpcCreate: 0, bodies: [] }
  page.on('request', (r) => { if (r.url().includes('/rpc/create_listing_with_location')) net.rpcCreate++ })
  page.on('response', async (r) => {
    const u = r.url()
    if (/supabase\.co\/rest\/v1\/(listings|rpc\/get_listing_contact|rpc\/search_listings)/.test(u)) { try { net.bodies.push(await r.text()) } catch { /* */ } }
  })
  return { ctx, page, net }
}

export async function goto(page, path, settle = 800) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (settle) await page.waitForTimeout(settle)
}

export async function loginPhone(page, mobile) {
  await goto(page, '/login', 500)
  await page.fill('[data-testid="login-phone-form"] #phone', mobile)
  await page.click('[data-testid="login-phone-submit"]')
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(800)
  const s = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ks_session_v1') || 'null') } catch { return null } })
  return { ok: !!s?.id, id: s?.id || null }
}

// Screenshot with every 10-digit run / e-mail and input boxes painted over.
export async function shot(page, name, { full = true } = {}) {
  const dir = join(EV, LABEL); mkdirSync(dir, { recursive: true })
  const file = join(dir, `${name}.jpg`)
  await page.evaluate(() => {
    const st = document.createElement('style'); st.id = '__ks_mask'
    st.textContent = 'input[type=password],input[type=email],input[type=tel],#phone,#f_contact_phone{color:transparent!important;-webkit-text-fill-color:transparent!important;background:#444!important}'
    document.head.appendChild(st)
    const re = /\d{10}|[^\s@]+@[^\s@]+\.[a-z]{2,}/i
    for (const el of document.querySelectorAll('body *')) if (el.children.length === 0 && re.test(el.textContent || '') && !/hello@kissansahyog/i.test(el.textContent)) { el.style.setProperty('background', '#444', 'important'); el.style.setProperty('color', 'transparent', 'important') }
  }).catch(() => {})
  await page.screenshot({ path: file, type: 'jpeg', quality: 55, fullPage: full }).catch(() => {})
  return `evidence/fix9b/${LABEL}/${name}.jpg`
}

// ---- REST as the public key (exactly what the app sends for logged-out and logged-in users) ----
const H = () => ({ apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' })
export async function rpc(name, body) {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${name}`, { method: 'POST', headers: H(), body: JSON.stringify(body) })
  const text = await r.text()
  let json = null; try { json = JSON.parse(text) } catch { /* */ }
  return { ok: r.ok, status: r.status, text, json }
}
export async function rawListing(id) {
  return (await fetch(`${SUPA}/rest/v1/listings?id=eq.${id}&select=*`, { headers: H() })).text()
}
// Does the public data / contact lookup reveal this owner's number (or the listing's private one)?
export async function exposure(listingId) {
  const [row] = await stagingSql(`select right(regexp_replace(coalesce(p.phone,''),'\\D','','g'),10) a, right(regexp_replace(coalesce(c.contact_phone,''),'\\D','','g'),10) b, l.contact_consent_at is not null consent, l.details->>'contact_phone' is not null and l.details->>'contact_phone' <> '' details_phone from public.listings l join public.profiles p on p.id=l.user_id left join public.listing_private_contact c on c.listing_id=l.id where l.id='${listingId}'`)
  const phones = [row.a, row.b].filter((x) => x && x.length === 10)
  const raw = await rawListing(listingId)
  const c = await rpc('get_listing_contact', { p_listing_id: listingId })
  return {
    consent: row.consent,
    raw_json_has_number: phones.some((p) => raw.includes(p)),
    lookup_gives_number: c.ok && phones.some((p) => c.text.includes(p)),
    lookup_says_hidden: !c.ok && c.text.includes('contact_hidden'),
  }
}
export async function countByVillage(village) {
  const [r] = await stagingSql(`select count(*)::int n, array_agg(id::text) ids from public.listings where village_name = '${village.replace(/'/g, "''")}'`)
  return { n: r.n, ids: r.ids || [] }
}
