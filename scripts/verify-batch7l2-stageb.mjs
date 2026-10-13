#!/usr/bin/env node
// Batch 7L-2 Stage B — the REAL login / registration functions on the STAGING database only.
//   npm run build && node scripts/verify-batch7l2-stageb.mjs
// Refuses to run unless .env AND the built dist/ both point at the staging project.
// It registers two throwaway users through the real registration form (served from dist/),
// tests them, and deletes everything it made in a `finally` block: the two profiles, their
// listings, their Supabase Auth users and ITS OWN login_attempts rows (by identifier).
// Nothing else in the database is changed. Every other visitor write is answered locally.
// Screenshots + stageb-check.json go to docs/review/batch7l2/. Never prints a key.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch7l2')
const STAGING = 'wzxtqbqlahyahsnoqqva', PRODUCTION = 'eltmcznjcqiahqhjvpjg'
const PORT = 4188, BASE = `http://localhost:${PORT}`

const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8')
  .split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const url = env.VITE_SUPABASE_URL, anon = env.VITE_SUPABASE_ANON_KEY, token = env.SUPABASE_ACCESS_TOKEN
const ref = (url || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
if (ref !== STAGING) { console.error(`STOP: .env points at "${ref}", not the staging project`); process.exit(1) }
if (!existsSync(join(DIST, 'index.html'))) { console.error('dist/ not found — run `npm run build` first'); process.exit(1) }
const bundle = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n')
if (!bundle.includes(STAGING) || bundle.includes(PRODUCTION)) { console.error('STOP: dist/ is not a staging build — run `npm run build` first'); process.exit(1) }

// ---- helpers ----
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${STAGING}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const text = await res.text()
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status}): ${text}`)
  return text ? JSON.parse(text) : null
}
// The real REST API, as the browser calls it with the public anon key.
async function rest(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { method, headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  let json; try { json = JSON.parse(text) } catch { json = undefined }
  return { status: res.status, text, json }
}
const results = []
let failures = 0
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); if (!ok) failures += 1; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`) }
const info = (line) => { results.push({ info: line }); console.log(`INFO  ${line}`) }

const stamp = Date.now()
const H = { name: 'StageB Hidden', email: `ks-stageb-${stamp}-h@example.com`, phone: '9000000101', password: `Stageb-${stamp}-h` }
const S = { name: 'StageB Show', email: `ks-stageb-${stamp}-s@example.com`, phone: '9000000102', password: `Stageb-${stamp}-s` }
const UNKNOWN_REST = '9000000199', UNKNOWN_UI = '9000000198'
const PHONES = [H.phone, S.phone, UNKNOWN_REST, UNKNOWN_UI]
const inList = (xs) => xs.map((x) => `'${x}'`).join(',')
const countsSql = `select (select count(*) from public.profiles)::int as profiles, (select count(*) from public.listings)::int as listings, (select count(*) from public.login_attempts)::int as attempts, (select count(*) from auth.users)::int as auth_users`

async function cleanup() {
  await sql(`delete from public.listings where user_id in (select id from public.profiles where email like 'ks-stageb-%@example.com' and phone in (${inList([H.phone, S.phone])}));
    delete from public.profiles where email like 'ks-stageb-%@example.com' and phone in (${inList([H.phone, S.phone])});
    delete from auth.users where email like 'ks-stageb-%@example.com';
    delete from public.login_attempts where identifier in (${inList(PHONES)}) or identifier like 'ks-stageb-%@example.com';`)
}

console.log(`== staging database (${ref}) — Stage B ==`)
const clash = (await sql(`select (select count(*) from public.profiles where phone in (${inList(PHONES)}))::int as p, (select count(*) from auth.users where email like 'ks-stageb-%@example.com')::int as a, (select count(*) from public.login_attempts where identifier in (${inList(PHONES)}))::int as l`))[0]
if (clash.p || clash.a || clash.l) { console.error(`STOP: the throwaway numbers/emails are already present on staging (${JSON.stringify(clash)}). Nothing was changed.`); process.exit(1) }
const before = (await sql(countsSql))[0]
info(`before: ${JSON.stringify(before)}`)

// ---- static server for dist/ ----
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' }
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, BASE).pathname)
  const direct = join(DIST, p), page = join(DIST, p, 'index.html')
  const hit = extname(direct) && existsSync(direct) ? direct : existsSync(page) ? page : join(DIST, 'index.html')
  res.writeHead(200, { 'Content-Type': MIME[extname(hit)] || 'application/octet-stream' })
  res.end(await readFile(hit))
})
await new Promise((r) => server.listen(PORT, r))
const browser = await chromium.launch()

// Only the functions under test reach the database; every other visitor write is answered here.
const UNDER_TEST = new Set(['app_login', 'app_login_email', 'app_login_email_guard', 'app_register'])
async function open({ width, lang, path, fakeLogin }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 900 }, hasTouch: width < 800, deviceScaleFactor: width < 800 ? 2 : 1, serviceWorkers: 'block' })
  await ctx.addInitScript(({ lang }) => {
    if (!localStorage.getItem('__ks_test_seeded')) { localStorage.setItem('__ks_test_seeded', '1'); localStorage.setItem('ks_lang_v1', lang) }
    const fake = { getCurrentPosition(ok, err) { setTimeout(() => err({ code: 1, message: 'denied' }), 30) }, watchPosition() { return 0 }, clearWatch() {} }
    Object.defineProperty(Navigator.prototype, 'geolocation', { get: () => fake, configurable: true })
  }, { lang })
  const calls = []
  await ctx.route((u) => u.pathname.includes('/rest/v1/'), (route) => {
    const req = route.request()
    const name = new URL(req.url()).pathname.split('/rest/v1/')[1] || ''
    const fn = name.startsWith('rpc/') ? name.slice(4) : null
    if (fn === 'app_login' && fakeLogin !== undefined) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeLogin) })
    if (fn && UNDER_TEST.has(fn)) { calls.push(fn); return route.continue() }
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.continue()
    return route.fulfill({ status: fn ? 200 : 201, contentType: 'application/json', body: fn ? 'null' : '[]' })
  })
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 })
  return { ctx, page, calls }
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `stageb-${name}.png`), fullPage: true })
const storedUser = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ks_session_v1') || 'null') } catch { return null } })
const T = {
  hi: { notFound: 'इस नंबर से कोई खाता नहीं मिला', tooMany: 'बहुत बार कोशिश हो चुकी है। कृपया 15 मिनट बाद दोबारा कोशिश करें।', wrongPw: 'गलत ईमेल या पासवर्ड', place: 'खुर' },
  en: { notFound: 'No account found for this number', tooMany: 'Too many attempts. Please try again after 15 minutes.', wrongPw: 'Wrong email or password', place: 'Khur' },
}

async function registerThroughForm(u, { width, lang, hidden }) {
  const { ctx, page, calls } = await open({ width, lang, path: '/signup' })
  await page.getByTestId('signup-form').waitFor({ timeout: 20000 })
  await page.fill('#full_name', u.name); await page.fill('#email', u.email); await page.fill('#password', u.password); await page.fill('#phone', u.phone)
  await page.getByTestId('place-input').fill(T[lang].place)
  await page.getByTestId('place-suggestions').getByRole('button').first().click()
  if (hidden) await page.getByTestId('visibility-hidden').click()
  await shot(page, `signup-${hidden ? 'hidden' : 'show'}-${lang}-${width}`)
  await page.getByTestId('signup-form').locator('button[type=submit]').click()
  await page.getByTestId('disclaimer-accept').check()
  await page.getByTestId('disclaimer-accept').locator('xpath=ancestor::div[1]').locator('button').last().click()
  await page.waitForURL((x) => !x.pathname.startsWith('/signup'), { timeout: 30000 }).catch(() => {})
  const err = await page.getByTestId('signup-error').innerText().catch(() => '')
  const user = await storedUser(page)
  await ctx.close()
  return { user, calls, err }
}
const row = async (u) => (await sql(`select id, full_name, phone, email, auth_uid is not null as has_auth, auth_provider, village_town, pincode, latitude, longitude, is_admin, consents from public.profiles where phone = '${u.phone}'`))[0]

try {
  // ============ 0. login_attempts is closed to the public key ============
  const sel = await rest('login_attempts?select=*&limit=1', { method: 'GET' })
  check('login_attempts: anon cannot read it', sel.status >= 400 || (Array.isArray(sel.json) && sel.json.length === 0), `HTTP ${sel.status} ${sel.text.slice(0, 90)}`)
  const ins = await rest('login_attempts', { body: { identifier: UNKNOWN_REST, success: true } })
  check('login_attempts: anon cannot write to it', ins.status >= 400, `HTTP ${ins.status} ${ins.text.slice(0, 90)}`)
  for (const fn of ['login_is_locked', 'login_record_attempt']) {
    const r = await rest(`rpc/${fn}`, { body: fn === 'login_is_locked' ? { p_identifier: UNKNOWN_REST } : { p_identifier: UNKNOWN_REST, p_success: true } })
    check(`${fn}: anon cannot call the helper`, r.status >= 400, `HTTP ${r.status} ${r.text.slice(0, 70)}`)
  }
  check('login_attempts: still empty of this run\'s rows after the refused probes', (await sql(`select count(*)::int as n from public.login_attempts where identifier = '${UNKNOWN_REST}'`))[0].n === 0)

  // ============ 1. app_login with an unknown number, through the real REST API ============
  const unk = await rest('rpc/app_login', { body: { p_phone: UNKNOWN_REST } })
  info(`app_login(unknown ${UNKNOWN_REST}) → HTTP ${unk.status}, exact body: ${unk.text}`)
  const allNull = unk.json && typeof unk.json === 'object' && !Array.isArray(unk.json) && Object.values(unk.json).every((v) => v === null)
  check('app_login(unknown): HTTP 200 and "no profile" (null, or an object whose every field is null)', unk.status === 200 && (unk.json === null || allNull), unk.json === null ? 'shape: null' : `shape: object with ${Object.keys(unk.json || {}).length} fields, all null = ${allNull}`)
  check('app_login(unknown): the failure was counted', (await sql(`select count(*)::int as n from public.login_attempts where identifier = '${UNKNOWN_REST}' and not success`))[0].n === 1)

  // The built app must treat BOTH shapes as "not found" and never store a session.
  const nullObject = Object.fromEntries(Object.keys(allNull ? unk.json : { id: 0, full_name: 0, phone: 0, email: 0, is_admin: 0, consents: 0 }).map((k) => [k, null]))
  for (const [label, body] of [['null', null], ['an object with all-null fields', nullObject]]) {
    const { ctx, page } = await open({ width: 390, lang: 'en', path: '/login', fakeLogin: body })
    await page.getByTestId('login-screen').waitFor({ timeout: 20000 })
    await page.fill('#phone', UNKNOWN_REST); await page.getByTestId('login-phone-submit').click()
    const msg = await page.getByTestId('login-phone-error').innerText({ timeout: 10000 }).catch(() => '')
    check(`app: answer ${label} → "not found", still on the sign-in screen, no session stored`, msg.includes(T.en.notFound) && (await storedUser(page)) == null && new URL(page.url()).pathname.startsWith('/login'), msg.slice(0, 60))
    // An all-null object left in storage by an older copy of the app is not a session either.
    await page.evaluate((b) => localStorage.setItem('ks_session_v1', JSON.stringify(b)), body)
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
    check(`app: ${label} already sitting in storage → not treated as signed in`, (await page.getByTestId('login-screen').count()) === 1 && new URL(page.url()).pathname.startsWith('/login'))
    await ctx.close()
  }

  // ============ 2a. register two throwaway users through the real form ============
  const regH = await registerThroughForm(H, { width: 390, lang: 'hi', hidden: true })
  const regS = await registerThroughForm(S, { width: 1440, lang: 'en', hidden: false })
  const rowH = await row(H), rowS = await row(S)
  check('register (form, "Keep hidden"): signed in afterwards, app_register was called', regH.user?.id && regH.user.id === rowH?.id && regH.calls.includes('app_register'), regH.err || `id ${String(rowH?.id).slice(0, 8)}…`)
  check('register (form, "Show my details"): signed in afterwards, app_register was called', regS.user?.id && regS.user.id === rowS?.id && regS.calls.includes('app_register'), regS.err || `id ${String(rowS?.id).slice(0, 8)}…`)
  check('app_register stored "hidden" in profiles.consents.details_visibility', rowH?.consents?.details_visibility?.choice === 'hidden' && !!rowH.consents.details_visibility.chosen_at, JSON.stringify(rowH?.consents))
  check('app_register stored "show" in profiles.consents.details_visibility', rowS?.consents?.details_visibility?.choice === 'show', JSON.stringify(rowS?.consents))
  check('app_register stored email, mobile, town + town coordinates, no pincode, linked to Supabase Auth, not admin', [rowH, rowS].every((r, i) => r && r.email === [H, S][i].email && r.phone === [H, S][i].phone && r.has_auth && r.auth_provider === 'email' && r.pincode === null && /खुरई|Khurai/.test(r.village_town || '') && Math.abs(Number(r.latitude) - 24.04) < 0.05 && r.is_admin === false), `${rowH?.village_town} ${rowH?.latitude},${rowH?.longitude}`)
  const dupe = await sql(`select count(*)::int as n from public.profiles where phone in (${inList([H.phone, S.phone])})`)
  check('exactly two profiles were created', dupe[0].n === 2)

  // ============ 2b. "Keep hidden" → get_listing_contact refuses ============
  await sql(`insert into public.listings (user_id, listing_type, category, details, status, expires_at) values ('${rowH.id}', 'requirement', 'labor', '{"stageb":true}', 'active', now() + interval '1 hour'), ('${rowS.id}', 'requirement', 'labor', '{"stageb":true}', 'active', now() + interval '1 hour')`)
  const ls = await sql(`select id, user_id from public.listings where user_id in ('${rowH.id}', '${rowS.id}')`)
  const listH = ls.find((l) => l.user_id === rowH.id)?.id, listS = ls.find((l) => l.user_id === rowS.id)?.id
  const cH = await rest('rpc/get_listing_contact', { body: { p_listing_id: listH } })
  info(`get_listing_contact(hidden user's listing) → HTTP ${cH.status}, body: ${cH.text}`)
  check('"Keep hidden": get_listing_contact refuses with contact_hidden and gives out no name or number', cH.status >= 400 && cH.json?.message === 'contact_hidden' && !cH.text.includes(H.phone) && !cH.text.includes(H.name))
  const cS = await rest('rpc/get_listing_contact', { body: { p_listing_id: listS } })
  check('"Show my details": get_listing_contact still returns that user\'s name and number', cS.status === 200 && cS.json?.[0]?.phone === S.phone && cS.json?.[0]?.full_name === S.name, `HTTP ${cS.status}`)
  const items = { connect_only: true, no_verification: true, no_payments: true, posting_rules: true }
  const acc = await rest('rpc/accept_listing_consents', { body: { p_actor_id: rowH.id, p_items: items } })
  const afterAcc = await row(H)
  check('accept_listing_consents keeps the visibility choice next to the listing consents', acc.status === 200 && afterAcc.consents?.details_visibility?.choice === 'hidden' && afterAcc.consents?.items?.posting_rules === true, JSON.stringify(Object.keys(afterAcc.consents || {})))
  const cH2 = await rest('rpc/get_listing_contact', { body: { p_listing_id: listH } })
  check('…and the hidden user\'s listing is still refused afterwards', cH2.json?.message === 'contact_hidden')

  // ============ 2c. normal sign-in still works (mobile and email) ============
  const okS = await rest('rpc/app_login', { body: { p_phone: S.phone } })
  check('mobile sign-in for a normal (non-admin) profile returns the profile', okS.status === 200 && okS.json?.id === rowS.id)
  {
    const { ctx, page } = await open({ width: 1440, lang: 'en', path: '/login' })
    await page.getByTestId('login-screen').waitFor({ timeout: 20000 })
    await page.fill('#email', H.email); await page.fill('#password', H.password); await page.getByTestId('login-email-submit').click()
    await page.waitForURL((x) => !x.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {})
    check('email + password sign-in through the form works for the new user', (await storedUser(page))?.id === rowH.id)
    await ctx.close()
  }

  // ============ 2d. an is_admin profile is refused on the mobile path ============
  await sql(`update public.profiles set is_admin = true where id = '${rowS.id}' and email = '${S.email}'`)
  const adm = await rest('rpc/app_login', { body: { p_phone: S.phone } })
  info(`app_login(is_admin throwaway ${S.phone}) → HTTP ${adm.status}, exact body: ${adm.text}`)
  check('mobile sign-in for an is_admin profile is refused, byte-for-byte the same answer as an unknown number', adm.status === unk.status && adm.text === unk.text && !adm.text.includes(S.phone))
  {
    const { ctx, page } = await open({ width: 1440, lang: 'en', path: '/login' })
    await page.getByTestId('login-screen').waitFor({ timeout: 20000 })
    await page.fill('#phone', UNKNOWN_UI); await page.getByTestId('login-phone-submit').click()
    const unknownMsg = await page.getByTestId('login-phone-error').innerText({ timeout: 10000 })
    await page.fill('#phone', S.phone); await page.getByTestId('login-phone-submit').click()
    await page.waitForTimeout(1500)
    const adminMsg = await page.getByTestId('login-phone-error').innerText({ timeout: 10000 })
    check('sign-in screen: the admin number gets the same "not found" message and nobody is signed in', adminMsg === unknownMsg && adminMsg.includes(T.en.notFound) && (await storedUser(page)) == null && new URL(page.url()).pathname.startsWith('/login'), adminMsg.slice(0, 60))
    await shot(page, 'admin-mobile-refused-en-1440')

    // ============ 2e. throttle, mobile (UNKNOWN_UI already has 1 failure from above) ============
    await page.fill('#phone', UNKNOWN_UI)
    const seen = [unknownMsg]
    for (let i = 2; i <= 6; i++) { await page.getByTestId('login-phone-submit').click(); await page.waitForTimeout(1500); seen.push(await page.getByTestId('login-phone-error').innerText()) }
    check('mobile: attempts 1–5 say "not found", attempt 6 shows the throttle message', seen.slice(0, 5).every((m) => m.includes(T.en.notFound)) && seen[5].trim() === T.en.tooMany, seen.map((m) => (m.includes(T.en.tooMany) ? 'LOCK' : 'nf')).join(' '))
    await shot(page, 'throttle-mobile-en-1440')
    await ctx.close()
  }
  const lockRest = await rest('rpc/app_login', { body: { p_phone: UNKNOWN_UI } })
  info(`app_login(locked number) → HTTP ${lockRest.status}, body: ${lockRest.text}`)
  check('mobile: the server itself answers too_many_attempts while locked', lockRest.status >= 400 && lockRest.json?.message === 'too_many_attempts')
  check('mobile: exactly 5 failures were counted for that number (refused attempts are not added)', (await sql(`select count(*)::int as n from public.login_attempts where identifier = '${UNKNOWN_UI}' and not success`))[0].n === 5)

  // ============ 2f. throttle, email ============
  {
    const { ctx, page } = await open({ width: 390, lang: 'hi', path: '/login' })
    await page.getByTestId('login-screen').waitFor({ timeout: 20000 })
    await page.fill('#email', H.email); await page.fill('#password', 'galat-password-1')
    const seen = []
    for (let i = 1; i <= 6; i++) { await page.getByTestId('login-email-submit').click(); await page.waitForTimeout(2500); seen.push(await page.getByTestId('login-email-error').innerText()) }
    check('email: wrong password 1–5 say "wrong email or password", attempt 6 shows the throttle message', seen.slice(0, 5).every((m) => m.includes(T.hi.wrongPw)) && seen[5].trim() === T.hi.tooMany, seen.map((m) => (m.includes(T.hi.tooMany) ? 'LOCK' : 'wrong')).join(' '))
    await shot(page, 'throttle-email-hi-390')
    await page.fill('#password', H.password); await page.getByTestId('login-email-submit').click(); await page.waitForTimeout(2500)
    check('email: while locked, even the correct password is refused and nobody is signed in', (await page.getByTestId('login-email-error').innerText()).trim() === T.hi.tooMany && (await storedUser(page)) == null)
    await ctx.close()
  }
} catch (e) {
  check('the run finished without an unexpected error', false, String(e?.message || e).slice(0, 300))
} finally {
  await browser.close().catch(() => {})
  server.close()
  // ============ cleanup: only what this run made ============
  try {
    const mine = (await sql(`select identifier, success, count(*)::int as n from public.login_attempts where identifier in (${inList(PHONES)}) or identifier like 'ks-stageb-%@example.com' group by 1, 2 order by 1, 2`))
    info(`login_attempts rows written by this run: ${JSON.stringify(mine)}`)
    await cleanup()
    const after = (await sql(countsSql))[0]
    check('cleanup: staging is back to exactly what it was (profiles, listings, login_attempts, Supabase Auth users)', JSON.stringify(after) === JSON.stringify(before), `before ${JSON.stringify(before)} after ${JSON.stringify(after)}`)
  } catch (e) {
    check('cleanup ran', false, String(e?.message || e).slice(0, 300))
  }
}
writeFileSync(join(OUT, 'stageb-check.json'), JSON.stringify({ at: new Date().toISOString(), database: 'staging', passed: results.filter((r) => r.ok === true).length, failed: failures, results }, null, 2))
console.log(`\nstaging Stage B: ${results.filter((r) => r.ok === true).length} passed, ${failures} failed`)
process.exit(failures ? 1 : 0)
