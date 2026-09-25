// Phase 8 screenshots for /mausam, /msp, /msp/gehun, /msp/soyabean at 1280 + 375.
// Slices into readable tiles under /tmp/ks_shots and logs the live WhatsApp share text.
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
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 80)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 80)) })
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2500)
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  const share = await page.evaluate(() => { const a = document.querySelector('[data-share-text]'); return a ? a.getAttribute('data-share-text') : null })
  const png = await page.screenshot({ fullPage: true })
  if (keepFull) await sharp(png).toFile(`docs/review/${name}.png`)
  let img = sharp(png); let w = (await img.metadata()).width
  if (tileW && w > tileW) { img = sharp(await img.resize({ width: tileW }).toBuffer()); w = (await img.metadata()).width }
  const buf = await img.png().toBuffer(); const h = (await sharp(buf).metadata()).height
  const n = Math.min(7, Math.ceil(h / tileH))
  for (let i = 0; i < n; i++) { const top = i * tileH, hh = Math.min(tileH, h - top); await sharp(buf).extract({ left: 0, top, width: w, height: hh }).jpeg({ quality: 76 }).toFile(`/tmp/ks_shots/${name}-${i + 1}.jpg`) }
  console.log(`${name} ${path} sw=${m.sw} cw=${m.cw} tiles=${n}${errs.length ? ' ERR:' + errs.slice(0, 2).join('|') : ''}`)
  if (share) console.log(`   share[${name}]: ${JSON.stringify(share)}`)
  await ctx.close()
}

for (const [p, n] of [['/mausam', 'mausam'], ['/msp', 'msp'], ['/msp/gehun', 'msp-gehun'], ['/msp/soyabean', 'msp-soya']]) {
  await shoot(p, `${n}-d`, { width: 1280, height: 800 }, 1000, 740, true)
  await shoot(p, `${n}-m`, { width: 375, height: 812 }, 375, 900, false)
}
await browser.close()
console.log('done')
