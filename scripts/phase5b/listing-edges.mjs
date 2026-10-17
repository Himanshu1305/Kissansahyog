// Batch 9 Phase 5B.3 edge checks on the staging WEBSITE Post form, as a THROW-AWAY KSTEST account.
//   node scripts/phase5b/listing-edges.mjs [--only E1,E2,...]
import * as L from './lib.mjs'
import { PLAN, fillStep2, step1, step3, testJpeg } from './listings.mjs'

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null })()
const want = (k) => !only || only.includes(k)
const state = L.loadState()
const pw = L.password()
const N = L.newNoise('N1')
const t = L.town(N.town)
const A = 'listing-edge'
const { ctx, page } = await L.newPhone({ geo: { lat: t.lat + 0.01, lng: t.lng - 0.01 }, lang: 'hi' })
const errText = async () => page.locator('.bg-red-50').first().innerText().catch(() => null)
let rpcCount = 0
page.on('request', (r) => { if (r.url().includes('/rpc/create_listing_with_location')) rpcCount++ })
const noiseListing = (rec) => { state.noise = state.noise || []; state.noise.push({ kind: 'listing (edge test, website Post form)', keep: false, by: 'N1', marker: 'KSTEST', time: new Date().toISOString(), ...rec }); L.saveState(state) }

try {
  L.heartbeat('5B.3 listing edge checks (throw-away N1)')
  // throw-away account (created through the form once)
  if (!state.noiseAccounts?.N1) {
    const r = await L.signup(page, N, pw)
    state.noiseAccounts = { ...(state.noiseAccounts || {}), N1: { profileId: r.profileId, ok: r.ok, at: new Date().toISOString() } }
    state.noise = state.noise || []; state.noise.push({ kind: 'profile + auth user (throw-away, website signup)', keep: false, tag: 'N1', profile_id: r.profileId, marker: 'KSTEST', time: new Date().toISOString() })
    L.saveState(state)
    if (!r.ok) throw new Error('N1 signup failed: ' + r.error)
  } else {
    const r = await L.loginPhone(page, N.mobile); if (!r.ok) throw new Error('N1 login failed')
  }

  // E1 — required-field error on step 2 for every category × type (nothing filled)
  if (want('E1')) {
    const rows = []
    for (const p of PLAN.filter((x) => !x.noise && !x.note)) {
      await step1(page, p)
      await page.click('[data-testid="post-next"]')
      await page.waitForTimeout(500)
      const e = await errText()
      // Batch 10A: post-source-* now lives on step 1; "still on step 2" = no step-1 block, no step-3 submit.
      const stayed = (await page.locator('[data-testid="post-source-block"]').count()) === 0 && (await page.locator('[data-testid="post-submit"]').count()) === 0 && (await page.locator('[id^="f_"]').count()) > 0
      rows.push({ cell: `${p.category}/${p.type}`, error: e, stayedOnStep2: stayed })
    }
    await L.shot(page, A, 'E1-last-required-error')
    const bad = rows.filter((r) => !r.error || !r.stayedOnStep2)
    L.result(state, { area: '5B.3-edge', id: 'E1', title: 'every category×type shows a required-field error on an empty step 2', status: bad.length ? 'RAN-FAILED' : 'RAN-PASSED', detail: { checked: rows.length, failing: bad, sample: rows.slice(0, 22) }, evidence: `evidence/phase5b/${A}/` })
  }

  // E2 — Back keeps data (step 3 → 2 → 1 → 2) + E7 photo limit (4 files into a 3-photo category)
  if (want('E2')) {
    const p = { category: 'bhusa', type: 'offer' }
    await step1(page, p)
    await fillStep2(page, 'KSTEST N1 E2')
    const q1 = await page.inputValue('#f_quantity')
    const files = []; for (let i = 0; i < 4; i++) files.push({ name: `kstest-e7-${i}.jpg`, mimeType: 'image/jpeg', buffer: await testJpeg(`KSTEST E7 ${i}`) })
    await page.setInputFiles('input[type="file"]', files)
    await page.waitForTimeout(800)
    const counter = await page.getByText(/^\d\/\d ·/).first().innerText().catch(() => null)
    const limitMsg = await errText()
    await L.shot(page, A, 'E7-photo-limit')
    L.result(state, { area: '5B.3-edge', id: 'E7', title: 'photo limit: 4 photos into bhusa (limit 3)', status: counter && counter.startsWith('3/3') ? 'RAN-PASSED' : 'RAN-FAILED', detail: { counter, message: limitMsg } })
    await page.click('[data-testid="post-next"]')
    await page.waitForSelector('#f_asset_village')
    await page.fill('#f_asset_village', 'KSTEST N1 E2 village')
    await page.locator('main button.h-11.w-11').first().click().catch(() => {}) // Screen back arrow
    await page.waitForTimeout(600)
    const backTo2 = await page.inputValue('#f_quantity').catch(() => null)
    const photos2 = await page.getByText(/^\d\/\d ·/).first().innerText().catch(() => null)
    await page.locator('main button.h-11.w-11').first().click().catch(() => {})
    await page.waitForTimeout(600)
    const onStep1 = await page.locator('[data-testid="post-cat-bhusa"][aria-pressed="true"]').count()
    await page.click('[data-testid="post-next"]'); await page.waitForTimeout(600)
    const again = await page.inputValue('#f_quantity').catch(() => null)
    await page.click('[data-testid="post-next"]'); await page.waitForTimeout(600)
    const village3 = await page.inputValue('#f_asset_village').catch(() => null)
    await L.shot(page, A, 'E2-back-keeps-data')
    const ok = backTo2 === q1 && onStep1 > 0 && again === q1 && photos2 === counter
    L.result(state, { area: '5B.3-edge', id: 'E2', title: '3-step form: Back keeps entered data', status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { step2KeptAfterBack: backTo2 === q1, step1KeepsCategory: onStep1 > 0, step2KeptAfterForward: again === q1, photosKept: photos2 === counter, step3VillageKeptAfterBackForward: village3 === 'KSTEST N1 E2 village' } })

    // E3 — maps link invalid (on this same step 3), then valid + E5 double submit → one listing
    await page.click('[data-testid="post-location-current"]')
    await page.waitForSelector('[data-testid="post-location-coords"]', { timeout: 20000 }).catch(() => {})
    await page.fill('#f_map_url', 'https://example.com/not-a-map'); await page.locator('#f_map_url').blur(); await page.waitForTimeout(400)
    const blurErr = await errText()
    for (const cb of await page.locator('input[type="checkbox"]:visible').all()) if ((await cb.getAttribute('data-testid')) !== 'wide-visibility-checkbox' && !(await cb.isChecked())) await cb.check()
    const before = rpcCount
    await page.click('[data-testid="post-submit"]'); await page.waitForTimeout(1500)
    const submitErr = await errText()
    await L.shot(page, A, 'E3-maps-invalid')
    L.result(state, { area: '5B.3-edge', id: 'E3a', title: 'maps link invalid → clear message, nothing posted', status: blurErr && submitErr && rpcCount === before ? 'RAN-PASSED' : 'RAN-FAILED', detail: { onBlur: blurErr, onSubmit: submitErr, createCalls: rpcCount - before } })
    await page.fill('#f_map_url', 'https://maps.app.goo.gl/KSTESTabc123')
    const before2 = rpcCount
    const resp = page.waitForResponse((r) => r.url().includes('/rpc/create_listing_with_location'), { timeout: 45000 }).catch(() => null)
    await page.locator('[data-testid="post-submit"]').dblclick()
    const r = await resp
    let row = null; try { row = await r.json() } catch { /* */ }
    await page.waitForTimeout(4000)
    await L.shot(page, A, 'E5-double-submit-done')
    const calls = rpcCount - before2
    if (row?.id) noiseListing({ listing_id: row.id, category: 'bhusa', listing_type: 'offer', note: 'E3b/E5 valid maps link + double tap' })
    L.result(state, { area: '5B.3-edge', id: 'E3b', title: 'valid Google Maps short link accepted and stored', status: row?.details?.map_url === 'https://maps.app.goo.gl/KSTESTabc123' ? 'RAN-PASSED' : 'RAN-FAILED', detail: { listing: row?.id, map_url_stored: row?.details?.map_url || null } })
    L.result(state, { area: '5B.3-edge', id: 'E5', title: 'double tap on Submit → exactly one listing', status: calls === 1 ? 'RAN-PASSED' : 'RAN-FAILED', detail: { createCalls: calls } })
  }

  // E4 — transport from/to required (to missing)
  if (want('E4')) {
    const p = { category: 'transport', type: 'offer' }
    await step1(page, p); await fillStep2(page, 'KSTEST N1 E4')
    await page.click('[data-testid="post-next"]'); await page.waitForSelector('#f_transport_from')
    await page.fill('#f_transport_from', 'KSTEST N1 E4 from')
    for (const cb of await page.locator('input[type="checkbox"]:visible').all()) if (!(await cb.isChecked())) await cb.check()
    const before = rpcCount
    await page.click('[data-testid="post-submit"]'); await page.waitForTimeout(800)
    const e1 = await errText()
    await page.fill('#f_transport_from', ''); await page.fill('#f_transport_to', 'KSTEST N1 E4 to')
    await page.click('[data-testid="post-submit"]'); await page.waitForTimeout(800)
    const e2 = await errText()
    await L.shot(page, A, 'E4-transport-from-to')
    L.result(state, { area: '5B.3-edge', id: 'E4', title: 'transport: missing "to" and missing "from" each blocked with a message', status: e1 && e2 && rpcCount === before ? 'RAN-PASSED' : 'RAN-FAILED', detail: { missingTo: e1, missingFrom: e2, createCalls: rpcCount - before } })
  }

  // E6 — offline submit → clear message, nothing created (then online: My Listings count unchanged)
  if (want('E6')) {
    const countMine = async () => { await L.goto(page, '/my', 2500); return page.locator('[data-testid="listing-card"]').count() }
    const mineBefore = await countMine()
    const p = { category: 'labor', type: 'requirement' }
    await step1(page, p); await fillStep2(page, 'KSTEST N1 E6')
    await page.click('[data-testid="post-next"]'); await page.waitForSelector('#f_asset_village')
    await step3(page, p, 'KSTEST N1 E6 offline')
    await ctx.setOffline(true)
    const before = rpcCount
    await page.click('[data-testid="post-submit"]')
    await page.waitForTimeout(6000)
    const e = await errText()
    const stillOnForm = await page.locator('[data-testid="post-submit"]').count()
    await L.shot(page, A, 'E6-offline-submit')
    await ctx.setOffline(false)
    await page.waitForTimeout(1500)
    const mineAfter = await countMine()
    L.result(state, { area: '5B.3-edge', id: 'E6', title: 'posting while offline → clear message, no listing created', status: e && stillOnForm && mineAfter === mineBefore ? 'RAN-PASSED' : 'RAN-FAILED', detail: { message: e, stillOnForm: stillOnForm > 0, myListingsBefore: mineBefore, myListingsAfter: mineAfter, createAttempts: rpcCount - before } })
  }

  // E8 — wide-visibility box only for eligible categories (bhusa yes, labor no)
  if (want('E8')) {
    const seen = {}
    for (const c of ['bhusa', 'labor']) {
      const p = { category: c, type: 'requirement' }
      await step1(page, p); await fillStep2(page, 'KSTEST N1 E8')
      await page.click('[data-testid="post-next"]'); await page.waitForSelector('[data-testid="post-submit"]')
      seen[c] = await page.locator('[data-testid="wide-visibility-checkbox"]').count()
    }
    L.result(state, { area: '5B.3-edge', id: 'E8', title: 'wide-visibility box shown for bhusa, hidden for labor', status: seen.bhusa === 1 && seen.labor === 0 ? 'RAN-PASSED' : 'RAN-FAILED', detail: seen })
  }
  await L.logout(page)
} catch (e) {
  L.log('ERROR', String(e.message || e).split('\n')[0])
  await L.shot(page, A, 'zz-error', { full: true })
} finally {
  L.saveState(state)
  await ctx.close().catch(() => {})
  await L.closeBrowser()
}
