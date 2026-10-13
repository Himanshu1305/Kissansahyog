#!/usr/bin/env node
// Batch 7L-2 browser check — one registration form, one sign-in screen, the Clear-location
// button and the weather rounding, in Hindi and English at 390 and 1440 wide.
//   npm run build && node scripts/shots-batch7l2.mjs
// Serves dist/ itself. EVERY Supabase request (database AND Supabase Auth) is answered by a
// mock here: no database is read or written, no account is created, no migration is needed.
// The mock behaves the way migrations 0059/0060 are written to behave (admin number refused
// like an unknown one, lock after 5 failures); the real functions are checked in Stage B.
// Screenshots + browser-check.json go to docs/review/batch7l2/.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch7l2')
const PORT = 4187
const BASE = `http://localhost:${PORT}`
mkdirSync(OUT, { recursive: true })
if (!existsSync(join(DIST, 'index.html'))) { console.error('dist/ not found — run `npm run build` first'); process.exit(1) }
const SEED = JSON.parse(readFileSync(join(ROOT, 'supabase/seed/sagar_division_places.json'), 'utf8')).places

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' }
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, BASE).pathname)
  const direct = join(DIST, url), page = join(DIST, url, 'index.html')
  const hit = extname(direct) && existsSync(direct) ? direct : existsSync(page) ? page : join(DIST, 'index.html')
  res.writeHead(200, { 'Content-Type': MIME[extname(hit)] || 'application/octet-stream' })
  res.end(await readFile(hit))
})
await new Promise((r) => server.listen(PORT, r))

// ---- mock backend ----
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' }
const USER_PHONE = '9000000001', ADMIN_PHONE = '9000000009', TAKEN_PHONE = '9000000002'
const USER_EMAIL = 'kisan@example.com', TAKEN_EMAIL = 'taken@example.com', GOOD_PASSWORD = 'sahi-password-1'
const profile = (over = {}) => ({ id: '11111111-1111-4111-8111-111111111111', full_name: 'Test Kisan', phone: USER_PHONE, email: null, village_town: 'खुरई', pincode: null, latitude: 24.0422, longitude: 78.3296, preferred_language: 'hi', is_admin: false, auth_provider: 'phone', consents: {}, disclaimer_accepted_at: new Date().toISOString(), ...over })
const session = (email) => ({ access_token: 'mock.' + Buffer.from(JSON.stringify({ sub: 'u1', email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.sig', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'mock-refresh', user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } })

async function mockNetwork(page) {
  const st = { calls: [], fails: {}, registered: null, weatherWrites: [], openMeteo: [] }
  const locked = (id) => (st.fails[id] || 0) >= 5
  const json = (route, status, body) => route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route(/supabase\.co\//, async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const u = new URL(req.url())
    let body = {}
    try { body = JSON.parse(req.postData() || '{}') } catch { /* not json */ }

    // --- Supabase Auth ---
    if (u.pathname.includes('/auth/v1/')) {
      st.calls.push(`auth ${u.pathname.split('/auth/v1/')[1]}`)
      if (u.pathname.endsWith('/signup')) {
        if (body.email === TAKEN_EMAIL) return json(route, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' })
        return json(route, 200, session(body.email))
      }
      if (u.pathname.endsWith('/token')) {
        if (body.password === GOOD_PASSWORD && body.email !== TAKEN_EMAIL) return json(route, 200, session(body.email))
        return json(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
      }
      return json(route, 200, {})
    }

    // --- database functions ---
    if (u.pathname.includes('/rpc/')) {
      const fn = u.pathname.split('/rpc/')[1]
      st.calls.push(`rpc ${fn}`)
      if (fn === 'app_login') {
        const id = body.p_phone
        if (locked(id)) return json(route, 400, { code: 'P0001', message: 'too_many_attempts' })
        if (id === USER_PHONE) return json(route, 200, profile())
        st.fails[id] = (st.fails[id] || 0) + 1 // unknown number and the admin number: same answer
        return json(route, 200, null)
      }
      if (fn === 'app_login_email_guard') {
        const id = body.p_email
        if (locked(id)) return json(route, 400, { code: 'P0001', message: 'too_many_attempts' })
        if (body.p_failed) st.fails[id] = (st.fails[id] || 0) + 1
        return route.fulfill({ status: 204, headers: CORS })
      }
      if (fn === 'app_login_email') return st.registered ? json(route, 200, st.registered) : json(route, 200, profile({ email: USER_EMAIL, auth_provider: 'email' }))
      if (fn === 'app_register') {
        st.registerArgs = body
        if (body.p_phone === TAKEN_PHONE) return json(route, 400, { code: 'P0001', message: 'phone_exists' })
        st.registered = profile({ full_name: body.p_full_name, phone: body.p_phone, email: USER_EMAIL, auth_provider: 'email', village_town: body.p_village_town, latitude: body.p_latitude, longitude: body.p_longitude, preferred_language: body.p_language, consents: { details_visibility: { choice: body.p_show_details === false ? 'hidden' : 'show', chosen_at: new Date().toISOString(), version: '2026-10' } } })
        return json(route, 200, st.registered)
      }
      if (fn === 'update_kisan_profile') return json(route, 200, { ...(st.registered || profile()), land_acres: body.p_land_acres })
      if (fn === 'cache_weather_cell') { st.weatherWrites.push({ via: fn, lat: body.p_lat, lon: body.p_lon, key: body.p_grid_key }); return route.fulfill({ status: 204, headers: CORS }) }
      return json(route, 200, [])
    }

    // --- tables ---
    const table = u.pathname.split('/').pop()
    const one = (req.headers().accept || '').includes('vnd.pgrst.object')
    if (req.method() !== 'GET') {
      if (table === 'weather_grid_requests') st.weatherWrites.push({ via: table, lat: body.latitude, lon: body.longitude, key: body.grid_key })
      return json(route, 201, [])
    }
    const send = (rows) => (one && !rows.length
      ? json(route, 406, { code: 'PGRST116', message: 'no rows' })
      : route.fulfill({ status: 200, headers: { ...CORS, 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` }, contentType: 'application/json', body: JSON.stringify(one ? rows[0] : rows) }))
    if (table === 'places') return send(SEED.map(({ name_en, name_hi, district, kind, lat, lng, verified }, id) => ({ id, name_en, name_hi, district, kind, lat, lng, verified })))
    return send([]) // weather_cache_v2 empty → the app takes the live-fetch path
  })
  await page.route(/api\.open-meteo\.com/, (route) => {
    const u = new URL(route.request().url())
    st.openMeteo.push({ lat: u.searchParams.get('latitude'), lon: u.searchParams.get('longitude') })
    const days = Array.from({ length: 16 }, (_, i) => new Date(Date.now() + i * 86400000).toISOString().slice(0, 10))
    const hours = Array.from({ length: 48 }, (_, i) => new Date(Date.now() + i * 3600000).toISOString().slice(0, 16))
    const fill = (n, v) => Array(n).fill(v)
    return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({
      current: { temperature_2m: 29, relative_humidity_2m: 50, wind_speed_10m: 8, weather_code: 1, precipitation: 0 },
      hourly: { time: hours, temperature_2m: fill(48, 28), precipitation: fill(48, 0), precipitation_probability: fill(48, 5), wind_speed_10m: fill(48, 8), relative_humidity_2m: fill(48, 50), soil_moisture_0_to_7cm: fill(48, 0.2) },
      daily: { time: days, temperature_2m_max: fill(16, 31), temperature_2m_min: fill(16, 19), precipitation_sum: fill(16, 0), precipitation_probability_max: fill(16, 5), weather_code: fill(16, 1), wind_speed_10m_max: fill(16, 10), et0_fao_evapotranspiration: fill(16, 4) },
    }) })
  })
  await page.route(/api\.bigdatacloud\.net/, (route) => route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: '{}' }))
  return st
}

const results = []
let failures = 0
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`) }

const T = {
  hi: { show: 'मेरी जानकारी दिखाएँ (सुझाया गया)', hidden: 'छिपी रहने दें', explain: 'नहीं देख पाएँगे', otp: 'OTP से जाँच जल्द आ रही है।', notFound: 'इस नंबर से कोई खाता नहीं मिला', tooMany: 'बहुत बार कोशिश हो चुकी है', emailUsed: 'इस ईमेल से पहले से खाता है', phoneUsed: 'इस नंबर से पहले से खाता है', weakPw: 'पासवर्ड कम से कम 8 अक्षर', badPhone: 'सही 10 अंकों', wrongPw: 'गलत ईमेल या पासवर्ड', clear: 'मेरी लोकेशन हटाएँ', khurai: 'खुरई', technical: /[A-Za-z_]{4,}_[a-z_]+|P0001|null|undefined|exception/ },
  en: { show: 'Show my details (recommended)', hidden: 'Keep hidden', explain: 'will NOT see them', otp: 'OTP verification is coming soon.', notFound: 'No account found for this number', tooMany: 'Too many attempts', emailUsed: 'An account with this email already exists', phoneUsed: 'An account with this number already exists', weakPw: 'Password must be at least 8 characters', badPhone: 'valid 10-digit', wrongPw: 'Wrong email or password', clear: 'Clear my location', khurai: 'Khurai', technical: /[a-z]{3,}_[a-z_]+|P0001|\bnull\b|undefined|exception/ },
}

const browser = await chromium.launch()
async function open({ width, lang, path, saved = null }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 900 }, hasTouch: width < 800, deviceScaleFactor: width < 800 ? 2 : 1, serviceWorkers: 'block' })
  await ctx.addInitScript(({ lang, saved }) => {
    if (!localStorage.getItem('__ks_test_seeded')) {
      localStorage.setItem('__ks_test_seeded', '1')
      localStorage.setItem('ks_lang_v1', lang)
      if (saved) localStorage.setItem('ks_location_v1', JSON.stringify(saved))
    }
    const fake = { getCurrentPosition(ok, err) { setTimeout(() => err({ code: 1, message: 'denied' }), 30) }, watchPosition() { return 0 }, clearWatch() {} }
    Object.defineProperty(Navigator.prototype, 'geolocation', { get: () => fake, configurable: true })
    if (navigator.permissions) { const orig = navigator.permissions.query.bind(navigator.permissions); navigator.permissions.query = (d) => (d && d.name === 'geolocation' ? Promise.resolve({ state: 'prompt', onchange: null }) : orig(d)) }
  }, { lang, saved })
  const page = await ctx.newPage()
  const st = await mockNetwork(page)
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
  await page.evaluate(() => document.fonts.ready)
  return { ctx, page, st }
}
const shot = (page, name, full = false) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full })
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
const storedUser = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ks_session_v1') || 'null') } catch { return null } })

async function fillSignup(page, L, { email = USER_EMAIL, password = GOOD_PASSWORD, phone = '9000000003' } = {}) {
  await page.fill('#full_name', 'Ramesh Patel')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.fill('#phone', phone)
  if (await page.getByTestId('place-input').count()) {
    await page.getByTestId('place-input').fill(L.khurai === 'खुरई' ? 'खुर' : 'Khur')
    await page.getByTestId('place-suggestions').getByRole('button').first().click()
  }
}
async function acceptAndSubmit(page) {
  await page.getByTestId('signup-form').locator('button[type=submit]').click()
  await page.getByTestId('disclaimer-accept').check()
  await page.getByTestId('disclaimer-accept').locator('xpath=ancestor::div[1]').locator('button').last().click()
}

for (const width of [390, 1440]) for (const lang of ['hi', 'en']) {
  const L = T[lang], tag = `${lang}-${width}`

  // ================= REGISTRATION =================
  {
    const { ctx, page, st } = await open({ width, lang, path: '/signup' })
    await page.getByTestId('signup-form').waitFor({ timeout: 15000 })
    check(`${tag} signup: ONE form, no tabs`, (await page.getByTestId('signup-form').count()) === 1 && (await page.locator('[role=tab], [role=tablist]').count()) === 0)
    const ids = await page.evaluate(() => [...document.querySelectorAll('[data-testid=signup-form] input, [data-testid=signup-form] select')].map((i) => i.id || i.getAttribute('data-testid')))
    check(`${tag} signup: name, email, password, mobile, village/town, language and the optional farmer fields are all there`, ['full_name', 'email', 'password', 'phone', 'village_town', 'language', 'k_land', 'k_crops', 'k-interest-lease', 'k-interest-equipment', 'k-whatsapp-optin'].every((i) => ids.includes(i)), ids.join(','))
    const formText = await page.getByTestId('signup-form').innerText()
    check(`${tag} signup: no pincode field or pincode wording`, !ids.some((i) => /pin/i.test(i || '')) && !/pincode|पिन कोड|पिनकोड/i.test(formText))
    // visibility choice
    const vis = page.getByTestId('visibility-choice')
    check(`${tag} signup: both visibility buttons with the plain explanation`, (await page.getByTestId('visibility-show').innerText()).includes(L.show) && (await page.getByTestId('visibility-hidden').innerText()).includes(L.hidden) && (await vis.innerText()).includes(L.explain))
    const big = await page.evaluate(() => ['visibility-show', 'visibility-hidden'].map((t) => document.querySelector(`[data-testid=${t}]`).getBoundingClientRect().height))
    check(`${tag} signup: the two buttons are large (≥ 56px) and "show" starts selected`, big.every((h) => h >= 56) && (await vis.getAttribute('data-choice')) === 'show', big.map(Math.round).join('/'))
    await page.getByTestId('visibility-hidden').click()
    check(`${tag} signup: "Keep hidden" can be chosen (not blocked) and warns plainly`, (await vis.getAttribute('data-choice')) === 'hidden' && (await page.getByTestId('visibility-warning').count()) === 1)
    await page.getByTestId('visibility-show').click()
    check(`${tag} signup: and back to "Show my details"`, (await vis.getAttribute('data-choice')) === 'show')
    // password show / hide
    await page.fill('#password', 'abc')
    await page.getByTestId('password-toggle').click()
    check(`${tag} signup: password show/hide toggle works`, (await page.locator('#password').getAttribute('type')) === 'text')
    await page.getByTestId('password-toggle').click()
    // friendly validation: weak password + invalid mobile
    await page.fill('#full_name', 'Ramesh Patel'); await page.fill('#email', USER_EMAIL); await page.fill('#phone', '12345')
    await page.getByTestId('signup-form').locator('button[type=submit]').click()
    const errText = await page.getByTestId('signup-form').innerText()
    check(`${tag} signup: weak password and invalid mobile get friendly messages`, errText.includes(L.weakPw) && errText.includes(L.badPhone) && (await page.getByTestId('place-error').count()) === 1)
    check(`${tag} signup: no horizontal scroll`, await noHScroll(page))
    await shot(page, `signup-${tag}`, true)

    // place picker: typed suggestion, then the district → town list
    await page.getByTestId('place-open-picker').click()
    await page.getByTestId('place-district-Damoh').click()
    await page.getByTestId('place-towns').getByRole('button').first().click()
    check(`${tag} signup: village/town can be picked district → town`, /दमोह|Damoh/.test(await page.getByTestId('place-chosen').innerText()))
    await page.getByTestId('place-change').click()

    // submit with "Keep hidden"
    await fillSignup(page, L)
    await page.getByTestId('visibility-hidden').click()
    await page.getByTestId('signup-form').scrollIntoViewIfNeeded()
    await shot(page, `signup-filled-hidden-${tag}`, true)
    await acceptAndSubmit(page)
    await page.waitForURL((u) => !u.pathname.startsWith('/signup'), { timeout: 15000 }).catch(() => {})
    const a = st.registerArgs || {}, user = await storedUser(page)
    check(`${tag} signup: "Keep hidden" is sent and stored in consents`, a.p_show_details === false && user?.consents?.details_visibility?.choice === 'hidden', JSON.stringify(user?.consents || null))
    check(`${tag} signup: the town from the places list is what is saved (name + town coordinates), no pincode`, /खुरई|Khurai/.test(a.p_village_town || '') && Math.abs(a.p_latitude - 24.04) < 0.05 && !('p_pincode' in a) && a.p_phone === '9000000003')
    check(`${tag} signup: the password goes only to Supabase Auth, never to our own function`, !JSON.stringify(a).includes(GOOD_PASSWORD) && st.calls.includes('auth signup'))
    await ctx.close()
  }
  // "Show my details" stored
  {
    const { ctx, page, st } = await open({ width, lang, path: '/signup' })
    await page.getByTestId('signup-form').waitFor({ timeout: 15000 })
    await fillSignup(page, L)
    await acceptAndSubmit(page)
    await page.waitForURL((u) => !u.pathname.startsWith('/signup'), { timeout: 15000 }).catch(() => {})
    const user = await storedUser(page)
    check(`${tag} signup: "Show my details" is sent and stored in consents`, st.registerArgs?.p_show_details === true && user?.consents?.details_visibility?.choice === 'show')
    await ctx.close()
  }
  // email already used / mobile already used
  for (const [what, over, expected] of [['email already used', { email: TAKEN_EMAIL }, L.emailUsed], ['mobile already used', { phone: TAKEN_PHONE }, L.phoneUsed]]) {
    const { ctx, page } = await open({ width, lang, path: '/signup' })
    await page.getByTestId('signup-form').waitFor({ timeout: 15000 })
    await fillSignup(page, L, over)
    await acceptAndSubmit(page)
    const msg = await page.getByTestId('signup-error').innerText({ timeout: 15000 }).catch(() => '')
    check(`${tag} signup: ${what} → friendly message, no technical wording`, msg.includes(expected) && !L.technical.test(msg), msg.slice(0, 80))
    check(`${tag} signup: ${what} → nobody is logged in`, (await storedUser(page)) == null)
    await ctx.close()
  }

  // ================= SIGN-IN =================
  {
    const { ctx, page } = await open({ width, lang, path: '/login' })
    await page.getByTestId('login-screen').waitFor({ timeout: 15000 })
    const bothVisible = (await page.getByTestId('login-email-form').isVisible()) && (await page.getByTestId('login-phone-form').isVisible())
    check(`${tag} login: ONE screen, email+password AND mobile both visible, no tabs`, bothVisible && (await page.locator('[role=tab], [role=tablist]').count()) === 0)
    check(`${tag} login: honest "OTP coming soon" note`, (await page.getByTestId('login-otp-note').innerText()).includes(L.otp))
    check(`${tag} login: no horizontal scroll`, await noHScroll(page))
    await shot(page, `login-${tag}`, true)

    // unknown number
    await page.fill('#phone', '9000000077'); await page.getByTestId('login-phone-submit').click()
    const unknownMsg = await page.getByTestId('login-phone-error').innerText({ timeout: 10000 })
    // admin number — refused, and with exactly the same words
    await page.fill('#phone', ADMIN_PHONE); await page.getByTestId('login-phone-submit').click()
    await page.waitForTimeout(600)
    const adminMsg = await page.getByTestId('login-phone-error').innerText({ timeout: 10000 })
    check(`${tag} login: mobile sign-in refused for an is_admin profile (mock), same message as an unknown number`, adminMsg === unknownMsg && adminMsg.includes(L.notFound) && (await storedUser(page)) == null, adminMsg.slice(0, 60))
    // throttle: 4 more failures on the admin number, then the lock message
    let last = adminMsg
    for (let i = 0; i < 5; i++) { await page.getByTestId('login-phone-submit').click(); await page.waitForTimeout(450); last = await page.getByTestId('login-phone-error').innerText() }
    check(`${tag} login: after repeated failures the friendly "try again later" message appears (mobile)`, last.includes(L.tooMany) && !L.technical.test(last), last.slice(0, 70))
    await shot(page, `login-throttled-${tag}`, true)

    // email: wrong password ×5 → lock
    await page.fill('#email', USER_EMAIL); await page.fill('#password', 'galat-password')
    let emailMsg = ''
    for (let i = 0; i < 5; i++) { await page.getByTestId('login-email-submit').click(); await page.waitForTimeout(500); emailMsg = await page.getByTestId('login-email-error').innerText() }
    check(`${tag} login: wrong password → friendly message`, emailMsg.includes(L.wrongPw))
    await page.getByTestId('login-email-submit').click(); await page.waitForTimeout(500)
    emailMsg = await page.getByTestId('login-email-error').innerText()
    check(`${tag} login: after repeated failures the "try again later" message appears (email)`, emailMsg.includes(L.tooMany), emailMsg.slice(0, 70))
    await ctx.close()
  }
  // both ways end in the same session
  {
    const { ctx, page } = await open({ width, lang, path: '/login' })
    await page.getByTestId('login-screen').waitFor({ timeout: 15000 })
    await page.fill('#phone', USER_PHONE); await page.getByTestId('login-phone-submit').click()
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }).catch(() => {})
    const byPhone = await storedUser(page)
    await ctx.close()
    const b = await open({ width, lang, path: '/login' })
    await b.page.getByTestId('login-screen').waitFor({ timeout: 15000 })
    await b.page.fill('#email', USER_EMAIL); await b.page.fill('#password', GOOD_PASSWORD); await b.page.getByTestId('login-email-submit').click()
    await b.page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 }).catch(() => {})
    const byEmail = await storedUser(b.page)
    check(`${tag} login: mobile and email both end in the same stored session`, byPhone?.id === profile().id && byEmail?.id === profile().id)
    await b.ctx.close()
  }

  // ================= LOCATION: Clear button + rounding =================
  {
    // An exact-looking saved position (5 decimals) so rounding is visible.
    const { ctx, page, st } = await open({ width, lang, path: '/mausam', saved: { lat: 24.04537, lng: 78.33481, label: L.khurai, from: 'typed' } })
    const control = page.getByTestId('location-control').first()
    await control.getByTestId('location-banner').waitFor({ timeout: 15000 })
    await page.getByText(/\d+°/).first().waitFor({ timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(600)
    const clearBtn = control.getByTestId('location-clear')
    check(`${tag} location: "Clear my location" button is shown next to the place`, (await clearBtn.innerText()).trim() === L.clear)
    await control.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); await shot(page, `location-clear-button-${tag}`)
    // rounding: every saved coordinate and the forecast request use the cell centre 24.0, 78.3
    const sent = [...st.weatherWrites.map((w) => [w.via, w.lat, w.lon, w.key]), ...st.openMeteo.map((o) => ['open-meteo', Number(o.lat), Number(o.lon), ''])]
    const allCentre = sent.length >= 2 && sent.every(([, la, lo]) => la === 24 && lo === 78.3) && st.weatherWrites.every((w) => w.key === '24.0_78.3')
    check(`${tag} location: weather saves and requests only the ~10 km cell centre, never the exact position`, allCentre, JSON.stringify(sent))
    let dialog = false
    page.on('dialog', (d) => { dialog = true; d.dismiss() })
    await clearBtn.click()
    await control.getByTestId('location-prompt').waitFor({ timeout: 8000 })
    const stored = await page.evaluate(() => localStorage.getItem('ks_location_v1'))
    check(`${tag} location: Clear removes the place from the device and returns to the prompt card, no dialog`, stored == null && !dialog && (await page.getByTestId('location-banner').count()) === 0)
    await control.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); await shot(page, `location-after-clear-${tag}`)
    await page.reload({ waitUntil: 'networkidle' })
    check(`${tag} location: it stays cleared after a reload`, (await page.getByTestId('location-banner').count()) === 0 && (await page.getByTestId('location-prompt').count()) >= 1)
    await ctx.close()
  }
}
await browser.close()
server.close()
writeFileSync(join(OUT, 'browser-check.json'), JSON.stringify({ at: new Date().toISOString(), passed: results.length - failures, failed: failures, results }, null, 2))
console.log(`\n${results.length - failures}/${results.length} checks passed → ${OUT}`)
process.exit(failures ? 1 : 0)
