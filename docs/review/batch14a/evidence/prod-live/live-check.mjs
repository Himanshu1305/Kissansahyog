import { chromium } from '@playwright/test'
import fs from 'node:fs'
const BASE = 'https://kissansahyog.com'
const OUT = 'docs/review/batch14a/evidence/prod-live'
const paths = ['/','/browse','/signup','/login','/post','/my','/admin','/msp','/mausam','/guide','/about','/contact']
const sizes = [[320,640],[360,640],[412,860]]
const results = []
const browser = await chromium.launch()
for (const lang of ['hi','en']) for (const [w,h] of sizes) {
  const ctx = await browser.newContext({ viewport:{width:w,height:h} })
  await ctx.addInitScript(l => { try { localStorage.setItem('ks_lang_v1', l) } catch {} }, lang)
  for (const p of paths) {
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push('pageerror: '+String(e).slice(0,160)))
    page.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text().slice(0,160)) })
    let status = 0
    try {
      const r = await page.goto(BASE+p, { waitUntil:'networkidle', timeout:45000 }); status = r.status()
      await page.waitForTimeout(1200)
    } catch (e) { errs.push('nav: '+String(e).slice(0,120)) }
    const body = (await page.evaluate(() => document.body.innerText).catch(()=> '')) || ''
    const errBoundary = /पेज नहीं खुल पाया|This page could not open/.test(body)
    const blank = body.trim().length < 40
    const denied = /पहुँच नहीं|Access denied/.test(body)
    const hs = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(()=>false)
    // ignore noisy third-party/network console errors? record all
    const row = { lang, size:`${w}x${h}`, path:p, status, blank, errBoundary, denied, hscroll:hs, errs }
    if (lang==='hi' || p==='/') {}
    if ((p==='/'||p==='/browse'||p==='/admin') && w===360) await page.screenshot({ path:`${OUT}/screens/${p==='/'?'home':p.slice(1)}-${w}-${lang}.png` }).catch(()=>{})
    results.push(row); await page.close()
  }
  await ctx.close()
}
// home content checks
const ctx = await browser.newContext({ viewport:{width:360,height:640} })
await ctx.addInitScript(() => { try { localStorage.setItem('ks_lang_v1','hi') } catch {} })
const page = await ctx.newPage(); await page.goto(BASE+'/',{waitUntil:'networkidle'}); await page.waitForTimeout(1500)
const home = await page.evaluate(() => ({
  announcements: !!document.querySelector('[data-testid="announcements"]'),
  bigNeed: document.body.innerText.includes('मुझे कुछ चाहिए'), bigHave: document.body.innerText.includes('मेरे पास कुछ है'),
  rupees: (document.body.innerText.match(/₹/g)||[]).length, footerBharat: document.body.innerText.includes('· भारत'),
  wa: !!document.querySelector('a[href*="whatsapp.com/channel"]'),
}))
const b = await ctx.newPage(); await b.goto(BASE+'/browse',{waitUntil:'networkidle'}); await b.waitForTimeout(1500)
home.browseSections = await b.evaluate(() => document.querySelectorAll('section, [data-testid^="browse"]').length)
home.browseTestIds = await b.evaluate(() => [...new Set([...document.querySelectorAll('[data-testid]')].map(e=>e.dataset.testid))].filter(x=>/browse/i.test(x)))
await browser.close()
fs.writeFileSync(`${OUT}/live-check.json`, JSON.stringify({ results, home }, null, 1))
const bad = results.filter(r => r.status!==200 || r.blank || r.errBoundary || r.errs.length)
console.log('rows', results.length, 'problem rows', bad.length)
for (const r of bad) console.log(JSON.stringify(r))
const adm = results.filter(r=>r.path==='/admin'); console.log('admin denied', adm.filter(r=>r.denied).length+'/'+adm.length)
console.log('hscroll', results.filter(r=>r.hscroll).map(r=>r.lang+r.size+r.path).join(' ')||'none')
console.log(JSON.stringify(home))
