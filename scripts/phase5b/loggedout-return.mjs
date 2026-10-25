import * as L from 'file:///C:/Users/usdvi/projects/Kissansahyog/scripts/phase5b/lib.mjs'
const st = L.loadState(); const l = st.listings.find((x) => x.lid === 'L03'); const P2 = L.persona('P2'); const t = L.town('Sagar')
for (let i = 0; i < 2; i++) {
const { ctx, page } = await L.newPhone({ geo: { lat: t.lat, lng: t.lng }, lang: 'hi' })
const log = []; page.on('response', (r) => { if (r.url().includes('/rpc/app_login')) log.push(r.status()) })
const t0 = Date.now()
await L.goto(page, `/listing/${l.id}`, 2000)
await page.locator('[data-testid="contact-call"]').first().click()
await page.waitForURL(/\/login/)
await page.fill('[data-testid="login-phone-form"] #phone', P2.mobile)
await page.click('[data-testid="login-phone-submit"]')
await page.waitForURL((u) => u.pathname.startsWith('/listing/'), { timeout: 60000 }).catch(() => {})
await page.waitForTimeout(1500)
console.log(JSON.stringify({ run: i + 1, appLoginStatus: log, secs: Math.round((Date.now() - t0) / 1000), path: new URL(page.url()).pathname === `/listing/${l.id}` ? 'same listing' : new URL(page.url()).pathname, contactButtons: await page.locator('[data-testid="contact-call"]').count() }))
await L.shot(page, 'visibility', `V2-loggedout-return-retry${i + 1}`)
await ctx.close()
}
await L.closeBrowser()
