#!/usr/bin/env node
// Batch 8A — Android launcher icons + splash images, generated from the existing brand
// images in public/icons (sharp only; nothing is drawn by hand).
//   node scripts/android/gen-android-icons.mjs
//
// Launcher icon
//   mipmap-<density>/ic_launcher.png, ic_launcher_round.png   legacy icons (API 24–25)
//   mipmap-<density>/ic_launcher_foreground.png               adaptive foreground, 108dp canvas
//   values/ic_launcher_background.xml                         adaptive background colour
// The foreground is public/icons/maskable-512.png (the logo on its own brown tile) scaled to
// 80% of the 108dp canvas: the tile still covers the whole 72dp visible area and the artwork
// stays inside the 66dp safe zone. The background colour is that same tile brown, so the
// launcher's parallax never shows a seam.
//
// Splash
//   drawable/splash_logo.png            Android 12+ system splash icon (288dp canvas, logo
//                                       inside the 192dp circle), transparent
//   drawable*/splash.png                window background until the WebView paints: the logo
//                                       centred on --ks-bg (#FBFAF5)
import sharp from 'sharp'
import { mkdirSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res')
const MASKABLE = join(ROOT, 'public', 'icons', 'maskable-512.png')
const ROUNDED = join(ROOT, 'public', 'icons', 'icon-512.png')
const TILE = '#421F03' // tile colour of the logo artwork (scripts/gen-icons.mjs)
const SPLASH_BG = '#FBFAF5' // --ks-bg

if (!existsSync(RES)) { console.error('android/ project not found — run `npx cap add android` first'); process.exit(1) }

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const wrote = []
const out = async (img, file) => { await img.png({ compressionLevel: 9 }).toFile(file); wrote.push(`${file.slice(RES.length + 1).replaceAll('\\', '/')} ${Math.round(statSync(file).size / 1024)} KB`) }

for (const [name, scale] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${name}`)
  mkdirSync(dir, { recursive: true })
  // Legacy square icon (48dp): the rounded tile.
  const legacy = Math.round(48 * scale)
  await out(sharp(ROUNDED).resize(legacy, legacy, { kernel: 'lanczos3' }), join(dir, 'ic_launcher.png'))
  // Legacy round icon: the maskable artwork cut to a circle.
  const circle = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}" fill="#fff"/></svg>`)
  const sq = await sharp(MASKABLE).resize(legacy, legacy, { kernel: 'lanczos3' }).ensureAlpha().png().toBuffer()
  await out(sharp(sq).composite([{ input: circle, blend: 'dest-in' }]), join(dir, 'ic_launcher_round.png'))
  // Adaptive foreground (108dp canvas).
  const canvas = Math.round(108 * scale)
  const inner = Math.round(canvas * 0.8)
  const art = await sharp(MASKABLE).resize(inner, inner, { kernel: 'lanczos3' }).png().toBuffer()
  await out(sharp({ create: { width: canvas, height: canvas, channels: 4, background: TILE } }).composite([{ input: art, gravity: 'centre' }]), join(dir, 'ic_launcher_foreground.png'))
}

writeFileSync(join(RES, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${TILE}</color>\n</resources>\n`)
const adaptive = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`
mkdirSync(join(RES, 'mipmap-anydpi-v26'), { recursive: true })
writeFileSync(join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive)
writeFileSync(join(RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive)

// Android 12+ splash icon: 288dp canvas at xxhdpi, logo tile inside the 192dp circle.
{
  const canvas = 864
  const inner = Math.round(canvas * (192 / 288) / Math.SQRT2)
  const art = await sharp(ROUNDED).resize(inner, inner, { kernel: 'lanczos3' }).png().toBuffer()
  await out(sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: art, gravity: 'centre' }]), join(RES, 'drawable', 'splash_logo.png'))
}

// Window-background splash images: keep each existing file's pixel size, redraw its content.
for (const dir of readdirSync(RES).filter((d) => d.startsWith('drawable'))) {
  const file = join(RES, dir, 'splash.png')
  if (!existsSync(file)) continue
  const { width, height } = await sharp(file).metadata()
  const inner = Math.round(Math.min(width, height) * 0.36)
  const art = await sharp(ROUNDED).resize(inner, inner, { kernel: 'lanczos3' }).png().toBuffer()
  const buf = await sharp({ create: { width, height, channels: 3, background: SPLASH_BG } }).composite([{ input: art, gravity: 'centre' }]).png({ compressionLevel: 9 }).toBuffer()
  await out(sharp(buf), file)
}

console.log(wrote.join('\n'))
console.log(`OK — ${wrote.length} images written`)
