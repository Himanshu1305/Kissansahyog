// Batch 9 Phase 5C.3 — text and display settings, WEB STAND-IN (staging website, headless Chromium), not the app.
//   node scripts/phase5c/display.mjs --variant base|f13|f15|f15en|large|large15|dark|en
//
// How the Android settings are simulated (stated in CONDITIONS.md):
//  * font_scale 1.3 / 1.5 — Android WebView scales text by the system font scale (WebSettings textZoom), which
//    multiplies every computed font-size (px and rem alike) but not box sizes. Simulated by taking every
//    element's computed font-size (and px line-height) after the page settled and re-applying it × factor as an
//    inline style (re-applied after each Post step). A root-font-size change alone would miss px-sized text
//    (text-[13px] etc.) and would also grow rem paddings, which textZoom does not do.
//  * display size "large" — a bigger density makes the CSS viewport narrower: 412 → 360 CSS px wide
//    (Pixel-7-class phone at "Large"), deviceScaleFactor 3.
//  * dark mode — colorScheme 'dark' (prefers-color-scheme). The app has no dark styles and targets SDK 36
//    without algorithmic darkening, so the expectation is "page stays fully light and readable".
//  * phone language — browser locale hi-IN / en-IN (+ the app's own language switch ks_lang_v1).
import * as C from './lib5c.mjs'
import { fillStep2 } from '../phase5b/listings.mjs'

const VARIANTS = {
  base: { label: 'default (font 1.0, 412 CSS px, light, hi)', font: 1, width: 412, dsf: 2.625, lang: 'hi', locale: 'hi-IN' },
  f13: { label: 'font_scale 1.3 (hi)', font: 1.3, width: 412, dsf: 2.625, lang: 'hi', locale: 'hi-IN' },
  f15: { label: 'font_scale 1.5 (hi)', font: 1.5, width: 412, dsf: 2.625, lang: 'hi', locale: 'hi-IN' },
  f15en: { label: 'font_scale 1.5 (en, en-IN)', font: 1.5, width: 412, dsf: 2.625, lang: 'en', locale: 'en-IN' },
  large: { label: 'display size large (360 CSS px)', font: 1, width: 360, dsf: 3, lang: 'hi', locale: 'hi-IN' },
  large15: { label: 'display size large + font_scale 1.5 (worst case)', font: 1.5, width: 360, dsf: 3, lang: 'hi', locale: 'hi-IN' },
  dark: { label: 'dark mode forced (prefers-color-scheme: dark)', font: 1, width: 412, dsf: 2.625, lang: 'hi', locale: 'hi-IN', dark: true },
  en: { label: 'phone language English (en-IN) + app English', font: 1, width: 412, dsf: 2.625, lang: 'en', locale: 'en-IN' },
}
const LISTING = '/listing/76e13f41-f2eb-4565-998a-5244640329b7' // KEEP P1 labour offer (read-only)
const PRIMARY = {
  '/': [], '/mausam': [], '/browse': [], [LISTING]: ['[data-testid="contact-call"]'],
  '/signup': ['[data-testid="signup-form"] button[type="submit"]'], '/login': ['[data-testid="login-phone-submit"]', '[data-testid="login-email-submit"]'],
  '/home': [], 'post-1': ['[data-testid="post-next"]'], 'post-2': ['[data-testid="post-next"]'], 'post-3': ['[data-testid="post-submit"]'], '/profile': [],
}

const vname = C.arg('variant', 'base')
const V = VARIANTS[vname]
if (!V) throw new Error('unknown variant ' + vname)
const R = C.loadResults('display')

async function applyFont(page, f) {
  await page.evaluate((f) => {
    for (const el of document.querySelectorAll('[data-ks-zoom]')) { el.style.removeProperty('font-size'); el.style.removeProperty('line-height'); delete el.dataset.ksZoom }
    if (f === 1) return
    const els = [...document.querySelectorAll('body, body *')]
    const snap = els.map((e) => { const cs = getComputedStyle(e); return [parseFloat(cs.fontSize), cs.lineHeight] })
    els.forEach((e, i) => {
      e.style.setProperty('font-size', `${snap[i][0] * f}px`, 'important')
      if (snap[i][1].endsWith('px')) e.style.setProperty('line-height', `${parseFloat(snap[i][1]) * f}px`, 'important')
      e.dataset.ksZoom = '1'
    })
  }, f)
  await page.waitForTimeout(400)
}

async function measure(page, primarySel) {
  return page.evaluate((primarySel) => {
    const W = window.innerWidth, H = window.innerHeight
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 }
    const desc = (el) => `${el.tagName.toLowerCase()}${el.dataset.testid ? `[${el.dataset.testid}]` : ''}${el.id ? '#' + el.id : ''} "${(el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`
    // 1. horizontal page scroll
    const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    const wide = []
    if (docW > W + 1) for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > W + 1 && r.width > 0 && el.children.length === 0) wide.push(`${desc(el)} right=${Math.round(r.right)}`); if (wide.length >= 6) break }
    // 2. clipped text: element hides overflow and its text is wider/taller than the box (not an intended ellipsis)
    const clipped = []
    for (const el of document.querySelectorAll('button, a, label, h1, h2, h3, p, span, div, li, td')) {
      if (!vis(el) || !(el.innerText || '').trim()) continue
      const cs = getComputedStyle(el)
      const hides = /hidden|clip/.test(cs.overflowX + cs.overflowY)
      if (!hides || cs.textOverflow === 'ellipsis' || /line-clamp/.test(el.className) || cs.webkitLineClamp !== 'none') continue
      // intended scrolling marquee (mandi ticker): a descendant is animated
      if ([...el.querySelectorAll('*')].slice(0, 30).some((d) => getComputedStyle(d).animationName !== 'none')) continue
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
        if (el.querySelector('img, svg, canvas, video, iframe') && el.scrollWidth <= el.clientWidth + 2) continue
        if (/overflow-x-auto|overflow-auto|overflow-y-auto|scroll/.test(cs.overflowX + cs.overflowY + el.className)) continue
        clipped.push(`${desc(el)} ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`)
      }
      if (clipped.length >= 8) break
    }
    // 3. bottom nav: at maximum scroll, no visible control or text may sit behind the fixed bottom bar
    const navs = [...document.querySelectorAll('body *')].filter((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.position === 'fixed' && r.height > 20 && r.height < 160 && Math.abs(r.bottom - H) < 3 && r.width > W * 0.8 && vis(el) })
    const nav = navs[0] || null
    window.scrollTo(0, document.documentElement.scrollHeight)
    const behind = []
    if (nav) {
      const nr = nav.getBoundingClientRect()
      for (const el of document.querySelectorAll('main a, main button, main input, main select, main textarea, main p, main h1, main h2, main h3, main label, footer a')) {
        if (nav.contains(el) || !vis(el)) continue
        const r = el.getBoundingClientRect()
        if (r.bottom > nr.top + 2 && r.top < nr.bottom) behind.push(`${desc(el)} top=${Math.round(r.top)} navTop=${Math.round(nr.top)}`)
        if (behind.length >= 6) break
      }
    }
    window.scrollTo(0, 0)
    // 4. tap targets < 44x44 CSS px (inline text links inside a sentence are exempt, as in WCAG 2.5.8)
    const small = []
    let tappables = 0
    for (const el of document.querySelectorAll('a[href], button, select, input:not([type=hidden]), textarea, [role=button], summary')) {
      if (!vis(el)) continue
      let box = el
      if (el.matches('input[type=checkbox], input[type=radio]')) box = el.closest('label') || el
      const cs = getComputedStyle(el)
      if (el.tagName === 'A' && cs.display === 'inline') {
        const p = el.parentElement
        const own = [...p.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 2)
        if (own.length) continue
      }
      tappables++
      const r = box.getBoundingClientRect()
      if (r.width < 44 - 0.5 || r.height < 44 - 0.5) small.push(`${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    // 5. primary buttons reachable (scrolled into view, on top, not under the bottom bar)
    const primary = []
    for (const sel of primarySel) {
      const el = document.querySelector(sel)
      if (!el) { primary.push({ sel, found: false }); continue }
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const top = document.elementFromPoint(cx, cy)
      const navTop = nav ? nav.getBoundingClientRect().top : H
      primary.push({ sel, found: true, onTop: !!top && (top === el || el.contains(top)), inView: r.top >= 0 && r.bottom <= navTop + 1 && r.left >= 0 && r.right <= W + 1, size: `${Math.round(r.width)}x${Math.round(r.height)}` })
    }
    window.scrollTo(0, 0)
    const bodyBg = getComputedStyle(document.body).backgroundColor
    const darkEls = [...document.querySelectorAll('main *')].filter((el) => { const m = getComputedStyle(el).backgroundColor.match(/\d+/g); return m && Number(m[3] ?? 1) !== 0 && (Number(m[0]) + Number(m[1]) + Number(m[2])) / 3 < 40 && el.getBoundingClientRect().width > W * 0.5 }).length
    return { W, docW, hScroll: docW > W + 1, wide, clipped, navFound: !!nav, behind, tappables, small, primary, bodyBg, darkBlocks: darkEls }
  }, primarySel)
}

async function check(page, diag, key, label) {
  const id = `${vname}:${key}`
  await applyFont(page, V.font)
  const m = await measure(page, PRIMARY[key] || [])
  const primaryBad = m.primary.filter((p) => !p.found || !p.onTop || !p.inView)
  const st = await C.pageState(page)
  const problems = []
  if (m.hScroll) problems.push('horizontal page scroll')
  if (m.clipped.length) problems.push('clipped text')
  if (m.behind.length) problems.push('content behind bottom nav')
  if (m.small.length) problems.push(`${m.small.length} tap targets < 44x44`)
  if (primaryBad.length) problems.push('primary button not reachable')
  if (st.errorBoundary || st.textLength < 100) problems.push('no real content / ErrorBoundary')
  if (V.dark && m.darkBlocks) problems.push('partial dark rendering')
  let evidence = null
  if (problems.length) evidence = await C.shot(page, `display/${vname}`, key.replace(/[^a-z0-9]+/gi, '_') || 'root')
  C.record(R, {
    id, variant: vname, page: key, title: `${label} — ${V.label}`,
    status: problems.length ? 'RAN-FAILED' : 'RAN-PASSED',
    detail: { problems, ...m, primary: m.primary, h1: st.h1, console: diag.console.slice(0, 3) },
    evidence,
  })
  C.saveResults(R)
}

C.memoryGuard()
C.heartbeat(`5C.3 display variant ${vname}`)
const opts = { width: V.width, height: Math.round(V.width * 2.22), dsf: V.dsf, locale: V.locale, lang: V.lang, colorScheme: V.dark ? 'dark' : 'light', geo: { lat: 23.8388, lng: 78.7378 } }
try {
  // logged out
  {
    const { ctx, page, diag } = await C.newPhone(opts)
    for (const [path, label] of [['/', 'Homepage (/)'], ['/mausam', 'Mausam'], ['/browse', 'Browse'], [LISTING, 'Listing detail'], ['/signup', 'Signup (not submitted)'], ['/login', 'Login']]) {
      try { await C.goto(page, path, 2500); await check(page, diag, path, label) } catch (e) { C.record(R, { id: `${vname}:${path}`, variant: vname, page: path, title: label, status: 'RAN-FAILED', detail: { error: String(e.message).split('\n')[0] } }); C.saveResults(R) }
    }
    await ctx.close()
  }
  // logged in as KEEP P2 (read-only: Post is never submitted)
  {
    const ss = await C.keepSession('P2')
    const { ctx, page, diag } = await C.newPhone({ ...opts, storageState: ss })
    for (const [path, label] of [['/home', 'Home (/home)'], ['/profile', 'Profile']]) {
      try { await C.goto(page, path, 2500); await check(page, diag, path, label) } catch (e) { C.record(R, { id: `${vname}:${path}`, variant: vname, page: path, title: label, status: 'RAN-FAILED', detail: { error: String(e.message).split('\n')[0] } }); C.saveResults(R) }
    }
    try {
      await C.goto(page, '/post', 1500)
      await page.click('[data-testid="post-cat-labor"]'); await page.click('[data-testid="post-type-offer"]')
      await check(page, diag, 'post-1', 'Post step 1/3')
      await applyFont(page, 1)
      await page.click('[data-testid="post-next"]')
      await page.waitForSelector('[data-testid="post-source-farmer"]', { timeout: 20000 })
      await page.click('[data-testid="post-source-farmer"]').catch(() => {})
      await fillStep2(page, 'KSTEST-5C display (never submitted)')
      await check(page, diag, 'post-2', 'Post step 2/3 (filled)')
      await applyFont(page, 1)
      await page.click('[data-testid="post-next"]')
      await page.waitForSelector('[data-testid="post-submit"]', { timeout: 20000 })
      await check(page, diag, 'post-3', 'Post step 3/3 (NOT submitted)')
    } catch (e) { C.record(R, { id: `${vname}:post-flow`, variant: vname, page: 'post', title: 'Post 3 steps', status: 'RAN-FAILED', detail: { error: String(e.message).split('\n')[0] } }); C.saveResults(R); await C.shot(page, `display/${vname}`, 'post-flow-error') }
    await ctx.close()
  }
} finally {
  C.saveResults(R)
  await C.closeBrowser()
}
