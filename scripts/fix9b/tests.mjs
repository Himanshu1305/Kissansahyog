#!/usr/bin/env node
// Batch 9B — Fix B (duplicate post) + Fix A (vendor-contact consent) tests, STAGING only.
//   node --env-file=.env scripts/fix9b/tests.mjs --base http://localhost:4173 --only B1,B2
//   node --env-file=.env scripts/fix9b/tests.mjs --base https://staging.kissansahyog.com --only B4UI
// Headless, one browser, one test at a time. Every listing it creates has a village name starting
// "KSTEST 9B" and its id is kept in evidence/fix9b/created-rows.json for the clean-up at the end.
// Results: evidence/fix9b/results-<local|deployed>.json; screenshots: evidence/fix9b/<label>/.
import * as T from './lib9b.mjs'
import { fillStep2, testJpeg } from '../phase5b/listings.mjs'

const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null })()
const RUN = Date.now().toString(36).slice(-5)
const SUCCESS = /आपकी लिस्टिंग जुड़ गई|Your listing has been posted/
const CONSENT_HI = 'इस विज्ञापन पर आपका मोबाइल नंबर सबको दिखेगा, ताकि ग्राहक सीधे आपसे संपर्क कर सकें।'
const CONSENT_EN = 'Your mobile number will be shown on this listing so customers can contact you directly.'
const village = (id, p) => `KSTEST 9B ${id} ${RUN} ${p.town}`

async function phoneFor(pid, opts = {}) {
  const p = T.persona(pid)
  const t = T.town(p.town)
  const ph = await T.newPhone({ lang: opts.lang || p.lang, geo: { lat: t.lat + 0.003, lng: t.lng + 0.003 }, ...opts })
  const lr = await T.loginPhone(ph.page, p.mobile)
  if (!lr.ok) throw new Error(`login failed for ${pid}`)
  return { ...ph, p }
}

// Category -> step 3, with every checkbox ticked EXCEPT the new consent box (and wide visibility).
async function toStep3(page, { category, type = 'offer', source = 'farmer', subtype = null, photos = 0, vname, marker }) {
  await T.goto(page, '/post', 1000)
  await page.click(`[data-testid="post-cat-${category}"]`)
  await page.click(`[data-testid="post-type-${type}"]`)
  await page.click('[data-testid="post-next"]')
  await page.waitForSelector('[data-testid="post-source-farmer"]', { timeout: 20000 })
  if (source === 'vendor') await page.click('[data-testid="post-source-vendor"]')
  if (subtype === 'vendor') await page.getByRole('button', { name: /दुकान \/ विक्रेता|Shop \/ Vendor/ }).click()
  await page.waitForTimeout(400)
  await fillStep2(page, marker, vname)
  for (let i = 0; i < photos; i++) {
    await page.setInputFiles('input[type="file"]', { name: `kstest-9b-${i}.jpg`, mimeType: 'image/jpeg', buffer: await testJpeg(`KSTEST 9B ${i}`) })
    await page.waitForTimeout(500)
  }
  await page.click('[data-testid="post-next"]')
  await page.waitForSelector('[data-testid="post-submit"]', { timeout: 20000 })
  if (category === 'transport') { await page.fill('#f_transport_from', vname); await page.fill('#f_transport_to', `${vname} to Damoh`) } else await page.fill('#f_asset_village', vname)
  await page.click('[data-testid="post-location-current"]')
  await page.waitForSelector('[data-testid="post-location-coords"]', { timeout: 20000 }).catch(() => {})
  for (const cb of await page.locator('input[type="checkbox"]:visible').all()) {
    const id = await cb.getAttribute('data-testid')
    if (id === 'wide-visibility-checkbox' || id === 'contact-consent-checkbox') continue
    if (!(await cb.isChecked())) await cb.check()
  }
}
const submitEnabled = (page) => page.locator('[data-testid="post-submit"]').isEnabled()
const consentBox = (page) => page.locator('[data-testid="contact-consent-box"]').count()
async function waitSuccess(page, ms = 45000) { return page.getByText(SUCCESS).first().waitFor({ timeout: ms }).then(() => true).catch(() => false) }

const CASES = {}
async function run(id, title, fn) {
  if (ONLY && !ONLY.includes(id)) return
  T.heartbeat(`start ${id}`)
  try {
    const r = await fn()
    T.record({ id, title, ...r })
  } catch (e) {
    T.record({ id, title, status: 'RAN-FAILED', detail: { error: String(e.message || e).split('\n')[0] } })
  }
}

// ---------------- Fix B ----------------
CASES.B1 = () => run('B1', 'double-click on Post -> exactly 1 listing', async () => {
  const { ctx, page, p } = await phoneFor('P1')
  try {
    const vname = village('B1', p)
    await toStep3(page, { category: 'bhusa', vname, marker: `KSTEST 9B B1 ${RUN}` })
    // two clicks in the same instant (before React can re-render), then a normal double-click
    await page.evaluate(() => { const b = document.querySelector('[data-testid="post-submit"]'); b.click(); b.click() })
    await page.locator('[data-testid="post-submit"]').dblclick({ timeout: 1500 }).catch(() => {})
    const ok = await waitSuccess(page)
    await page.waitForTimeout(2500)
    const c = await T.countByVillage(vname)
    T.rememberRows(c.ids, 'B1')
    const evidence = await T.shot(page, 'B1-after-double-click')
    return { status: ok && c.n === 1 ? 'RAN-PASSED' : 'RAN-FAILED', detail: { success_screen: ok, listings_in_db: c.n }, evidence }
  } finally { await ctx.close() }
})

CASES.B2 = () => run('B2', 'lost reply: server saved, client saw a failure; Post again -> 1 listing, user lands on it', async () => {
  const { ctx, page, p, net } = await phoneFor('P1')
  try {
    const vname = village('B2', p)
    await toStep3(page, { category: 'labor', vname, marker: `KSTEST 9B B2 ${RUN}` })
    let reached = false
    await page.route('**/rest/v1/rpc/create_listing_with_location', async (route) => {
      const resp = await route.fetch()       // the request reaches the server, which saves the listing
      reached = resp.ok()
      await route.abort('failed')            // ...but the reply never reaches the phone
    })
    await page.click('[data-testid="post-submit"]')
    await page.waitForSelector('[data-testid="post-submit"]', { timeout: 45000 })
    const errShown = await page.locator('[role="alert"]').first().innerText().catch(() => '')
    const afterFirst = await T.countByVillage(vname)
    await T.shot(page, 'B2-1-reply-lost')
    await page.unroute('**/rest/v1/rpc/create_listing_with_location')
    const rpcBefore = net.rpcCreate
    await page.click('[data-testid="post-submit"]')
    await page.waitForURL(/\/listing\//, { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const landed = page.url().split('/listing/')[1]?.split(/[?#]/)[0] || null
    const notice = await page.locator('[data-testid="already-saved"]').count()
    const c = await T.countByVillage(vname)
    T.rememberRows(c.ids, 'B2')
    const evidence = await T.shot(page, 'B2-2-landed-on-listing')
    const pass = reached && afterFirst.n === 1 && c.n === 1 && landed === c.ids[0]
    return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { server_saved_first: reached, error_shown_first: !!errShown, listings_after_first: afterFirst.n, listings_after_retry: c.n, landed_on_that_listing: landed === c.ids[0], already_saved_notice: notice > 0, extra_create_calls_on_retry: net.rpcCreate - rpcBefore }, evidence }
  } finally { await ctx.close() }
})

CASES.B3 = () => run('B3', 'parallel submits with the same client_request_id -> 1 listing', async () => {
  const p = T.persona('P1')
  const vname = village('B3', p)
  const rid = crypto.randomUUID()
  const body = { p_actor_id: p.profileId, p_listing_type: 'offer', p_category: 'labor', p_details: { worker_count: 2, marker: 'KSTEST 9B B3' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: vname, p_rules_agreed: true, p_client_request_id: rid }
  const rs = await Promise.all(Array.from({ length: 6 }, () => T.rpc('create_listing_with_location', body)))
  const ids = [...new Set(rs.map((r) => r.json?.id).filter(Boolean))]
  const c = await T.countByVillage(vname)
  T.rememberRows(c.ids, 'B3')
  return { status: rs.every((r) => r.ok) && ids.length === 1 && c.n === 1 ? 'RAN-PASSED' : 'RAN-FAILED', detail: { parallel_calls: rs.length, all_answered_ok: rs.every((r) => r.ok), distinct_ids_returned: ids.length, listings_in_db: c.n, statuses: rs.map((r) => r.status) } }
})

CASES.B4 = () => run('B4', 'old-style post without client_request_id (older app) still works', async () => {
  const p = T.persona('P1')
  const vname = village('B4', p)
  // exactly the 12 parameters the older app / cached website sends
  const body = { p_actor_id: p.profileId, p_listing_type: 'offer', p_category: 'labor', p_details: { worker_count: 3, marker: 'KSTEST 9B B4' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: vname, p_rules_agreed: true }
  const r = await T.rpc('create_listing_with_location', body)
  const c = await T.countByVillage(vname)
  T.rememberRows(c.ids, 'B4')
  return { status: r.ok && c.n === 1 && r.json?.client_request_id === null ? 'RAN-PASSED' : 'RAN-FAILED', detail: { http: r.status, listings_in_db: c.n, client_request_id_stored: r.json && 'client_request_id' in r.json ? r.json.client_request_id : 'missing' } }
})

// B4UI: the OLD website build (run with --base https://staging.kissansahyog.com BEFORE the new deploy)
CASES.B4UI = () => run('B4UI', 'old website build posts through the UI against the new database', async () => {
  const { ctx, page, p } = await phoneFor('P1')
  try {
    const vname = village('B4UI', p)
    await toStep3(page, { category: 'bhusa', vname, marker: `KSTEST 9B B4UI ${RUN}` })
    const hasNewBox = await consentBox(page)
    await page.click('[data-testid="post-submit"]')
    const ok = await waitSuccess(page)
    const c = await T.countByVillage(vname)
    T.rememberRows(c.ids, 'B4UI')
    const evidence = await T.shot(page, 'B4UI-old-build-posted')
    return { status: ok && c.n === 1 ? 'RAN-PASSED' : 'RAN-FAILED', detail: { old_build_without_consent_box: hasNewBox === 0, success_screen: ok, listings_in_db: c.n }, evidence }
  } finally { await ctx.close() }
})

CASES.B5 = () => run('B5', 'retry after a failed photo upload leaves no duplicate or orphan photo files', async () => {
  const { ctx, page, p } = await phoneFor('P1')
  try {
    const vname = village('B5', p)
    await toStep3(page, { category: 'bhusa', vname, marker: `KSTEST 9B B5 ${RUN}`, photos: 2 })
    const t0 = new Date(Date.now() - 5000).toISOString()
    let uploads = 0; let rid = null
    await page.route('**/storage/v1/object/listing-photos/**', async (route) => {
      uploads++
      rid ||= (route.request().url().match(/listings\/([0-9a-f-]{36})\//) || [])[1] || null
      if (uploads === 2) return route.abort('failed') // the 2nd photo of the 1st try fails
      return route.fallback()
    })
    await page.click('[data-testid="post-submit"]')
    await page.waitForSelector('[data-testid="post-submit"]', { timeout: 45000 })
    const after1 = await T.countByVillage(vname)
    await T.shot(page, 'B5-1-upload-failed')
    await page.click('[data-testid="post-submit"]')
    const ok = await waitSuccess(page)
    const c = await T.countByVillage(vname)
    T.rememberRows(c.ids, 'B5')
    const objs = await T.stagingSql(`select name from storage.objects where bucket_id='listing-photos' and created_at >= '${t0}' and (name like 'listings/${rid}/%' or owner_id is null) order by name`)
    const mine = objs.filter((o) => o.name.startsWith(`listings/${rid}/`))
    const [row] = c.ids[0] ? await T.stagingSql(`select details->'photo_urls' u from public.listings where id='${c.ids[0]}'`) : [{}]
    const urls = row?.u || []
    const allUsed = mine.every((o) => urls.some((u) => u.endsWith(o.name)))
    const evidence = await T.shot(page, 'B5-2-posted-after-retry')
    const pass = ok && after1.n === 0 && c.n === 1 && mine.length === 2 && urls.length === 2 && allUsed
    return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { listings_after_failed_try: after1.n, success_after_retry: ok, listings_in_db: c.n, files_in_request_folder: mine.length, photo_urls_on_listing: urls.length, every_file_used_by_listing: allUsed, upload_requests_seen: uploads }, evidence }
  } finally { await ctx.close() }
})

// ---------------- Fix A ----------------
async function contactSheet(viewerPid, listingId, name) {
  const { ctx, page } = viewerPid ? await phoneFor(viewerPid) : { ...(await T.newPhone({ lang: 'hi' })) }
  try {
    await T.goto(page, `/listing/${listingId}`, 1200)
    await page.click('[data-testid="contact-call"]')
    await page.waitForTimeout(2500)
    const sheet = await page.locator('[data-testid="contact-sheet"]').innerText().catch(() => '')
    const url = page.url()
    const evidence = await T.shot(page, name)
    return { number_shown: /\d{10}/.test(sheet), hidden_message: /छिपाकर|keep their details hidden/.test(sheet), sent_to_login: /\/login/.test(url), evidence }
  } finally { await ctx.close() }
}

CASES.A1 = () => run('A1', 'hidden farmer posts Shop/Vendor in agri_inputs: box shown, Post blocked until ticked, number then shown', async () => {
  const { ctx, page, p } = await phoneFor('P4')
  let id = null; const d = {}
  try {
    const vname = village('A1', p)
    await toStep3(page, { category: 'agri_inputs', source: 'vendor', subtype: 'vendor', vname, marker: `KSTEST 9B A1 ${RUN}` })
    d.box_shown = (await consentBox(page)) === 1
    d.post_blocked_before_tick = !(await submitEnabled(page))
    await T.shot(page, 'A1-1-box-unticked')
    await page.check('[data-testid="contact-consent-checkbox"]')
    d.post_enabled_after_tick = await submitEnabled(page)
    await page.click('[data-testid="post-submit"]')
    d.success = await waitSuccess(page)
    const c = await T.countByVillage(vname); id = c.ids[0]; T.rememberRows(c.ids, 'A1')
    await T.shot(page, 'A1-2-posted')
  } finally { await ctx.close() }
  d.api = await T.exposure(id)
  d.other_user = await contactSheet('P2', id, 'A1-3-other-user-sees-number')
  const pass = d.box_shown && d.post_blocked_before_tick && d.post_enabled_after_tick && d.success && d.api.consent && d.api.lookup_gives_number && d.other_user.number_shown
  return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { ...d, listing: id }, evidence: d.other_user.evidence }
})

CASES.A2 = () => run('A2', 'same hidden account as farmer (non-provider): no box; number hidden in UI and network, other user + logged out', async () => {
  const { ctx, page, p } = await phoneFor('P4')
  const d = {}; const ids = {}
  try {
    for (const [k, spec] of Object.entries({ bhusa: { category: 'bhusa' }, agri_shop_as_farmer: { category: 'agri_inputs', subtype: 'vendor' } })) {
      const vname = village(`A2-${k}`, p)
      await toStep3(page, { ...spec, source: 'farmer', vname, marker: `KSTEST 9B A2 ${RUN}` })
      d[`${k}_box_shown`] = (await consentBox(page)) > 0
      d[`${k}_post_enabled`] = await submitEnabled(page)
      await page.click('[data-testid="post-submit"]')
      d[`${k}_success`] = await waitSuccess(page)
      const c = await T.countByVillage(vname); ids[k] = c.ids[0]; T.rememberRows(c.ids, `A2-${k}`)
      await T.shot(page, `A2-${k}-posted`)
    }
  } finally { await ctx.close() }
  for (const k of Object.keys(ids)) d[`${k}_api`] = await T.exposure(ids[k])
  d.other_user = await contactSheet('P2', ids.bhusa, 'A2-other-user-hidden')
  d.logged_out = await contactSheet(null, ids.bhusa, 'A2-logged-out')
  const apiOk = Object.keys(ids).every((k) => !d[`${k}_api`].raw_json_has_number && !d[`${k}_api`].lookup_gives_number && d[`${k}_api`].lookup_says_hidden && !d[`${k}_api`].consent)
  const pass = !d.bhusa_box_shown && !d.agri_shop_as_farmer_box_shown && d.bhusa_post_enabled && d.bhusa_success && d.agri_shop_as_farmer_success && apiOk && !d.other_user.number_shown && d.other_user.hidden_message && !d.logged_out.number_shown && d.logged_out.sent_to_login
  return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { ...d, listings: ids }, evidence: d.other_user.evidence }
})

CASES.A3 = () => run('A3', 'show-number farmer: unchanged (farmer post: no box, number shown; vendor post: box like everyone)', async () => {
  const { ctx, page, p } = await phoneFor('P1')
  const d = {}; let id = null
  try {
    const vname = village('A3', p)
    await toStep3(page, { category: 'bhusa', vname, marker: `KSTEST 9B A3 ${RUN}` })
    d.farmer_box_shown = (await consentBox(page)) > 0
    await page.click('[data-testid="post-submit"]')
    d.success = await waitSuccess(page)
    const c = await T.countByVillage(vname); id = c.ids[0]; T.rememberRows(c.ids, 'A3')
    await T.goto(page, '/post', 600)
    await toStep3(page, { category: 'labor', source: 'vendor', vname: village('A3v', p), marker: `KSTEST 9B A3v ${RUN}` })
    d.vendor_box_shown_for_show_owner = (await consentBox(page)) === 1
    d.vendor_post_blocked_before_tick = !(await submitEnabled(page))
    await T.shot(page, 'A3-show-owner-vendor-box')
  } finally { await ctx.close() }
  d.api = await T.exposure(id)
  const pass = !d.farmer_box_shown && d.success && d.api.lookup_gives_number && !d.api.consent && d.vendor_box_shown_for_show_owner && d.vendor_post_blocked_before_tick
  return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: { ...d, listing: id } }
})

CASES.A4 = () => run('A4', 'the 4 provider categories (offers) with a hidden owner: consent required in each', async () => {
  const { ctx, page, p } = await phoneFor('P3')
  const d = {}
  try {
    for (const cat of ['equipment', 'warehouse', 'greenhouse', 'jugaad']) {
      const vname = village(`A4-${cat}`, p)
      await toStep3(page, { category: cat, vname, marker: `KSTEST 9B A4 ${RUN}`, photos: cat === 'jugaad' ? 1 : 0 })
      const r = { box: (await consentBox(page)) === 1, blocked: !(await submitEnabled(page)) }
      await T.shot(page, `A4-${cat}-box`)
      await page.check('[data-testid="contact-consent-checkbox"]')
      r.enabled_after_tick = await submitEnabled(page)
      await page.click('[data-testid="post-submit"]')
      r.success = await waitSuccess(page)
      const c = await T.countByVillage(vname); T.rememberRows(c.ids, `A4-${cat}`)
      r.api = c.ids[0] ? await T.exposure(c.ids[0]) : null
      d[cat] = r
    }
  } finally { await ctx.close() }
  const pass = Object.values(d).every((r) => r.box && r.blocked && r.enabled_after_tick && r.success && r.api?.consent && r.api?.lookup_gives_number)
  return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: d }
})

CASES.A5 = () => run('A5', 'existing vendor listing, NULL consent, hidden owner: number not shown', async () => {
  const rows = await T.stagingSql(`select l.id from public.listings l join public.profiles p on p.id=l.user_id where l.status='active' and l.expires_at>now() and l.listing_source='vendor' and l.contact_consent_at is null and p.consents #>> '{details_visibility,choice}'='hidden' and l.created_at < now() - interval '1 hour' order by l.created_at limit 5`)
  const d = { existing_rows_checked: rows.length, rows: [] }
  for (const r of rows) d.rows.push({ id: r.id, ...(await T.exposure(r.id)) })
  d.other_user = rows[0] ? await contactSheet('P2', rows[0].id, 'A5-existing-vendor-hidden') : null
  const lookupOk = d.rows.every((r) => r.lookup_says_hidden && !r.lookup_gives_number)
  d.raw_json_still_has_number_old_rows = d.rows.filter((r) => r.raw_json_has_number).map((r) => r.id)
  const pass = rows.length > 0 && lookupOk && d.other_user && !d.other_user.number_shown && d.other_user.hidden_message
  return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: d, evidence: d.other_user?.evidence }
})

CASES.A6 = () => run('A6', 'Hindi + English text render; checkbox tappable at 360 px and with large font', async () => {
  const d = {}
  for (const [lang, pid, text] of [['hi', 'P6', CONSENT_HI], ['en', 'P4', CONSENT_EN]]) {
    for (const fontScale of [1, 1.3]) {
      const { ctx, page, p } = await phoneFor(pid, { lang, width: 360, height: 760, fontScale })
      try {
        await toStep3(page, { category: 'labor', source: 'vendor', vname: village(`A6-${lang}`, p), marker: `KSTEST 9B A6 ${RUN}` })
        const box = page.locator('[data-testid="contact-consent-box"]')
        await box.scrollIntoViewIfNeeded()
        const txt = await box.innerText()
        const cb = page.locator('[data-testid="contact-consent-checkbox"]')
        const bb = await cb.boundingBox()
        const lb = await box.boundingBox()
        const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
        // tap on the TEXT of the label (big target), not just the small square
        await page.touchscreen.tap(lb.x + lb.width / 2, lb.y + lb.height / 2)
        const checked = await cb.isChecked()
        const name = `A6-${lang}-360-font${fontScale}`
        await T.shot(page, name, { full: false })
        d[name] = { text_ok: txt.includes(text), agree_word: txt.includes(lang === 'hi' ? 'मैं सहमत हूँ' : 'I agree'), checkbox_px: bb ? Math.round(bb.width) : 0, tap_area_px: lb ? `${Math.round(lb.width)}x${Math.round(lb.height)}` : null, inside_screen: !!bb && bb.x >= 0 && bb.x + bb.width <= 360, no_sideways_scroll: !overflowX, tap_ticks_it: checked }
      } finally { await ctx.close() }
    }
  }
  const pass = Object.values(d).every((r) => r.text_ok && r.agree_word && r.checkbox_px >= 24 && r.inside_screen && r.no_sideways_scroll && r.tap_ticks_it)
  return { status: pass ? 'RAN-PASSED' : 'RAN-FAILED', detail: d }
})

// ---------------- quick regression: one listing in each of the 11 categories ----------------
const REG = [['equipment', 'offer'], ['labor', 'offer'], ['drone_didi', 'offer'], ['bhusa', 'offer'], ['agri_inputs', 'offer'], ['building_materials', 'offer'], ['warehouse', 'offer'], ['greenhouse', 'offer'], ['jugaad', 'offer'], ['transport', 'offer'], ['land', 'requirement']]
CASES.R11 = () => run('R11', 'regression: post one listing in each of the 11 categories, it appears', async () => {
  const { ctx, page, p } = await phoneFor('P7')
  const d = {}
  try {
    for (const [cat, type] of REG) {
      const vname = village(`R-${cat}`, p)
      try {
        await toStep3(page, { category: cat, type, vname, marker: `KSTEST 9B R ${RUN}`, photos: cat === 'jugaad' ? 1 : 0 })
        if (await consentBox(page)) await page.check('[data-testid="contact-consent-checkbox"]')
        await page.click('[data-testid="post-submit"]')
        const ok = await waitSuccess(page)
        const c = await T.countByVillage(vname); T.rememberRows(c.ids, `R-${cat}`)
        let appears = false
        if (c.ids[0]) {
          await page.getByRole('button', { name: /लिस्टिंग देखें|View listing/ }).first().click().catch(() => {})
          await page.waitForURL(/\/listing\//, { timeout: 15000 }).catch(() => {})
          // own listing: no Call buttons; the details list (dl) renders once the listing has loaded
          const rendered = await page.waitForSelector('dl', { timeout: 20000 }).then(() => true).catch(() => false)
          appears = page.url().includes(c.ids[0]) && rendered
          const raw = await T.rawListing(c.ids[0])
          appears = appears && raw.includes(c.ids[0])
        }
        d[cat] = ok && c.n === 1 && appears ? 'RAN-PASSED' : 'RAN-FAILED'
        if (d[cat] === 'RAN-FAILED') { d[`${cat}_why`] = { ok, n: c.n, appears }; await T.shot(page, `R11-${cat}-failed`) }
      } catch (e) {
        d[cat] = 'RAN-FAILED'; d[`${cat}_why`] = String(e.message || e).split('\n')[0]
        await T.shot(page, `R11-${cat}-error`)
      }
    }
  } finally { await ctx.close() }
  const vals = REG.map(([c]) => d[c])
  return { status: vals.every((v) => v === 'RAN-PASSED') ? 'RAN-PASSED' : 'RAN-FAILED', detail: { passed: vals.filter((v) => v === 'RAN-PASSED').length, failed: vals.filter((v) => v === 'RAN-FAILED').length, ...d } }
})

const order = ['B4UI', 'B1', 'B2', 'B3', 'B4', 'B5', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'R11']
for (const k of order) if (!ONLY || ONLY.includes(k)) await CASES[k]()
await T.closeBrowser()
T.heartbeat(`done ${ONLY ? ONLY.join(',') : 'all'}`)
