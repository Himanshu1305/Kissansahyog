// Batch 10A Part 2 — post-ship checks on https://kissansahyog.com. READ-ONLY:
// every browser request that is not GET/HEAD/OPTIONS is aborted and recorded; no login, no sign-up,
// no form submit. Only browser localStorage is set (language, a typed place for Browse).
// Run from the repo root: node docs/review/batch10a/evidence/prod-live/prod-live-check.mjs
import { chromium } from 'playwright'
import { writeFile, readFile } from 'node:fs/promises'

const BASE = 'https://kissansahyog.com'
const OUT = 'docs/review/batch10a/evidence/prod-live'
const EXPECT_MAIN = '/assets/index-DRo2-cnt.js'
const EB_TEXT = ['This page could not open', 'पेज नहीं खुल पाया']
// Allowed console noise: pre-existing prerender localhost links (B17); Cloudflare Web Analytics beacon blocked by our
// CSP (seen on the old build too: batch9 + 10A after-rollback results); our own write-blocks (ERR_BLOCKED_BY_CLIENT).
const CONSOLE_ALLOW = [/localhost:\d+/i, /ERR_CONNECTION_REFUSED/i, /static\.cloudflareinsights\.com\/beacon/i, /ERR_BLOCKED_BY_CLIENT/i]
const allowedSeen = []
const SAGAR = { lat: 23.8388, lng: 78.7378, label: 'सागर', from: 'typed' }
const R = { startedAt: new Date().toISOString(), checks: {}, blockedWrites: [] }
const set = (k, status, detail) => { R.checks[k] = { status, detail }; console.log(`${status}  ${k}  ${JSON.stringify(detail).slice(0, 400)}`) }

const browser = await chromium.launch()
async function ctxFor({ width = 412, height = 915, lang = 'hi', loc = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', deviceScaleFactor: 1 })
  await ctx.addInitScript(([l, p]) => { try { localStorage.setItem('ks_lang_v1', l); if (p) localStorage.setItem('ks_location_v1', JSON.stringify(p)) } catch {} }, [lang, loc])
  await ctx.route('**/*', (route) => {
    const m = route.request().method()
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue()
    R.blockedWrites.push(`${m} ${route.request().url().slice(0, 160)}`)
    return route.abort('blockedbyclient')
  })
  return ctx
}
function watch(page) {
  const w = { consoleErrors: [], pageErrors: [], failed: [], bad: [] }
  page.on('console', (m) => { if (m.type() !== 'error') return; if (CONSOLE_ALLOW.some((re) => re.test(m.text()))) { allowedSeen.push(m.text().slice(0, 120)); return } w.consoleErrors.push(m.text().slice(0, 300)) })
  page.on('pageerror', (e) => w.pageErrors.push(String(e).slice(0, 300)))
  page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!/blockedbyclient|BLOCKED_BY_CLIENT/i.test(f)) w.failed.push(`${r.method()} ${r.url().slice(0, 160)} ${f}`) })
  page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 && (u.startsWith(BASE) || u.includes('supabase.co'))) w.bad.push(`${r.status()} ${u.slice(0, 160)}`) })
  return w
}
const ownProblems = (w) => [...w.failed, ...w.bad].filter((s) => s.includes('kissansahyog.com') || s.includes('supabase.co') || s.includes('/functions') || s.includes('/api/'))

// ---- 2.1 routes ----
const ROUTES = ['/', '/browse', '/signup', '/login', '/how-to-use', '/sawaal', '/yojana', '/mausam']
{
  const ctx = await ctxFor({ loc: SAGAR })
  const res = []
  for (const p of ROUTES) {
    const http = await fetch(BASE + p, { redirect: 'follow' })
    const page = await ctx.newPage(); const w = watch(page)
    let status = null
    try { status = (await page.goto(BASE + p, { waitUntil: 'load', timeout: 60000 }))?.status() ?? null; await page.waitForTimeout(3000) } catch (e) { w.pageErrors.push('goto: ' + e.message.slice(0, 200)) }
    const text = await page.locator('body').innerText().catch(() => '')
    const h1 = await page.locator('h1').first().textContent({ timeout: 3000 }).catch(() => null)
    const shot = `route${p === '/' ? '-home' : p.replace(/\//g, '-')}.png`
    await page.screenshot({ path: `${OUT}/${shot}`, fullPage: false })
    const r = { path: p, httpStatus: http.status, browserStatus: status, h1: h1?.trim().slice(0, 60), textLen: text.trim().length, errorBoundary: EB_TEXT.some((t) => text.includes(t)), consoleErrors: w.consoleErrors, pageErrors: w.pageErrors, ownRequestProblems: ownProblems(w), shot }
    r.ok = r.httpStatus === 200 && (status === 200 || status === 304) && r.textLen > 50 && !r.errorBoundary && !w.pageErrors.length && !w.consoleErrors.length && !r.ownRequestProblems.length
    res.push(r); await page.close()
  }
  set('2.1 routes', res.every((r) => r.ok) ? 'RAN-PASSED' : 'RAN-FAILED', res)
  await ctx.close()
}

// ---- 2.2 signup at 412 / 360, hi / en (nothing submitted) ----
{
  const res = []
  for (const width of [412, 360]) for (const lang of ['hi', 'en']) {
    const ctx = await ctxFor({ width, height: 900, lang }); const page = await ctx.newPage(); const w = watch(page)
    await page.goto(BASE + '/signup', { waitUntil: 'load' }); await page.waitForTimeout(2500)
    const info = await page.evaluate(() => {
      const form = document.querySelector('[data-testid="signup-form"]')
      const q = (s) => form?.querySelector(s)
      const submit = q('button[type="submit"]')
      const accept = q('[data-testid="disclaimer-accept"]')
      const notice = form ? [...form.querySelectorAll('h2')].at(-1) : null
      const top = (el) => el ? Math.round(el.getBoundingClientRect().top + scrollY) : null
      return {
        form: !!form,
        selects: form ? form.querySelectorAll('select').length : null,
        kisanBlock: !!document.querySelector('[data-testid*="kisan"], [data-testid*="farmer-profile"]'),
        visibilityCheckboxes: form ? form.querySelectorAll('[data-testid="visibility-show"]').length : 0,
        checkboxesTotal: form ? form.querySelectorAll('input[type="checkbox"]').length : 0,
        explain: !!q('[data-testid="visibility-explain"]'),
        noticeTop: top(notice), acceptTop: top(accept), submitTop: top(submit),
        submitText: submit?.textContent?.trim() || null,
        steps: /step|चरण|अगला|next/i.test([...form?.querySelectorAll('button') || []].map((b) => b.textContent).join(' ')),
        overflowX: document.documentElement.scrollWidth > innerWidth,
      }
    })
    const shot = `signup-${width}-${lang}.png`
    await page.screenshot({ path: `${OUT}/${shot}`, fullPage: true })
    const ok = info.form && info.selects === 0 && !info.kisanBlock && info.visibilityCheckboxes === 1 && info.explain && info.noticeTop != null && info.noticeTop < info.acceptTop && info.acceptTop < info.submitTop && !!info.submitText && !info.overflowX && !w.pageErrors.length
    res.push({ width, lang, ok, ...info, pageErrors: w.pageErrors, shot })
    await ctx.close()
  }
  set('2.2 signup phone', res.every((r) => r.ok) ? 'RAN-PASSED' : 'RAN-FAILED', res)
}

// ---- 2.3 browse equipment tags ----
{
  const res = {}
  for (const width of [412, 360]) {
    const ctx = await ctxFor({ width, height: 915, lang: 'hi', loc: SAGAR }); const page = await ctx.newPage(); const w = watch(page)
    await page.goto(BASE + '/browse', { waitUntil: 'load' }); await page.waitForTimeout(2500)
    await page.click('[data-testid="chip-equipment"]'); await page.waitForTimeout(3000)
    const cards = async () => page.locator('[data-testid="listing-card"]').count()
    const pos = await page.evaluate(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect()
      return { catsBottom: Math.round(r('[data-testid="browse-cats"]')?.bottom ?? -1), tagsTop: Math.round(r('[data-testid="equipment-tag-filters"]')?.top ?? -1),
        chips: [...document.querySelectorAll('[data-testid^="etag-chip-"]')].map((b) => ({ id: b.dataset.testid, text: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), pressed: b.getAttribute('aria-pressed') })),
        overflowX: document.documentElement.scrollWidth > innerWidth }
    })
    const urlBefore = page.url(); const all = await cards()
    await page.screenshot({ path: `${OUT}/browse-equipment-${width}.png` })
    await page.click('[data-testid="etag-chip-rare_emergency"]'); await page.waitForTimeout(1000)
    const pressedRare = await page.getAttribute('[data-testid="etag-chip-rare_emergency"]', 'aria-pressed')
    const urlAfterTap = page.url(); const filtered = await cards()
    await page.screenshot({ path: `${OUT}/browse-equipment-rare-${width}.png` })
    await page.click('[data-testid="etag-chip-rare_emergency"]'); await page.waitForTimeout(1000)
    const cleared = (await page.getAttribute('[data-testid="etag-chip-all"]', 'aria-pressed')) === 'true' && (await cards()) === all
    // Deep link (the way Bazaar links to it)
    await page.goto(BASE + '/browse?cat=equipment&etag=rare_emergency', { waitUntil: 'load' }); await page.waitForTimeout(3000)
    const deepPressed = await page.getAttribute('[data-testid="etag-chip-rare_emergency"]', 'aria-pressed').catch(() => null)
    res[width] = { pos, urlBefore, urlAfterTap, cardsAll: all, cardsRare: filtered, pressedRare, cleared, deepLinkPressed: deepPressed, pageErrors: w.pageErrors, consoleErrors: w.consoleErrors,
      ok: pos.tagsTop >= pos.catsBottom && pos.chips[0]?.id === 'etag-chip-all' && pos.chips.length === 3 && pos.chips.every((c) => c.h >= 44) && pressedRare === 'true' && filtered <= all && cleared && deepPressed === 'true' && !pos.overflowX && !w.pageErrors.length,
      urlGetsEtagOnTap: urlAfterTap.includes('etag=') }
    await ctx.close()
  }
  set('2.3 browse tags', Object.values(res).every((r) => r.ok) ? 'RAN-PASSED' : 'RAN-FAILED', res)
}

// ---- 2.4 live JS markers ----
{
  const html = await (await fetch(BASE + '/post')).text()
  const main = html.match(/<script[^>]+src="(\/assets\/index-[^"]+\.js)"/)?.[1]
  const seen = new Map(); const queue = [main]
  while (queue.length && seen.size < 400) {
    const p = queue.shift(); if (!p || seen.has(p)) continue
    const t = await (await fetch(BASE + p)).text(); seen.set(p, t)
    for (const m of t.matchAll(/["'`(/]?(?:\.\/|\/assets\/)?([A-Za-z0-9_.-]+-[A-Za-z0-9_-]{8}\.js)/g)) { const q = '/assets/' + m[1]; if (!seen.has(q)) queue.push(q) }
  }
  const has = (s) => [...seen].filter(([, t]) => t.includes(s)).map(([p]) => p)
  const cat = [...seen].find(([, t]) => t.includes('`575 DI`') || t.includes('"575 DI"') || t.includes("'575 DI'"))
  const m = {
    mainChunk: main, mainMatchesScript: main === EXPECT_MAIN, chunksFetched: seen.size,
    'जैसे 2023': has('जैसे 2023'),
    'जैसे 575 DI (template "जैसे ${n}" + "575 DI" in the same chunk)': cat && cat[1].includes('जैसे ${') ? [cat[0]] : [],
    'post-source-farmer': has('post-source-farmer'), 'equipment-tag-filters': has('equipment-tag-filters'),
    'FieldRow grid-rows-subgrid': has('grid-rows-subgrid'), 'FieldRow min-[400px]:grid-cols-2': has('min-[400px]:grid-cols-2'),
  }
  const ok = m.mainMatchesScript && Object.entries(m).filter(([, v]) => Array.isArray(v)).every(([, v]) => v.length > 0)
  set('2.4 live JS markers', ok ? 'RAN-PASSED' : 'RAN-FAILED', m)
}

// ---- 2.5 existing listing ----
{
  const ctx = await ctxFor({ loc: SAGAR }); const page = await ctx.newPage()
  await page.goto(BASE + '/browse', { waitUntil: 'load' }); await page.waitForTimeout(3500)
  const openFirst = async () => { const c = page.locator('[data-testid="listing-card"] button, [data-testid="listing-card"] a').first(); if (!(await c.count())) return null; await c.click(); await page.waitForURL(/\/listing\//, { timeout: 10000 }).catch(() => {}); return /\/listing\//.test(page.url()) ? new URL(page.url()).pathname : null }
  let href = await openFirst()
  if (!href) { await page.goto(BASE + '/browse', { waitUntil: 'load' }); await page.waitForTimeout(2500); await page.click('[data-testid="chip-equipment"]').catch(() => {}); await page.waitForTimeout(3000); href = await openFirst() }
  const p2 = await ctx.newPage(); const w = watch(p2)
  let status = null, text = '', h1 = null
  if (href) { status = (await p2.goto(BASE + href, { waitUntil: 'load' }))?.status(); await p2.waitForTimeout(3000); text = await p2.locator('body').innerText().catch(() => ''); h1 = await p2.locator('h1').first().textContent().catch(() => null); await p2.screenshot({ path: `${OUT}/listing-detail.png` }) }
  const ok = !!href && status === 200 && text.trim().length > 100 && !EB_TEXT.some((t) => text.includes(t)) && !w.pageErrors.length && !ownProblems(w).length
  set('2.5 existing listing', ok ? 'RAN-PASSED' : 'RAN-FAILED', { href, status, h1: h1?.trim().slice(0, 80), textLen: text.length, pageErrors: w.pageErrors, consoleErrors: w.consoleErrors, ownRequestProblems: ownProblems(w) })
  await ctx.close()
}

// ---- 2.6 sitemap + robots ----
{
  const sm = await fetch(BASE + '/sitemap.xml'); const smText = await sm.text()
  const rb = await (await fetch(BASE + '/robots.txt')).text()
  let before = null
  for (const f of ['docs/review/batch10a/evidence/prod-before.json', 'docs/review/batch10a/evidence/prod-ship/prod-before-ship.json']) {
    try { const j = JSON.parse(await readFile(f, 'utf8')); const r = j.files?.['/robots.txt'] ?? j.robots ?? j.pages?.['/robots.txt']; if (r) { before = { file: f, r }; break } } catch {}
  }
  const robotsSame = before ? (typeof before.r === 'string' ? before.r === rb : (before.r.sha256 ? before.r.sha256 === (await import('node:crypto')).createHash('sha256').update(rb).digest('hex') : before.r.bytes === Buffer.byteLength(rb))) : null
  const ok = sm.status === 200 && /^<\?xml/.test(smText.trim()) && /<sitemapindex/.test(smText) && robotsSame === true
  set('2.6 sitemap + robots', ok ? 'RAN-PASSED' : 'RAN-FAILED', { sitemapStatus: sm.status, sitemapContentType: sm.headers.get('content-type'), sitemapXml: /^<\?xml/.test(smText.trim()), robotsBytes: Buffer.byteLength(rb), robotsSameAs: before?.file ?? 'no snapshot found', robotsSame, robotsBefore: before?.r })
}

R.allowedConsoleNoise = [...new Set(allowedSeen)]
R.finishedAt = new Date().toISOString()
await writeFile(`${OUT}/results.json`, JSON.stringify(R, null, 2))
console.log(`blocked write requests: ${R.blockedWrites.length}`, R.blockedWrites.slice(0, 10))
await browser.close()
