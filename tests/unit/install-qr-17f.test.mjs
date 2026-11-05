// Batch 17F - the committed QR files really contain https://kissansahyog.com/install?s=qr.
// The test DECODES them (dev-only decoder: jsqr), it does not trust the generator.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import jsQR from 'jsqr'
import QRCode from 'qrcode'
import { INSTALL_QR_URL } from '../../src/lib/install/link.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const EXPECTED = 'https://kissansahyog.com/install?s=qr'

async function decode(input, opts) {
  const { data, info } = await sharp(input, opts).flatten({ background: '#ffffff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { result: jsQR(new Uint8ClampedArray(data), info.width, info.height), info }
}

test('the URL the app uses for the QR is the agreed one', () => {
  assert.equal(INSTALL_QR_URL, EXPECTED)
})

test('public/images/install-qr.svg decodes to exactly the install URL', async () => {
  const svg = await readFile(join(ROOT, 'public/images/install-qr.svg'))
  const { result } = await decode(svg, { density: 400 })
  assert.ok(result, 'the SVG QR could not be decoded')
  assert.equal(result.data, EXPECTED)
})

test('docs/review/batch17f/install-qr-print.png (1024 px) decodes to exactly the install URL', async () => {
  const file = join(ROOT, 'docs/review/batch17f/install-qr-print.png')
  const { result, info } = await decode(file)
  assert.equal(info.width, 1024)
  assert.equal(info.height, 1024)
  assert.ok(result, 'the print PNG could not be decoded')
  assert.equal(result.data, EXPECTED)
})

test('the SVG QR still decodes when it is shown small (168 px) as on the homepage', async () => {
  const svg = await readFile(join(ROOT, 'public/images/install-qr.svg'))
  const { result } = await decode(await sharp(svg, { density: 400 }).resize(168, 168, { kernel: 'nearest' }).png().toBuffer())
  assert.ok(result)
  assert.equal(result.data, EXPECTED)
})

test('QR settings: error correction H, quiet zone of 4 modules, dark on white, no logo - the committed SVG equals a fresh build with exactly those settings', async () => {
  const svg = await readFile(join(ROOT, 'public/images/install-qr.svg'), 'utf8')
  const fresh = await QRCode.toString(EXPECTED, { type: 'svg', errorCorrectionLevel: 'H', margin: 4, color: { dark: '#000000', light: '#ffffff' } })
  assert.equal(svg, fresh)
  // the quiet zone: viewBox is (modules + 8) wide and the first dark module starts at 4
  const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
  assert.ok(vb && vb[1] === vb[2], 'square viewBox')
  assert.match(svg, /d="M4 4/)
  // level H is not the default (M): the same URL at level M gives a smaller symbol
  const m = await QRCode.toString(EXPECTED, { type: 'svg', errorCorrectionLevel: 'M', margin: 4 })
  assert.ok(Number(svg.match(/viewBox="0 0 (\d+)/)[1]) > Number(m.match(/viewBox="0 0 (\d+)/)[1]), 'level H needs a bigger symbol than level M')
  assert.ok(!/<image|<text/i.test(svg), 'no logo or text inside the QR')
})
