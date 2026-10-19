// Recapture the final 320 px Hindi error without numbers or any database writes/SMS.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser=await chromium.launch()
try{
  const page=await browser.newPage({viewport:{width:320,height:1000},deviceScaleFactor:1,serviceWorkers:'block'})
  await page.addInitScript(()=>localStorage.setItem('ks_lang_v1','hi'))
  await page.route('**/api/otp/config',r=>r.fulfill({json:{otp_required:true,session_enforced:false}}))
  await page.route('**/api/otp/send',r=>r.fulfill({status:409,json:{error:'phone_not_registered'}}))
  await page.goto('http://127.0.0.1:8788/login')
  await page.locator('#phone').fill('90000'+'12345')
  await page.getByTestId('login-phone-submit').click()
  await page.getByTestId('login-create-account').waitFor()
  assert.equal(await page.getByTestId('login-phone-error').textContent(),'इस नंबर से कोई खाता नहीं मिला। पहले नया खाता बनाएं। अगर आपका खाता ई-मेल से है, तो ई-मेल से लॉगिन करें।')
  assert.equal(await page.getByTestId('login-otp-step').count(),0)
  assert.ok((await page.getByTestId('login-create-account').boundingBox()).height>=48)
  await page.locator('#phone').fill('')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=320))
  await page.evaluate(()=>scrollTo(0,0))
  await page.screenshot({path:'docs/review/batch11b/evidence/screens/login-not-registered-hi-320.png',fullPage:true})
  console.log('PASS: sanitized Hindi screenshot at 320 px; alert/button fit, no OTP box; no database writes')
}finally{await browser.close()}
