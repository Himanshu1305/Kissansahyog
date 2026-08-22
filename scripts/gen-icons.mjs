#!/usr/bin/env node
// Generates PWA icons (PNG) from an inline SVG wheat motif — no external font
// needed, so it renders identically everywhere. Run: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const GREEN = '#15803d'
const GRAIN = '#fbbf24'

// Wheat stalk centered in a `size` viewport. `pad` shrinks the motif (maskable
// safe zone). `bg` true => full-bleed background (maskable); false => rounded.
function svg(size, { bg, pad = 0 } = {}) {
  const c = size / 2
  const scale = (size - pad * 2) / 512
  const grains = []
  // stem
  grains.push(`<line x1="${c}" y1="${c + 150 * scale}" x2="${c}" y2="${c - 170 * scale}" stroke="${GRAIN}" stroke-width="${16 * scale}" stroke-linecap="round"/>`)
  // grain pairs along the stem
  for (let i = 0; i < 6; i++) {
    const y = c - 150 * scale + i * 55 * scale
    const rx = 34 * scale
    const ry = 15 * scale
    grains.push(`<g transform="translate(${c},${y})"><ellipse cx="${-26 * scale}" cy="0" rx="${rx}" ry="${ry}" fill="${GRAIN}" transform="rotate(35 ${-26 * scale} 0)"/><ellipse cx="${26 * scale}" cy="0" rx="${rx}" ry="${ry}" fill="${GRAIN}" transform="rotate(-35 ${26 * scale} 0)"/></g>`)
  }
  // top grain
  grains.push(`<ellipse cx="${c}" cy="${c - 175 * scale}" rx="${16 * scale}" ry="${40 * scale}" fill="${GRAIN}"/>`)

  const bgShape = bg
    ? `<rect width="${size}" height="${size}" fill="${GREEN}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${GREEN}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bgShape}${grains.join('')}</svg>`
}

async function render(name, size, opts) {
  await sharp(Buffer.from(svg(size, opts))).png().toFile(join(OUT, name))
  console.log('wrote', name)
}

await render('icon-192.png', 192, {})
await render('icon-512.png', 512, {})
await render('maskable-512.png', 512, { bg: true, pad: 64 })
await render('apple-touch-icon.png', 180, {})
await render('favicon-32.png', 32, {})
console.log('done')
