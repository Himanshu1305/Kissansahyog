#!/usr/bin/env node
// Phase 1 test checklist — RLS enforcement + seed idempotency.
// Uses the ANON key (what the browser uses) to prove RLS actually blocks
// direct cross-user reads/writes. Run: node --env-file=.env scripts/test/phase1.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(url, anon, { auth: { persistSession: false } })
const admin = createClient(url, service, { auth: { persistSession: false } })

let pass = 0
let fail = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
  ok ? pass++ : fail++
}

async function main() {
  // --- Positive: anon can read lookups ---
  // Counts reflect the v1.1 seed set (v1 was 10 crops / 6 equipment types).
  const crops = await sb.from('crops').select('*')
  check('anon reads crops', !crops.error && crops.data.length === 11, `${crops.data?.length} rows`)

  const pins = await sb.from('pincodes').select('*')
  check('anon reads pincodes', !pins.error && pins.data.length === 20, `${pins.data?.length} rows`)

  const eq = await sb.from('equipment_types').select('*')
  check('anon reads equipment_types', !eq.error && eq.data.length === 11, `${eq.data?.length} rows`)

  // --- Negative: anon CANNOT read profiles (locked, no policy) ---
  // First create a real profile via the service role so there is a row to (fail to) read.
  const phone = '9' + String(1000000000 + Math.floor((Date.now() % 1e9))).slice(1)
  const { data: prof, error: profErr } = await admin
    .from('profiles')
    .insert({
      full_name: 'RLS Test User',
      phone,
      pincode: '470001',
      latitude: 23.8388,
      longitude: 78.7378,
      disclaimer_accepted_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (profErr) {
    check('setup: create test profile (service role)', false, profErr.message)
    return finish()
  }

  const anonProfiles = await sb.from('profiles').select('*')
  check(
    'anon CANNOT read profiles (RLS default-deny)',
    !anonProfiles.error && anonProfiles.data.length === 0,
    `got ${anonProfiles.data?.length ?? 'error:' + anonProfiles.error?.message} rows`,
  )

  // --- Negative: anon CANNOT insert a profile directly ---
  const anonInsProfile = await sb
    .from('profiles')
    .insert({ full_name: 'x', phone: '9999999999', pincode: '470001' })
    .select()
  check(
    'anon CANNOT insert profile directly',
    !!anonInsProfile.error,
    anonInsProfile.error?.message || 'NO ERROR (bad!)',
  )

  // --- Negative: anon CANNOT insert a listing directly ---
  const anonInsListing = await sb
    .from('listings')
    .insert({
      user_id: prof.id,
      listing_type: 'offer',
      category: 'land',
      details: { size_range: '1-2' },
      self_declared: true,
    })
    .select()
  check(
    'anon CANNOT insert listing directly',
    !!anonInsListing.error,
    anonInsListing.error?.message || 'NO ERROR (bad!)',
  )

  // --- Negative: create an active listing via service role, then confirm anon
  //     CANNOT update (close) it directly ---
  const { data: listing } = await admin
    .from('listings')
    .insert({
      user_id: prof.id,
      listing_type: 'requirement',
      category: 'land',
      details: { size_range: '2-5' },
    })
    .select()
    .single()

  const anonUpd = await sb.from('listings').update({ status: 'closed' }).eq('id', listing.id).select()
  // RLS with no UPDATE policy => update affects 0 rows (returns empty), never actually closes.
  const stillActive = await admin.from('listings').select('status').eq('id', listing.id).single()
  check(
    'anon CANNOT close listing directly (row unchanged)',
    stillActive.data.status === 'active' && (anonUpd.data?.length ?? 0) === 0,
    `status=${stillActive.data.status}, rowsUpdated=${anonUpd.data?.length ?? 0}`,
  )

  // --- Positive: anon CAN read the active listing ---
  const anonRead = await sb.from('listings').select('*').eq('id', listing.id)
  check('anon CAN read active listing', !anonRead.error && anonRead.data.length === 1)

  // --- Edge: seed idempotency — re-run seed, counts must not grow ---
  //     (done separately by re-running scripts/seed.mjs; here we just confirm
  //      the unique constraints exist by attempting a duplicate crop upsert.)
  const dupCrop = await admin
    .from('crops')
    .upsert({ name_hi: 'गेहूं', name_en: 'Wheat', region: 'sagar_mp' }, { onConflict: 'name_en,region' })
  const cropCount = await admin.from('crops').select('*', { count: 'exact', head: true })
  check('crops upsert is idempotent (no dup)', !dupCrop.error && cropCount.count === 11, `${cropCount.count} rows`)

  // --- cleanup test rows ---
  await admin.from('listings').delete().eq('user_id', prof.id)
  await admin.from('profiles').delete().eq('id', prof.id)

  finish()
}

function finish() {
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main()
