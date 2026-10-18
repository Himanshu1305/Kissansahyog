// Batch 10D — homepage first-action positions + screenshots (baseline in Task A, compare in Task E).
//
// Usage: node scripts/batch10d/positions.mjs <baseURL> <outDir> [--no-shots] [--langs hi,en]
//   <outDir>/positions.json  per viewport (360x640, 412x915, 1280x720) and language: bounding box of
//     the H1, the visible "I need" / "I have" hero buttons, the visible free-registration pill, the
//     first InfoTile of the visible hero, entry-home-guide and home-open-strip. top/bottom are PAGE
//     coordinates (rect + scrollY at scroll 0); inFirstViewport = some part above the fold,
//     fullyInFirstViewport = bottom <= viewport height.
//   <outDir>/screens/home-<w>x<h>-<lang>-{first,full}.png  at 360x640, 412x915, 1024x768.
// Unthrottled, fresh logged-out context per viewport/language, service workers blocked,
// read at load + 3 s (the app re-renders the prerendered DOM with createRoot).
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--langs')
const BASE = (pos[0] || 'http://localhost:4173').replace(/\/$/, '')
const OUT = pos[1] || 'positions-out'
const SHOTS = !args.includes('--no-shots')
const li = args.indexOf('--langs')
const LANGS = li >= 0 ? args[li + 1].split(',') : ['hi', 'en']
const POS_VPS = [[360, 640], [412, 915], [1280, 720]]
const SHOT_VPS = [[360, 640], [412, 915], [1024, 768]]

const CTA = { hi: { need: 'मुझे कुछ चाहिए', have: 'मेरे पास कुछ है' }, en: { need: 'I need something', have: 'I have something' } }

async function open(browser, w, h, lang) {
  const mobile = w < 768
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' })
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ } }, lang)
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60_000 })
  await page.waitForTimeout(3000)
  return { ctx, page }
}

const browser = await chromium.launch()
const positions = { baseURL: BASE, date: new Date().toISOString(), note: 'top/bottom in page px at scroll 0; fold = viewport height', results: [] }
try {
  for (const lang of LANGS) {
    for (const [w, h] of POS_VPS) {
      const { ctx, page } = await open(browser, w, h, lang)
      const r = await page.evaluate(({ cta }) => {
        window.scrollTo(0, 0)
        const vis = (el) => { if (!el) return false; const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0 }
        const box = (el) => {
          if (!el) return null
          const b = el.getBoundingClientRect()
          return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), left: Math.round(b.left), width: Math.round(b.width), height: Math.round(b.height), inFirstViewport: b.top < innerHeight && b.bottom > 0, fullyInFirstViewport: b.top >= 0 && b.bottom <= innerHeight, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) }
        }
        const firstVisible = (els) => [...els].find(vis) || null
        const byText = (t) => firstVisible([...document.querySelectorAll('button, a')].filter((e) => (e.textContent || '').includes(t)))
        const heroRoots = [...document.querySelectorAll('section > div.md\\:hidden, section > div.hidden.md\\:flex')]
        const hero = heroRoots.find(vis) || null
        const tiles = hero ? hero.querySelector('div.mt-4.flex.flex-col') : null
        return {
          viewport: { width: innerWidth, height: innerHeight }, docHeight: document.documentElement.scrollHeight,
          heroInstance: hero ? (hero.classList.contains('md:hidden') ? 'mobile (md:hidden)' : 'desktop (hidden md:flex)') : null,
          h1: box(firstVisible(document.querySelectorAll('h1'))),
          heroHeadingVisible: box(hero ? hero.querySelector('h1, p.mt-3') : null),
          iNeed: box(byText(cta.need)),
          iHave: box(byText(cta.have)),
          freeRegistrationPill: box(firstVisible(document.querySelectorAll('[data-testid="hero-free-registration"]'))),
          firstInfoTile: box(tiles ? tiles.firstElementChild : null),
          entryHomeGuide: box(firstVisible(document.querySelectorAll('[data-testid="entry-home-guide"]'))),
          homeOpenStrip: box(firstVisible(document.querySelectorAll('[data-testid="home-open-strip"]'))),
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        }
      }, { cta: CTA[lang] })
      positions.results.push({ lang, ...r })
      console.log(`${lang} ${w}x${h}: h1 ${r.h1?.top} iNeed ${r.iNeed?.top}-${r.iNeed?.bottom} (${r.iNeed?.fullyInFirstViewport ? 'above' : 'below'} fold ${h}) iHave ${r.iHave?.top} pill ${r.freeRegistrationPill?.top} tile ${r.firstInfoTile?.top} guide ${r.entryHomeGuide?.top} strip ${r.homeOpenStrip?.top}`)
      await ctx.close()
    }
  }
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'positions.json'), JSON.stringify(positions, null, 2))

  if (SHOTS) {
    const dir = path.join(OUT, 'screens')
    fs.mkdirSync(dir, { recursive: true })
    for (const lang of LANGS) {
      for (const [w, h] of SHOT_VPS) {
        const { ctx, page } = await open(browser, w, h, lang)
        await page.screenshot({ path: path.join(dir, `home-${w}x${h}-${lang}-first.png`) })
        await page.screenshot({ path: path.join(dir, `home-${w}x${h}-${lang}-full.png`), fullPage: true })
        await ctx.close()
      }
    }
  }
} finally {
  await browser.close()
}
console.log('wrote', OUT)
