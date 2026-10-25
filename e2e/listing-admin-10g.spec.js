// Batch 10G Phase 4 — admin disable / enable / delete permanently (admin listings panel, reports list,
// listing detail page) and non-admins never see or use them. STAGING build; KSTEST users in the reserved
// 90000xxxxx range (global teardown); admin log rows of these KSTEST listings are removed at the end.
import { test, expect } from '@playwright/test'
import { adminClient, anonClient, testPhone } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'
import { CATEGORY_META } from '../src/lib/listings/catalog.js'

test.setTimeout(120_000)
const S = (key, lang = 'hi') => strings[key][lang]
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')
const created = []

async function makeUser(admin = false) {
  const { data, error } = await anonClient().rpc('app_register_phone', {
    p_full_name: `KSTEST 10G ${admin ? 'admin' : 'seller'}`, p_phone: testPhone(), p_village_town: 'Sagar',
    p_latitude: 23.8388, p_longitude: 78.7378, p_language: 'hi', p_disclaimer_accepted: true, p_show_details: true,
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
    path = `listings/kstest-e2e-10g-admin-${Date.now()}-${Math.round(Math.random() * 1e6)}/0.jpg`
    const { error } = await anon.storage.from('listing-photos').upload(path, JPEG, { contentType: 'image/jpeg', upsert: false })
    if (error) throw new Error(error.message)
    photo_urls = [anon.storage.from('listing-photos').getPublicUrl(path).data.publicUrl]
  }
  const { data, error } = await anon.rpc('create_listing_with_location', {
    p_actor_id: user.id, p_listing_type: 'requirement', p_category: 'labor',
    p_details: { worker_count: 4, available_from: '2026-10-25', available_to: null, extra_info: 'KSTEST 10G admin', photo_urls },
    p_latitude: 23.8388, p_longitude: 78.7378, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer',
    p_wide_visibility: false, p_village_name: 'Sagar', p_rules_agreed: true, p_client_request_id: crypto.randomUUID(), p_contact_consent: false,
  })
  if (error) throw new Error(error.message)
  created.push(data.id)
  return { id: data.id, path, url: photo_urls[0] || null }
}
async function open(browser, user, { lang = 'hi', width = 1280, height = 900 } = {}) {
  const isMobile = width < 768
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile, serviceWorkers: 'block' })
  await ctx.addInitScript(([p, l]) => { localStorage.setItem('ks_session_v1', JSON.stringify(p)); localStorage.setItem('ks_lang_v1', l) }, [user, lang])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  return { ctx, page, errors }
}
const dbRow = async (id) => (await adminClient().from('listings').select('id,status,admin_disabled_at,admin_disabled_reason').eq('id', id).maybeSingle()).data
const audit = async (id) => ((await adminClient().from('listing_admin_actions').select('action,reason,category').eq('listing_id', id).order('id')).data || [])

test.afterAll(async () => { if (created.length) await adminClient().from('listing_admin_actions').delete().in('listing_id', created) })

test('A1 admin listings panel: disable needs a reason, enable, delete permanently needs reason + DELETE; log rows; photo removed', async ({ browser }) => {
  const admin = await makeUser(true)
  const seller = await makeUser()
  const L = await makeListing(seller, { photo: true })
  const { ctx, page, errors } = await open(browser, admin)
  await page.goto('/admin?tab=moderation')
  const row = page.locator(`[data-testid="admin-listing-row"][data-listing-id="${L.id}"]`)
  await expect(row).toBeVisible({ timeout: 30_000 })
  await expect(row.getByTestId('admin-status')).toHaveAttribute('data-status', 'active')
  // disable: the confirm button stays off until a reason is written
  await row.getByTestId('admin-disable').click()
  const dd = page.getByTestId('admin-disable-dialog')
  await expect(dd).toBeVisible()
  await expect(page.getByTestId('admin-disable-dialog-yes')).toBeDisabled()
  await page.getByTestId('admin-disable-reason').fill('KSTEST गलत फोटो')
  await page.getByTestId('admin-disable-dialog-yes').click()
  await expect(page.getByTestId('admin-done')).toHaveText(S('admin_done_disabled'))
  await expect(row.getByTestId('admin-status')).toHaveAttribute('data-status', 'disabled_admin')
  await expect(row.getByTestId('admin-reason')).toContainText('KSTEST गलत फोटो')
  expect((await dbRow(L.id)).admin_disabled_reason).toBe('KSTEST गलत फोटो')
  // enable
  await row.getByTestId('admin-enable').click()
  await expect(page.getByTestId('admin-done')).toHaveText(S('admin_done_enabled'))
  await expect(row.getByTestId('admin-status')).toHaveAttribute('data-status', 'active')
  expect((await dbRow(L.id)).status).toBe('active')
  // delete permanently: category repeated; reason + typing DELETE both required
  await row.getByTestId('admin-delete').click()
  const del = page.getByTestId('admin-delete-dialog')
  await expect(del).toContainText(`“${CATEGORY_META.labor.hi}”`)
  const yes = page.getByTestId('admin-delete-dialog-yes')
  await expect(yes).toBeDisabled()
  await page.getByTestId('admin-delete-reason').fill('KSTEST नकली विज्ञापन')
  await expect(yes).toBeDisabled()
  await page.getByTestId('admin-delete-type').fill('delet')
  await expect(yes).toBeDisabled()
  await page.getByTestId('admin-delete-type').fill('DELETE')
  await expect(yes).toBeEnabled()
  await yes.click()
  await expect(page.getByTestId('admin-done')).toHaveText(S('admin_done_deleted'))
  await expect(row).toHaveCount(0)
  expect(await dbRow(L.id)).toBeNull()
  expect((await audit(L.id)).map((a) => a.action)).toEqual(['disable', 'enable', 'delete'])
  await expect.poll(async () => (await fetch(`${L.url}?x=${Date.now()}`)).status, { timeout: 15_000 }).not.toBe(200)
  expect(errors).toEqual([])
  await ctx.close()
})

test('A2 reports list: "Delete permanently" next to remove / dismiss deletes the listing and resolves the report', async ({ browser }) => {
  const admin = await makeUser(true)
  const seller = await makeUser()
  const L = await makeListing(seller)
  const { data: rep } = await adminClient().from('listing_reports').insert({ target_type: 'listing', target_id: L.id, listing_id: L.id, reason: 'fraud', note: 'KSTEST 10G report', status: 'open' }).select('id').single()
  const { ctx, page, errors } = await open(browser, admin)
  await page.goto('/admin?tab=moderation')
  const card = page.locator('div.rounded-xl', { hasText: 'KSTEST 10G report' }).first()
  await expect(card).toBeVisible({ timeout: 30_000 })
  await card.getByTestId('admin-delete').click()
  await page.getByTestId('admin-delete-reason').fill('KSTEST शिकायत सही')
  await page.getByTestId('admin-delete-type').fill('DELETE')
  await page.getByTestId('admin-delete-dialog-yes').click()
  await expect(page.locator('div.rounded-xl', { hasText: 'KSTEST 10G report' })).toHaveCount(0, { timeout: 20_000 })
  expect(await dbRow(L.id)).toBeNull()
  const r = (await adminClient().from('listing_reports').select('status,listing_id,resolution_note').eq('id', rep.id).single()).data
  expect(r).toMatchObject({ status: 'removed', listing_id: null, resolution_note: 'KSTEST शिकायत सही' })
  await adminClient().from('listing_reports').delete().eq('id', rep.id)
  expect(errors).toEqual([])
  await ctx.close()
})

test('A3 listing detail page as admin (412 px): disable with a reason; the public no longer sees it', async ({ browser }) => {
  const admin = await makeUser(true)
  const seller = await makeUser()
  const L = await makeListing(seller)
  const { ctx, page, errors } = await open(browser, admin, { width: 412 })
  await page.goto(`/listing/${L.id}`)
  const panel = page.getByTestId('admin-panel-detail')
  await expect(panel).toBeVisible({ timeout: 20_000 })
  await panel.getByTestId('admin-disable').click()
  await page.getByTestId('admin-disable-reason').fill('KSTEST जाँच')
  await page.getByTestId('admin-disable-dialog-yes').click()
  await expect(page.getByTestId('toast')).toHaveText(S('admin_done_disabled'))
  expect((await dbRow(L.id)).status).toBe('disabled')
  expect(((await anonClient().from('listings').select('id').eq('id', L.id)).data || []).length).toBe(0)
  expect(errors).toEqual([])
  await ctx.close()
})

test('A4 non-admins never see admin controls, and the admin RPCs refuse them', async ({ browser }) => {
  const seller = await makeUser()
  const other = await makeUser()
  const L = await makeListing(seller)
  const { ctx, page } = await open(browser, other, { width: 412 })
  await page.goto(`/listing/${L.id}`)
  await expect(page.getByText(S('detail_title')).first()).toBeVisible({ timeout: 20_000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page.getByTestId('admin-panel-detail')).toHaveCount(0)
  await expect(page.getByTestId('admin-delete')).toHaveCount(0)
  await page.goto('/admin?tab=moderation')
  await expect(page.getByText(S('access_denied'))).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('admin-listing-row')).toHaveCount(0)
  const r1 = await anonClient().rpc('admin_set_listing_disabled', { p_actor_id: other.id, p_listing_id: L.id, p_disabled: true, p_reason: 'x' })
  const r2 = await anonClient().rpc('admin_delete_listing', { p_actor_id: other.id, p_listing_id: L.id, p_reason: 'x' })
  expect(r1.error?.message).toContain('not_admin')
  expect(r2.error?.message).toContain('not_admin')
  expect((await dbRow(L.id)).status).toBe('active')
  await ctx.close()
})
