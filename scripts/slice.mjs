// Slice tall full-page screenshots into readable tiles (<=1100px tall, jpg q80,
// well under 1MB) so the image viewer never chokes. Desktop downscaled to 1000w.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('/tmp/ks_shots', { recursive: true })

async function slice(src, prefix, targetW, tileH) {
  let img = sharp(src)
  const meta = await img.metadata()
  let w = meta.width, h = meta.height
  if (targetW && w > targetW) {
    img = sharp(await img.resize({ width: targetW }).toBuffer())
    const m2 = await img.metadata(); w = m2.width; h = m2.height
  }
  const buf = await img.png().toBuffer()
  const n = Math.ceil(h / tileH)
  for (let i = 0; i < n; i++) {
    const top = i * tileH
    const hh = Math.min(tileH, h - top)
    await sharp(buf).extract({ left: 0, top, width: w, height: hh }).jpeg({ quality: 80 }).toFile(`/tmp/ks_shots/${prefix}-${i + 1}.jpg`)
    console.log(`${prefix}-${i + 1}.jpg  ${w}x${hh}`)
  }
}

await slice('docs/review/home-desktop.png', 'desktop', 1000, 720)
await slice('docs/review/home-mobile.png', 'mobile', 375, 950)
console.log('done')
