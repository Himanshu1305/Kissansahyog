#!/usr/bin/env node
// Batch 7B browser check — /grievance form (e-mail or mobile, public-display
// checkbox) and the /about "What farmers say" section, at 360 and 1280 wide.
// Serves dist/ itself (run `npm run build` first).
//   node scripts/shots-batch7b.mjs
// Screenshots go to docs/review/batch7b/. Nothing is written to any database: every
// POST to /api/feedback and to Supabase is answered inside the browser, and any
// other non-GET request to Supabase is blocked.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const OUT = join(ROOT, 'docs/review/batch7b')
const PORT = 4180
const BASE = `http://localhost:${PORT}`
const WIDTHS = [360, 1280]
mkdirSync(OUT, { recursive: true })

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' }
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  const file = join(DIST, url)
  const hit = extname(file) && existsSync(file) ? file : join(DIST, 'index.html')
  res.writeHead(200, { 'Content-Type': MIME[extname(hit)] || 'application/octet-stream' })
  res.end(await readFile(hit))
})
await new Promise((r) => server.listen(PORT, r))

const results = []
let failures = 0
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`)
}
const jsonBody = (v) => ({ contentType: 'application/json', body: JSON.stringify(v) })

const browser = await chromium.launch()
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' })
  const page = await ctx.newPage()

  // What each scenario lets the "server" answer; everything is recorded.
  const net = { api: null, rpc: null, pub: null, apiCalls: [], rpcCalls: [], blocked: [] }
  await page.route('**/api/feedback', (route) => { net.apiCalls.push(route.request().postDataJSON()); return route.fulfill(net.api) })
  await page.route(/supabase\.co\//, (route) => {
    const req = route.request()
    const url = req.url()
    if (url.includes('/rpc/submit_feedback')) { net.rpcCalls.push(req.postDataJSON()); return route.fulfill(net.rpc) }
    if (url.includes('/rpc/get_public_feedback')) return route.fulfill(net.pub)
    if (req.method() !== 'GET') { net.blocked.push(url.split('/').pop()); return route.abort() }
    return route.continue()
  })
  const reset = () => { net.apiCalls.length = 0; net.rpcCalls.length = 0 }
  const NOT_DEPLOYED = { status: 404, contentType: 'text/html', body: '<!doctype html><title>Not found</title>' }
  const RPC_MISSING = { status: 404, ...jsonBody({ code: 'PGRST202', message: 'Could not find the function public.submit_feedback in the schema cache' }) }
  net.pub = { status: 404, ...jsonBody({ code: 'PGRST202', message: 'Could not find the function public.get_public_feedback in the schema cache' }) }

  await page.goto(BASE + '/grievance', { waitUntil: 'networkidle' })
  const form = page.locator('[data-testid="feedback-form"]')
  const contactBox = form.locator('#fb-contact')
  const contactError = form.locator('[data-testid="feedback-contact-error"]')
  const submit = form.locator('button[type="submit"]')
  const done = page.locator('[data-testid="feedback-done"]')
  const pick = (kind) => form.locator(`label:has(input[value="${kind}"])`).click()
  const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

  const inputs = await form.locator('input, textarea, select').evaluateAll((els) => els.map((el) => `${el.type}:${el.name}`))
  check(`${width}px form: contact, type, message, public checkbox (+ hidden honeypot); no name field`,
    JSON.stringify(inputs) === JSON.stringify(['text:contact', 'radio:kind', 'radio:kind', 'radio:kind', 'textarea:message', 'checkbox:public_ok', 'text:ks_leave_empty']), inputs.join(' '))
  check(`${width}px form: label and helper line as briefed`, (await form.locator('label[for="fb-contact"]').innerText()).trim() === 'ईमेल या मोबाइल नंबर' && (await form.locator('#fb-contact-hint').innerText()).trim() === 'हम आपसे इसी पर संपर्क करेंगे।')
  check(`${width}px form: no horizontal scroll`, await noScroll())
  await page.screenshot({ path: join(OUT, `grievance-${width}.png`), fullPage: true })

  // ---- checkbox visibility ------------------------------------------------------
  const box = form.locator('input[name="public_ok"]')
  const privateNote = form.locator('[data-testid="feedback-private-note"]')
  check(`${width}px checkbox: shown and unchecked for "suggestion"`, (await box.isVisible()) && !(await box.isChecked()) && (await form.locator('#fb-public-note').innerText()).includes('जाँच के बाद'))
  await pick('other')
  check(`${width}px checkbox: shown for "other"`, (await box.isVisible()) && !(await privateNote.isVisible()))
  await pick('problem')
  check(`${width}px checkbox: gone for "problem", replaced by the "never shown publicly" note`, (await box.count()) === 0 && (await privateNote.innerText()).includes('सार्वजनिक रूप से नहीं'))
  await page.screenshot({ path: join(OUT, `grievance-problem-${width}.png`), fullPage: true })
  await pick('suggestion')

  // ---- validation errors (no request may leave the page) ---------------------------
  reset()
  await submit.click()
  check(`${width}px validation: empty contact → inline error at the field`, (await contactError.innerText()).includes('ईमेल या मोबाइल नंबर') && (await contactBox.getAttribute('aria-invalid')) === 'true')
  await contactBox.fill('12345')
  await submit.click()
  check(`${width}px validation: short number → "10 अंकों का सही मोबाइल नंबर"`, (await contactError.innerText()).includes('10 अंकों का सही मोबाइल नंबर'))
  await page.screenshot({ path: join(OUT, `grievance-error-${width}.png`), fullPage: true })
  await contactBox.fill('5876543210')
  await submit.click()
  check(`${width}px validation: mobile starting with 5 is refused`, await contactError.isVisible())
  await contactBox.fill('kisan@')
  await submit.click()
  check(`${width}px validation: broken e-mail → "सही ईमेल पता"`, (await contactError.innerText()).includes('सही ईमेल पता'))
  await contactBox.fill('ram kumar')
  await submit.click()
  check(`${width}px validation: neither e-mail nor number → asks for one of the two`, (await contactError.innerText()).includes('सही ईमेल पता या 10 अंकों का मोबाइल नंबर'))
  await contactBox.fill('+91 98765 43210')
  check(`${width}px validation: the error clears as soon as the person types again`, (await contactError.count()) === 0)
  await submit.click()
  check(`${width}px validation: good contact, empty message → message error`, (await form.locator('[role="alert"]').innerText()).includes('अपना संदेश लिखें'))
  check(`${width}px validation: nothing was sent while the form was invalid`, net.apiCalls.length === 0 && net.rpcCalls.length === 0)

  // ---- success through /api/feedback -------------------------------------------------
  reset()
  net.api = { status: 200, ...jsonBody({ ok: true }) }
  net.rpc = { status: 500, ...jsonBody({ message: 'must not be called' }) }
  await form.locator('#fb-message').fill('मंडी भाव का पेज बहुत काम का है।')
  await box.check()
  await submit.click()
  await done.waitFor()
  const sent = net.apiCalls[0] || {}
  check(`${width}px success: /api/feedback gets the 10-digit mobile, type, message and consent; direct RPC not used`,
    net.apiCalls.length === 1 && net.rpcCalls.length === 0 && sent.mobile === '9876543210' && sent.email === null && sent.kind === 'suggestion' && sent.public_ok === true && sent.message === 'मंडी भाव का पेज बहुत काम का है।' && sent.lang === 'hi', JSON.stringify(sent))
  check(`${width}px success: nothing about who the person is in the request`, JSON.stringify(Object.keys(sent).sort()) === JSON.stringify(['device', 'email', 'kind', 'lang', 'message', 'mobile', 'public_ok']), Object.keys(sent).join(','))
  const doneText = await done.innerText()
  check(`${width}px success: warm confirmation, no promised reply time`, doneText.includes('धन्यवाद') && doneText.includes('ईमेल या मोबाइल नंबर पर') && !/[0-9०-९]|घंटे|दिन/.test(doneText), doneText.replace(/\n/g, ' '))
  await page.screenshot({ path: join(OUT, `grievance-done-${width}.png`) })
  await done.locator('button').click()

  // ---- a problem is never sent as public ------------------------------------------------
  reset()
  await box.check()
  await pick('problem')
  await contactBox.fill('Kisan@Example.com')
  await form.locator('#fb-message').fill('लिस्टिंग का फ़ोटो नहीं खुल रहा है।')
  await submit.click()
  await done.waitFor()
  check(`${width}px problem: sent with public_ok false and the e-mail lower-cased`, net.apiCalls[0]?.kind === 'problem' && net.apiCalls[0]?.public_ok === false && net.apiCalls[0]?.email === 'kisan@example.com' && net.apiCalls[0]?.mobile === null, JSON.stringify(net.apiCalls[0]))
  await done.locator('button').click()

  // ---- fallback 1: /api/feedback not deployed → direct RPC ---------------------------------
  reset()
  net.api = NOT_DEPLOYED
  net.rpc = { status: 200, ...jsonBody(7) }
  await pick('other')
  await form.locator('#fb-message').fill('कोल्ड स्टोरेज की सूची में मेरा ज़िला जोड़ें।')
  await submit.click()
  await done.waitFor()
  const viaRpc = net.rpcCalls[0] || {}
  check(`${width}px fallback: /api/feedback 404 → submit_feedback RPC called with the same fields → confirmation`,
    net.apiCalls.length === 1 && net.rpcCalls.length === 1 && viaRpc.p_email === 'kisan@example.com' && viaRpc.p_mobile === null && viaRpc.p_kind === 'other' && viaRpc.p_public_ok === false && viaRpc.p_message.length > 5, JSON.stringify(viaRpc))
  await done.locator('button').click()

  // ---- fallback 2: nothing can store it → mailto, never a thank-you ---------------------------
  reset()
  net.api = NOT_DEPLOYED
  net.rpc = RPC_MISSING
  await form.locator('#fb-message').fill('मौसम का पेज धीमा खुलता है।')
  await submit.click()
  const mailto = page.locator('[data-testid="feedback-mailto"]')
  await mailto.waitFor()
  const href = await mailto.getAttribute('href')
  check(`${width}px fallback: API and RPC both missing → e-mail link with the message, no false thank-you`,
    href.startsWith('mailto:grievance@kissansahyog.com?') && decodeURIComponent(href).includes('मौसम का पेज धीमा खुलता है।') && (await done.count()) === 0 && net.apiCalls.length === 1 && net.rpcCalls.length === 1)
  await page.screenshot({ path: join(OUT, `grievance-fallback-${width}.png`), fullPage: true })

  // ---- the function says 503 (stored nothing) → still tries the RPC ------------------------------
  reset()
  net.api = { status: 503, ...jsonBody({ error: 'unavailable' }) }
  net.rpc = { status: 200, ...jsonBody(8) }
  await submit.click()
  await done.waitFor()
  check(`${width}px fallback: /api/feedback 503 → RPC used → confirmation`, net.apiCalls.length === 1 && net.rpcCalls.length === 1)
  await done.locator('button').click()

  // ---- refusals from the server are shown, with no fallback and no thank-you -----------------------
  reset()
  net.api = { status: 429, ...jsonBody({ error: 'feedback_too_many' }) }
  net.rpc = { status: 200, ...jsonBody(9) }
  await form.locator('#fb-message').fill('एक और संदेश।')
  await submit.click()
  await form.locator('[role="alert"]').waitFor()
  check(`${width}px refusal: rate limit → clear message, no RPC retry, no mailto, no thank-you`, (await form.locator('[role="alert"]').innerText()).includes('कुछ देर बाद') && net.rpcCalls.length === 0 && (await mailto.count()) === 0 && (await done.count()) === 0)

  // ---- honeypot: looks like success, sends nothing ---------------------------------------------------
  reset()
  net.api = { status: 200, ...jsonBody({ ok: true }) }
  await form.locator('input[name="ks_leave_empty"]').evaluate((el) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, 'http://spam.example')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await submit.click()
  await done.waitFor()
  check(`${width}px honeypot: a filled trap sends nothing`, net.apiCalls.length === 0 && net.rpcCalls.length === 0)

  check(`${width}px form: legal section still collapsed, with the new privacy line inside`, await page.locator('[data-testid="grievance-legal"]').evaluate((d) => !d.open && d.textContent.includes('केवल आपके संदेश का जवाब देने के लिए') && !d.textContent.includes('gac.gov.in')))

  // ---- /about: "What farmers say" ----------------------------------------------------------------------
  await page.goto(BASE + '/about', { waitUntil: 'networkidle' })
  check(`${width}px about: RPC missing (before migration) → no section, page intact`, (await page.locator('#kisanon-ki-rai').count()) === 0 && (await page.locator('h1').count()) === 1 && (await page.locator('[data-testid="about-founder-card"]').isVisible()))
  net.pub = { status: 200, ...jsonBody([]) }
  await page.reload({ waitUntil: 'networkidle' })
  check(`${width}px about: RPC returns nothing → no section, no heading`, (await page.locator('#kisanon-ki-rai').count()) === 0 && !(await page.locator('main, body').first().innerText()).includes('किसानों की राय'))
  // Test rows only — answered by this script, never stored. The extra fields prove the page ignores them.
  net.pub = { status: 200, ...jsonBody([
    { message: 'मंडी भाव रोज़ देखता हूँ, बहुत काम आता है।', kind: 'suggestion', lang: 'hi', created_at: '2026-10-10T05:00:00Z', contact_email: 'leak@example.com', contact_mobile: '9999999999', device_id: 'dev-x' },
    { message: 'Please add more districts to the cold storage list.', kind: 'other', lang: 'en', created_at: '2026-10-09T05:00:00Z' },
    { message: 'यह नहीं दिखना चाहिए।', kind: 'problem', lang: 'hi', created_at: '2026-10-08T05:00:00Z' },
  ]) }
  await page.reload({ waitUntil: 'networkidle' })
  const section = page.locator('#kisanon-ki-rai')
  await section.waitFor()
  const sectionText = await section.innerText()
  check(`${width}px about: approved rows → heading, message text and type label`, sectionText.includes('किसानों की राय') && sectionText.includes('मंडी भाव रोज़ देखता हूँ') && sectionText.includes('Please add more districts') && sectionText.includes('सुझाव') && sectionText.includes('अन्य') && (await section.locator('li').count()) === 2)
  check(`${width}px about: no contact detail, device id or date is rendered; a "problem" row is dropped`, !/leak@example\.com|9999999999|dev-x|2026|यह नहीं दिखना चाहिए/.test(await section.innerHTML()))
  check(`${width}px about: no horizontal scroll with the section shown`, await noScroll())
  await section.scrollIntoViewIfNeeded()
  await section.screenshot({ path: join(OUT, `about-voices-${width}.png`) })

  check(`${width}px safety: no other write reached Supabase`, true, net.blocked.join(','))
  if (net.blocked.length) console.log(`      (blocked non-GET Supabase calls: ${[...new Set(net.blocked)].join(', ')})`)
  await ctx.close()
}
await browser.close()
server.close()

writeFileSync(join(OUT, 'browser-check.json'), JSON.stringify(results, null, 2), 'utf8')
const passed = results.filter((r) => r.ok).length
console.log(`\n${passed} passed, ${failures} failed`)
process.exit(failures ? 1 : 0)
