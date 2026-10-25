// Batch 10G Phase 3 — the seller deletes / disables / enables their OWN listings (My Listings and the
// own listing detail page). Runs against a STAGING build. Test users: "KSTEST …", phones in the reserved
// 90000xxxxx range; photos in listings/kstest-e2e-10g-*/ (the global teardown removes profiles, their
// listings and kstest-e2e-* photo folders).
import { test, expect } from '@playwright/test'
import { adminClient, anonClient, testPhone } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'

test.setTimeout(90_000)
const S = (key, lang = 'hi') => strings[key][lang]
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')

async function makeUser(lang = 'hi', admin = false) {
  const { data, error } = await anonClient().rpc('app_register_phone', {
    p_full_name: `KSTEST 10G ${admin ? 'admin' : 'seller'}`, p_phone: testPhone(), p_village_town: 'Sagar',
    p_latitude: 23.8388, p_longitude: 78.7378, p_language: lang, p_disclaimer_accepted: true, p_show_details: true,
  })
  if (error) throw new Error(error.message)
  const p = Array.isArray(data) ? data[0] : data
  if (admin) { await adminClient().from('profiles').update({ is_admin: true }).eq('id', p.id); p.is_admin = true }
  return p
}
async function makeListing(user, { photo = false } = {}) {
  const anon = anonClient()
  let photo_urls = []
  let path = null
  if (photo) {
    path = `listings/kstest-e2e-10g-${Date.now()}-${Math.round(Math.random() * 1e6)}/0.jpg`
    const { error } = await anon.storage.from('listing-photos').upload(path, JPEG, { contentType: 'image/jpeg', upsert: false })
    if (error) throw new Error(error.message)
    photo_urls = [anon.storage.from('listing-photos').getPublicUrl(path).data.publicUrl]
  }
  const { data, error } = await anon.rpc('create_listing_with_location', {
    p_actor_id: user.id, p_listing_type: 'requirement', p_category: 'labor',
    p_details: { worker_count: 3, available_from: '2026-10-25', available_to: null, extra_info: 'KSTEST 10G', photo_urls },
    p_latitude: 23.8388, p_longitude: 78.7378, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer',
    p_wide_visibility: false, p_village_name: 'Sagar', p_rules_agreed: true, p_client_request_id: crypto.randomUUID(), p_contact_consent: false,
  })
  if (error) throw new Error(error.message)
  return { id: data.id, path, url: photo_urls[0] || null }
}
async function open(browser, user, { lang = 'hi', width = 412, height = 900 } = {}) {
  const isMobile = width < 768
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile, serviceWorkers: 'block' })
  await ctx.addInitScript(([p, l]) => { localStorage.setItem('ks_session_v1', JSON.stringify(p)); localStorage.setItem('ks_lang_v1', l) }, [user, lang])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/cloudflareinsights|img-src|Failed to load resource/.test(m.text())) errors.push(m.text()) })
  return { ctx, page, errors }
}
const card = (page, id) => page.locator(`[data-testid="my-listing"][data-listing-id="${id}"]`)
const dbRow = async (id) => (await adminClient().from('listings').select('id,status,admin_disabled_at').eq('id', id).maybeSingle()).data
const publicSees = async (id) => ((await anonClient().from('listings').select('id').eq('id', id)).data || []).length > 0
const objectExists = async (path) => {
  const folder = path.split('/').slice(0, -1).join('/')
  const { data } = await adminClient().storage.from('listing-photos').list(folder, { limit: 10 })
  return (data || []).some((f) => `${folder}/${f.name}` === path)
}

for (const [lang, width] of [['hi', 412], ['en', 1280]]) {
  test(`O1 ${lang} ${width}: disable hides the listing from others, enable brings it back; buttons visible and ≥ 44 px`, async ({ browser }) => {
    const user = await makeUser(lang)
    const L = await makeListing(user)
    const { ctx, page, errors } = await open(browser, user, { lang, width })
    await page.goto('/my')
    const c = card(page, L.id)
    await expect(c).toBeVisible({ timeout: 20_000 })
    await expect(c).toHaveAttribute('data-status', 'active')
    for (const id of ['listing-disable', 'listing-delete']) {
      const b = c.getByTestId(id)
      await expect(b).toBeVisible()
      expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44)
    }
    await expect(c.getByTestId('listing-delete')).toContainText(S('listing_delete', lang))
    await c.getByTestId('listing-disable').click()
    await expect(page.getByTestId('toast')).toHaveText(S('listing_disabled_toast', lang))
    await expect(c).toHaveAttribute('data-status', 'disabled')
    await expect(c).toContainText(S('badge_disabled', lang))
    await expect(c.getByTestId('owner-disabled-note')).toBeVisible()
    expect((await dbRow(L.id)).status).toBe('disabled')
    expect(await publicSees(L.id)).toBe(false)
    await c.getByTestId('listing-enable').click()
    await expect(page.getByTestId('toast')).toHaveText(S('listing_enabled_toast', lang))
    await expect(c).toHaveAttribute('data-status', 'active')
    expect((await dbRow(L.id)).status).toBe('active')
    expect(await publicSees(L.id)).toBe(true)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over).toBeLessThanOrEqual(0)
    expect(errors).toEqual([])
    await ctx.close()
  })

  test(`O2 ${lang} ${width}: delete asks first (cancel keeps it), then removes row and photo for ever`, async ({ browser }) => {
    const user = await makeUser(lang)
    const L = await makeListing(user, { photo: true })
    expect(await objectExists(L.path)).toBe(true)
    const { ctx, page, errors } = await open(browser, user, { lang, width })
    await page.goto('/my')
    const c = card(page, L.id)
    await expect(c).toBeVisible({ timeout: 20_000 })
    await c.getByTestId('listing-delete').click()
    const dlg = page.getByTestId('delete-dialog')
    await expect(dlg).toBeVisible()
    await expect(dlg).toHaveAttribute('role', 'alertdialog')
    await expect(dlg).toContainText(S('listing_delete_body', lang))
    await expect(page.getByTestId('delete-dialog-no')).toBeFocused()
    await page.getByTestId('delete-dialog-no').click()
    await expect(dlg).toHaveCount(0)
    expect(await dbRow(L.id)).not.toBeNull()
    await c.getByTestId('listing-delete').click()
    await page.getByTestId('delete-dialog-yes').click()
    await expect(page.getByTestId('toast')).toHaveText(S('listing_deleted_toast', lang))
    await expect(c).toHaveCount(0)
    expect(await dbRow(L.id)).toBeNull()
    await expect.poll(() => objectExists(L.path), { timeout: 15_000 }).toBe(false)
    const status = (await fetch(`${L.url}?x=${Date.now()}`)).status
    expect([400, 404]).toContain(status)
    // the deleted listing's page shows the normal "not found" state
    await page.goto(`/listing/${L.id}`)
    await expect(page.getByText(S('listing_not_found', lang))).toBeVisible({ timeout: 20_000 })
    expect(errors).toEqual([])
    await ctx.close()
  })
}

test('O3 admin-disabled: badge + reason, NO enable button, delete still offered; the seller RPC refuses enable', async ({ browser }) => {
  const user = await makeUser('hi')
  const admin = await makeUser('hi', true)
  const L = await makeListing(user)
  const { error } = await anonClient().rpc('admin_set_listing_disabled', { p_actor_id: admin.id, p_listing_id: L.id, p_disabled: true, p_reason: 'KSTEST फोटो गलत है' })
  expect(error).toBeNull()
  const { ctx, page, errors } = await open(browser, user, { lang: 'hi', width: 360, height: 800 })
  await page.goto('/my')
  const c = card(page, L.id)
  await expect(c).toBeVisible({ timeout: 20_000 })
  await expect(c).toHaveAttribute('data-status', 'admin_disabled')
  await expect(c).toContainText(S('badge_admin_disabled'))
  await expect(c.getByTestId('owner-admin-reason')).toHaveText('KSTEST फोटो गलत है')
  await expect(c.getByTestId('listing-enable')).toHaveCount(0)
  await expect(c.getByTestId('listing-disable')).toHaveCount(0)
  await expect(c.getByTestId('listing-delete')).toBeVisible()
  const r = await anonClient().rpc('set_my_listing_disabled', { p_actor_id: user.id, p_listing_id: L.id, p_disabled: false })
  expect(r.error?.message).toContain('disabled_by_admin')
  // the own detail page shows the same state
  await page.goto(`/listing/${L.id}`)
  await expect(page.getByTestId('owner-status')).toHaveAttribute('data-status', 'admin_disabled', { timeout: 20_000 })
  await expect(page.getByTestId('listing-enable')).toHaveCount(0)
  await adminClient().from('listing_admin_actions').delete().eq('listing_id', L.id)
  expect(errors).toEqual([])
  await ctx.close()
})

test('O4 own detail page: a disabled listing is still shown to its seller, with enable; delete from there returns to My Listings', async ({ browser }) => {
  const user = await makeUser('hi')
  const L = await makeListing(user)
  await anonClient().rpc('set_my_listing_disabled', { p_actor_id: user.id, p_listing_id: L.id, p_disabled: true })
  const { ctx, page, errors } = await open(browser, user, { lang: 'hi', width: 412 })
  await page.goto(`/listing/${L.id}`)
  await expect(page.getByTestId('owner-panel')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('owner-status')).toHaveAttribute('data-status', 'disabled')
  await page.getByTestId('listing-enable').click()
  await expect(page.getByTestId('owner-status')).toHaveAttribute('data-status', 'active')
  expect((await dbRow(L.id)).status).toBe('active')
  await page.getByTestId('listing-delete').click()
  await page.getByTestId('delete-dialog-yes').click()
  await expect(page).toHaveURL(/\/my$/)
  await expect(page.getByTestId('toast')).toHaveText(S('listing_deleted_toast'))
  expect(await dbRow(L.id)).toBeNull()
  expect(errors).toEqual([])
  await ctx.close()
})

test('O5 keyboard and screen reader: buttons in a labelled group; Enter opens the dialog, focus on "नहीं", Escape closes and returns focus', async ({ browser }) => {
  const user = await makeUser('hi')
  const L = await makeListing(user)
  const { ctx, page } = await open(browser, user, { lang: 'hi', width: 1280 })
  await page.goto('/my')
  const c = card(page, L.id)
  await expect(c).toBeVisible({ timeout: 20_000 })
  await expect(c.getByRole('group', { name: S('listing_actions_label') })).toBeVisible()
  const del = c.getByTestId('listing-delete')
  await del.focus()
  await page.keyboard.press('Enter')
  const dlg = page.getByRole('alertdialog', { name: S('listing_delete_title') })
  await expect(dlg).toBeVisible()
  await expect(page.getByTestId('delete-dialog-no')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dlg).toHaveCount(0)
  await expect(del).toBeFocused()
  expect(await dbRow(L.id)).not.toBeNull()
  await ctx.close()
})

test('O6 a non-owner cannot disable or delete someone else\'s listing (RPC refuses; nothing changes)', async () => {
  const a = await makeUser('hi')
  const b = await makeUser('hi')
  const L = await makeListing(a)
  const r1 = await anonClient().rpc('set_my_listing_disabled', { p_actor_id: b.id, p_listing_id: L.id, p_disabled: true })
  const r2 = await anonClient().rpc('delete_my_listing', { p_actor_id: b.id, p_listing_id: L.id })
  expect(r1.error?.message).toContain('not_owner')
  expect(r2.error?.message).toContain('not_owner')
  expect((await dbRow(L.id)).status).toBe('active')
})
