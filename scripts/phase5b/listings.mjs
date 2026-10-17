// Batch 9 Phase 5B.3 — listing matrix through the staging WEBSITE Post form (UI only).
//   node scripts/phase5b/listings.mjs --only P7,P1
// Every category × type at least once, by the matching persona. Resumable (state.json).
import sharp from 'sharp'
import * as L from './lib.mjs'

export const PLAN = [
  { lid: 'L01', persona: 'P7', category: 'equipment', type: 'offer', source: 'farmer', photo: true },
  { lid: 'L02', persona: 'P2', category: 'equipment', type: 'requirement', source: 'farmer' },
  { lid: 'L03', persona: 'P1', category: 'labor', type: 'offer', source: 'farmer' },
  { lid: 'L04', persona: 'P2', category: 'labor', type: 'requirement', source: 'farmer' },
  { lid: 'L05', persona: 'P1', category: 'drone_didi', type: 'offer', source: 'farmer' },
  { lid: 'L06', persona: 'P2', category: 'drone_didi', type: 'requirement', source: 'farmer' },
  { lid: 'L07', persona: 'P1', category: 'bhusa', type: 'offer', source: 'farmer', wide: true, photo: true },
  { lid: 'L08', persona: 'P6', category: 'bhusa', type: 'requirement', source: 'vendor' },
  { lid: 'L09', persona: 'P5', category: 'agri_inputs', type: 'offer', source: 'vendor', subtype: 'vendor', wide: true },
  { lid: 'L10', persona: 'P4', category: 'agri_inputs', type: 'requirement', source: 'farmer' },
  { lid: 'L11', persona: 'P5', category: 'building_materials', type: 'offer', source: 'vendor', photo: true },
  { lid: 'L12', persona: 'P6', category: 'building_materials', type: 'requirement', source: 'vendor' },
  { lid: 'L13', persona: 'P7', category: 'warehouse', type: 'offer', source: 'farmer', photo: true },
  { lid: 'L14', persona: 'P4', category: 'warehouse', type: 'requirement', source: 'farmer' },
  { lid: 'L15', persona: 'P7', category: 'greenhouse', type: 'offer', source: 'vendor', wide: true },
  { lid: 'L16', persona: 'P2', category: 'greenhouse', type: 'requirement', source: 'farmer' },
  { lid: 'L17', persona: 'P7', category: 'jugaad', type: 'offer', source: 'farmer', photo: true },
  { lid: 'L18', persona: 'P3', category: 'jugaad', type: 'requirement', source: 'farmer' },
  { lid: 'L19', persona: 'P3', category: 'transport', type: 'offer', source: 'farmer' },
  { lid: 'L20', persona: 'P8', category: 'transport', type: 'requirement', source: 'farmer' },
  { lid: 'L21', persona: 'P3', category: 'land', type: 'offer', source: 'farmer', photo: true },
  { lid: 'L22', persona: 'P8', category: 'land', type: 'requirement', source: 'farmer' },
  { lid: 'L23', persona: 'P6', category: 'agri_inputs', type: 'offer', source: 'vendor', subtype: 'vendor', note: 'HIDDEN poster + vendor sub-type (contact_phone leak check)' },
  { lid: 'L24', persona: 'P8', category: 'labor', type: 'offer', source: 'farmer', note: 'SHOWN far-away poster' },
  { lid: 'L25', persona: 'P1', category: 'labor', type: 'offer', source: 'farmer', noise: true, note: 'KSTEST noise: used for My Listings close/availability tests' },
]

const NUMERIC = /rate|price|amount|acre|quantity|capacity|area|count|litre|year|radius|budget|micron|gauge|warranty|space|loading|size|worker|min_/
const SKIP = new Set(['f_contact_phone', 'f_demo_video', 'f_map_url', 'f_asset_village', 'f_transport_from', 'f_transport_to', 'f_pledge_bank', 'f_wdra_reg'])

export async function testJpeg(label) {
  return sharp({ create: { width: 480, height: 360, channels: 3, background: '#2E7D32' } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect x="30" y="30" width="420" height="300" fill="#F9A825"/><text x="240" y="190" font-size="36" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`) }])
    .jpeg({ quality: 70 }).toBuffer()
}

// Fill every empty visible field of step 2 with a valid value (generic; repeated so fields that
// appear after a choice — tanker capacity, land fixed amount, cold-storage extras — are filled too).
export async function fillStep2(page, marker, village = null) {
  // drone_didi has its own step-2 village box with the same id as step 3 (f_asset_village)
  if (village && await page.locator("#f_asset_village:visible").count()) await page.fill("#f_asset_village", village)
  for (let pass = 0; pass < 3; pass++) {
    for (const sel of await page.locator('select[id^="f_"]:visible').all()) {
      const id = await sel.getAttribute('id')
      if (SKIP.has(id)) continue
      if (!(await sel.inputValue())) await sel.selectOption({ index: 1 })
    }
    for (const inp of await page.locator('input[id^="f_"]:visible').all()) {
      const id = await inp.getAttribute('id'); const type = (await inp.getAttribute('type')) || 'text'
      if (SKIP.has(id) || ['date', 'file', 'checkbox', 'url'].includes(type)) continue
      if (await inp.inputValue()) continue
      const mode = (await inp.getAttribute('inputmode')) || ''
      await inp.fill(type === 'number' || /numeric|decimal/.test(mode) || NUMERIC.test(id) ? '5' : `${marker}`)
    }
    for (const ta of await page.locator('textarea[id^="f_"]:visible').all()) if (!(await ta.inputValue())) await ta.fill(`${marker} — test text`)
    // multi-choice chips: any chip group with nothing pressed gets its first chip
    const groups = await page.evaluate(() => {
      const out = []
      document.querySelectorAll('div.flex.flex-wrap.gap-2').forEach((g, i) => {
        const bs = [...g.children].filter((b) => b.tagName === 'BUTTON' && b.hasAttribute('aria-pressed') && b.className.includes('rounded-full'))
        if (bs.length && !bs.some((b) => b.getAttribute('aria-pressed') === 'true')) { g.setAttribute('data-ks-group', String(i)); out.push(String(i)) }
      })
      return out
    })
    for (const g of groups) await page.locator(`[data-ks-group="${g}"] > button`).first().click()
    await page.waitForTimeout(300)
  }
}

// Batch 10A: "who is posting" (post-source-farmer/vendor) is the FIRST control of step 1, so it is chosen
// before Continue. Step 2 is detected by the step-1 block going away and a details field (f_*) appearing.
export async function waitStep2(page) {
  await page.waitForSelector('[data-testid="post-source-block"]', { state: 'detached', timeout: 20000 })
  await page.waitForSelector('[id^="f_"]', { timeout: 20000 })
}
export async function step1(page, plan) {
  await L.goto(page, '/post', 1200)
  await page.click(`[data-testid="post-source-${plan.source === 'vendor' ? 'vendor' : 'farmer'}"]`)
  await page.click(`[data-testid="post-cat-${plan.category}"]`)
  await page.click(`[data-testid="post-type-${plan.type}"]`)
  await page.click('[data-testid="post-next"]')
  await waitStep2(page)
}

export async function step3(page, plan, village) {
  if (plan.category === 'transport') {
    await page.fill('#f_transport_from', village)
    await page.fill('#f_transport_to', `${village} → Damoh`)
  } else {
    await page.fill('#f_asset_village', village)
  }
  await page.click('[data-testid="post-location-current"]')
  const coords = await page.waitForSelector('[data-testid="post-location-coords"]', { timeout: 20000 }).then((e) => e.innerText()).catch(() => null)
  if (plan.mapUrl) { await page.fill('#f_map_url', plan.mapUrl); await page.locator('#f_map_url').blur() }
  if (plan.wide) await page.check('[data-testid="wide-visibility-checkbox"]')
  for (const cb of await page.locator('input[type="checkbox"]:visible').all()) {
    if ((await cb.getAttribute('data-testid')) === 'wide-visibility-checkbox') continue
    if (!(await cb.isChecked())) await cb.check()
  }
  return coords
}

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null })()
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/phase5b/listings.mjs')
if (isMain) {
  const state = L.loadState()
  const done = new Set((state.listings || []).filter((l) => l.id).map((l) => l.lid))
  const byPersona = {}
  for (const p of PLAN) if (!done.has(p.lid) && (!only || only.includes(p.persona))) (byPersona[p.persona] ||= []).push(p)
  for (const [pid, plans] of Object.entries(byPersona)) {
    const per = L.persona(pid); const t = L.town(per.town)
    L.heartbeat(`5B.3 listings for ${pid}: ${plans.map((p) => p.lid).join(',')}`)
    const { ctx, page, diag } = await L.newPhone({ geo: { lat: t.lat + 0.004, lng: t.lng + 0.004 }, lang: per.lang })
    try {
      const lr = await L.loginPhone(page, per.mobile)
      if (!lr.ok) throw new Error(`login failed for ${pid}: ${lr.error}`)
      for (const plan of plans) {
        const marker = `${plan.noise ? 'KSTEST' : 'KSTEST-KEEP'} ${plan.lid}`
        const village = `${marker} ${per.town}`
        const dir = `listings/${plan.lid}-${plan.category}-${plan.type}`
        const rec = { lid: plan.lid, persona: pid, category: plan.category, type: plan.type, source: plan.source, wide: !!plan.wide, village, keep: !plan.noise, note: plan.note || null }
        try {
          await step1(page, plan) // chooses plan.source on step 1 (Batch 10A)
          if (plan.subtype === 'vendor') await page.getByRole('button', { name: /दुकान \/ विक्रेता|Shop \/ Vendor/ }).click()
          await page.waitForTimeout(400)
          await fillStep2(page, marker, village)
          if (plan.photo) {
            await page.setInputFiles('input[type="file"]', { name: `kstest-${plan.lid}.jpg`, mimeType: 'image/jpeg', buffer: await testJpeg(`KSTEST-KEEP ${plan.lid}`) })
            await page.waitForTimeout(800)
            rec.photo = true
          }
          if (plan.subtype === 'vendor') rec.vendorContactPrefilledFromProfile = (await page.inputValue('#f_contact_phone').catch(() => '')) === per.mobile
          await L.shot(page, dir, 'step2', { full: true })
          await page.click('[data-testid="post-next"]')
          await page.waitForSelector('[data-testid="post-submit"]', { timeout: 20000 })
          rec.coords = await step3(page, plan, village)
          await L.shot(page, dir, 'step3', { full: true })
          const resp = page.waitForResponse((r) => r.url().includes('/rpc/create_listing_with_location'), { timeout: 45000 })
          await page.click('[data-testid="post-submit"]')
          const r = await resp
          let row = null; try { row = await r.json() } catch { /* */ }
          await page.waitForTimeout(1500)
          const success = await page.getByText(/आपकी लिस्टिंग जुड़ गई|Your listing has been posted/).count()
          rec.status = r.status(); rec.id = row?.id || null; rec.at = new Date().toISOString()
          rec.server = row ? { listing_source: row.listing_source, wide_visibility: row.wide_visibility, geocoding_status: row.geocoding_status, hasCoords: row.latitude != null, photos: (row.details?.photo_urls || []).length, provider_declared: row.details?.provider_declared ?? null, village_town: row.village_town === village } : null
          if (plan.subtype === 'vendor') rec.vendorPhoneInPublicDetails = !!(row?.details?.contact_phone && row.details.contact_phone === per.mobile)
          rec.result = r.ok() && success > 0 && rec.id ? 'RAN-PASSED' : 'RAN-FAILED'
          if (rec.result === 'RAN-FAILED') rec.error = await page.locator('.bg-red-50, [role="alert"]').first().innerText().catch(() => null)
          await L.shot(page, dir, 'done')
        } catch (e) {
          rec.result = 'RAN-FAILED'; rec.error = L.scrub(String(e.message || e).split('\n')[0])
          await L.shot(page, dir, 'zz-error', { full: true }).catch(() => {})
        }
        rec.evidence = `evidence/phase5b/${dir}/`
        state.listings = (state.listings || []).filter((x) => x.lid !== plan.lid)
        state.listings.push(rec)
        L.saveState(state)
        L.log(`${rec.result} ${plan.lid} ${pid} ${plan.category}/${plan.type}/${plan.source} id=${rec.id} ${rec.error || ''}`)
      }
      await L.logout(page)
    } catch (e) {
      L.log(`ERROR persona ${pid}`, String(e.message || e).split('\n')[0])
    } finally {
      if (diag.console.length) L.log(`console errors ${pid}:`, diag.console.slice(0, 5))
      await ctx.close().catch(() => {})
    }
  }
  await L.closeBrowser()
}
