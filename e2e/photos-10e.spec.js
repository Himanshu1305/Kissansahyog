// Batch 10E Phase 1A — listing photos must DISPLAY under the real site CSP.
//
// The local preview (vite preview) does not apply public/_headers, so this spec injects the
// Content-Security-Policy header from public/_headers into the HTML document response with
// page.route (the same header Cloudflare Pages sends). It:
//   1. uploads a small generated PNG to the STAGING `listing-photos` bucket with the anon key and
//      the same path layout the app uses (listings/<folder>/0.png) — like PhotoPicker/uploadPhotos;
//   2. creates a KSTEST land listing (reserved test phone range) whose details.photo_urls holds
//      the public URL — like Post.jsx does after the upload;
//   3. opens /listing/<id> with the CURRENT CSP: the photo loads (complete, naturalWidth > 0) and
//      the console has no CSP error;
//   4. opens it again with the OLD img-src (the Supabase hosts removed): the photo is blocked and a
//      CSP img-src error is logged — proving this test catches the bug.
// Cleanup: the profile (cascade: listing) is deleted by global-teardown (reserved phone range);
// the storage object is removed in afterAll, and cleanupTestData also sweeps "kstest-" folders.
// Run (staging only): node --env-file=.env scripts/check-staging-env.mjs &&
//   node --env-file=.env node_modules/@playwright/test/cli.js test e2e/photos-10e.spec.js --workers=1
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { adminClient, anonClient, testPhone } from './support.js'

const BUCKET = 'listing-photos'
const SUPA_HOSTS = ['https://wzxtqbqlahyahsnoqqva.supabase.co', 'https://eltmcznjcqiahqhjvpjg.supabase.co']

const headersFile = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')
const CSP_NOW = /^\s*Content-Security-Policy:\s*(.+)$/m.exec(headersFile)[1].trim()
// The pre-10E policy: same line without the two Supabase storage hosts in img-src.
const CSP_OLD = SUPA_HOSTS.reduce((s, h) => s.replace(` ${h}`, ''), CSP_NOW)

// --- a tiny valid PNG (64×48, green/saffron stripes) built with node:zlib, no dependency ---
function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function makePng(w = 64, h = 48) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3
      const stripe = Math.floor(x / 8) % 2
      raw[o] = stripe ? 0xe6 : 0x24; raw[o + 1] = stripe ? 0x9a : 0x73; raw[o + 2] = stripe ? 0x2d : 0x3f
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

async function withCsp(page, csp) {
  // Only the HTML document gets the header (that is how Pages serves it; CSP applies per document).
  await page.route((url) => url.pathname.startsWith('/listing/'), async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue()
    const res = await route.fetch()
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } })
  })
}

function watchConsole(page) {
  const csp = []
  // The Cloudflare beacon (deployed hosts only) is refused by script-src, unrelated to photos: ignored.
  page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/i.test(m.text()) && !/cloudflareinsights/.test(m.text())) csp.push(m.text()) })
  return csp
}

let listingId = null
let photoPath = null
let photoUrl = null

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  const url = process.env.VITE_SUPABASE_URL || ''
  if (!url.includes('wzxtqbqlahyahsnoqqva')) throw new Error('photos-10e runs against STAGING only (start with --env-file=.env)')
  const admin = adminClient()
  const { data: user, error: uErr } = await admin.from('profiles').insert({
    full_name: 'KSTEST Photo 10E', phone: testPhone(), village_town: 'Sagar', pincode: '470001',
    latitude: 23.8388, longitude: 78.7378, preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
  }).select().single()
  if (uErr) throw new Error(uErr.message)

  // Upload like the app: anon key, public bucket, listings/<folder>/<index>.<ext>.
  photoPath = `listings/kstest-e2e-${Date.now()}/0.png`
  const { error: upErr } = await anonClient().storage.from(BUCKET).upload(photoPath, makePng(), { contentType: 'image/png', upsert: false, cacheControl: '60' })
  if (upErr) throw new Error(`upload: ${upErr.message}`)
  photoUrl = anonClient().storage.from(BUCKET).getPublicUrl(photoPath).data.publicUrl

  const { data: listing, error: lErr } = await admin.from('listings').insert({
    user_id: user.id, listing_type: 'offer', category: 'land',
    latitude: user.latitude, longitude: user.longitude, pincode: user.pincode, village_name: 'Sagar',
    details: { size_acres: 2, arrangement: ['lease'], water_source: 'canal', season: 'rabi', price_type: 'negotiable', photo_urls: [photoUrl] },
    self_declared: true,
  }).select('id').single()
  if (lErr) throw new Error(lErr.message)
  listingId = listing.id
})

test.afterAll(async () => {
  if (photoPath) await adminClient().storage.from(BUCKET).remove([photoPath]).catch(() => {})
})

test('the stored photo URL is a public image on the staging storage host', async ({ request }) => {
  expect(photoUrl).toContain('https://wzxtqbqlahyahsnoqqva.supabase.co/storage/v1/object/public/listing-photos/')
  const res = await request.get(photoUrl)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/^image\//)
})

test('listing detail shows the photo under the site CSP (no CSP console error)', async ({ page }) => {
  const cspErrors = watchConsole(page)
  await withCsp(page, CSP_NOW)
  await page.goto(`/listing/${listingId}`)
  const img = page.locator(`img[src="${photoUrl}"]`).first()
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), { timeout: 15_000 }).toBe(true)
  expect(await img.evaluate((el) => el.naturalWidth)).toBe(64)
  expect(cspErrors, cspErrors.join('\n')).toEqual([])
  // Evidence screenshot only when asked (KS_SHOTS=<dir>).
  if (process.env.KS_SHOTS) await page.screenshot({ path: `${process.env.KS_SHOTS}/phase1-listing-photo-csp.png` })
})

test('control: with the OLD img-src the same photo is blocked (the test detects the bug)', async ({ page }) => {
  expect(CSP_OLD).not.toEqual(CSP_NOW)
  expect(/img-src[^;]*/.exec(CSP_OLD)[0]).not.toContain('supabase.co')
  expect(/img-src[^;]*/.exec(CSP_NOW)[0]).toContain('https://wzxtqbqlahyahsnoqqva.supabase.co')
  const cspErrors = watchConsole(page)
  await withCsp(page, CSP_OLD)
  await page.goto(`/listing/${listingId}`)
  const img = page.locator(`img[src="${photoUrl}"]`).first()
  await expect(img).toBeAttached()
  await expect.poll(() => cspErrors.some((e) => /img-src/.test(e) && e.includes('supabase.co')), { timeout: 15_000 }).toBe(true)
  expect(await img.evaluate((el) => el.naturalWidth)).toBe(0)
})
