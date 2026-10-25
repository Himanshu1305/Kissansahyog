#!/usr/bin/env node
// Generates every brand image from the one source logo
// (design/kissansahyog-logo-source.jpg, 1280x1189, brown tile background):
//   public/brand/logo-{48,96,192,512}.{webp,png}  — the <Logo/> component
//   public/icons/*                                — apple-touch + PWA icons (192, 512, maskable)
// and the small tab icon, which is NOT the photo logo (unreadable at 32px) but a
// simple drawn mark — the saffron turban and the two wheat ears from the logo — on
// the same brown tile:
//   public/icons/favicon-{32,48}.png, public/icons/favicon.svg
// Run: npm run icons   (node scripts/gen-icons.mjs). Uses sharp only.
import sharp from 'sharp'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'design', 'kissansahyog-logo-source.jpg')
const BRAND = join(ROOT, 'public', 'brand')
const ICONS = join(ROOT, 'public', 'icons')
mkdirSync(BRAND, { recursive: true })
mkdirSync(ICONS, { recursive: true })

// The tile colour of the source artwork (sampled from its edges). Used to square
// the logo up and to pad the maskable icon.
const TILE = { r: 66, g: 31, b: 3, alpha: 1 }
const WIDTHS = [48, 96, 192, 512]

const done = (file) => console.log('wrote', file.slice(ROOT.length + 1).replaceAll('\\', '/'), `${Math.round(statSync(file).size / 1024)} KB`)

// Logo at its own aspect ratio, `width` px wide.
for (const width of WIDTHS) {
  const base = sharp(SRC).resize({ width, kernel: 'lanczos3' })
  const webp = join(BRAND, `logo-${width}.webp`)
  const png = join(BRAND, `logo-${width}.png`)
  await base.clone().webp({ quality: 86 }).toFile(webp)
  await base.clone().png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(png)
  done(webp); done(png)
}

// Square icon: the logo fitted inside `size`, scaled to `fill` of the square and
// centred on the tile colour. `round` cuts transparent rounded corners.
async function icon(name, size, { fill = 1, round = false } = {}) {
  const inner = Math.round(size * fill)
  const logo = await sharp(SRC).resize({ width: inner, height: inner, fit: 'contain', background: TILE, kernel: 'lanczos3' }).png().toBuffer()
  let img = sharp({ create: { width: size, height: size, channels: 4, background: TILE } })
    .composite([{ input: logo, gravity: 'centre' }])
  if (round) {
    const flat = await img.png().toBuffer()
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#fff"/></svg>`)
    img = sharp(flat).composite([{ input: mask, blend: 'dest-in' }])
  }
  const file = join(ICONS, name)
  await img.png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(file)
  done(file)
}

// Tab icon (Batch 7D): turban + wheat, drawn on a 64-unit grid with shapes big
// enough to survive 32px. Colours are the logo's: tile brown, turban saffron, wheat gold.
const grain = (x, y, angle) => `<ellipse cx="${x}" cy="${y}" rx="3.3" ry="5.6" transform="rotate(${angle} ${x} ${y})"/>`
const ear = (side) => {
  // One wheat ear curving up the side of the tile; `side` is -1 (left) or 1 (right).
  const x = (v) => 32 + side * v
  const rows = [[25, 51, 62], [26.5, 43, 38], [27, 35, 20], [26, 27, 6], [23.5, 20, -8]]
  return `<path d="M${x(13)} 59 Q${x(27)} 52 ${x(26)} 22" fill="none" stroke="#F2B21B" stroke-width="2.4" stroke-linecap="round"/>`
    + rows.map(([dx, y, a]) => grain(x(dx), y, side * a)).join('')
}
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#421F03"/>
  <g fill="#FFCB2E">${ear(-1)}${ear(1)}</g>
  <path d="M15 42C13 26 22 13 34 13c9 0 15 6 15 15 0 6-1 10-3 14z" fill="#F59A14"/>
  <path d="M38 15c2-7 8-10 14-8-1 5-1 10 2 14-5 2-10 1-13-2z" fill="#FFB52E"/>
  <path d="M15 42h31l1.500 6H13.500z" fill="#D9790A"/>
  <g fill="none" stroke="#B4610A" stroke-width="2.200" stroke-linecap="round">
    <path d="M19 37C22 27 30 20 41 19"/><path d="M27 39c3-7 9-11 19-12"/>
  </g>
</svg>
`
async function favicon(size) {
  const file = join(ICONS, `favicon-${size}.png`)
  await sharp(Buffer.from(MARK_SVG), { density: 72 * (size / 64) * 4 }).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(file)
  done(file)
}
await favicon(32)
await favicon(48)
writeFileSync(join(ICONS, 'favicon.svg'), MARK_SVG, 'utf8')
done(join(ICONS, 'favicon.svg'))

await icon('icon-192.png', 192, { round: true })
await icon('icon-512.png', 512, { round: true })
// iOS masks the icon itself and shows black behind transparency: keep it full-bleed.
await icon('apple-touch-icon.png', 180)
// Maskable: the whole logo sits inside the central 80% safe zone.
await icon('maskable-512.png', 512, { fill: 0.74 })
console.log('done')
