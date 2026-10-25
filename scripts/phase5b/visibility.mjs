// Batch 9 Phase 5B.4 — who can see and contact whom, on the staging WEBSITE (UI + network checks).
//   node scripts/phase5b/visibility.mjs --only V1,V2,...
import * as L from './lib.mjs'

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null })()
const want = (k) => !only || only.includes(k)
const state = L.loadState()
const LS = Object.fromEntries((state.listings || []).filter((l) => l.id).map((l) => [l.lid, l]))
const P = Object.fromEntries(L.personas().map((p) => [p.id, p]))
const A = 'visibility'

async function phoneAs(pid, { geoOf = pid } = {}) {
  const t = L.town(P[geoOf]?.town || geoOf)
  const ph = await L.newPhone({ geo: { lat: t.lat, lng: t.lng }, lang: P[pid]?.lang || 'hi' })
  ph.bodies = []
  ph.page.on('response', async (r) => {
    const u = r.url()
    if (!/supabase\.co\/(rest|functions)|\/rpc\//.test(u) || /\/auth\//.test(u)) return
    try { ph.bodies.push({ u: u.split('?')[0].replace(/^https:\/\/[^/]+/, ''), q: u.split('?')[1] || '', s: r.status(), b: await r.text() }) } catch { /* */ }
  })
  if (pid && P[pid]) { const r = await L.loginPhone(ph.page, P[pid].mobile); if (!r.ok) throw new Error(`login ${pid} failed`) }
  return ph
}
const shareText = async (page) => { const h = await page.locator('a[href^="https://wa.me/?text="]').first().getAttribute('href').catch(() => null); return h ? decodeURIComponent(h.split('text=')[1]) : null }

// ---------- V1 Browse: 30/50 km rule and wide visibility ----------
if (want('V1')) {
  L.heartbeat('5B.4 V1 browse radius matrix')
  const viewers = [['P2', 'P2'], ['P4', 'P4'], ['P6', 'P6'], ['P8', 'P8'], [null, 'P2']]
  const cats = ['labor', 'bhusa', 'agri_inputs', 'land', 'transport']
  const out = []
  for (const [vid, geo] of viewers) {
    const ph = await phoneAs(vid, { geoOf: geo })
    const c0 = L.town(P[geo].town)
    try {
      for (const cat of cats) {
        ph.bodies.length = 0
        await L.goto(ph.page, `/browse?cat=${cat}`, 3500)
        const rowsResp = ph.bodies.filter((b) => b.u === '/rest/v1/listings' && /category=eq/.test(b.q) && /gte/.test(b.q)).pop()
        const rows = rowsResp ? JSON.parse(rowsResp.b) : []
        // independent re-implementation of the rule
        const d = rows.map((r) => ({ id: r.id, km: L.km(c0, { lat: Number(r.latitude), lng: Number(r.longitude) }), wide: r.wide_visibility === true && ['bhusa', 'agri_inputs', 'building_materials', 'warehouse', 'greenhouse'].includes(r.category) }))
        const within = d.filter((x) => x.km <= 30)
        const wideFar = d.filter((x) => x.km > 30 && x.wide && x.km <= 100)
        const ring = within.length ? [] : d.filter((x) => x.km > 30 && x.km <= 50 && !(x.wide))
        const expPrimary = within.length + wideFar.length
        const uiPrimary = await ph.page.locator('[data-testid="listing-card"]').evaluateAll((els) => els.filter((e) => !e.closest('section') && !e.closest('[data-testid="fallback-section"]')).length)
        const uiFallback = await ph.page.locator('[data-testid="fallback-section"] [data-testid="listing-card"]').count()
        const ours = Object.values(LS).filter((l) => l.category === cat).map((l) => {
          const x = d.find((y) => y.id === l.id)
          const shown = !!x && (x.km <= 30 || (x.wide && x.km <= 100) || ring.some((r) => r.id === l.id))
          return { lid: l.lid, inBoxResponse: !!x, km: x ? Math.round(x.km) : null, shownByRule: shown, where: !x ? 'not fetched' : x.km <= 30 ? 'primary' : (x.wide && x.km <= 100) ? 'primary-wide' : ring.some((r) => r.id === l.id) ? 'fallback-ring' : 'hidden' }
        })
        out.push({ viewer: vid || 'logged-out', at: P[geo].town, cat, fetched: rows.length, expPrimary, uiPrimary, expFallback: ring.length, uiFallback, ours })
        await L.shot(ph.page, A, `V1-${vid || 'anon'}-${cat}`)
      }
    } finally { await ph.ctx.close() }
  }
  const mismatch = out.filter((o) => o.expPrimary !== o.uiPrimary || o.expFallback !== o.uiFallback)
  // spot-checks against the predictions in ACCOUNT_MATRIX
  const find = (v, lid) => out.flatMap((o) => o.viewer === v ? o.ours : []).find((x) => x.lid === lid)
  const spot = {
    'P2 sees L03 (P1 labor, ~8 km)': find('P2', 'L03')?.where,
    'P4 Damoh does NOT see L03 (~73 km, not wide)': find('P4', 'L03')?.where,
    'P4 Damoh sees L07 (P1 bhusa wide, ~73 km)': find('P4', 'L07')?.where,
    'P8 Orchha does NOT see L07 (wide but >100 km)': find('P8', 'L07')?.where,
    'P8 sees own-area L24? (P8 labor, 0 km)': find('P8', 'L24')?.where,
    'P2 does NOT see L24 (Orchha)': find('P2', 'L24')?.where,
    'P4 sees L09 (P5 agri wide, Sagar ~70 km)': find('P4', 'L09')?.where,
    'P6 Garhakota and L03 (~42 km)': find('P6', 'L03')?.where,
    'logged-out at Sagar sees L03': find('logged-out', 'L03')?.where,
  }
  const spotOk = spot['P2 sees L03 (P1 labor, ~8 km)'] === 'primary' && spot['P4 Damoh does NOT see L03 (~73 km, not wide)'] !== 'primary' && spot['P4 Damoh sees L07 (P1 bhusa wide, ~73 km)'] === 'primary-wide' && ['hidden', 'not fetched'].includes(spot['P8 Orchha does NOT see L07 (wide but >100 km)']) && spot['P8 sees own-area L24? (P8 labor, 0 km)'] === 'primary' && ['hidden', 'not fetched'].includes(spot['P2 does NOT see L24 (Orchha)']) && spot['P4 sees L09 (P5 agri wide, Sagar ~70 km)'] === 'primary-wide' && spot['logged-out at Sagar sees L03'] === 'primary'
  state.v1 = out
  L.result(state, { area: '5B.4', id: 'V1', title: 'Browse: UI card counts equal the 30/50/100-km rule recomputed from the fetched rows; spot checks', status: !mismatch.length && spotOk ? 'RAN-PASSED' : 'RAN-FAILED', detail: { views: out.length, mismatches: mismatch.map((m) => ({ viewer: m.viewer, cat: m.cat, expPrimary: m.expPrimary, uiPrimary: m.uiPrimary, expFallback: m.expFallback, uiFallback: m.uiFallback })), spot }, evidence: `evidence/phase5b/${A}/V1-*` })
  L.saveState(state)
}

// ---------- V2 contact reveal matrix + leak scan ----------
if (want('V2')) {
  L.heartbeat('5B.4 V2 contact reveal matrix')
  const cases = [
    { key: 'shown-loggedin', lid: 'L03', viewer: 'P2', expect: 'number' },
    { key: 'hidden-loggedin', lid: 'L21', viewer: 'P2', expect: 'hidden' },
    { key: 'hidden-vendor-agri', lid: 'L23', viewer: 'P2', expect: 'hidden' },
    { key: 'shown-vendor', lid: 'L09', viewer: 'P4', expect: 'number' },
    { key: 'hidden-own', lid: 'L21', viewer: 'P3', expect: 'own' },
    { key: 'shown-own', lid: 'L03', viewer: 'P1', expect: 'own' },
  ]
  const rows = []
  for (const c of cases) {
    const l = LS[c.lid]; const owner = P[l.persona]
    const ph = await phoneAs(c.viewer)
    try {
      ph.bodies.length = 0
      await L.goto(ph.page, `/listing/${l.id}`, 2500)
      const btn = ph.page.locator('[data-testid="contact-call"]').first()
      const hasButtons = await btn.count()
      let sheet = null, num = false, hiddenMsg = null, tel = null
      if (hasButtons) {
        await btn.click()
        await ph.page.waitForSelector('[data-testid="contact-sheet"]', { timeout: 10000 })
        await ph.page.waitForTimeout(2500)
        sheet = await ph.page.locator('[data-testid="contact-sheet"]').innerText()
        num = sheet.includes(owner.mobile)
        hiddenMsg = /छिपाकर|keep their details hidden/.test(sheet)
        tel = await ph.page.locator('[data-testid="contact-sheet"] a[href^="tel:"]').count()
        await L.shot(ph.page, A, `V2-${c.key}`)
      } else await L.shot(ph.page, A, `V2-${c.key}`)
      const html = await ph.page.content()
      const share = await shareText(ph.page)
      const inNet = ph.bodies.filter((b) => b.b.includes(owner.mobile)).map((b) => b.u)
      const seen = !hasButtons ? 'own' : num ? 'number' : hiddenMsg ? 'hidden' : 'other'
      const leak = c.expect !== 'number' && c.expect !== 'own' && (html.includes(owner.mobile) || inNet.length > 0 || (share || '').includes(owner.mobile))
      rows.push({ case: c.key, listing: c.lid, poster: `${l.persona} ${owner.show ? 'SHOWN' : 'HIDDEN'}`, viewer: c.viewer, expected: c.expect, seen, telLinks: tel, numberInDom: html.includes(owner.mobile), numberInNetworkResponses: inNet, numberInShareText: (share || '').includes(owner.mobile), leak })
    } finally { await ph.ctx.close() }
  }
  // logged-out → login → back to the same listing
  const ph = await phoneAs(null, { geoOf: 'P2' })
  let back = null
  try {
    const l = LS.L03
    await L.goto(ph.page, `/listing/${l.id}`, 2000)
    await ph.page.locator('[data-testid="contact-call"]').first().click()
    await ph.page.waitForURL(/\/login/, { timeout: 10000 })
    const loginUrl = ph.page.url()
    await ph.page.fill('[data-testid="login-phone-form"] #phone', P.P2.mobile)
    await ph.page.click('[data-testid="login-phone-submit"]')
    await ph.page.waitForURL(/\/listing\//, { timeout: 20000 }).catch(() => {})
    back = { loginUrl: loginUrl.replace(L.BASE, ''), after: ph.page.url().replace(L.BASE, ''), sameListing: new URL(ph.page.url()).pathname === `/listing/${l.id}` }
    await L.shot(ph.page, A, 'V2-loggedout-return')
    rows.push({ case: 'loggedout', listing: 'L03', viewer: 'logged-out', expected: 'login then same listing', seen: back.sameListing ? 'returned to listing' : 'other', ...back })
  } finally { await ph.ctx.close() }
  state.v2 = rows
  const bad = rows.filter((r) => (r.expected !== r.seen && r.case !== 'loggedout') || r.leak || (r.case === 'loggedout' && !r.sameListing))
  L.result(state, { area: '5B.4', id: 'V2', title: 'contact reveal: SHOWN/HIDDEN × logged-in/out/own + leak scan (DOM, network, share text)', status: bad.length ? 'RAN-FAILED' : 'RAN-PASSED', detail: { failing: bad.map((r) => ({ case: r.case, expected: r.expected, seen: r.seen, leak: r.leak, net: r.numberInNetworkResponses })), rows: rows.map((r) => ({ case: r.case, expected: r.expected, seen: r.seen, leak: r.leak })) }, evidence: `evidence/phase5b/${A}/V2-*` })
  L.saveState(state)
}

// ---------- V3 counters + report ----------
if (want('V3')) {
  L.heartbeat('5B.4 V3 counters + report')
  const ph = await phoneAs('P4')
  try {
    const l = LS.L09
    const calls = []
    ph.page.on('request', (r) => { const m = r.url().match(/\/rpc\/(increment_listing_view|increment_contact_click|submit_listing_report|[a-z_]*report[a-z_]*)/); if (m) calls.push(m[1]) })
    ph.page.on('response', (r) => { const m = r.url().match(/\/rpc\/(increment_listing_view|increment_contact_click)/); if (m) calls.push(`${m[1]}:${r.status()}`) })
    await L.goto(ph.page, `/listing/${l.id}`, 2500)
    const view = calls.filter((c) => c.startsWith('increment_listing_view:')).pop()
    await ph.page.locator('[data-testid="contact-whatsapp"]').first().click(); await ph.page.waitForTimeout(2500)
    const click = calls.filter((c) => c.startsWith('increment_contact_click:')).pop()
    await ph.page.keyboard.press('Escape'); await ph.page.getByRole('button', { name: /रद्द करें|Cancel/ }).first().click().catch(() => {})
    L.result(state, { area: '5B.4', id: 'V3a', title: 'view counter call on opening a listing', status: view && /:2\d\d$/.test(view) ? 'RAN-PASSED' : 'RAN-FAILED', detail: { view } })
    L.result(state, { area: '5B.4', id: 'V3b', title: 'contact-click counter on first Call/WhatsApp tap', status: click && /:2\d\d$/.test(click) ? 'RAN-PASSED' : 'RAN-FAILED', detail: { click } })
    // report: no reason → error; reason "other" → success
    await ph.page.getByRole('button', { name: /शिकायत|Report/ }).last().click()
    await ph.page.waitForTimeout(600)
    await ph.page.getByRole('button', { name: /भेजें|Submit|Send/ }).last().click()
    await ph.page.waitForTimeout(800)
    const noReason = await ph.page.locator('.text-red-600, .text-red-700, .bg-red-50').first().innerText().catch(() => null)
    await L.shot(ph.page, A, 'V3-report-no-reason')
    await ph.page.getByRole('button', { name: /^(अन्य|Other)$/ }).first().click()
    const note = ph.page.locator('[role="dialog"] textarea, .fixed textarea').first()
    if (await note.count()) await note.fill('KSTEST 5B report test — please ignore')
    await ph.page.getByRole('button', { name: /भेजें|Submit|Send/ }).last().click()
    const ok = await ph.page.getByText(/धन्यवाद — आपकी शिकायत मिल गई|your complaint was received/).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    await L.shot(ph.page, A, 'V3-report-sent')
    state.rows = state.rows || []; if (ok) state.rows.push({ kind: 'listing report (website Report button)', keep: false, listing_id: l.id, by: 'P4', marker: 'KSTEST 5B report test', time: new Date().toISOString() })
    L.result(state, { area: '5B.4', id: 'V3c', title: 'Report: reason required, then success', status: noReason && ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { noReasonMessage: noReason, sent: ok } })
  } finally { await ph.ctx.close(); L.saveState(state) }
}

// ---------- V4 My Listings (own only, availability toggle, Found) ----------
if (want('V4')) {
  L.heartbeat('5B.4 V4 My Listings actions')
  const ph = await phoneAs('P1')
  try {
    ph.bodies.length = 0
    await L.goto(ph.page, '/my', 3000)
    const resp = ph.bodies.filter((b) => b.u.endsWith('/rpc/get_my_listings')).pop()
    const ids = resp ? JSON.parse(resp.b).map((r) => r.id) : []
    const mine = Object.values(LS).filter((l) => l.persona === 'P1').map((l) => l.id)
    const allOwn = ids.length > 0 && ids.every((id) => mine.includes(id) || !Object.values(LS).some((l) => l.id === id))
    const othersPresent = ids.filter((id) => Object.values(LS).some((l) => l.id === id && l.persona !== 'P1'))
    const cards = await ph.page.locator('[data-testid="listing-card"]').count()
    await L.shot(ph.page, A, 'V4-my-listings-P1', { full: true })
    L.result(state, { area: '5B.4', id: 'V4a', title: 'My Listings shows only the user\'s own listings', status: allOwn && !othersPresent.length && mine.every((m) => ids.includes(m)) ? 'RAN-PASSED' : 'RAN-FAILED', detail: { returned: ids.length, cards, othersPresent, allP1ListingsPresent: mine.every((m) => ids.includes(m)) } })
    // availability toggle on L25 (noise) → hidden from Browse for P2; then Found (close)
    const l25 = LS.L25
    const idx = await ph.page.evaluate((id) => { const rows = window.__x; return null }, l25.id)
    // locate the card index for L25 from the RPC order
    const pos = ids.indexOf(l25.id)
    const wrappers = ph.page.locator('main div.space-y-4 > div')
    const w = wrappers.nth(pos)
    await w.locator('[data-testid="availability-toggle"]').click()
    await ph.page.waitForTimeout(2500)
    const p2 = await phoneAs('P2')
    let visibleWhenUnavailable = null
    try {
      p2.bodies.length = 0
      await L.goto(p2.page, '/browse?cat=labor', 3500)
      const rr = p2.bodies.filter((b) => b.u === '/rest/v1/listings' && /category=eq/.test(b.q)).pop()
      visibleWhenUnavailable = rr ? JSON.parse(rr.b).some((r) => r.id === l25.id) : null
    } finally { await p2.ctx.close() }
    L.result(state, { area: '5B.4', id: 'V4b', title: 'availability switch off → listing gone from Browse for others', status: visibleWhenUnavailable === false ? 'RAN-PASSED' : 'RAN-FAILED', detail: { inBrowseAfterSwitchOff: visibleWhenUnavailable } })
    await L.goto(ph.page, '/my', 3000)
    ph.page.once('dialog', (d) => d.accept())
    await wrappers.nth(pos).locator('[data-testid="mark-found"]').click()
    await ph.page.waitForTimeout(3000)
    await L.shot(ph.page, A, 'V4-after-found', { full: true })
    const p2b = await phoneAs('P2')
    let detailAfter = null
    try {
      await L.goto(p2b.page, `/listing/${l25.id}`, 2500)
      detailAfter = await p2b.page.getByText(/लिस्टिंग नहीं मिली|not found|उपलब्ध नहीं/i).count()
      await L.shot(p2b.page, A, 'V4-closed-listing-as-P2')
    } finally { await p2b.ctx.close() }
    l25.closed = true
    state.listings.find((x) => x.lid === 'L25').closed = true
    L.result(state, { area: '5B.4', id: 'V4c', title: '"Found" closes the listing; others get "not found" on its page', status: detailAfter > 0 ? 'RAN-PASSED' : 'RAN-FAILED', detail: { notFoundShownToP2: detailAfter > 0 } })
  } finally { await ph.ctx.close(); L.saveState(state) }
}

// ---------- V5 account switch on the same device ----------
if (want('V5')) {
  L.heartbeat('5B.4 V5 account switch P1 → P3')
  const ph = await phoneAs('P1')
  try {
    await L.goto(ph.page, '/my', 2500); await L.goto(ph.page, '/profile', 1500)
    await L.logout(ph.page)
    await L.loginPhone(ph.page, P.P3.mobile)
    await L.goto(ph.page, '/profile', 1500)
    const name = await ph.page.inputValue('#pf_name')
    ph.bodies.length = 0
    await L.goto(ph.page, '/my', 3000)
    const resp = ph.bodies.filter((b) => b.u.endsWith('/rpc/get_my_listings')).pop()
    const ids = resp ? JSON.parse(resp.b).map((r) => r.id) : []
    const p1ids = Object.values(LS).filter((l) => l.persona === 'P1').map((l) => l.id)
    const storage = await ph.page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
    const p1Id = state.personas.P1.profileId
    const leftovers = { p1ProfileIdInStorage: storage.includes(p1Id), p1EmailInStorage: storage.toLowerCase().includes(P.P1.email.toLowerCase()), p1MobileInStorage: storage.includes(P.P1.mobile), p1NameInStorage: storage.includes(P.P1.name), p1ListingsInMy: ids.filter((i) => p1ids.includes(i)).length, profileName: name === P.P3.name ? 'P3' : 'other' }
    await L.shot(ph.page, A, 'V5-after-switch-to-P3')
    const keys = await ph.page.evaluate(() => Object.keys(localStorage))
    L.result(state, { area: '5B.4', id: 'V5', title: 'account switch P1 → P3 leaves nothing of P1 (profile, My Listings, storage)', status: !leftovers.p1ProfileIdInStorage && !leftovers.p1EmailInStorage && !leftovers.p1MobileInStorage && !leftovers.p1NameInStorage && leftovers.p1ListingsInMy === 0 && leftovers.profileName === 'P3' ? 'RAN-PASSED' : 'RAN-FAILED', detail: { ...leftovers, localStorageKeys: keys } })
    await L.logout(ph.page)
  } finally { await ph.ctx.close(); L.saveState(state) }
}
await L.closeBrowser()
