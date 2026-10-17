// Batch 9 Phase 5B.1 — KEEP personas through the staging WEBSITE's own sign-up form (UI only).
//   node scripts/phase5b/personas.mjs --only P1,P2,P3
// Resumable: each persona's finished steps are kept in evidence/phase5b/state.json (ids only).
import * as L from './lib.mjs'

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null })()
const state = L.loadState()
const pw = L.password()
const list = L.personas().filter((p) => !only || only.includes(p.id))

for (const p of list) {
  L.heartbeat(`5B.1 persona ${p.id}`)
  const st = (state.personas[p.id] ||= { id: p.id, role: p.role, name: p.name, town: p.town, lang: p.lang, details: p.show ? 'SHOWN' : 'HIDDEN', steps: {} })
  delete st.error
  const dir = p.id
  const t = L.town(p.town)
  const { ctx, page, diag } = await L.newPhone({ geo: { lat: t.lat, lng: t.lng }, lang: p.id === 'P9' ? 'hi' : p.lang })
  const step = (k, ok, detail) => { st.steps[k] = { ok: !!ok, detail: detail == null ? null : L.scrub(typeof detail === 'string' ? detail : JSON.stringify(detail)), at: new Date().toISOString() }; L.log(`${ok ? 'OK  ' : 'FAIL'} ${p.id} ${k}`, st.steps[k].detail || ''); L.saveState(state) }
  try {
    // 1. sign up (once)
    if (!st.steps.signup?.ok) {
      let r
      if (p.id === 'P9') {
        // Edge: spaces around name/e-mail, mixed-case e-mail, language switched hi → en → hi → en at signup.
        await L.goto(page, '/signup')
        await L.fillSignupForm(page, p, pw, { edge: true })
        // Batch 10A Task E: the header हिं / EN toggle replaces the removed #language dropdown.
        await L.setAppLang(page, 'hi'); await page.waitForTimeout(400)
        await L.setAppLang(page, 'en'); await page.waitForTimeout(400)
        const kept = await page.inputValue('#full_name')
        step('p9-lang-switch-keeps-fields', kept.trim() === p.name, { nameKept: kept.trim() === p.name })
        await L.shot(page, dir, '01-signup-form', { full: true })
        await page.check('[data-testid="disclaimer-accept"]') // Batch 10A Task E: same page, no step 2
        const sr = page.waitForResponse((x) => x.url().includes('/auth/v1/signup'), { timeout: 30000 }).catch(() => null)
        const rr = page.waitForResponse((x) => x.url().includes('/rpc/app_register'), { timeout: 40000 }).catch(() => null)
        await L.registerBtn(page).click()
        const s1 = await sr; const r1 = await rr
        let autoconfirmSession = null; try { const j = await s1.json(); autoconfirmSession = !!(j.access_token || j.session?.access_token) } catch { /* */ }
        let profileId = null; try { profileId = (await r1.json()).id } catch { /* */ }
        await page.waitForURL((u) => !/\/signup/.test(u.pathname), { timeout: 20000 }).catch(() => {})
        await page.waitForTimeout(1200)
        const s = await L.session(page)
        r = { ok: !!s?.id, profileId: profileId || s?.id, autoconfirmSession, signupStatus: s1?.status(), regStatus: r1?.status(), error: await page.locator('[data-testid="signup-error"]').innerText().catch(() => null), storedName: s?.full_name === p.name, storedEmailLower: s?.email === p.email.toLowerCase() }
      } else {
        r = await L.signup(page, p, pw, { dir })
      }
      st.profileId = r.profileId
      st.createdAt = new Date().toISOString()
      step('signup', r.ok, { url: r.url, autoconfirmSession: r.autoconfirmSession, signupStatus: r.signupStatus, regStatus: r.regStatus, error: r.error, placeLabel: r.placeLabel, storedName: r.storedName, storedEmailLower: r.storedEmailLower })
      await L.shot(page, dir, '03-after-signup')
      if (!r.ok) throw new Error('signup failed')
    }
    // 2-3. log out → e-mail + password
    if (!st.steps.loginEmail?.ok) {
      step('logout1', await L.logout(page))
      const em = p.id === 'P9' ? `  ${p.email.toUpperCase()}  ` : p.email
      const r = await L.loginEmail(page, em, pw)
      step('loginEmail', r.ok && r.id === st.profileId, { url: r.url, error: r.error, sameProfile: r.id === st.profileId, variant: p.id === 'P9' ? 'upper-case + spaces' : 'as registered' })
      await L.shot(page, dir, '04-after-login-email')
    }
    // 4-5. log out → mobile only
    if (!st.steps.loginPhone?.ok) {
      step('logout2', await L.logout(page))
      const r = await L.loginPhone(page, p.mobile)
      step('loginPhone', r.ok && r.id === st.profileId, { url: r.url, error: r.error, sameProfile: r.id === st.profileId })
      await L.shot(page, dir, '05-after-login-mobile')
    } else if (!(await L.session(page))) {
      await L.loginPhone(page, p.mobile)
    }
    // 6. reload (web stand-in for "kill and reopen the app")
    if (!st.steps.reloadPersists?.ok) {
      await L.goto(page, '/home', 300)
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500)
      const s = await L.session(page)
      const nameShown = await page.getByText(p.name.split(' ').slice(0, 3).join(' '), { exact: false }).count().catch(() => 0)
      step('reloadPersists', s?.id === st.profileId, { sessionAfterReload: !!s, nameOnHome: nameShown > 0 })
      await L.shot(page, dir, '06-after-reload')
    }
    // 7. language switch persists after the next login
    if (!st.steps.langPersists?.ok) {
      const other = p.lang === 'hi' ? 'en' : 'hi'
      await L.goto(page, '/home', 300)
      await L.switchLang(page, other)
      const afterSwitch = await L.uiLang(page)
      await L.logout(page)
      await page.evaluate((l) => localStorage.setItem('ks_lang_v1', l), p.lang) // device back to the old language
      const r = await L.loginPhone(page, p.mobile)
      const ui = await L.uiLang(page)
      step('langPersists', afterSwitch === other && r.lang === other && ui === other, { switchedTo: other, uiAfterSwitch: afterSwitch, profileLangAfterLogin: r.lang, uiAfterLogin: ui })
      await L.shot(page, dir, '07-lang-after-relogin')
      // restore the persona's own language (same toggle) so the founder finds it as documented
      await L.goto(page, '/home', 300)
      await L.switchLang(page, p.lang)
      const s = await L.session(page)
      step('langRestored', s?.preferred_language === p.lang, { now: s?.preferred_language })
    }
    // 8. Profile shows the right data
    if (!st.steps.profileData?.ok) {
      await L.goto(page, '/profile', 1500)
      const v = async (sel) => page.inputValue(sel).catch(() => null)
      const got = { name: await v('#pf_name'), email: await v('#pf_email'), village: await v('#pf_village'), lang: await v('#pf_lang'), land: await v('#k_land'), crops: await v('#k_crops'), mandi: await v('#k_mandi'),
        lease: await page.isChecked('[data-testid="k-interest-lease"]').catch(() => null), equip: await page.isChecked('[data-testid="k-interest-equipment"]').catch(() => null), wa: await page.isChecked('[data-testid="k-whatsapp-optin"]').catch(() => null),
        mobileShown: (await page.locator('#pf_phone').count()) > 0 }
      // Batch 10A Task E: signup no longer has the किसान block, so a fresh profile always has the empty farmer
      // profile (p.kisan is not entered at signup any more; it can be filled on Profile).
      const k = { land_acres: '', main_crops: '', interest_lease: false, interest_equipment: false, whatsapp_opt_in: false, preferred_mandi: '' }
      const checks = {
        name: got.name === p.name, email: got.email === p.email.toLowerCase(), village: !!got.village && (got.village.includes(t.name_en) || got.village.includes(t.name_hi)), lang: got.lang === p.lang,
        land: String(got.land || '') === String(k.land_acres || '') || Number(got.land) === Number(k.land_acres), crops: (got.crops || '') === (k.main_crops || ''), mandi: (got.mandi || '') === (k.preferred_mandi || ''),
        lease: got.lease === !!k.interest_lease, equip: got.equip === !!k.interest_equipment, wa: got.wa === !!k.whatsapp_opt_in,
      }
      const bad = Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n)
      step('profileData', bad.length === 0, { mismatched: bad, villageShown: got.village, mobileShownOnProfile: got.mobileShown })
      await L.shot(page, dir, '08-profile', { full: true })
    }
    // 9. edit one field (किसान profile → main crops) and confirm it persists
    if (!st.steps.profileEdit?.ok) {
      await L.goto(page, '/profile', 1500)
      const before = await page.inputValue('#k_crops')
      const next = before ? `${before}, मक्का` : 'मक्का'
      await page.fill('#k_crops', next)
      await page.getByRole('button', { name: /^(सेव करें|Save)$/ }).click()
      const saved = await page.getByText(/किसान प्रोफाइल सहेज ली गई|Farmer profile saved/).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500)
      const afterReload = await page.inputValue('#k_crops').catch(() => null)
      // and from the server: log out, log in by mobile, read again
      await L.logout(page); await L.loginPhone(page, p.mobile)
      await L.goto(page, '/profile', 1500)
      const afterRelogin = await page.inputValue('#k_crops').catch(() => null)
      step('profileEdit', saved && afterReload === next && afterRelogin === next, { field: 'main_crops', savedNotice: saved, persistsAfterReload: afterReload === next, persistsAfterRelogin: afterRelogin === next })
      await L.shot(page, dir, '09-profile-edited')
    }
    // P1 only: the name/basic-info Save (expected to need a pincode — backlog B8)
    if (p.id === 'P1' && !st.steps.profileNameSaveB8) {
      await L.goto(page, '/profile', 1500)
      await page.fill('#pf_name', p.name) // unchanged value; only the Save path is exercised
      await page.getByRole('button', { name: /बदलाव सहेजें|Save changes|सेव/ }).first().click()
      await page.waitForTimeout(3000)
      const msg = await page.locator('[role="alert"], .text-red-700, .text-red-800, .bg-red-50').first().innerText().catch(() => null)
      const ok = await page.getByText(/बदलाव सहेजे गए|Changes saved/).count()
      st.steps.profileNameSaveB8 = { ok: ok > 0, detail: L.scrub(JSON.stringify({ saved: ok > 0, message: msg })), at: new Date().toISOString() }
      L.saveState(state)
      await L.shot(page, dir, '10-profile-basic-save-B8')
    }
    // leave logged out
    await L.logout(page)
    st.diag = { consoleErrors: diag.console.slice(0, 10), failedOwnRequests: diag.failed.slice(0, 10) }
    L.saveState(state)
  } catch (e) {
    L.log(`ERROR ${p.id}`, String(e.message || e).split('\n')[0])
    st.error = L.scrub(String(e.message || e).split('\n')[0])
    await L.shot(page, dir, 'zz-error').catch(() => {})
    L.saveState(state)
  } finally {
    await ctx.close().catch(() => {})
  }
}
await L.closeBrowser()
