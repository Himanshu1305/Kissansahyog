// Batch 9 Phase 5C.4 — does the listing posted after the photo-upload drop carry its photo? (read-only)
import * as C from './lib5c.mjs'
C.memoryGuard()
const R = C.loadResults('network')
const { ctx, page } = await C.newPhone()
try {
  const photos = []
  page.on('request', (r) => { if (/listing-photos/.test(r.url())) photos.push(r.url().split('/listing-photos/')[1]) })
  await C.goto(page, '/listing/70517023-2484-415e-9bc3-dbb6356f3194', 3000)
  const imgs = await page.evaluate(() => [...document.querySelectorAll('img')].map((i) => i.getAttribute('src')).filter((s) => /listing-photos/.test(s || '')).length)
  const rec = R.results.find((x) => x.id === 'drop:post:photo')
  rec.detail.photoOnListingAfterRetry = { imgElements: imgs, photoRequests: photos.length }
  if (!(imgs > 0 || photos.length > 0)) { rec.status = 'RAN-FAILED'; rec.detail.photoNote = 'the listing posted after the retry has NO photo' }
  C.saveResults(R)
  C.log('photo check', JSON.stringify(rec.detail.photoOnListingAfterRetry), rec.status)
} finally { await ctx.close(); await C.closeBrowser() }
