// Phase 8 screenshot capture. Run from project dir so playwright + sharp resolve:
//   node --env-file=.env scripts/shots.mjs
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'

const BASE = process.env.SHOTS_BASE || 'http://localhost:4173'
const OUT = 'docs/review/shots'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Ensure a logged-in test profile (for /post, which is auth-gated).
async function testProfile() {
  const phone = '9000000252'
  let { data } = await db.from('profiles').select('*').eq('phone', phone).maybeSingle()
  if (!data) {
    const { data: ins } = await db.from('profiles').insert({
      full_name: 'शॉट टेस्ट', phone, village_town: 'Khurai', pincode: '470117',
      latitude: 24.045, longitude: 78.33, preferred_language: 'hi',
      disclaimer_accepted_at: new Date().toISOString(), is_test_data: true,
    }).select('*').single()
    data = ins
  }
  return data
}

async function slice(page, name) {
  const buf = await page.screenshot({ fullPage: true })
  const meta = await sharp(buf).metadata()
  const W = meta.width, H = meta.height, TILE = 1100
  let i = 0
  for (let top = 0; top < H; top += TILE, i++) {
    const h = Math.min(TILE, H - top)
    await sharp(buf).extract({ left: 0, top, width: W, height: h })
      .resize({ width: Math.min(W, 1000) }).jpeg({ quality: 72 })
      .toFile(`${OUT}/${name}__${String(i).padStart(2, '0')}.jpg`)
  }
}

async function run() {
  const profile = await testProfile()
  const browser = await chromium.launch()

  for (const [vp, w, h] of [['d', 1280, 800], ['m', 375, 812]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    await ctx.addInitScript(([p]) => {
      localStorage.setItem('ks_session_v1', JSON.stringify(p))
      localStorage.setItem('ks_pincode', '470117')
    }, [profile])
    const page = await ctx.newPage()

    // homepage
    await page.goto(`${BASE}/`); await page.waitForTimeout(2500); await slice(page, `home-${vp}`)
    // mausam
    await page.goto(`${BASE}/mausam`); await page.waitForTimeout(2000); await slice(page, `mausam-${vp}`)
    // msp/gehun with a distant mandi search performed
    await page.goto(`${BASE}/msp/gehun`); await page.waitForTimeout(2000)
    try {
      await page.getByTestId('mandi-search').fill('Indore')
      await page.locator('button', { hasText: /Indore/ }).first().click({ timeout: 5000 })
      await page.getByTestId('mandi-search-result').waitFor({ timeout: 6000 })
    } catch { /* fall back: search a market that has wheat */
      try { await page.getByTestId('mandi-search').fill('a'); await page.locator('button', { hasText: /APMC|Khurai|Sagar/ }).first().click({ timeout: 4000 }); await page.getByTestId('mandi-search-result').waitFor({ timeout: 5000 }) } catch { /* ignore */ }
    }
    await page.waitForTimeout(500); await slice(page, `msp-gehun-${vp}`)

    // /post — Bhoosa (checkbox present) and Equipment (checkbox absent)
    for (const [cat, label] of [['bhusa', 'भूसा / पराली'], ['equipment', 'मशीन']]) {
      await page.goto(`${BASE}/post`); await page.waitForTimeout(800)
      try {
        await page.getByRole('button', { name: /आगे बढ़ें/ }).click({ timeout: 5000 })       // source → continue
        await page.getByRole('button', { name: /दे रहे हैं|Offer/ }).click({ timeout: 5000 })  // type → offer
        await page.getByRole('button', { name: new RegExp(label) }).click({ timeout: 5000 })   // category
        await page.waitForTimeout(1200)
      } catch (e) { console.log(`post ${cat} nav issue:`, e.message) }
      await slice(page, `post-${cat}-${vp}`)
    }

    // PWA install prompt (returning visit) — desktop + mobile
    await page.goto(`${BASE}/`); await page.waitForTimeout(500)
    await page.reload(); await page.waitForTimeout(800) // visit count >= 2
    await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt')))
    await page.waitForTimeout(600); await slice(page, `pwa-install-${vp}`)

    // बाज़ार dropdown with फसल सलाह (desktop only — mobile uses the hamburger)
    if (vp === 'd') {
      await page.goto(`${BASE}/`); await page.waitForTimeout(1000)
      try { await page.locator('button[aria-haspopup="menu"]').first().click({ timeout: 4000 }); await page.waitForTimeout(500) } catch { /* ignore */ }
      await slice(page, `bazaar-dropdown-${vp}`)
    }

    // /info showing the input-price tracker
    await page.goto(`${BASE}/info`); await page.waitForTimeout(1500); await slice(page, `info-${vp}`)

    await ctx.close()
  }
  await browser.close()

  const files = readdirSync(OUT).sort()
  console.log('SHOTS:')
  for (const f of files) console.log(`  ${f}  (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
