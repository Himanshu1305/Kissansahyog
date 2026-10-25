#!/usr/bin/env node
// Batch 9 Phase 6.6 — Play Store app icon (512x512, 32-bit PNG) from the SAME source as the launcher icon.
//   node scripts/store/gen-store-icon.mjs
//
// The Android launcher icon (scripts/android/gen-android-icons.mjs) is an adaptive icon:
//   background = #421F03 (the logo's brown tile), foreground = public/icons/maskable-512.png
//   (logo at 74% of its square) scaled to 80% of the 108dp canvas. A launcher shows the central
//   72dp of that 108dp canvas, so the visible logo width is 0.74 x 0.80 x 108/72 = 88.8% of the icon.
// Here the same geometry is rendered straight from the original artwork
// (design/kissansahyog-logo-source.jpg, 1280x1189) so the 512 px store icon is sharper than an
// upscale of a mipmap. Full-bleed square, no transparency: Google Play applies its own rounded mask.
import sharp from 'sharp'
import { mkdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(ROOT, 'design', 'kissansahyog-logo-source.jpg')
const OUT_DIR = join(ROOT, 'docs', 'store', 'graphics')
const TILE = { r: 66, g: 31, b: 3, alpha: 1 } // #421F03, same as the launcher background
const SIZE = 512
const VISIBLE_FILL = 0.74 * 0.8 * (108 / 72) // 0.888

mkdirSync(OUT_DIR, { recursive: true })
const inner = Math.round(SIZE * VISIBLE_FILL)
const logo = await sharp(SRC).resize({ width: inner, height: inner, fit: 'contain', background: TILE, kernel: 'lanczos3' }).png().toBuffer()
const file = join(OUT_DIR, 'icon-512.png')
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: TILE } })
  .composite([{ input: logo, gravity: 'centre' }])
  .ensureAlpha()
  .png({ compressionLevel: 9 }) // keep RGBA (32-bit) as Play asks; no palette
  .toFile(file)
const m = await sharp(file).metadata()
console.log(JSON.stringify({ file: 'docs/store/graphics/icon-512.png', width: m.width, height: m.height, channels: m.channels, hasAlpha: m.hasAlpha, bytes: statSync(file).size }))
