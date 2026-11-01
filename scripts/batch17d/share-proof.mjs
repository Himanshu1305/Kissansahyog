// Batch 17D - runs the REAL /admin/morning page (the built app, `vite preview`) in Chromium at 360 px width with a stubbed
// navigator.share / canShare / clipboard and a stubbed morning-post answer. Nothing leaves the machine: every Supabase call is answered here.
//   node scripts/batch17d/share-proof.mjs <baseUrl> <message.txt> <card.png> <outDir>
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [base, msgPath, cardPath, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const message = readFileSync(msgPath, 'utf8').replace(/\r/g, '')
const card = readFileSync(cardPath).toString('base64')
const voice = Buffer.from('ID3 fake mp3 bytes for the proof - not real audio').toString('base64')
const DATE = '2026-10-30'
const log = []
const say = (s) => { log.push(s); console.log(s) }
let fails = 0
const check = (ok, what) => { say(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fails++ }

const admin = { id: '00000000-0000-4000-8000-000000000001', full_name: 'Proof Admin', phone: null, is_admin: true, admin_role: 'owner', preferred_language: 'hi', language: 'hi', disclaimer_accepted: true }
const post = { post_date: DATE, message_text: message, poll_text: 'आज का सवाल\n1. हाँ\n2. नहीं', card_png_b64: card, voice_mp3_b64: voice, voice_script: 'सीताराम किसान भाइयो!', report_text: 'proof', posted_at: null, generated_at: `${DATE}T01:00:00Z` }

async function open(browser, { mode }) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  await ctx.addInitScript(([p, m]) => {
    localStorage.setItem('ks_session_v1', JSON.stringify(p)); localStorage.setItem('ks_lang_v1', 'hi')
    window.__calls = []
    const rec = (k, v) => window.__calls.push({ k, ...v })
    const fileInfo = (f) => ({ name: f.name, type: f.type, size: f.size })
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
  await page.route(/supabase\.co\/(rest|auth|functions)\//, (route) => {
    const u = route.request().url()
    const body = u.includes('/rpc/morning_post_get') ? { ok: true, post } : u.includes('/rpc/morning_post_history') ? { ok: true, rows: [{ post_date: DATE, posted_at: null }] } : []
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  })
  await page.goto(`${base}/admin/morning?date=${DATE}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="morning-post-admin"]', { timeout: 15000 })
  await page.waitForSelector('[data-testid="morning-message"]')
  await page.evaluate(() => { window.__calls = []; window.__warns = [] }) // forget what the page did while loading (its own start-up checks); only the taps are judged
  return { ctx, page, errors }
}
const calls = (page) => page.evaluate(() => window.__calls)
const textOf = (page, id) => page.locator(`[data-testid="${id}"]`).first().innerText()

const browser = await chromium.launch()

// 1) happy path: both buttons, taps send exactly the right shapes
{
  const { ctx, page, errors } = await open(browser, { mode: 'ok' })
  await page.locator('[data-testid="morning-share-card-msg"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, 'share-page-both-buttons-360.png'), fullPage: true })
  const sec = page.locator('[data-testid="morning-send"]'); await sec.scrollIntoViewIfNeeded()
  await sec.screenshot({ path: join(out, 'share-section-both-buttons-360.png') })
  const h = await page.evaluate(() => ['morning-share-card-msg', 'morning-share-voice'].map((id) => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect().height))
  check(h.every((x) => x >= 56), `both share buttons are at least 56 px high at 360 px width (${h.map((x) => Math.round(x)).join(', ')})`)
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll at 360 px')
  check(await page.locator('[data-testid="morning-share-all"]').count() === 0, 'the old combined button is gone')
  check((await page.locator('[data-testid="morning-share-card-msg"]').getAttribute('aria-label')) === 'कार्ड + संदेश शेयर करें', 'card + message button has its aria-label')
  await page.locator('[data-testid="morning-share-card-msg"]').click()
  await page.waitForSelector('[data-testid="morning-share-note"]')
  let c = await calls(page)
  check(JSON.stringify(c.map((x) => x.k)) === JSON.stringify(['writeText', 'canShare', 'share']), `order: clipboard, then canShare(real file), then share (${c.map((x) => x.k).join(' > ')})`)
  const s1 = c.find((x) => x.k === 'share')
  check(JSON.stringify(s1.keys) === '["files","text"]' && s1.files.length === 1 && s1.files[0].type === 'image/png' && s1.files[0].name === `kisan-sahyog-card-${DATE}.png` && s1.files[0].size > 1000, `card share = one PNG file (${s1.files[0].size} bytes) + text`)
  check(s1.text === message && c[0].text === message, 'the text shared and the text copied are exactly the message in the text box')
  check((await textOf(page, 'morning-share-note')).includes('संदेश कॉपी हो गया'), 'the "message copied" line is shown under the button')
  await page.screenshot({ path: join(out, 'share-page-after-card-share-360.png'), fullPage: false })
  await page.locator('[data-testid="morning-share-voice"]').click(); await page.waitForTimeout(150)
  c = await calls(page)
  const s2 = c.filter((x) => x.k === 'share')[1]
  check(JSON.stringify(s2.keys) === '["files"]' && s2.files.length === 1 && s2.files[0].type === 'audio/mpeg' && s2.files[0].name === `morning-${DATE}.mp3` && s2.text === undefined, 'voice share = one MP3 file and NO text')
  check(c.filter((x) => x.k === 'writeText').length === 1, 'the voice button does not touch the clipboard')
  check(await page.locator('[data-testid="morning-share-error"]').count() === 0, 'no error line after two good shares')
  check(errors.length === 0, `no page errors (${errors.length})`)
  await ctx.close()
}
// 2) closing the share sheet (AbortError): silent
{
  const { ctx, page } = await open(browser, { mode: 'abort' })
  await page.locator('[data-testid="morning-share-card-msg"]').click(); await page.waitForTimeout(200)
  await page.locator('[data-testid="morning-share-voice"]').click(); await page.waitForTimeout(200)
  check(await page.locator('[data-testid="morning-share-error"]').count() === 0, 'AbortError (share sheet closed): no error line')
  check((await page.evaluate(() => window.__warns)).length === 0, 'AbortError: nothing logged')
  await ctx.close()
}
// 3) a real error: visible message, only the error name logged
{
  const { ctx, page } = await open(browser, { mode: 'error' })
  await page.locator('[data-testid="morning-share-card-msg"]').click(); await page.waitForSelector('[data-testid="morning-share-error"]')
  const t = await textOf(page, 'morning-share-error')
  check(t.includes('शेयर नहीं हो सका') && t.includes('डाउनलोड'), `visible Hindi message: ${t}`)
  const w = await page.evaluate(() => window.__warns)
  check(w.length === 1 && w[0] === 'share failed: NotAllowedError' && !w[0].includes('SECRET'), `console.warn carries only the error name: ${JSON.stringify(w)}`)
  await page.locator('[data-testid="morning-share-error"]').scrollIntoViewIfNeeded()
  await page.locator('[data-testid="morning-send"]').screenshot({ path: join(out, 'share-section-after-error-360.png') })
  await page.screenshot({ path: join(out, 'share-page-after-error-360.png'), fullPage: false })
  check(await page.locator('[data-testid="morning-download"]').count() === 1 && await page.locator('[data-testid="morning-voice-download"]').count() === 1, 'the Download buttons are still there to use instead')
  await ctx.close()
}
// 4) the real file is refused by canShare: visible message, share() never called
{
  const { ctx, page } = await open(browser, { mode: 'canshare-false' })
  await page.locator('[data-testid="morning-share-voice"]').click(); await page.waitForSelector('[data-testid="morning-share-error"]')
  const c = await calls(page)
  check(!c.some((x) => x.k === 'share'), 'canShare(real file) = false: share() was not called, a visible message was shown')
  check((await page.evaluate(() => window.__warns))[0] === 'share failed: canShare-false', 'logged: canShare-false only')
  await ctx.close()
}
// 5) a computer: no navigator.share
{
  const { ctx, page } = await open(browser, { mode: 'nosupport' })
  const hint = await page.locator('[data-testid="morning-share-hint"]').count()
  check(hint === 1 && await page.locator('[data-testid="morning-share-card-msg"]').count() === 0, 'no navigator.share: the Download hint is shown and no share buttons')
  await page.locator('[data-testid="morning-send"]').screenshot({ path: join(out, 'share-section-computer-360.png') })
  await ctx.close()
}
await browser.close()
say(fails ? `\n${fails} FAILED` : '\nALL PASSED')
writeFileSync(join(out, 'share-proof.txt'), log.join('\n') + '\n', 'utf8')
process.exit(fails ? 1 : 0)
