// Phase 6 screenshots — Sawaal grid, PWA banner, back buttons, ticker, agro-forestry depth.
//   node scripts/shots_0033.mjs   (preview on :4173)
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'

const BASE = 'http://localhost:4173'
const OUT = 'docs/review/shots-0033'
mkdirSync(OUT, { recursive: true })
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`)

async function full(page, name, maxTiles = 3) {
  const buf = await page.screenshot({ fullPage: true })
  const { width: W, height: H } = await sharp(buf).metadata()
  for (let top = 0, i = 0; top < H && i < maxTiles; top += 1100, i++) {
    const h = Math.min(1100, H - top)
    await sharp(buf).extract({ left: 0, top, width: W, height: h }).resize({ width: Math.min(W, 1000) }).jpeg({ quality: 74 }).toFile(`${OUT}/${name}__${i}.jpg`)
  }
}
const view = async (page, name) => { const b = await page.screenshot(); await sharp(b).resize({ width: 1000 }).jpeg({ quality: 78 }).toFile(`${OUT}/${name}.jpg`) }

async function run() {
  const br = await chromium.launch()
  for (const [vp, w, h] of [['d', 1280, 800], ['m', 375, 812]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h } })
    const p = await ctx.newPage()
    // 1) /sawaal grid
    await p.goto(`${BASE}/sawaal`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); await full(p, `sawaal-grid-${vp}`)
    // 2) homepage with PWA banner (fresh) + ticker
    await p.goto(`${BASE}/`); await p.waitForTimeout(1200); await full(p, `home-banner-ticker-${vp}`, 1)
    // ticker close-up (clip)
    {
      const tick = p.locator('[role=marquee]'); const box = await tick.boundingBox()
      if (box) { const b = await p.screenshot({ clip: { x: 0, y: Math.max(0, box.y - 2), width: Math.min(box.width, 1000), height: box.height + 4 } }); await sharp(b).toFile(`${OUT}/ticker-${vp}.png`) }
    }
    // 3) scheme detail with back button (direct URL → fallback path)
    await p.goto(`${BASE}/yojana/fal-podharopan-yojana`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); await view(p, `scheme-back-${vp}`)
    // 4) two other audited pages with back button
    await p.goto(`${BASE}/agro-forestry`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); await full(p, `agroforestry-${vp}`)
    await p.goto(`${BASE}/msp/gehun`, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); await view(p, `msp-back-${vp}`)
    await ctx.close()
  }
  // PWA standalone (banner hidden) + iOS (instructions) — desktop viewport is fine
  const st = await br.newContext({ viewport: { width: 1280, height: 800 } })
  await st.addInitScript(() => { const o = window.matchMedia.bind(window); window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false } } : o(q)) })
  const sp = await st.newPage(); await sp.goto(`${BASE}/`); await sp.waitForTimeout(800); await view(sp, 'pwa-standalone-hidden'); await st.close()
  const iosCtx = await br.newContext({ viewport: { width: 375, height: 812 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
  const ip = await iosCtx.newPage(); await ip.goto(`${BASE}/`); await ip.waitForTimeout(800)
  await ip.getByTestId('pwa-install-cta').click().catch(() => {}); await ip.waitForTimeout(300); await view(ip, 'pwa-ios-help'); await iosCtx.close()

  await br.close()
  for (const f of readdirSync(OUT).sort()) console.log(`  ${f} (${(statSync(`${OUT}/${f}`).size / 1024).toFixed(0)}KB)`)
}
run().catch((e) => { console.error(e); process.exit(1) })
