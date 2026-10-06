#!/usr/bin/env node
// Generate Open Graph share images (1200×630 PNG) into public/og/.
// A branded default + one per hub page (§14.1). SVG → PNG via sharp.
//   node scripts/gen-og.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og')
mkdirSync(OUT, { recursive: true })

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// A 1200×630 card: green gradient, grain motif, brand + Hindi + English line.
function svg({ hi, en }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#166534"/><stop offset="1" stop-color="#14532d"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="0" y="0" width="1200" height="14" fill="#f59e0b"/>
  <text x="80" y="150" font-family="sans-serif" font-size="54" font-weight="bold" fill="#ffffff">🌾 किसान सहयोग · Kissan Sahyog</text>
  <text x="80" y="330" font-family="sans-serif" font-size="78" font-weight="bold" fill="#ffffff">${esc(hi)}</text>
  <text x="80" y="430" font-family="sans-serif" font-size="46" fill="#bbf7d0">${esc(en)}</text>
  <text x="80" y="560" font-family="sans-serif" font-size="36" fill="#d1fae5">kissansahyog.com · सागर, मध्य प्रदेश</text>
</svg>`
}

const CARDS = {
  'default':       { hi: 'किसानों के लिए मुफ़्त मंच', en: 'A free marketplace & knowledge hub for farmers' },
  'greenhouse':    { hi: 'ग्रीनहाउस / पॉलीहाउस', en: 'Greenhouse & polyhouse — subsidy, cost, vendors' },
  'carbon-credit': { hi: 'कार्बन क्रेडिट', en: 'Carbon credit for farmers — facts & policy' },
  'jugaad':        { hi: 'जुगाड़ / नवाचार', en: 'Rural innovations — support, safety & law' },
  'cold-storage':  { hi: 'कोल्ड स्टोरेज', en: 'MP Cold Storage Finder' },
  'sawaal':        { hi: 'किसान सवाल', en: 'Most-asked farmer questions, answered with sources' },
}

for (const [name, text] of Object.entries(CARDS)) {
  await sharp(Buffer.from(svg(text))).png().toFile(join(OUT, `${name}.png`))
  console.log(`og/${name}.png`)
}
console.log('OG images generated.')
