// Batch 9 Phase 5B.5 — every other data-writing form on the staging WEBSITE: one invalid and one
// valid KSTEST submission each (throw-away N1 where a login is needed). Never KEEP data, never prod.
//   node scripts/phase5b/forms.mjs --only F1,F2,...
import * as L from './lib.mjs'

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null })()
const want = (k) => !only || only.includes(k)
const state = L.loadState()
const pw = L.password()
const N1 = L.newNoise('N1')
const A = 'forms'
const S = Date.now() % 1000000
const R = (id, title, status, detail) => L.result(state, { area: '5B.5', id, title, status, detail, evidence: `evidence/phase5b/${A}/` })
const row = (r) => { state.rows = state.rows || []; state.rows.push({ keep: false, marker: `KSTEST-5B-${S}`, time: new Date().toISOString(), ...r }); L.saveState(state) }
const t = L.town('Sagar')
const { ctx, page } = await L.newPhone({ geo: { lat: t.lat, lng: t.lng }, lang: 'hi' })
const writes = []
page.on('response', (r) => { const u = r.url(); const m = r.request().method(); if (m === 'POST' && /supabase\.co\/rest|\/api\/feedback/.test(u) && !/rpc\/(increment_|log_search|get_|search_|app_login|resolve_|claim_geocode|cache_weather)/.test(u)) writes.push(`${u.split('?')[0].replace(/^https:\/\/[^/]+/, '')} ${r.status()}`) })
const errNow = async () => page.locator('[role="alert"], .text-red-600, .text-red-700, .bg-red-50').allInnerTexts().then((a) => a.filter((x) => x.trim()).slice(0, 3)).catch(() => [])

try {
  L.heartbeat('5B.5 forms')
  // F1 — Feedback / grievance (/grievance → Pages Function /api/feedback on the LIVE staging site)
  if (want('F1')) {
    await L.goto(page, '/grievance', 1500)
    writes.length = 0
    await page.locator('[data-testid="feedback-form"] button[type="submit"]').click(); await page.waitForTimeout(800)
    const e = await errNow()
    await L.shot(page, A, 'F1-feedback-invalid')
    R('F1a', 'Feedback: empty form refused with a message, nothing sent', e.length && !writes.length ? 'RAN-PASSED' : 'RAN-FAILED', { messages: e, writes })
    await page.fill('#fb-contact', N1.email)
    await page.fill('#fb-message', `KSTEST-5B-${S} feedback form test from the Phase 5B web run — please ignore`)
    await page.locator('[data-testid="feedback-form"] button[type="submit"]').click()
    const done = await page.waitForSelector('[data-testid="feedback-done"]', { timeout: 20000 }).then(() => true).catch(() => false)
    await L.shot(page, A, 'F1-feedback-valid')
    if (done) row({ kind: 'feedback (website /grievance → /api/feedback)', table: 'feedback_messages' })
    R('F1b', 'Feedback: valid KSTEST message → thank-you state, POST /api/feedback 200', done && writes.some((w) => /api\/feedback 200/.test(w)) ? 'RAN-PASSED' : 'RAN-FAILED', { done, writes })
  }
  // F2 — Kisan Sawaal (ask a question)
  if (want('F2')) {
    await L.goto(page, '/sawaal', 1500)
    await page.getByRole('button', { name: /अपना सवाल पूछें|Ask a question/ }).first().click()
    await page.waitForSelector('#sw_q')
    writes.length = 0
    await page.getByRole('button', { name: /^जमा करें$|^Submit$/ }).last().click(); await page.waitForTimeout(1500)
    const e = await errNow()
    await L.shot(page, A, 'F2-sawaal-invalid')
    R('F2a', 'Sawaal: empty question refused with a message, nothing stored', e.length && !writes.some((w) => / 20\d$/.test(w)) ? 'RAN-PASSED' : 'RAN-FAILED', { messages: e, writes })
    await page.fill('#sw_name', `KSTEST-5B-${S}`); await page.fill('#sw_village', 'KSTEST village')
    await page.selectOption('#sw_cat', { index: 1 }).catch(() => {})
    await page.fill('#sw_q', `KSTEST-5B-${S} test question — please ignore`)
    writes.length = 0
    await page.getByRole('button', { name: /^जमा करें$|^Submit$/ }).last().click()
    const ok = await page.getByText(/आपका सवाल मिल गया|question receiv/i).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    await L.shot(page, A, 'F2-sawaal-valid')
    if (ok) row({ kind: 'kisan_sawaal question (website /sawaal)', table: 'kisan_sawaal' })
    R('F2b', 'Sawaal: valid KSTEST question → "question received"', ok ? 'RAN-PASSED' : 'RAN-FAILED', { ok, writes })
  }
  // F3 — Safalta (share a success story)
  if (want('F3')) {
    await L.goto(page, '/safalta', 1500)
    await page.getByRole('button', { name: /अपनी कहानी शेयर करें|Share your story/ }).first().click()
    await page.waitForSelector('#sf_story')
    writes.length = 0
    await page.getByRole('button', { name: /^जमा करें$|^Submit$/ }).last().click(); await page.waitForTimeout(1500)
    const e = await errNow()
    await L.shot(page, A, 'F3-safalta-invalid')
    R('F3a', 'Safalta: empty story refused with a message, nothing stored', e.length && !writes.some((w) => / 20\d$/.test(w)) ? 'RAN-PASSED' : 'RAN-FAILED', { messages: e, writes })
    await page.fill('#sf_name', `KSTEST-5B-${S}`); await page.fill('#sf_village', 'KSTEST village'); await page.fill('#sf_crop', 'KSTEST crop')
    await page.fill('#sf_story', `KSTEST-5B-${S} test story — please ignore`)
    writes.length = 0
    await page.getByRole('button', { name: /^जमा करें$|^Submit$/ }).last().click()
    const ok = await page.getByText(/आपकी कहानी मिल गई|Your story was received|story received/i).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    await L.shot(page, A, 'F3-safalta-valid')
    if (ok) row({ kind: 'kisan_safalta story (website /safalta, no contact phone)', table: 'kisan_safalta' })
    R('F3b', 'Safalta: valid KSTEST story (no phone) → "story received"', ok ? 'RAN-PASSED' : 'RAN-FAILED', { ok, writes })
  }
  // F4 — Kisan Mela submit
  if (want('F4')) {
    await L.goto(page, '/kisan-mela/submit', 1500)
    writes.length = 0
    await page.getByRole('button', { name: /जानकारी भेजें|^Submit$/ }).last().click(); await page.waitForTimeout(1500)
    const e = await errNow()
    await L.shot(page, A, 'F4-mela-invalid')
    R('F4a', 'Kisan Mela submit: empty form refused with a message', e.length && !writes.some((w) => / 20\d$/.test(w)) ? 'RAN-PASSED' : 'RAN-FAILED', { messages: e, writes })
    await page.fill('#m_name', `KSTEST-5B-${S} test mela`); await page.fill('#m_venue', 'KSTEST venue'); await page.fill('#m_addr', 'KSTEST address')
    await page.selectOption('#m_state', { index: 1 }).catch(() => {}); await page.waitForTimeout(400)
    await page.selectOption('#m_dist', { index: 1 }).catch(() => {})
    await page.check('[data-testid="m-date-unknown"]').catch(() => {})
    await page.fill('#m_cn', 'KSTEST contact').catch(() => {})
    writes.length = 0
    await page.getByRole('button', { name: /जानकारी भेजें|^Submit$/ }).last().click()
    const ok = await page.getByText(/धन्यवाद! आपकी जानकारी|Thank you/).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    await L.shot(page, A, 'F4-mela-valid', { full: true })
    if (ok) row({ kind: 'kisan_mela submission (website /kisan-mela/submit, for review)', table: 'kisan_mela' })
    R('F4b', 'Kisan Mela submit: valid KSTEST event → "sent for review"', ok ? 'RAN-PASSED' : 'RAN-FAILED', { ok, writes, errors: ok ? null : await errNow() })
  }
  // F5 — Carbon credit: suggestion + poll vote
  if (want('F5')) {
    await L.goto(page, '/carbon-credit', 2000)
    const sb = page.getByRole('button', { name: /सुझाव भेजें|Send suggestion/ }).first()
    await sb.scrollIntoViewIfNeeded().catch(() => {})
    writes.length = 0
    await sb.click(); await page.waitForTimeout(1200)
    const e = await errNow()
    R('F5a', 'Carbon suggestion: empty text refused', e.length && !writes.some((w) => / 20\d$/.test(w)) ? 'RAN-PASSED' : (writes.length ? 'RAN-FAILED' : 'HUMAN-REVIEW'), { messages: e, writes })
    const ta = page.locator('textarea').first()
    await ta.fill(`KSTEST-5B-${S} test suggestion — please ignore`)
    writes.length = 0
    await sb.click(); await page.waitForTimeout(3000)
    await L.shot(page, A, 'F5-carbon-suggestion')
    const okS = writes.some((w) => /submit_carbon_suggestion 20\d/.test(w))
    if (okS) row({ kind: 'carbon suggestion (website /carbon-credit)', table: 'carbon_suggestions (via submit_carbon_suggestion)' })
    R('F5b', 'Carbon suggestion: valid KSTEST text stored', okS ? 'RAN-PASSED' : 'RAN-FAILED', { writes })
    R('F5c', 'Carbon poll vote', 'NOT-RUN', 'not run: a vote is one per device and counts in the PUBLIC poll results shown on the page; skipped to keep the staging poll clean (no invalid input exists — a vote is one tap)')
  }
  // F6 — Daily update (alerts) signup on /mausam: invalid only
  if (want('F6')) {
    await L.goto(page, '/mausam', 2500)
    const inp = page.locator('input[placeholder="9876543210"]').first()
    await inp.scrollIntoViewIfNeeded()
    await inp.fill('0000055690')
    const sec = inp.locator('xpath=ancestor::section[1]')
    await sec.locator('input[type="checkbox"]').check()
    writes.length = 0
    await sec.getByRole('button', { name: /^जमा करें$|^Submit$/ }).click(); await page.waitForTimeout(1000)
    const e = await sec.innerText()
    await L.shot(page, A, 'F6-daily-update-invalid')
    R('F6a', 'Daily-update signup: number not starting 6-9 refused ("valid 10-digit mobile")', /सही 10-अंकों|valid 10-digit/.test(e) && !writes.length ? 'RAN-PASSED' : 'RAN-FAILED', { refused: /सही 10-अंकों|valid 10-digit/.test(e), writes })
    R('F6b', 'Daily-update signup: valid submission', 'NOT-RUN', 'not run on purpose: this form only accepts numbers starting 6-9, i.e. numbers that can belong to a real person; storing one as a test subscription is unsafe. Note: the registration form accepts 0-leading numbers but this one does not (inconsistent rules).')
  }
  // F7 — change password (throw-away N1): mismatch (invalid) then a real change and back
  if (want('F7')) {
    const r = await L.loginPhone(page, N1.mobile)
    if (!r.ok) throw new Error('N1 login failed')
    await L.goto(page, '/profile', 1500)
    await page.fill('#pw_cur', pw); await page.fill('#pw_new', pw + 'Z'); await page.fill('#pw_confirm', pw + 'Y')
    await page.getByRole('button', { name: /पासवर्ड बदलें|Change password/ }).last().click(); await page.waitForTimeout(1200)
    const mism = await errNow()
    await L.shot(page, A, 'F7-password-mismatch')
    R('F7a', 'Change password: new ≠ confirm refused', mism.length ? 'RAN-PASSED' : 'RAN-FAILED', { messages: mism })
    await page.fill('#pw_cur', pw); await page.fill('#pw_new', pw + 'Z'); await page.fill('#pw_confirm', pw + 'Z')
    await page.getByRole('button', { name: /पासवर्ड बदलें|Change password/ }).last().click()
    const changed = await page.getByText(/पासवर्ड बदल गया|Password changed/).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    await L.logout(page)
    const withNew = await L.loginEmail(page, N1.email, pw + 'Z')
    // put the original back so N1 keeps the shared password
    await L.goto(page, '/profile', 1500)
    await page.fill('#pw_cur', pw + 'Z'); await page.fill('#pw_new', pw); await page.fill('#pw_confirm', pw)
    await page.getByRole('button', { name: /पासवर्ड बदलें|Change password/ }).last().click()
    const back = await page.getByText(/पासवर्ड बदल गया|Password changed/).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    R('F7b', 'Change password works (log in with the new one), then restored', changed && withNew.ok && back ? 'RAN-PASSED' : 'RAN-FAILED', { changed, loginWithNew: withNew.ok, restored: back })
    // F8 — Mela interest (logged-in) on /kisan-mela
    await L.goto(page, '/kisan-mela', 2500)
    const ib = page.locator('[data-testid="mela-interest-btn"]').first()
    if (await ib.count()) {
      writes.length = 0
      await ib.click(); await page.waitForTimeout(2500)
      const ok = writes.some((w) => /set_mela_interest 20\d/.test(w))
      await L.shot(page, A, 'F8-mela-interest')
      if (ok) row({ kind: 'mela interest (throw-away N1)', table: 'mela interest (set_mela_interest)' })
      R('F8', 'Kisan Mela "interested" button (logged in)', ok ? 'RAN-PASSED' : 'RAN-FAILED', { writes })
    } else R('F8', 'Kisan Mela "interested" button', 'NOT-RUN', 'no mela card with an interest button on staging')
    await L.logout(page)
  }
} catch (e) {
  L.log('ERROR', String(e.message || e).split('\n')[0])
  await L.shot(page, A, 'zz-error', { full: true }).catch(() => {})
} finally {
  L.saveState(state)
  await ctx.close().catch(() => {})
  await L.closeBrowser()
}
