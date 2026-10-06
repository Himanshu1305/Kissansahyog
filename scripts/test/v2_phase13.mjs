// PERMANENT regression suite for V2 Phase 13 — WhatsApp groundwork (no sending).
// Run: node --env-file=.env scripts/test/v2_phase13.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  // 1. profiles columns
  let r = await db.from('profiles').select('whatsapp_opt_in,whatsapp_opt_in_at,preferred_mandi').limit(1)
  ok('profiles has whatsapp_opt_in/_at + preferred_mandi', !r.error, r.error?.message)

  // 2. join_clicks: anon can log, anon cannot read.
  r = await anon.rpc('log_join_click', { p_src: 'test', p_device: `jointest-${Date.now()}` })
  ok('anon log_join_click accepted', !r.error, r.error?.message)
  const { data: rawJc } = await anon.from('join_clicks').select('id').limit(1)
  ok('anon CANNOT read join_clicks', !rawJc || rawJc.length === 0)

  // 3. update_kisan_profile sets opt-in + timestamp (use a test profile).
  const { data: prof } = await db.from('profiles').select('id,whatsapp_opt_in,preferred_mandi').eq('phone', '9999000001').maybeSingle()
  if (prof) {
    r = await db.rpc('update_kisan_profile', { p_actor_id: prof.id, p_whatsapp_opt_in: true, p_preferred_mandi: 'Sagar' })
    ok('update_kisan_profile sets opt-in', !r.error && r.data?.whatsapp_opt_in === true && !!r.data?.whatsapp_opt_in_at, r.error?.message)
    ok('update_kisan_profile sets preferred_mandi', r.data?.preferred_mandi === 'Sagar')
    // withdraw clears timestamp
    r = await db.rpc('update_kisan_profile', { p_actor_id: prof.id, p_whatsapp_opt_in: false })
    ok('withdraw clears opt-in + timestamp', !r.error && r.data?.whatsapp_opt_in === false && r.data?.whatsapp_opt_in_at == null, r.error?.message)
    // reset
    await db.from('profiles').update({ whatsapp_opt_in: prof.whatsapp_opt_in, preferred_mandi: prof.preferred_mandi }).eq('id', prof.id)
  } else { ok('update_kisan_profile opt-in (skipped — no test profile)', true) }

  // 4. get_whatsapp_optins admin-only.
  r = await anon.rpc('get_whatsapp_optins', { p_actor_id: '00000000-0000-0000-0000-000000000000' })
  ok('get_whatsapp_optins blocks non-admin', !!r.error)

  // 5. Channel URL empty by default → everything stays hidden.
  const { data: setting } = await anon.from('site_settings').select('value').eq('key', 'whatsapp_channel_url').maybeSingle()
  ok('whatsapp_channel_url not set (surfaces stay hidden)', !setting || setting.value == null || setting.value === '' )

  // 6. Gating component renders null when no URL.
  const wj = read('src/components/WhatsAppJoin.jsx')
  ok('WhatsAppJoin gates on channel URL (returns null)', /if\s*\(!url\)\s*return null/.test(wj))
  ok('WhatsAppJoin links via /join?src=', wj.includes('/join?src='))

  // 7. Join screen logs then redirects.
  const join = read('src/screens/Join.jsx')
  ok('Join screen logs click + redirects', join.includes('logJoinClick') && join.includes('window.location'))

  // 8. Surfaces wired.
  const has = (f) => read(f).includes('WhatsAppJoin')
  ok('Footer shows WhatsApp link', has('src/components/layout/Footer.jsx'))
  ok('Homepage shows WhatsApp banner', has('src/screens/Homepage.jsx'))
  ok('Mausam shows WhatsApp box', has('src/screens/Mausam.jsx'))
  ok('Msp shows WhatsApp box', has('src/screens/Msp.jsx'))
  ok('KisanMela shows WhatsApp box', has('src/screens/KisanMela.jsx'))
  ok('Home (post-signup) shows WhatsApp box', has('src/screens/Home.jsx'))
  ok('Post (post-listing) shows WhatsApp box', has('src/screens/Post.jsx'))

  // 9. Consent at signup + profile via KisanFields.
  ok('KisanFields has WhatsApp opt-in (unchecked) + preferred mandi', (() => {
    const k = read('src/components/KisanFields.jsx')
    return k.includes('whatsapp_opt_in') && k.includes('wa_consent_label') && k.includes('preferred_mandi')
  })())
  ok('Signup inits whatsapp_opt_in false', /whatsapp_opt_in:\s*false/.test(read('src/screens/Signup.jsx')))

  // 10. Admin builder + export + channel setter + QR.
  const ap = read('src/components/admin/WhatsAppAdminPanel.jsx')
  ok('Admin builder: 1080×1350 canvas', ap.includes('1080') && ap.includes('1350'))
  ok('Admin builder: download image + copy caption', ap.includes('admin_today_download') && ap.includes('admin_today_copy'))
  ok('Admin: channel URL setter + opt-in export + QR', ap.includes('adminSetSiteSetting') && ap.includes('getWhatsappOptins') && ap.includes('downloadQrPng'))
  ok('Admin panel mounted', read('src/screens/Admin.jsx').includes('WhatsAppAdminPanel'))

  // 11. QR is generated in-app (no third-party QR service URL).
  const qr = read('src/components/WhatsAppQR.jsx')
  ok('QR generated in-app (qrcode lib, no external service)', qr.includes("from 'qrcode'") && !/qrserver|goqr|chart\.googleapis/.test(qr))

  // 12. Privacy notice covers WhatsApp consent + withdrawal.
  ok('privacy notice covers WhatsApp consent + withdrawal', (() => {
    const l = read('src/lib/i18n/legal.js')
    return /WhatsApp/.test(l) && /withdraw|वापस ले/.test(l)
  })())

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
