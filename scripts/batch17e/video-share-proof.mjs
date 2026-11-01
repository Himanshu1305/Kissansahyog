// Batch 17E - runs the REAL /admin/morning page (the built app, `vite preview`) in Chromium at 360 px width with a stubbed
// navigator.share / canShare / clipboard and stubbed database answers. Nothing leaves the machine.
// The page is served WITH the real Content-Security-Policy from public/_headers (added to the document response), so a blob: video that the CSP
// blocked would show up as a violation here.
// NOTE: Playwright's Chromium cannot decode H.264, so this proves the WIRING (button, file, text, states, CSP), not playback.
// Playback of the file is proven by the ffmpeg decode test (docs/review/batch17e/evidence/decode-test.txt) and by the founder's phone.
//   node scripts/batch17e/video-share-proof.mjs <baseUrl> <message.txt> <card.png> <video.mp4> <outDir>
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [base, msgPath, cardPath, mp4Path, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const message = readFileSync(msgPath, 'utf8').replace(/\r/g, '')
const card = readFileSync(cardPath).toString('base64')
const mp4 = readFileSync(mp4Path)
const mp4b64 = mp4.toString('base64')
const voice = Buffer.from('ID3 fake mp3 bytes for the proof - not real audio').toString('base64')
const DATE = '2026-10-30'
const csp = /Content-Security-Policy:\s*(.+)/.exec(readFileSync('public/_headers', 'utf8'))[1].trim()
const log = []
const say = (s) => { log.push(s); console.log(s) }
let fails = 0
const check = (ok, what) => { say(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fails++ }

const admin = { id: '00000000-0000-4000-8000-000000000001', full_name: 'Proof Admin', phone: null, is_admin: true, admin_role: 'owner', preferred_language: 'hi', language: 'hi', disclaimer_accepted: true }
const basePost = { post_date: DATE, message_text: message, poll_text: 'आज का सवाल\n1. हाँ\n2. नहीं', card_png_b64: card, voice_mp3_b64: voice, voice_script: 'सीताराम किसान भाइयो!', report_text: 'proof', posted_at: null, generated_at: `${DATE}T01:00:00Z` }

async function open(browser, { mode = 'ok', hasVideo = true, videoDelayMs = 0, videoFails = false, width = 360, mobile = true }) {
  const ctx = await browser.newContext({ viewport: { width, height: mobile ? 780 : 900 }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' })
  await ctx.addInitScript(([p, m]) => {
    localStorage.setItem('ks_session_v1', JSON.stringify(p)); localStorage.setItem('ks_lang_v1', 'hi')
    window.__calls = []; window.__t0 = 0
    const rec = (k, v) => window.__calls.push({ k, at: performance.now(), ...v })
    const fileInfo = (f) => ({ name: f.name, type: f.type, size: f.size })
    window.addEventListener('click', () => { window.__t0 = performance.now() }, true)
    window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
    if (m !== 'nosupport') {
      navigator.canShare = (o) => { rec('canShare', { files: (o.files || []).map(fileInfo) }); return m !== 'canshare-false' }
      navigator.share = async (o) => {
        rec('share', { keys: Object.keys(o).sort(), files: (o.files || []).map(fileInfo), text: o.text })
        if (m === 'abort') throw Object.assign(new Error('x'), { name: 'AbortError' })
        if (m === 'error') throw Object.assign(new Error('SECRET MESSAGE TEXT'), { name: 'NotAllowedError' })
      }
    } else {
      try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }) } catch { /* ignore */ }
      try { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) } catch { /* ignore */ }
    }
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { rec('writeText', { text: t }) } }, configurable: true })
    window.__warns = []; const w = console.warn; console.warn = (...a) => { if (!/Service Worker/.test(String(a[0]))) window.__warns.push(a.map(String).join(' ')); w(...a) }
  }, [admin, mode])
  const page = await ctx.newPage()
  const errors = []; page.on('pageerror', (e) => errors.push(e.message))
  const videoCalls = []
  // the real CSP on the document, exactly as Cloudflare Pages would send it
  await page.route(/\/admin\/morning/, async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback()
    const r = await route.fetch()
    await route.fulfill({ response: r, headers: { ...r.headers(), 'content-security-policy': csp } })
  })
  await page.route(/supabase\.co\/(rest|auth|functions)\//, async (route) => {
    const u = route.request().url()
    const j = (body) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    if (u.includes('/rpc/morning_post_get')) return j({ ok: true, post: { ...basePost, has_video: hasVideo } })
    if (u.includes('/rpc/morning_post_video_get')) {
      videoCalls.push(route.request().postData())
      if (videoDelayMs) await new Promise((r) => setTimeout(r, videoDelayMs))
      return videoFails ? j({ ok: false, error: 'forbidden' }) : j({ ok: true, video_mp4_b64: mp4b64, video_meta: { bytes: mp4.length } })
    }
    return j(u.includes('/rpc/morning_post_history') ? { ok: true, rows: [{ post_date: DATE, posted_at: null }] } : [])
  })
  await page.goto(`${base}/admin/morning?date=${DATE}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-testid="morning-message"]', { timeout: 15000 })
  return { ctx, page, errors, videoCalls }
}
const calls = (page) => page.evaluate(() => window.__calls)
const textOf = (page, id) => page.locator(`[data-testid="${id}"]`).first().innerText()
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

const browser = await chromium.launch()

// 1) happy path
{
  const { ctx, page, errors, videoCalls } = await open(browser, {})
  await page.waitForSelector('[data-testid="morning-share-video"]:not([disabled])', { timeout: 15000 })
  await page.waitForSelector('[data-testid="morning-video"]')
  await page.evaluate(() => { window.__calls = [] })
  check(videoCalls.length === 1 && JSON.parse(videoCalls[0]).p_actor === admin.id && JSON.parse(videoCalls[0]).p_date === DATE, 'the video was fetched once, in the background, with morning_post_video_get (actor + date)')
  const sec = page.locator('[data-testid="morning-send"]'); await sec.scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, 'video-main-button-ready-360.png'), fullPage: true })
  await sec.screenshot({ path: join(out, 'video-share-section-ready-360.png') })
  const h = await page.evaluate(() => ['morning-share-video', 'morning-share-card-msg', 'morning-share-voice'].map((id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect().height))
  check(h.every((x) => x >= 56), `main + both backup buttons are at least 56 px high at 360 px (${h.map((x) => Math.round(x)).join(', ')})`)
  check(h[0] >= 56 && (await page.evaluate(() => { const r = (id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect(); return r('morning-share-video').top < r('morning-share-card-msg').top && r('morning-share-card-msg').top < r('morning-wa-text').top })), 'order in the block: main button, backups, then the text-only link')
  check(await noHScroll(page), 'no horizontal scroll at 360 px')
  check((await page.locator('[data-testid="morning-share-video"]').getAttribute('aria-label')) === 'कार्ड + आवाज़ शेयर करें', 'the main button has its aria-label')
  check((await textOf(page, 'morning-video-what')) === 'कार्ड पर प्ले दबाने से आवाज़ चलेगी', 'the "press play" line is under the button')
  const bg = await page.evaluate(() => ['morning-share-video', 'morning-wa-text'].map((id) => getComputedStyle(document.querySelector(`[data-testid="${id}"]`)).backgroundColor))
  check(bg[0] !== bg[1], `the text-only link is not styled like the green buttons (${bg[0]} vs ${bg[1]})`)
  const v = await page.evaluate(() => { const e = document.querySelector('[data-testid="morning-video"]'); return { src: e.currentSrc || e.src, poster: e.poster.slice(0, 30), controls: e.controls, pi: e.hasAttribute('playsinline'), preload: e.preload, label: e.getAttribute('aria-label') } })
  check(v.src.startsWith('blob:') && v.poster.startsWith('data:image/png') && v.controls && v.pi && v.preload === 'metadata' && !!v.label, `preview: blob src, card poster, controls, playsinline, preload=metadata, aria-label (${JSON.stringify({ ...v, src: v.src.slice(0, 16) })})`)
  const dl = await page.evaluate(() => { const a = document.querySelector('[data-testid="morning-video-download"]'); return { d: a.getAttribute('download'), h: a.href.slice(0, 5) } })
  check(dl.d === `morning-${DATE}.mp4` && dl.h === 'blob:', 'the "download video" link is the blob and is named morning-DATE.mp4')
  await page.locator('[data-testid="morning-share-video"]').click()
  await page.waitForSelector('[data-testid="morning-share-note"]')
  const c = await calls(page)
  check(JSON.stringify(c.map((x) => x.k)) === JSON.stringify(['writeText', 'canShare', 'share']), `order: copy started, canShare(real file), share (${c.map((x) => x.k).join(' > ')})`)
  const t0 = await page.evaluate(() => window.__t0)
  const gaps = c.map((x) => Math.round(x.at - t0))
  check(gaps.every((g) => g >= 0 && g < 100), `SAME CLICK: all three calls happened within ${Math.max(...gaps)} ms of the tap (no waiting before share): ${gaps.join(', ')} ms`)
  const s = c.find((x) => x.k === 'share')
  check(JSON.stringify(s.keys) === '["files","text"]' && s.files.length === 1 && s.files[0].type === 'video/mp4' && s.files[0].name === `morning-${DATE}.mp4` && s.files[0].size === mp4.length, `share = exactly one file, video/mp4, ${s.files[0].size} bytes (same as the stored video), name ${s.files[0].name}, plus text`)
  check(s.text === message && c[0].text === message, 'the text shared and the text copied are exactly the message')
  check(c.find((x) => x.k === 'canShare').files[0].type === 'video/mp4', 'canShare was asked about the REAL video file')
  check((await textOf(page, 'morning-share-note')).includes('संदेश कॉपी हो गया'), 'the "message copied, paste it if the caption is empty" line shows under the button')
  await page.screenshot({ path: join(out, 'video-after-share-360.png') })
  check((await page.evaluate(() => window.__csp)).length === 0, `no CSP violation with the real policy (media-src allows blob:) ${JSON.stringify(await page.evaluate(() => window.__csp))}`)
  check(errors.length === 0, `no page errors (${errors.length})`)
  // a second tap shares the SAME file object (made once)
  await page.locator('[data-testid="morning-share-video"]').click(); await page.waitForTimeout(150)
  const c2 = (await calls(page)).filter((x) => x.k === 'share')
  check(c2.length === 2 && c2[1].files[0].size === c2[0].files[0].size, 'a second tap shares the same file again (the File is made once, not on every tap)')
  await ctx.close()
}
// 2) loading state
{
  const { ctx, page } = await open(browser, { videoDelayMs: 4000 })
  await page.waitForSelector('[data-testid="morning-share-video"]')
  const b = page.locator('[data-testid="morning-share-video"]')
  check(await b.isDisabled() && (await b.innerText()).includes('वीडियो तैयार हो रहा है'), 'while the video loads the main button is disabled and says it is getting ready')
  check(await page.locator('[data-testid="morning-share-card-msg"]').isEnabled() && await page.locator('[data-testid="morning-share-voice"]').isEnabled(), 'the two backup buttons are usable while it loads')
  await page.locator('[data-testid="morning-send"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, 'video-loading-360.png') })
  await ctx.close()
}
// 3) no video yet
{
  const { ctx, page } = await open(browser, { hasVideo: false })
  await page.waitForSelector('[data-testid="morning-video-none"]')
  check(await page.locator('[data-testid="morning-share-video"]').count() === 0 && await page.locator('[data-testid="morning-video"]').count() === 0, 'no video: main button and preview are hidden')
  check((await textOf(page, 'morning-video-none')) === 'वीडियो अभी नहीं बना। नीचे के दो बटन से कार्ड और आवाज़ अलग भेजें।', 'no video: the one plain line')
  check(await page.locator('[data-testid="morning-share-card-msg"]').isEnabled() && await page.locator('[data-testid="morning-share-voice"]').isEnabled() && await page.locator('[data-testid="morning-copy"]').count() === 1, 'no video: the page stays fully usable')
  await page.locator('[data-testid="morning-send"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, 'video-none-360.png') })
  await ctx.close()
}
// 4) the video fetch fails
{
  const { ctx, page } = await open(browser, { videoFails: true })
  await page.waitForSelector('[data-testid="morning-video-error"]')
  check(await page.locator('[data-testid="morning-share-video"]').count() === 0, 'fetch failed: no main button, a plain line instead')
  check(await page.locator('[data-testid="morning-share-card-msg"]').isEnabled(), 'fetch failed: the backups stay usable')
  await page.locator('[data-testid="morning-send"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, 'video-fetch-failed-360.png') })
  await ctx.close()
}
// 5) a real share error is visible, AbortError is silent, canShare false is visible
{
  const { ctx, page } = await open(browser, { mode: 'error' })
  await page.waitForSelector('[data-testid="morning-share-video"]:not([disabled])', { timeout: 15000 })
  await page.evaluate(() => { window.__warns = [] })
  await page.locator('[data-testid="morning-share-video"]').click(); await page.waitForSelector('[data-testid="morning-share-error"]')
  const t = await textOf(page, 'morning-share-error')
  check(t.includes('शेयर नहीं हो सका'), `error: visible Hindi message: ${t}`)
  const w = await page.evaluate(() => window.__warns)
  check(w.length === 1 && w[0] === 'share failed: NotAllowedError' && !w[0].includes('SECRET'), `error: console.warn carries only the error name: ${JSON.stringify(w)}`)
  await page.locator('[data-testid="morning-send"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, 'video-after-error-360.png') })
  await ctx.close()
  const a = await open(browser, { mode: 'abort' })
  await a.page.waitForSelector('[data-testid="morning-share-video"]:not([disabled])', { timeout: 15000 })
  await a.page.evaluate(() => { window.__warns = [] })
  await a.page.locator('[data-testid="morning-share-video"]').click(); await a.page.waitForTimeout(250)
  check(await a.page.locator('[data-testid="morning-share-error"]').count() === 0 && (await a.page.evaluate(() => window.__warns)).length === 0, 'AbortError: silent, nothing logged')
  await a.ctx.close()
  const f = await open(browser, { mode: 'canshare-false' })
  await f.page.waitForSelector('[data-testid="morning-share-video"]:not([disabled])', { timeout: 15000 })
  await f.page.locator('[data-testid="morning-share-video"]').click(); await f.page.waitForSelector('[data-testid="morning-share-error"]')
  check(!(await calls(f.page)).some((x) => x.k === 'share'), 'canShare(real video) false: share() not called, the visible message is shown')
  await f.ctx.close()
}
// 6) a computer
{
  const { ctx, page } = await open(browser, { mode: 'nosupport', width: 1100, mobile: false })
  await page.waitForSelector('[data-testid="morning-video"]', { timeout: 15000 })
  check(await page.locator('[data-testid="morning-share-hint"]').count() === 1 && await page.locator('[data-testid="morning-share-video"]').count() === 0, 'computer: the hint is shown, no share buttons')
  check(await page.locator('[data-testid="morning-video-download"]').count() === 1 && await page.locator('[data-testid="morning-download"]').count() === 1 && await page.locator('[data-testid="morning-voice-download"]').count() === 1, 'computer: the three download links are there')
  await page.screenshot({ path: join(out, 'video-computer-desktop.png'), fullPage: true })
  await ctx.close()
}
await browser.close()
say(fails ? `\n${fails} FAILED` : '\nALL PASSED')
writeFileSync(join(out, 'video-share-proof.txt'), log.join('\n') + '\n', 'utf8')
process.exit(fails ? 1 : 0)
