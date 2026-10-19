// Batch 11A Phase 4 — /login and /signup at 320/412/768/1280 (hi + en): no horizontal scroll, mobile box above e-mail on
// /login, screenshots to evidence/screens/. Logged out, no data written.
//   node scripts/batch11a/widths.mjs <baseURL>
import { chromium } from 'playwright'
const OUT = 'docs/review/batch11a/evidence/screens'
const b = await chromium.launch(); const lines = []; let bad = 0
try {
  for (const lang of ['hi', 'en']) for (const w of [320, 412, 768, 1280]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 768, hasTouch: w < 768, serviceWorkers: 'block' })
    await c.addInitScript((l) => localStorage.setItem('ks_lang_v1', l), lang)
    const p = await c.newPage()
    for (const path of ['/login', '/signup']) {
      await p.goto(process.argv[2] + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(500)
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      let order = ''
      if (path === '/login') {
        const ph = await p.getByTestId('login-phone-card').boundingBox(); const em = await p.locator('input[type=email]').first().boundingBox()
        const first = w < 768 ? ph.y < em.y : (ph.y < em.y || ph.x < em.x)
        order = ` mobileFirst=${first}`; if (!first) bad++
      }
      if (o > 0) bad++
      lines.push(`${lang} ${w} ${path} overflowX=${o}${order}`)
      if (lang === 'hi' || w === 320) await p.screenshot({ path: `${OUT}/phase4${path.replace('/', '-')}-${w}-${lang}.png`, fullPage: true })
    }
    await c.close()
  }
} finally { await b.close() }
console.log(lines.join('\n')); console.log(bad ? `WIDTHS: ${bad} problem(s)` : 'WIDTHS: OK (no horizontal scroll, mobile box first)')
process.exitCode = bad ? 1 : 0
