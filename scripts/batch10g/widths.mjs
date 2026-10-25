// Batch 10G Phase 5 — horizontal-scroll check of My Listings, own listing page and /admin (KSTEST admin seller on STAGING, removed at the end).
//   node --env-file=.env scripts/batch10g/widths.mjs <baseURL>
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
const url = process.env.VITE_SUPABASE_URL
if (!/wzxtqbqlahyahsnoqqva/.test(url)) process.exit(2)
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const mk = async (ph, admin) => (await svc.from('profiles').insert({ full_name: 'KSTEST widths', phone: ph, village_town: 'Sagar', pincode: '470001', latitude: 23.8388, longitude: 78.7378, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(), is_admin: !!admin }).select('*').single()).data
const u = await mk(`90000${String(Date.now() % 100000).padStart(5, '0')}`, true)
const id = (await anon.rpc('create_listing_with_location', { p_actor_id: u.id, p_listing_type: 'requirement', p_category: 'labor', p_details: { worker_count: 2, available_from: '2026-10-25', available_to: null }, p_latitude: 23.8388, p_longitude: 78.7378, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Sagar', p_rules_agreed: true, p_client_request_id: crypto.randomUUID(), p_contact_consent: false })).data.id
const b = await chromium.launch(); const bad = []; let n = 0
try {
  for (const lang of ['hi', 'en']) for (const w of [320, 412, 768, 1280]) {
    const c = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 768, hasTouch: w < 768, serviceWorkers: 'block' })
    await c.addInitScript(([p, l]) => { localStorage.setItem('ks_session_v1', JSON.stringify(p)); localStorage.setItem('ks_lang_v1', l) }, [u, lang])
    const p = await c.newPage()
    for (const path of ['/my', `/listing/${id}`, '/admin']) {
      await p.goto(process.argv[2] + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(600)
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); n++
      if (o > 0) bad.push(`${lang} ${w} ${path} +${o}`)
    }
    await c.close()
  }
} finally { await b.close(); await svc.from('profiles').delete().eq('id', u.id) }
console.log(`checked ${n} page/width/language combinations (signed in as a KSTEST admin seller); horizontal page scroll: ${bad.length ? bad.join('; ') : 'none'}`)
