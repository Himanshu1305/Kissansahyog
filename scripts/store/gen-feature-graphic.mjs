#!/usr/bin/env node
// Batch 9 Phase 6.6 — Play Store feature graphic, 1024x500, 24-bit PNG (no alpha), Hindi + English.
//   node scripts/store/gen-feature-graphic.mjs
// Rendered by headless Chromium (Playwright) so Devanagari is shaped by HarfBuzz with the site's own
// font files (public/fonts/noto-sans-devanagari-*.woff2, same @font-face as src/index.css).
// Colours: logo tile brown #421F03 (scripts/gen-icons.mjs), saffron/yellow of the logo and the site
// tokens --ks-saffron #E69A2D / --ks-green #24733F (src/index.css). The logo is the original artwork
// design/kissansahyog-logo-source.jpg. The script checks that no text overflows its box.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { readFileSync, statSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'docs', 'store', 'graphics')
mkdirSync(OUT, { recursive: true })
// Fonts inlined as data: URLs (a setContent page cannot load file:// fonts).
const font = (w, sub) => 'data:font/woff2;base64,' + readFileSync(join(ROOT, 'public', 'fonts', `noto-sans-devanagari-${sub}-${w}-normal.woff2`)).toString('base64')
const logo = 'data:image/jpeg;base64,' + readFileSync(join(ROOT, 'design', 'kissansahyog-logo-source.jpg')).toString('base64')

const VARIANTS = {
  hi: { lang: 'hi', name: 'किसान सहयोग', line1: 'खेती का भाव, मौसम और सहयोग', line2: '— एक ही जगह', chips: ['मंडी भाव', 'मौसम', 'MSP', 'योजनाएँ', 'सवाल-जवाब'] },
  en: { lang: 'en', name: 'Kissan Sahyog', line1: 'Mandi prices, weather', line2: 'and help — in one place', chips: ['Mandi', 'Weather', 'MSP', 'Schemes', 'Q&A'] },
}

const faces = [400, 600, 700, 800].map((w) => `
@font-face{font-family:'NSD';font-weight:${w};src:url('${font(w, 'devanagari')}') format('woff2');unicode-range:U+0900-097F,U+1CD0-1CFF,U+A8E0-A8FF,U+2014;}
@font-face{font-family:'NSD';font-weight:${w};src:url('${font(w, 'latin')}') format('woff2');unicode-range:U+0000-00FF;}`).join('')

const html = (v) => `<!doctype html><html lang="${v.lang}"><head><meta charset="utf-8"><style>${faces}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1024px;height:500px;overflow:hidden}
body{font-family:'NSD',sans-serif;background:radial-gradient(ellipse at 28% 50%,#5a2c08 0%,#421F03 55%,#2e1502 100%);color:#fff;display:flex;align-items:center;}
.logo{width:470px;height:500px;display:flex;align-items:center;justify-content:center;flex:none}
.logo img{width:452px;height:auto;display:block;-webkit-mask-image:radial-gradient(ellipse 72% 72% at 50% 50%,#000 78%,transparent 100%)}
.text{flex:1;min-width:0;padding:0 44px 0 6px;}
.name{font-weight:800;font-size:58px;line-height:1.35;color:#FFCB2E;letter-spacing:.5px}
.tag{margin-top:10px;font-weight:700;font-size:36px;line-height:1.5;color:#fff}
.tag span{display:block;white-space:nowrap}
.chips{margin-top:26px;display:flex;flex-wrap:nowrap;gap:8px}
.chip{font-weight:600;font-size:19px;line-height:1.5;padding:3px 11px 4px;white-space:nowrap;border-radius:999px;background:#24733F;color:#fff;border:2px solid #3f9a5c}
.bar{position:absolute;left:0;right:0;bottom:0;height:10px;background:linear-gradient(90deg,#E69A2D,#FFCB2E,#24733F)}
</style></head><body>
<div class="logo"><img src="${logo}" alt=""></div>
<div class="text" id="text">
  <div class="name" id="name">${v.name}</div>
  <div class="tag" id="tag"><span id="l1">${v.line1}</span><span id="l2">${v.line2}</span></div>
  <div class="chips" id="chips">${v.chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div>
</div>
<div class="bar"></div>
</body></html>`

const browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--renderer-process-limit=1'] })
try {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 })
  // Offline render: block everything that is not a local file or data: URL.
  await ctx.route('**/*', (r) => (/^(file|data):/.test(r.request().url()) ? r.continue() : r.abort()))
  const page = await ctx.newPage()
  for (const [key, v] of Object.entries(VARIANTS)) {
    await page.setContent(html(v), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const check = await page.evaluate(() => {
      const box = (id) => { const rg = document.createRange(); rg.selectNodeContents(document.getElementById(id)); const r = rg.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom } }
      const over = ['name', 'l1', 'l2', 'chips'].map((id) => { const e = document.getElementById(id); return { id, sw: e.scrollWidth, cw: e.clientWidth, ...box(id) } })
      const fontsOk = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family}/${f.weight}`)
      return { over, fontsOk, textBox: box('text') }
    })
    const problems = check.over.filter((o) => o.sw > o.cw + 1 || o.r > 1024 - 20 || o.b > 500 - 14 || o.t < 8)
    const png = await page.screenshot({ type: 'png' })
    const file = join(OUT, `feature-graphic-${key}.png`)
    await sharp(png).flatten({ background: '#421F03' }).removeAlpha().png({ compressionLevel: 9 }).toFile(file)
    const m = await sharp(file).metadata()
    console.log(JSON.stringify({ file: `docs/store/graphics/feature-graphic-${key}.png`, width: m.width, height: m.height, channels: m.channels, hasAlpha: m.hasAlpha, bytes: statSync(file).size, fontsLoaded: check.fontsOk, overflow: problems }))
    if (problems.length) process.exitCode = 2
  }
} finally { await browser.close() }
