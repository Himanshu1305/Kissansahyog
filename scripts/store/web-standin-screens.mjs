#!/usr/bin/env node
// Batch 9 Phase 6.6 — phone screenshots 1080x2400 as WEB STAND-INS (no emulator this session: low PC memory).
//   node scripts/store/web-standin-screens.mjs [hi|en|all] [screenId,...]
//
// Source: the PUBLIC PRODUCTION website https://kissansahyog.com, logged out, no cookies, READ-ONLY:
// every request that is not GET/HEAD is aborted (nothing is written to prod), service workers blocked.
// Chromium phone context: 432x960 CSS px at deviceScaleFactor 2.5 = 1080x2400 px, isMobile, hasTouch,
// Sagar geolocation granted (so /mausam shows weather, as for a visitor who once allowed location).
// Language: localStorage ks_lang_v1 (src/lib/i18n/LanguageProvider.jsx) = the site's own toggle state.
// Install prompts pre-dismissed the way the site itself stores a dismissal (PwaInstallBanner.jsx /
// PwaPrompts.jsx); the Android app never shows them (isNative()).
// Each shot is REJECTED (deleted) if the visible viewport text contains KSTEST, a 10-digit mobile-like
// number, an offline banner, an install prompt, or a spinner/skeleton is still showing.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync, unlinkSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BASE = 'https://kissansahyog.com'
const OUT = join(ROOT, 'docs', 'store', 'graphics', 'screens')
const REPORT = join(OUT, 'screens-report.json')
const SAGAR = { latitude: 23.8388, longitude: 78.7378, accuracy: 30 }
const MAX_BYTES = 2 * 1024 * 1024

const SCREENS = [
  { id: '01-home', path: '/', ready: 'ticker' },
  { id: '02-msp', path: '/msp', ready: 'rupee' },
  { id: '03-mausam', path: '/mausam', ready: 'weather' },
  { id: '04-browse', path: '/browse', ready: 'generic' },
  { id: '05-yojana', path: '/yojana', ready: 'generic' },
  { id: '06-sawaal', path: '/sawaal', ready: 'generic' },
  { id: '07-cold-storage', path: '/cold-storage', ready: 'generic' },
  { id: '08-about', path: '/about', ready: 'generic' },
]

const langs = (process.argv[2] && process.argv[2] !== 'all') ? [process.argv[2]] : ['hi', 'en']
const only = process.argv[3] ? process.argv[3].split(',') : null

function stamp() { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` }
function heartbeat(what) { appendFileSync(join(ROOT, 'docs', 'review', 'batch9', 'HEARTBEAT.log'), `${stamp()} | phase6.6 | ${what}\n`) }
function memMb() { try { return Number(execSync('powershell -NoProfile -Command "(Get-Counter \'\\Memory\\Available MBytes\').CounterSamples.CookedValue"', { encoding: 'utf8', timeout: 20000 }).trim()) } catch { return null } }

const mb = memMb()
if (mb != null && mb < 300) { console.error(`memory guard: ${mb} MB available < 300 — not starting Chromium`); process.exit(3) }

const report = existsSync(REPORT) ? JSON.parse(readFileSync(REPORT, 'utf8')) : { source: BASE, note: 'WEB STAND-IN from the public production website, not the Android app', shots: {} }
const blocked = []

const browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--disable-dev-shm-usage', '--renderer-process-limit=1', '--disable-extensions'] })
try {
  for (const lang of langs) {
    mkdirSync(join(OUT, lang), { recursive: true })
    for (const s of SCREENS) {
      if (only && !only.includes(s.id)) continue
      heartbeat(`shot ${lang}/${s.id}`)
      const ctx = await browser.newContext({
        viewport: { width: 432, height: 960 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 KS-store-screenshot',
        locale: lang === 'en' ? 'en-IN' : 'hi-IN', timezoneId: 'Asia/Kolkata', colorScheme: 'light',
        geolocation: SAGAR, permissions: ['geolocation'], serviceWorkers: 'block',
      })
      // READ-ONLY guard: nothing but GET/HEAD leaves the browser.
      await ctx.route('**/*', (route) => {
        const m = route.request().method()
        if (m === 'GET' || m === 'HEAD') return route.continue()
        blocked.push(`${lang}/${s.id} ${m} ${route.request().url().slice(0, 120)}`)
        return route.abort()
      })
      await ctx.addInitScript((l) => {
        try { localStorage.setItem('ks_lang_v1', l); localStorage.setItem('ks_install_dismissed_at', String(Date.now())); sessionStorage.setItem('ks_install_banner_dismissed', '1') } catch { /* */ }
      }, lang)
      const page = await ctx.newPage()
      const rec = { lang, id: s.id, url: BASE + s.path, at: new Date().toISOString() }
      try {
        await page.goto(BASE + s.path, { waitUntil: 'load', timeout: 60000 })
        await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {})
        if (s.ready === 'ticker') rec.ready = await page.waitForFunction(() => { const m = document.querySelector('[role="marquee"]'); return m && /₹\s?\d/.test(m.textContent || '') }, null, { timeout: 30000 }).then(() => true).catch(() => false)
        else if (s.ready === 'rupee') rec.ready = await page.waitForFunction(() => /₹\s?\d/.test(document.querySelector('main')?.innerText || ''), null, { timeout: 30000 }).then(() => true).catch(() => false)
        else if (s.ready === 'weather') {
          let banner = await page.waitForSelector('[data-testid="location-banner"]', { timeout: 15000 }).then(() => true).catch(() => false)
          if (!banner) { const sh = page.getByTestId('location-share'); if (await sh.isVisible().catch(() => false)) await sh.click().catch(() => {}); banner = await page.waitForSelector('[data-testid="location-banner"]', { timeout: 15000 }).then(() => true).catch(() => false) }
          const temp = await page.waitForFunction(() => /-?\d{1,2}(\.\d)?\s?°/.test(document.querySelector('main')?.innerText || ''), null, { timeout: 40000 }).then(() => true).catch(() => false)
          rec.ready = banner && temp
        } else rec.ready = await page.waitForFunction(() => (document.querySelector('main')?.innerText || '').trim().length > 150, null, { timeout: 30000 }).then(() => true).catch(() => false)
        // No spinners / skeletons left.
        rec.spinnerGone = await page.waitForFunction(() => ![...document.querySelectorAll('.animate-spin,.animate-pulse,[aria-busy="true"]')].some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight }), null, { timeout: 20000 }).then(() => true).catch(() => false)
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(1500) // ticker/images settle
        const vis = await page.evaluate(() => {
          const out = []
          const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
          let n
          while ((n = w.nextNode())) {
            const t = n.textContent.trim(); if (!t) continue
            const p = n.parentElement; if (!p) continue
            const cs = getComputedStyle(p); if (cs.visibility === 'hidden' || cs.display === 'none') continue
            const rg = document.createRange(); rg.selectNodeContents(n)
            const r = rg.getBoundingClientRect()
            if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) out.push(t)
          }
          return { text: out.join(' | '), htmlLang: document.documentElement.lang, title: document.title }
        })
        const t = vis.text
        rec.htmlLang = vis.htmlLang
        rec.title = vis.title
        rec.textSample = t.slice(0, 300)
        const problems = []
        if (/KSTEST/i.test(t)) problems.push('KSTEST text visible')
        const phones = t.match(/(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g)
        if (phones) problems.push(`mobile-like number visible (${phones.length})`)
        if (/ऑफ़लाइन|ऑफलाइन|offline/i.test(t)) problems.push('offline text visible')
        // "installments" (Yojana card) is not an install prompt: match the word only.
        if (/इंस्टॉल|\binstall\b|होम स्क्रीन पर जोड़ें|add to home/i.test(t)) problems.push('install prompt text visible')
        if (/cookie|कुकी/i.test(t)) problems.push('cookie text visible')
        if (!rec.ready) problems.push('content not ready (timeout)')
        if (!rec.spinnerGone) problems.push('spinner/skeleton still visible')
        if (lang === 'en' && /[ऀ-ॿ]{3,}/.test(t) && !/[A-Za-z]{4,}/.test(t)) problems.push('English mode shows no English')
        rec.devanagariShare = Math.round(100 * (t.match(/[ऀ-ॿ]/g) || []).length / Math.max(1, (t.match(/[ऀ-ॿA-Za-z]/g) || []).length))
        const file = join(OUT, lang, `${s.id}.png`)
        const raw = await page.screenshot({ type: 'png' })
        await sharp(raw).removeAlpha().png({ compressionLevel: 9 }).toFile(file)
        let size = statSync(file).size
        if (size > MAX_BYTES) { await sharp(raw).removeAlpha().png({ palette: true, quality: 95, compressionLevel: 9 }).toFile(file + '.tmp'); const s2 = statSync(file + '.tmp').size; if (s2 < size) { writeFileSync(file, readFileSync(file + '.tmp')); size = s2; rec.optimized = 'palette q95' } unlinkSync(file + '.tmp') }
        const m = await sharp(file).metadata()
        rec.width = m.width; rec.height = m.height; rec.bytes = size; rec.overLimit = size > MAX_BYTES
        rec.problems = problems
        if (problems.length) { unlinkSync(file); rec.status = 'REJECTED-AUTO' } else rec.status = 'KEPT-PENDING-VISUAL-CHECK'
      } catch (e) {
        rec.status = 'ERROR'; rec.error = String(e.message || e).slice(0, 300)
      }
      report.shots[`${lang}/${s.id}`] = rec
      console.log(JSON.stringify({ shot: `${lang}/${s.id}`, status: rec.status, problems: rec.problems, bytes: rec.bytes, lang: rec.htmlLang, dev: rec.devanagariShare }))
      await ctx.close()
    }
  }
} finally {
  await browser.close()
  report.blockedNonGet = [...new Set([...(report.blockedNonGet || []), ...blocked])].slice(0, 200)
  report.updatedAt = new Date().toISOString()
  writeFileSync(REPORT, JSON.stringify(report, null, 1) + '\n')
}
