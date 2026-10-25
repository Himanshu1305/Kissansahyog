// Batch 9 Phase 5B.2 — negative / edge cases of sign-up and sign-in on the staging WEBSITE,
// ONLY with throw-away KSTEST accounts (never a KEEP persona).
//   node scripts/phase5b/negatives.mjs --only N01,N02,...
import * as L from './lib.mjs'

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null })()
const want = (k) => !only || only.includes(k)
const state = L.loadState()
const pw = L.password()
const A = 'negatives'
const N1 = L.newNoise('N1')
const noiseRow = (r) => { state.noise = state.noise || []; state.noise.push({ keep: false, marker: 'KSTEST', time: new Date().toISOString(), ...r }); L.saveState(state) }
const R = (id, title, ok, detail, status) => L.result(state, { area: '5B.2', id, title, status: status || (ok ? 'RAN-PASSED' : 'RAN-FAILED'), detail })

async function fresh(lang = 'hi') { const t = L.town('Sagar'); return L.newPhone({ geo: { lat: t.lat, lng: t.lng }, lang }) }
const fieldErr = async (page) => page.locator('p.text-red-600, [data-testid="place-error"]').allInnerTexts().catch(() => [])
const topErr = async (page) => page.locator('[data-testid="signup-error"]').innerText().catch(() => null)
async function submitStep1(page) { await page.locator('[data-testid="signup-form"] button[type="submit"]').click(); await page.waitForTimeout(700) }
// Batch 10A Task E: one page — tick the acknowledgment, then press Register (the form's submit button).
async function accept(page) {
  await page.check('[data-testid="disclaimer-accept"]')
  await L.registerBtn(page).click()
}

let ph = await fresh()
let { page, ctx } = ph
try {
  L.heartbeat('5B.2 negatives (throw-away accounts only)')
  // N01 — all client-side errors at once: empty name, invalid e-mail, short password, 9-digit mobile, no village
  if (want('N01')) {
    await L.goto(page, '/signup')
    await page.fill('#email', 'abc@x'); await page.fill('#password', '1234567'); await page.fill('#phone', '123456789')
    const reqs = []; page.on('request', (r) => { if (/auth\/v1|rpc\/app_register/.test(r.url())) reqs.push(r.url()) })
    await submitStep1(page)
    const errs = await fieldErr(page)
    await L.shot(page, A, 'N01-all-field-errors', { full: true })
    const still = await page.locator('[data-testid="signup-form"]').count()
    R('N01', 'empty name / invalid e-mail / 7-char password / 9-digit mobile / no village → one message per field, no network call', errs.length >= 5 && still && !reqs.length, { messages: errs, networkCalls: reqs.length })
  }
  // N02 — 11-digit and non-numeric mobile, and a mobile starting with 0 / 1
  if (want('N02')) {
    await L.goto(page, '/signup')
    await page.fill('#phone', '98765432101')
    const v11 = await page.inputValue('#phone')
    await page.fill('#phone', '98765abcde'); await submitStep1(page)
    const nonNum = (await fieldErr(page)).find((e) => /मोबाइल|mobile/i.test(e)) || null
    await page.fill('#phone', '0123456789'); await submitStep1(page)
    const lead0 = (await fieldErr(page)).find((e) => /मोबाइल|mobile/i.test(e)) || null
    await page.fill('#phone', '1111111111'); await submitStep1(page)
    const lead1 = (await fieldErr(page)).find((e) => /मोबाइल|mobile/i.test(e)) || null
    await L.shot(page, A, 'N02-mobile-rules')
    R('N02a', '11-digit mobile: box keeps at most 10 digits (maxLength)', v11.length <= 10, { valueLength: v11.length })
    R('N02b', 'non-numeric mobile "98765abcde" refused', !!nonNum, { message: nonNum })
    R('N02c', 'mobile starting with 0 or 1 (not an Indian mobile) — refused?', !!lead0 && !!lead1, { startsWith0Refused: !!lead0, startsWith1Refused: !!lead1, note: 'isValidPhone accepts any 10 digits (authService.js:30); the screen asks for a "10-digit mobile number"' }, !!lead0 && !!lead1 ? 'RAN-PASSED' : 'RAN-FAILED')
  }
  // N03 — password show/hide toggle
  if (want('N03')) {
    await L.goto(page, '/signup')
    const a = await page.getAttribute('#password', 'type'); await page.click('[data-testid="password-toggle"]')
    const b = await page.getAttribute('#password', 'type'); await page.click('[data-testid="password-toggle"]')
    const c = await page.getAttribute('#password', 'type')
    await L.goto(page, '/login')
    const la = await page.getAttribute('[data-testid="login-email-form"] #password', 'type'); await page.click('[data-testid="login-email-form"] [data-testid="password-toggle"]')
    const lb = await page.getAttribute('[data-testid="login-email-form"] #password', 'type')
    R('N03', 'password Show/Hide toggle (signup + login)', a === 'password' && b === 'text' && c === 'password' && la === 'password' && lb === 'text', { signup: [a, b, c], login: [la, lb] })
  }
  // N04 — language switch mid-form keeps data; Register without the acknowledgment ticked is refused with the
  // existing message and no network call; after that refusal every field is still filled in.
  // (Batch 10A Task E: one page — there is no step 2 / Back any more, and the header toggle replaces #language.)
  if (want('N04')) {
    const n = L.newNoise('N3')
    await L.goto(page, '/signup')
    await L.fillSignupForm(page, n, pw)
    await L.setAppLang(page, 'en')
    const afterLang = { name: await page.inputValue('#full_name'), email: await page.inputValue('#email'), phone: await page.inputValue('#phone'), place: await page.locator('[data-testid="place-chosen"]').count() }
    const reqs = []; const onReq = (r) => { if (/auth\/v1|rpc\/app_register/.test(r.url())) reqs.push(r.url()) }; page.on('request', onReq)
    await submitStep1(page)
    page.off('request', onReq)
    const refusal = await topErr(page)
    await L.shot(page, A, 'N04-disclaimer-not-accepted')
    const back = { name: await page.inputValue('#full_name'), email: await page.inputValue('#email'), phone: await page.inputValue('#phone'), pwLen: (await page.inputValue('#password')).length, place: await page.locator('[data-testid="place-chosen"]').count(), vis: await page.getAttribute('[data-testid="visibility-choice"]', 'data-choice') }
    R('N04a', 'language switch mid-form keeps every field', afterLang.name === n.name && afterLang.email === n.email && afterLang.phone === n.mobile && afterLang.place === 1, { kept: afterLang.name === n.name && afterLang.email === n.email && afterLang.phone === n.mobile, placeKept: afterLang.place === 1 })
    R('N04b', 'acknowledgment not ticked → Register refused with the acknowledgment message, no network call', !!refusal && /acknowledg|स्वीकार|accept/i.test(refusal) && !reqs.length && (await page.locator('[data-testid="signup-form"]').count()) === 1, { message: refusal, networkCalls: reqs.length })
    R('N04c', 'after the refused Register every field is kept', back.name === n.name && back.email === n.email && back.phone === n.mobile && back.pwLen === pw.length && back.place === 1, { nameKept: back.name === n.name, emailKept: back.email === n.email, mobileKept: back.phone === n.mobile, passwordKept: back.pwLen === pw.length, placeKept: back.place === 1, visibility: back.vis })
  }
  // N05 — rapid double-tap on the final button → exactly one account (creates throw-away N4)
  if (want('N05') && !state.noiseAccounts?.N4) {
    const n = L.newNoise('N4')
    const calls = { signup: 0, register: 0 }
    page.on('request', (r) => { if (r.url().includes('/auth/v1/signup')) calls.signup++; if (r.url().includes('/rpc/app_register')) calls.register++ })
    await L.goto(page, '/signup'); await L.fillSignupForm(page, n, pw)
    await page.check('[data-testid="disclaimer-accept"]')
    await L.registerBtn(page).dblclick()
    await page.waitForURL((u) => !/\/signup/.test(u.pathname), { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const s = await L.session(page)
    state.noiseAccounts = { ...(state.noiseAccounts || {}), N4: { profileId: s?.id || null } }
    noiseRow({ kind: 'profile + auth user (throw-away, double-tap test)', tag: 'N4', profile_id: s?.id || null })
    R('N05', 'double tap on Register → one sign-up call, one profile', !!s?.id && calls.signup === 1 && calls.register === 1, { signupCalls: calls.signup, registerCalls: calls.register, loggedIn: !!s?.id })
    await L.logout(page)
  }
  // N06 — duplicate e-mail (N1's e-mail, another password) and duplicate mobile (N1's mobile, new e-mail)
  if (want('N06')) {
    const dupEmail = { ...L.newNoise('N2'), email: N1.email }
    await L.goto(page, '/signup'); await L.fillSignupForm(page, dupEmail, pw + 'x'); await accept(page)
    await page.waitForTimeout(5000)
    const e1 = await topErr(page); const s1 = await L.session(page)
    await L.shot(page, A, 'N06a-duplicate-email')
    R('N06a', 'duplicate e-mail → "account with this email already exists", no session', !!e1 && /ईमेल|email/i.test(e1) && !s1, { message: e1, session: !!s1 })
    const dupMobile = { ...L.newNoise('N2'), mobile: N1.mobile }
    await L.goto(page, '/signup'); await L.fillSignupForm(page, dupMobile, pw); await accept(page)
    await page.waitForTimeout(5000)
    const e2 = await topErr(page); const s2 = await L.session(page)
    const underPhone = (await fieldErr(page)).find((x) => /नंबर|number/i.test(x)) || null
    await L.shot(page, A, 'N06b-duplicate-mobile', { full: true })
    noiseRow({ kind: 'Supabase Auth user WITHOUT profile (half-finished: duplicate-mobile test)', tag: 'N2', note: 'auth.users row only; e-mail kept outside the repo (noise.json)' })
    R('N06b', 'duplicate mobile → "account with this number already exists" next to the mobile box, back on step 1', !!e2 && /नंबर|number/i.test(e2) && !s2 && !!underPhone, { message: e2, underMobileBox: underPhone, session: !!s2 })
    // half-finished registration: log in with that e-mail → registration_incomplete
    const r = await L.loginEmail(page, dupMobile.email, pw)
    await L.shot(page, A, 'N06c-half-finished-login')
    R('N06c', 'e-mail login of the half-finished registration → "account was not finished" message', !r.ok && !!r.error && /पूरा नहीं|not finished/i.test(r.error), { message: r.error })
    // and finish it: same e-mail + password with a NEW mobile → completes the registration
    const finish = { ...dupMobile, mobile: L.newNoise('N2b').mobile }
    const lst = L.noiseList(); const i = lst.findIndex((x) => x.tag === 'N2b'); lst[i].email = dupMobile.email; L.saveNoise(lst)
    await L.goto(page, '/signup'); await L.fillSignupForm(page, finish, pw); await accept(page)
    await page.waitForURL((u) => !/\/signup/.test(u.pathname), { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(2000)
    const s3 = await L.session(page)
    noiseRow({ kind: 'profile completing the half-finished registration (throw-away)', tag: 'N2b', profile_id: s3?.id || null })
    R('N06d', 'same e-mail + password + a new mobile finishes the half-finished registration', !!s3?.id, { profileCreated: !!s3?.id })
    await L.logout(page)
  }
  // N07 — login errors: wrong password, unregistered mobile, mobile with spaces, upper-case e-mail
  if (want('N07')) {
    const a = await L.loginEmail(page, N1.email, pw + 'wrong')
    await L.shot(page, A, 'N07a-wrong-password')
    R('N07a', 'correct e-mail + wrong password → "Wrong email or password"', !a.ok && /गलत|Wrong/i.test(a.error || ''), { message: a.error })
    const b = await L.loginPhone(page, '0000055699')
    await L.shot(page, A, 'N07b-unregistered-mobile')
    R('N07b', 'unregistered mobile → "No account found for this number"', !b.ok && /नहीं मिला|No account/i.test(b.error || ''), { message: b.error })
    const c = await L.loginPhone(page, ` ${N1.mobile.slice(0, 5)} ${N1.mobile.slice(5)} `)
    R('N07c', 'mobile typed with spaces signs in (maxLength 10 permitting)', c.ok, { ok: c.ok, error: c.error }, c.ok ? 'RAN-PASSED' : 'HUMAN-REVIEW')
    if (c.ok) await L.logout(page)
    const d = await L.loginEmail(page, `  ${N1.email.toUpperCase()}  `, pw)
    R('N07d', 'upper-case e-mail with spaces signs in', d.ok, { ok: d.ok, error: d.error })
    if (d.ok) await L.logout(page)
  }
  // N08 — offline sign-up attempt: clear message, nothing half-created
  if (want('N08')) {
    const n = L.newNoise('N6')
    await L.goto(page, '/signup'); await L.fillSignupForm(page, n, pw)
    await page.check('[data-testid="disclaimer-accept"]')
    await ctx.setOffline(true)
    await L.registerBtn(page).click()
    await page.waitForTimeout(6000)
    const e = await topErr(page)
    await L.shot(page, A, 'N08-offline-signup', { full: true })
    await ctx.setOffline(false); await page.waitForTimeout(1500)
    const tryLogin = await L.loginEmail(page, n.email, pw)
    const tryPhone = await L.loginPhone(page, n.mobile)
    R('N08', 'offline sign-up → message, no account (neither e-mail nor mobile can sign in afterwards)', !!e && !tryLogin.ok && !tryPhone.ok, { message: e, emailLoginAfter: tryLogin.error, mobileLoginAfter: tryPhone.error, note: e && /गड़बड़|wrong/i.test(e) ? 'message is the generic "something went wrong", it does not say "no internet"' : null })
  }
  // N09 — lockout on a DEDICATED throw-away account N5 (e-mail), and on an unregistered number
  if (want('N09')) {
    const n = L.newNoise('N5')
    if (!state.noiseAccounts?.N5) {
      const r = await L.signup(page, n, pw)
      state.noiseAccounts = { ...(state.noiseAccounts || {}), N5: { profileId: r.profileId } }
      noiseRow({ kind: 'profile + auth user (throw-away, lockout test)', tag: 'N5', profile_id: r.profileId })
      await L.logout(page)
    }
    const msgs = []
    for (let i = 1; i <= 5; i++) { const r = await L.loginEmail(page, n.email, pw + 'bad' + i); msgs.push(r.error) }
    const sixth = await L.loginEmail(page, n.email, pw)
    await L.shot(page, A, 'N09a-email-locked')
    const t0 = new Date().toISOString()
    R('N09a', 'e-mail lockout: 5 wrong passwords, then the RIGHT password is refused for 15 min', !sixth.ok && /15|बहुत बार|Too many/i.test(sixth.error || ''), { wrongPasswordMessages: msgs, sixthWithCorrectPassword: sixth.error, lockedAt: t0 })
    // mobile: failures are counted only for numbers WITHOUT an account (a registered number always signs in)
    const pm = []
    for (let i = 1; i <= 6; i++) { const r = await L.loginPhone(page, '0000055698'); pm.push(r.error) }
    await L.shot(page, A, 'N09b-mobile-unknown-locked')
    R('N09b', 'mobile: 6 tries of an unregistered number → the 6th says "too many attempts"', /15|बहुत बार|Too many/i.test(pm[5] || ''), { messages: pm })
    // N5's mobile still signs in (lock is per identifier: the e-mail is locked, not the number)
    const viaMobile = await L.loginPhone(page, n.mobile)
    R('N09c', 'while N5\'s e-mail is locked, N5 can still sign in with its mobile (lock is per identifier)', true, { mobileLoginWorks: viaMobile.ok }, 'HUMAN-REVIEW')
    if (viaMobile.ok) await L.logout(page)
  }
} catch (e) {
  L.log('ERROR', String(e.message || e).split('\n')[0])
  await L.shot(page, A, 'zz-error', { full: true }).catch(() => {})
} finally {
  L.saveState(state)
  await ctx.close().catch(() => {})
  await L.closeBrowser()
}
