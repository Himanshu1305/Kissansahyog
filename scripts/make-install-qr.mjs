#!/usr/bin/env node
// Batch 17F - make the install QR code ONCE (dev-only; nothing here runs on the website).
//   node scripts/make-install-qr.mjs
// Writes:
//   public/images/install-qr.svg                    - crisp at any size, shown on the site (>= 768 px)
//   docs/review/batch17f/install-qr-print.png       - 1024 px, for printing cards
// Settings (see docs/review/batch17f/DECISIONS.md): error correction H (30 % can be damaged),
// quiet zone of 4 modules, dark (#000) on white (#fff), no logo inside.
// The `qrcode` package is already a dependency of the site (WhatsAppQR); nothing new at run time.
import QRCode from 'qrcode'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const INSTALL_QR_URL = 'https://kissansahyog.com/install?s=qr'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const opts = { errorCorrectionLevel: 'H', margin: 4, color: { dark: '#000000', light: '#ffffff' } }

const svg = await QRCode.toString(INSTALL_QR_URL, { ...opts, type: 'svg' })
await mkdir(join(ROOT, 'public/images'), { recursive: true })
await writeFile(join(ROOT, 'public/images/install-qr.svg'), svg)

await mkdir(join(ROOT, 'docs/review/batch17f'), { recursive: true })
await QRCode.toFile(join(ROOT, 'docs/review/batch17f/install-qr-print.png'), INSTALL_QR_URL, { ...opts, type: 'png', width: 1024 })

console.log(`QR for ${INSTALL_QR_URL}`)
console.log('  public/images/install-qr.svg')
console.log('  docs/review/batch17f/install-qr-print.png (1024 px)')
