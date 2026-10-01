// One-off screenshot capture for the Kisan Mela re-architecture review (Phase 9). Not a permanent test.
// Run: node --env-file=.env scripts/mela/shots.mjs   (needs vite preview on :4173)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = 'docs/review/shots'
mkdirSync(OUT, { recursive: true })

const ADMIN = { id: '2d6b13fe-40a9-42f0-903b-c5beb6617c94', full_name: 'Himanshu Dixit', phone: '9849993171', preferred_language: 'hi', disclaimer_accepted_at: '2026-01-01T00:00:00Z', is_admin: true }

const sizes = { desktop: { width: 1280, height: 800 }, mobile: { width: 375, height: 812 } }

const browser = await chromium.launch()

for (const [name, vp] of Object.entries(sizes)) {
  // Public /kisan-mela — full page + a framed crop of a multi-source card beside a single-source card.
  const ctx = await browser.newContext({ viewport: vp })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/kisan-mela`, { waitUntil: 'networkidle' })
  await page.getByTestId('mela-card').first().waitFor({ timeout: 15000 })
  await page.screenshot({ path: `${OUT}/kisan-mela-${name}.png`, fullPage: true })
  // Framed crop: the multi-source card (UAS Bengaluru) scrolled into view with a single-source neighbour.
  const multi = page.getByTestId('mela-card').filter({ has: page.getByTestId('mela-multi-source') }).first()
  await multi.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/kisan-mela-cards-${name}.png` }) // viewport crop around the cards
  await ctx.close()

  // Admin candidates-review panel — framed in the viewport (not a full-page dump).
  const actx = await browser.newContext({ viewport: vp })
  await actx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), ADMIN)
  const apage = await actx.newPage()
  await apage.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
  const row = apage.getByTestId('admin-mela-candidate-row').first()
  await row.waitFor({ timeout: 15000 }).catch(() => {})
  const panel = apage.locator('section').filter({ has: apage.getByTestId('admin-mela-candidate-row') }).first()
  await panel.scrollIntoViewIfNeeded().catch(() => {})
  await apage.waitForTimeout(400)
  await panel.screenshot({ path: `${OUT}/admin-candidates-${name}.png` }).catch(async () => {
    await apage.screenshot({ path: `${OUT}/admin-candidates-${name}.png` })
  })
  await actx.close()
  console.log(`captured ${name}`)
}

await browser.close()
console.log('done')
