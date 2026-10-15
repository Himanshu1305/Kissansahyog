// Which password does throw-away N1 have now (shared or shared+'Z')? Prints only which variant works.
import * as L from './lib.mjs'
const N1 = L.newNoise('N1'); const pw = L.password()
const { ctx, page } = await L.newPhone({ lang: 'hi' })
const a = await L.loginEmail(page, N1.email, pw); if (a.ok) await L.logout(page)
const b = a.ok ? { ok: false } : await L.loginEmail(page, N1.email, pw + 'Z')
console.log(JSON.stringify({ sharedWorks: a.ok, sharedError: a.error, variantZWorks: b.ok }))
await ctx.close(); await L.closeBrowser()
