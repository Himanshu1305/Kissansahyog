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
  // (Batch 10E: phone-only profiles from app_register_phone have no auth user and no email; the
  // phone-prefix delete above removes them like any other test profile.)
  // Batch 10E Phase 3A: e-mail test accounts (Supabase Auth users) are named
  // kstest-e2e-<anything>@example.com — remove any left behind (best effort; profiles.auth_uid has no
  // foreign key, and no real address can match this pattern).
  try {
    for (let pageNo = 1; pageNo <= 20; pageNo++) {
      const { data, error: listErr } = await admin.auth.admin.listUsers({ page: pageNo, perPage: 1000 })
      if (listErr) break
      const users = data?.users || []
      for (const u of users) {
        if (/^kstest-e2e-[^@\s]*@example\.com$/i.test(u.email || '')) await admin.auth.admin.deleteUser(u.id)
      }
      if (users.length < 1000) break
    }
  } catch { /* auth sweep is best effort */ }
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

// Batch 10E 5.2 — helpers for the old v1 post specs, which pre-date the current Post form.
// Step 2: equipment / land / labor / drone didi need a start date since 10E 3C — tap "आज"/"Today"
// (date-quick-0) when the date block is on the page; other categories are left alone.
export async function pickTodayIfAsked(page) {
  const today = page.getByTestId('date-quick-0')
  if (await today.count()) await today.click()
}
// Step 3: tick every consent / declaration box (the checklist grew in 6B/9B; not the optional
// wide-visibility box), as e2e/post-10e.spec.js does.
export async function tickAllConsents(page) {
  for (const cb of await page.locator('input[type="checkbox"]:not([data-testid="wide-visibility-checkbox"])').all()) {
    if (!(await cb.isChecked())) await cb.check()
  }
}
// Batch 9C made brand / model / year / HP mandatory for most equipment OFFERS (tractor, rotavator…);
// the old specs picked "option index 1", which is now such a type. "Trolley" has no spec fields
// (as e2e/post-10e.spec.js uses), so the old specs pick it by its visible name.
export async function selectSpecFreeEquipmentType(page, name = 'Trolley') {
  const sel = page.locator('#f_equipment_type_id')
  await sel.waitFor({ timeout: 8000 })
  const value = await sel.locator('option').evaluateAll((os, n) => (os.find((o) => o.textContent.trim().includes(n)) || {}).value, name)
  if (!value) throw new Error(`equipment type "${name}" not in the list`)
  await sel.selectOption(value)
}
