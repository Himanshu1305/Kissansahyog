#!/usr/bin/env node
// Kisan Sahyog — seed script (run OUTSIDE the client app).
// Idempotent upserts of lookup tables (pincodes, crops, equipment_types) using
// the SERVICE ROLE key, which bypasses RLS. Safe to run repeatedly: conflicts
// on natural keys update in place rather than duplicating rows.
//
// Usage:
//   node --env-file=.env scripts/seed.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const HERE = dirname(fileURLToPath(import.meta.url))
const SEED_DIR = join(HERE, '..', 'supabase', 'seed')

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in env (.env)')
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function load(name) {
  return JSON.parse(readFileSync(join(SEED_DIR, name), 'utf8'))
}

async function seed() {
  const pincodes = load('pincodes.json')
  const lookups = load('lookups.json')
  const crops = lookups.crops
  const equipment = lookups.equipment_types

  // pincodes — conflict on primary key `pincode`.
  {
    const { error } = await supabase.from('pincodes').upsert(pincodes, { onConflict: 'pincode' })
    if (error) throw new Error(`pincodes seed failed: ${error.message}`)
    console.log(`pincodes: upserted ${pincodes.length}`)
  }

  // crops — conflict on (name_en, region).
  {
    const { error } = await supabase
      .from('crops')
      .upsert(crops, { onConflict: 'name_en,region' })
    if (error) throw new Error(`crops seed failed: ${error.message}`)
    console.log(`crops: upserted ${crops.length}`)
  }

  // equipment_types — conflict on name_en.
  {
    const { error } = await supabase
      .from('equipment_types')
      .upsert(equipment, { onConflict: 'name_en' })
    if (error) throw new Error(`equipment_types seed failed: ${error.message}`)
    console.log(`equipment_types: upserted ${equipment.length}`)
  }

  // Report final counts.
  for (const table of ['pincodes', 'crops', 'equipment_types']) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    if (error) throw new Error(`count ${table} failed: ${error.message}`)
    console.log(`  ${table}: ${count} rows total`)
  }
}

seed()
  .then(() => console.log('\nSeed complete.'))
  .catch((err) => {
    console.error('\nSEED ERROR:', err.message)
    process.exit(1)
  })
