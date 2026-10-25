// Batch 9 Phase 5C.3 — close-up evidence of the Browse listing-card clipping (font 1.5 and display "large").
//   node scripts/phase5c/display-cards.mjs
import * as C from './lib5c.mjs'
C.memoryGuard()
try {
  for (const [name, width, f] of [['cards-412-font1.0', 412, 1], ['cards-412-font1.5', 412, 1.5], ['cards-360-font1.0', 360, 1]]) {
    const { ctx, page } = await C.newPhone({ width, height: Math.round(width * 2.22), dsf: 2, lang: 'hi', geo: { lat: 23.8388, lng: 78.7378 } })
    await C.goto(page, '/browse', 3000)
    await page.evaluate((f) => { if (f === 1) return; const els = [...document.querySelectorAll('body, body *')]; const s = els.map((e) => [parseFloat(getComputedStyle(e).fontSize), getComputedStyle(e).lineHeight]); els.forEach((e, i) => { e.style.setProperty('font-size', s[i][0] * f + 'px', 'important'); if (s[i][1].endsWith('px')) e.style.setProperty('line-height', parseFloat(s[i][1]) * f + 'px', 'important') }) }, f)
    await page.waitForTimeout(500)
    const info = await page.evaluate(() => { const c = document.querySelector('[data-testid="listing-card"]'); if (!c) return null; c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); return { scrollW: c.scrollWidth, clientW: c.clientWidth } })
    await page.waitForTimeout(300)
    const ev = await C.shot(page, 'display/cards', name)
    C.log(name, JSON.stringify(info), ev)
    await ctx.close()
  }
} finally { await C.closeBrowser() }
