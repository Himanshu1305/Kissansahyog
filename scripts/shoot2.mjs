// Phase 8 screenshot self-review — homepage (desktop+mobile) + the new pages.
// Slices each into small readable tiles under /tmp/ks_shots for viewing.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOOT_URL || 'http://localhost:4173'
mkdirSync('/tmp/ks_shots', { recursive: true })
mkdirSync('docs/review', { recursive: true })
const browser = await chromium.launch()

async function shoot(path, name, vp, tileW, tileH, keepFull) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2200)
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  const png = await page.screenshot({ fullPage: true })
  if (keepFull) await sharp(png).toFile(`docs/review/${name}.png`)
  let img = sharp(png); const meta = await img.metadata(); let w = meta.width
  if (tileW && w > tileW) { img = sharp(await img.resize({ width: tileW }).toBuffer()); w = (await img.metadata()).width }
  const buf = await img.png().toBuffer(); const h = (await sharp(buf).metadata()).height
  const n = Math.min(6, Math.ceil(h / tileH))
  for (let i = 0; i < n; i++) {
    const top = i * tileH, hh = Math.min(tileH, h - top)
    await sharp(buf).extract({ left: 0, top, width: w, height: hh }).jpeg({ quality: 78 }).toFile(`/tmp/ks_shots/${name}-${i + 1}.jpg`)
  }
  console.log(`${name} ${path} sw=${m.sw} cw=${m.cw} tiles=${n}`)
  await ctx.close()
}

await shoot('/', 'home-desktop', { width: 1280, height: 800 }, 1000, 720, true)
await shoot('/', 'home-mobile', { width: 375, height: 812 }, 375, 900, true)
await shoot('/yojana', 'yojana', { width: 1280, height: 800 }, 1000, 720)
await shoot('/yojana/pm-kisan', 'scheme', { width: 1280, height: 800 }, 1000, 760)
await shoot('/yojana/mp', 'yojana-mp', { width: 1280, height: 800 }, 1000, 720)
await shoot('/videos', 'videos', { width: 1280, height: 800 }, 1000, 720)
await shoot('/drone-didi', 'drone', { width: 1280, height: 800 }, 1000, 760)
await shoot('/videos', 'videos-mobile', { width: 375, height: 812 }, 375, 900)

await browser.close()
console.log('done')
