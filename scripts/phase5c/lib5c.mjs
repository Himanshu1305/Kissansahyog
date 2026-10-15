// Batch 9 Phase 5C — shared helpers for the WEB STAND-IN runs (no emulator this session: low PC memory).
// Everything runs against the STAGING website https://staging.kissansahyog.com in ONE headless Chromium,
// closed at the end of each script. Re-uses the Phase 5B helpers (secrets stay outside the repo, prod guard).
//
// "web stand-in, not the app": the app runs the same bundle inside an Android WebView, so results here are
// indicative; differences (WebView version, textZoom, system bars, native back) are stated per check.
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { chromium } from 'playwright'
import * as L5 from '../phase5b/lib.mjs'

export const { BASE, PROD_REF, password, persona, scrub, log, km, town } = L5
export { L5 }
export const EV = resolve('docs/review/batch9/evidence/phase5c')
mkdirSync(EV, { recursive: true })
// Scratch outside the repo for anything that holds a session token (storageState).
export const SCRATCH = process.env.KS_SCRATCH || resolve(process.env.LOCALAPPDATA || '.', 'Temp/ks-phase5c')
mkdirSync(SCRATCH, { recursive: true })

export function heartbeat(what) {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0')
  appendFileSync(resolve('docs/review/batch9/HEARTBEAT.log'), `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} | phase5c | ${what}\n`)
}

// Refuse to start a browser when the PC is nearly out of memory (the reason the emulator is off).
export function memoryGuard(minMb = Number(process.env.KS_MIN_MB || 300)) {
  let mb = null
  try { mb = Number(execSync('powershell -NoProfile -Command "(Get-Counter \'\\Memory\\Available MBytes\').CounterSamples.CookedValue"', { encoding: 'utf8', timeout: 20000 }).trim()) } catch { /* unknown */ }
  if (mb != null && mb < minMb) { log(`memory guard: only ${mb} MB available (< ${minMb}) — refusing to start Chromium`); process.exit(3) }
  return mb
}

// ---- results (one JSON per area; merged into CONDITIONS.md by hand-checked build script) ----
export function resultsFile(area) { return join(EV, `results-${area}.json`) }
export function loadResults(area) { const f = resultsFile(area); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { area, results: [] } }
export function saveResults(r) {
  const text = JSON.stringify(r, null, 1)
  for (const v of L5.secretValues()) if (text.includes(v)) throw new Error('refusing to write a secret value into results')
  writeFileSync(resultsFile(r.area), text)
}
export function record(r, rec) {
  const out = { at: new Date().toISOString(), ...rec, detail: rec.detail == null ? null : JSON.parse(scrub(JSON.stringify(rec.detail))) }
  r.results = r.results.filter((x) => x.id !== rec.id)
  r.results.push(out)
  log(`${rec.status}  ${rec.id} ${rec.title}`)
  return out
}

// ---- browser ----
let _b = null
export async function browser(extraArgs = []) {
  if (!_b) _b = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage', '--renderer-process-limit=1', '--disable-extensions', '--disable-background-networking', ...extraArgs] })
  return _b
}
export async function closeBrowser() { if (_b) { await _b.close().catch(() => {}); _b = null } }

const CONSOLE_ALLOW = [/localhost:\d+/i, /ERR_CONNECTION_REFUSED/i, /img-src/i, /Content Security Policy/i, /favicon/i]
export const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 KSTEST-phase5c'

// Phone-sized context with the Phase 5B prod guard. opts: width,height,dsf,locale,colorScheme,lang,storageState,geo
export async function newPhone(opts = {}) {
  const b = await browser()
  const ctx = await b.newContext({
    viewport: { width: opts.width || 412, height: opts.height || 915 }, deviceScaleFactor: opts.dsf || 1, isMobile: true, hasTouch: true,
    userAgent: UA, locale: opts.locale || 'hi-IN', timezoneId: 'Asia/Kolkata', colorScheme: opts.colorScheme || 'light',
    ...(opts.storageState ? { storageState: opts.storageState } : {}),
    ...(opts.geo ? { geolocation: { latitude: opts.geo.lat, longitude: opts.geo.lng, accuracy: 30 }, permissions: ['geolocation'] } : {}),
  })
  await ctx.route('**/*', (route) => {
    const u = route.request().url(); let host = ''
    try { host = new URL(u).host } catch { /* data: */ }
    if (u.includes(PROD_REF) || host === 'kissansahyog.com' || host === 'www.kissansahyog.com' || host.endsWith('kissansahyog-prod.pages.dev')) return route.abort()
    return route.continue()
  })
  if (opts.lang) await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* */ } }, opts.lang)
  const page = await ctx.newPage()
  page.setDefaultTimeout(25000)
  const diag = { console: [], pageErrors: [], failed: [] }
  page.on('console', (m) => { if (m.type() === 'error' && !CONSOLE_ALLOW.some((re) => re.test(m.text()))) diag.console.push(scrub(m.text()).slice(0, 300)) })
  page.on('pageerror', (e) => diag.pageErrors.push(scrub(String(e.message)).slice(0, 300)))
  page.on('requestfailed', (r) => { const u = r.url(); if (/supabase\.co|staging\.kissansahyog\.com/.test(u)) diag.failed.push(`${r.method()} ${u.split('?')[0]} ${r.failure()?.errorText || ''}`) })
  return { ctx, page, diag }
}

export async function goto(page, path, settle = 800) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  if (settle) await page.waitForTimeout(settle)
}

// JPEG < 300 KB, viewport only, contact/e-mail/mobile masked (same CSS masking as 5B).
export async function shot(page, dir, name) {
  const d = join(EV, dir); mkdirSync(d, { recursive: true })
  const file = join(d, `${name}.jpg`)
  await page.evaluate(() => {
    const st = document.createElement('style'); st.id = '__ks_mask'
    st.textContent = 'input[type=password],input[type=email],input[type=tel],#email,#phone,#pf_email,#pf_phone,#f_contact_phone{color:transparent!important;-webkit-text-fill-color:transparent!important;background:#444!important}'
    document.head.appendChild(st)
    const re = /\d{10}|[^\s@]+@[^\s@]+\.[a-z]{2,}/i
    for (const el of document.querySelectorAll('body *')) if (el.children.length === 0 && re.test(el.textContent || '') && !/hello@kissansahyog/i.test(el.textContent)) { el.dataset.ksMasked = '1'; el.style.setProperty('background', '#444', 'important'); el.style.setProperty('color', 'transparent', 'important') }
    for (const el of document.querySelectorAll('[data-testid="contact-sheet"] p')) { el.dataset.ksMasked = '1'; el.style.setProperty('background', '#444', 'important'); el.style.setProperty('color', 'transparent', 'important') }
  }).catch(() => {})
  for (const q of [55, 40, 28]) {
    await page.screenshot({ path: file, type: 'jpeg', quality: q }).catch(() => {})
    try { if (statSync(file).size < 300 * 1024) break } catch { break }
  }
  await page.evaluate(() => { document.getElementById('__ks_mask')?.remove(); for (const el of document.querySelectorAll('[data-ks-masked]')) { el.style.removeProperty('background'); el.style.removeProperty('color'); delete el.dataset.ksMasked } }).catch(() => {})
  return file.replace(/\\/g, '/').replace(resolve('.').replace(/\\/g, '/') + '/', '')
}

// Page state used by the route sweep and the display checks.
export async function pageState(page) {
  return page.evaluate(() => {
    const root = document.querySelector('#root')
    const text = (root?.innerText || '').replace(/\s+/g, ' ').trim()
    return {
      path: location.pathname + location.search,
      title: document.title,
      textLength: text.length,
      head: text.slice(0, 160),
      h1: document.querySelector('h1')?.innerText?.trim().slice(0, 120) || null,
      errorBoundary: /This page could not open|पेज नहीं खुल पाया/.test(text),
      notFound: /\(404\)/.test(document.querySelector('h1')?.innerText || ''),
      spinners: document.querySelectorAll('.animate-spin').length,
    }
  })
}

// Log in a KEEP persona by e-mail (read-only use) and save the session to SCRATCH (outside the repo).
export async function keepSession(pid = 'P2') {
  const file = join(SCRATCH, `session-${pid}.json`)
  if (existsSync(file) && Date.now() - statSync(file).mtimeMs < 50 * 60 * 1000) return file
  const { ctx, page } = await newPhone()
  const p = persona(pid)
  const r = await L5.loginEmail(page, p.email, password())
  if (!r.ok) { await ctx.close(); throw new Error(`login ${pid} failed: ${scrub(r.error || '')}`) }
  await ctx.storageState({ path: file })
  await ctx.close()
  return file
}

export function arg(name, def = null) { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def }
