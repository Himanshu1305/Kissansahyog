// Shared helpers for E2E + backend tests.
import { createClient } from '@supabase/supabase-js'

export const TEST_PHONE_PREFIX = '90000' // reserved for automated tests

// A fresh, valid-looking 10-digit test phone in the reserved range.
let counter = 0
export function testPhone() {
  counter += 1
  const suffix = String((Date.now() % 100000) + counter).padStart(5, '0').slice(-5)
  return TEST_PHONE_PREFIX + suffix
}

export function adminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env (run with node --env-file=.env)')
  return createClient(url, key, { auth: { persistSession: false } })
}

export function anonClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  return createClient(url, key, { auth: { persistSession: false } })
}

// Delete every profile (and cascade its listings) in the reserved test range.
export async function cleanupTestData() {
  const admin = adminClient()
  const { error } = await admin.from('profiles').delete().like('phone', `${TEST_PHONE_PREFIX}%`)
  if (error) throw new Error(`cleanup failed: ${error.message}`)
}
