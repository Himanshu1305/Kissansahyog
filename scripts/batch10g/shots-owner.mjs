// Batch 10G — screenshots of the seller screens (KSTEST user and listings on STAGING, removed at the end).
//   node --env-file=.env scripts/batch10g/shots-owner.mjs <baseURL> <outDir> <prefix>
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [base, out, prefix = 'phase3'] = process.argv.slice(2)
const url = process.env.VITE_SUPABASE_URL || ''
if (!/wzxtqbqlahyahsnoqqva/.test(url)) { console.error('not staging — refusing'); process.exit(2) }
mkdirSync(out, { recursive: true })
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const phone = `90000${String(Date.now() % 100000).padStart(5, '0')}`
const aphone = `90000${String((Date.now() + 5) % 100000).padStart(5, '0')}`
const mkProf = async (ph, admin) => (await svc.from('profiles').insert({ full_name: admin ? 'KSTEST Admin' : 'KSTEST Seller', phone: ph, village_town: 'Sagar', pincode: '470001', latitude: 23.8388, longitude: 78.7378, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(), is_admin: !!admin }).select('*').single()).data
const user = await mkProf(phone)
const admin = await mkProf(aphone, true)
const mk = async (cat, details) => (await anon.rpc('create_listing_with_location', { p_actor_id: user.id, p_listing_type: 'requirement', p_category: cat, p_details: details, p_latitude: 23.8388, p_longitude: 78.7378, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Sagar', p_rules_agreed: true, p_client_request_id: crypto.randomUUID(), p_contact_consent: false })).data.id
const ids = []
try {
  ids.push(await mk('labor', { worker_count: 3, available_from: '2026-10-25', available_to: null }))
  ids.push(await mk('labor', { worker_count: 5, available_from: '2026-10-26', available_to: null }))
  ids.push(await mk('labor', { worker_count: 2, available_from: '2026-10-27', available_to: null }))
  await anon.rpc('set_my_listing_disabled', { p_actor_id: user.id, p_listing_id: ids[1], p_disabled: true })
  await anon.rpc('admin_set_listing_disabled', { p_actor_id: admin.id, p_listing_id: ids[0], p_disabled: true, p_reason: 'फोटो और जानकारी मेल नहीं खाती' })
  const browser = await chromium.launch()
  for (const [w, lang] of [[360, 'hi'], [1280, 'en']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 768, hasTouch: w < 768, serviceWorkers: 'block', reducedMotion: 'reduce' })
    await ctx.addInitScript(([p, l]) => { localStorage.setItem('ks_session_v1', JSON.stringify(p)); localStorage.setItem('ks_lang_v1', l) }, [user, lang])
    const page = await ctx.newPage()
    await page.goto(`${base}/my`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${out}/${prefix}-my-listings-${lang}-${w}.png`, fullPage: true })
    await page.locator(`[data-listing-id="${ids[2]}"] [data-testid="listing-delete"]`).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${out}/${prefix}-delete-dialog-${lang}-${w}.png` })
    await page.getByTestId('delete-dialog-no').click()
    await page.goto(`${base}/listing/${ids[0]}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${out}/${prefix}-detail-admin-disabled-${lang}-${w}.png` })
    await ctx.close()
  }
  await browser.close()
} finally {
  await svc.from('listing_admin_actions').delete().in('listing_id', ids)
  await svc.from('profiles').delete().in('id', [user.id, admin.id])
}
console.log('done')
