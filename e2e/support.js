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

// Batch1 3-step post flow: step 1 picks the listing type + category and advances to
// the Details step. `type` is 'offer' | 'requirement'; `category` is a catalog key.
export async function postStep1(page, type, category) {
  await page.goto('/post')
  await page.getByTestId(`post-type-${type}`).click()
  await page.getByTestId(`post-cat-${category}`).click()
  await page.getByTestId('post-next').click() // → Details (step 2)
}

// Delete every profile (and cascade its listings) in the reserved test range.
export async function cleanupTestData() {
  const admin = adminClient()
  const { error } = await admin.from('profiles').delete().like('phone', `${TEST_PHONE_PREFIX}%`)
  if (error) throw new Error(`cleanup failed: ${error.message}`)
  // Batch 10E: photos uploaded by e2e/photos-10e.spec.js live in listings/kstest-e2e-<ts>/ —
  // sweep any left behind (best effort; never touches other folders).
  try {
    const bucket = admin.storage.from('listing-photos')
    const { data: dirs } = await bucket.list('listings', { search: 'kstest-e2e-', limit: 100 })
    for (const d of dirs || []) {
      if (!d.name.startsWith('kstest-e2e-')) continue
      const { data: files } = await bucket.list(`listings/${d.name}`, { limit: 100 })
      const paths = (files || []).map((f) => `listings/${d.name}/${f.name}`)
      if (paths.length) await bucket.remove(paths)
    }
  } catch { /* storage sweep is best effort */ }
}

// Batch 7L-1 Stage B — a page visit normally writes a few best-effort rows as the visitor
// (the weather cell request/cache, view counters, search-miss logs). Tests that only LOOK at
// public pages call this so they leave nothing behind in the shared database. Reads still go
// to the real database. Returns the list of writes that were answered here instead.
const WRITE_RPC = /^(cache_weather_cell|increment_|log_|subscribe_|submit_|vote_|set_|update_|delete_|create_|close_|accept_|app_|claim_|resolve_|fail_|next_pending)/
export async function blockVisitorWrites(context) {
  const blocked = []
  await context.route((url) => url.pathname.includes('/rest/v1/'), (route) => {
    const req = route.request()
    const name = new URL(req.url()).pathname.split('/rest/v1/')[1] || ''
    const isRpc = name.startsWith('rpc/')
    const write = isRpc ? WRITE_RPC.test(name.slice(4)) : !['GET', 'HEAD', 'OPTIONS'].includes(req.method())
    if (!write) return route.continue()
    blocked.push(`${req.method()} ${name}`)
    return route.fulfill({ status: isRpc ? 200 : 201, contentType: 'application/json', body: isRpc ? 'null' : '[]' })
  })
  return blocked
}
