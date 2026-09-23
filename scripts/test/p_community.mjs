#!/usr/bin/env node
// Community features (Sawaal / Safalta / Yojana) — static structure checks.
// No DB needed (migration 0021 is blocked on the expired Management API token).
//   node scripts/test/p_community.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { strings } from '../../src/lib/i18n/strings.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

// 1 — Migration: 3 tables, RLS, anon insert only for the two submission tables.
const mig = read('supabase/migrations/0021_community_features.sql')
for (const tbl of ['kisan_sawaal', 'kisan_safalta', 'sarkari_yojana']) {
  check(`migration creates ${tbl}`, mig.includes(`create table if not exists public.${tbl}`))
  check(`${tbl} has RLS enabled`, mig.includes(`alter table public.${tbl} enable row level security`))
}
check('sawaal public read only published', /sawaal_public_read[\s\S]*?using \(is_published = true\)/.test(mig))
check('sawaal public insert forces is_published=false', /sawaal_public_insert[\s\S]*?with check \(is_published = false\)/.test(mig))
check('safalta public insert forces unpublished+unfeatured', /safalta_public_insert[\s\S]*?with check \(is_published = false and is_featured = false\)/.test(mig))
check('yojana public read only active', /yojana_public_read[\s\S]*?using \(is_active = true\)/.test(mig))
check('yojana grants anon SELECT only (no anon insert)', mig.includes('grant select on public.sarkari_yojana to anon') && !/grant insert on public\.sarkari_yojana/.test(mig))

// 2 — Every admin RPC checks require_admin.
const RPCS = [
  'get_admin_sawaal', 'admin_answer_sawaal', 'admin_set_sawaal_featured', 'admin_set_sawaal_published', 'admin_delete_sawaal',
  'get_admin_safalta', 'admin_upsert_safalta', 'admin_set_safalta_published', 'admin_set_safalta_featured', 'admin_delete_safalta',
  'get_admin_yojana', 'admin_upsert_yojana', 'admin_set_yojana_active', 'admin_set_yojana_featured',
]
for (const fn of RPCS) {
  check(`RPC ${fn} defined + granted`, mig.includes(`function public.${fn}(`) && mig.includes(`grant execute on function public.${fn}`))
}
// Each function body performs require_admin.
const bodies = mig.split('create or replace function').slice(1)
const adminBodies = bodies.filter((b) => RPCS.some((fn) => b.includes(`public.${fn}(`)))
check('every community admin RPC calls require_admin', adminBodies.length === RPCS.length && adminBodies.every((b) => b.includes('perform public.require_admin')))

// 3 — Seeds: 8 schemes, 3 Q&As, 2 stories (idempotent by fixed id).
check('8 government schemes seeded', (mig.match(/00000000-0000-4000-c000-0000000000/g) || []).length >= 8)
check('3 example Q&As seeded', (mig.match(/c000-0000000001\d\d/g) || []).length === 3)
check('2 placeholder stories seeded', (mig.match(/c000-0000000002\d\d/g) || []).length === 2)
check('schemes include PM Kisan + Fasal Bima + KUSUM + KCC + Drone Didi + e-NAM + PM-AASHA + Soil Health',
  ['PM Kisan Samman Nidhi', 'PM Fasal Bima', 'PM KUSUM', 'Kisan Credit Card', 'Drone Didi Scheme', 'e-NAM', 'PM-AASHA', 'Soil Health Card'].every((s) => mig.includes(s)))
check('no helicopter imagery/word in Drone Didi scheme', !/helicopter|हेलिकॉप्टर/i.test(mig))

// 4 — Client API surface.
const api = read('src/lib/community/communityApi.js')
for (const fn of ['fetchPublishedSawaal', 'fetchFeaturedSawaal', 'submitSawaal', 'fetchPublishedSafalta',
  'fetchFeaturedSafalta', 'submitSafalta', 'fetchActiveYojana', 'fetchFeaturedYojana']) {
  check(`communityApi exports ${fn}`, api.includes(`export async function ${fn}`) || api.includes(`export function ${fn}`))
}
check('submit paths never set is_published true', !/is_published:\s*true/.test(api))

// 5 — Routes wired (public, no auth gate).
const app = read('src/App.jsx')
check('/sawaal /safalta /yojana routes registered', ['/sawaal', '/safalta', '/yojana'].every((p) => app.includes(`path="${p}"`)))
check('community routes are public (outside Protected)', !/Protected>\s*<(Sawaal|Safalta|Yojana)/.test(app))

// 6 — Nav dropdown + admin panels.
const nav = read('src/components/NavBar.jsx')
check('nav has a single Community dropdown (not 3 top-level items)', nav.includes("t('community_nav')") && nav.includes('COMMUNITY'))
const admin = read('src/screens/Admin.jsx')
check('admin renders all 3 community panels', ['SawaalPanel', 'SafaltaPanel', 'YojanaPanel'].every((p) => admin.includes(`<${p} `)))

// 7 — i18n: every required key present + bilingual.
const bi = (o) => o && typeof o.hi === 'string' && o.hi.trim() && typeof o.en === 'string' && o.en.trim()
const KEYS = [
  'community_nav', 'sawaal_nav', 'sawaal_title', 'sawaal_sub', 'sawaal_ask_cta', 'sawaal_submitted',
  'safalta_nav', 'safalta_title', 'safalta_sub', 'safalta_empty', 'safalta_share_cta',
  'yojana_nav', 'yojana_title', 'yojana_sub', 'yojana_benefit_label', 'yojana_eligibility_label',
  'yojana_howto_label', 'yojana_msp_crosslink', 'home_sawaal_title', 'home_safalta_title', 'info_yojana_heading',
  'admin_sawaal', 'admin_safalta', 'admin_yojana',
  ...['all', 'land', 'equipment', 'crop', 'pest', 'weather', 'market', 'scheme', 'drone_didi', 'general'].map((c) => `scat_${c}`),
  ...['all', 'income_support', 'crop_insurance', 'credit', 'equipment', 'solar', 'storage', 'women', 'general', 'market'].map((c) => `ycat_${c}`),
]
const missing = KEYS.filter((k) => !strings[k])
check('all community i18n keys present', missing.length === 0, missing.join(', '))
const notBi = KEYS.filter((k) => strings[k] && !bi(strings[k]))
check('all community i18n keys bilingual', notBi.length === 0, notBi.join(', '))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
