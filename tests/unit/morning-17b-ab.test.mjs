// Batch 17B - Defect A (CSP media-src so the voice can play) and Defect B (admin link to /admin/morning).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { rolldown } from 'rolldown'
import { strings } from '../../src/lib/i18n/strings.js'
import { adminStrings } from '../../src/lib/i18n/adminStrings.js'

const read = (p) => readFileSync(p, 'utf8')

test('A: public/_headers CSP has media-src and every earlier directive', () => {
  const csp = read('public/_headers').split(/\r?\n/).find((l) => /^\s*Content-Security-Policy:/i.test(l))
  assert.ok(csp, 'CSP line')
  const dirs = csp.replace(/^\s*Content-Security-Policy:\s*/i, '').split(';').map((d) => d.trim())
  const get = (n) => dirs.find((d) => d.split(/\s+/)[0] === n)
  assert.equal(get('media-src'), "media-src 'self' data: blob:")
  assert.equal(get('default-src'), "default-src 'self'")
  assert.ok(get('script-src').includes("'self'") && get('style-src').includes("'self'"))
  assert.ok(get('img-src').includes('https://images.pexels.com') && get('img-src').includes('https://wzxtqbqlahyahsnoqqva.supabase.co') && get('img-src').includes('https://eltmcznjcqiahqhjvpjg.supabase.co'))
  assert.ok(get('connect-src').includes('https://*.supabase.co') && get('connect-src').includes('https://api.open-meteo.com'))
  assert.equal(get('font-src'), "font-src 'self' data:")
  assert.equal(get('frame-ancestors'), "frame-ancestors 'none'")
  assert.ok(csp.includes("media-src 'self' data: blob:"))
})
test('A: the build only copies public/_headers (nothing rewrites the CSP), and the prod guard strips only host tokens', () => {
  const guard = read('scripts/check-prod-env.mjs')
  assert.ok(guard.includes('stripCspProjectHosts'))
  // no build script writes dist/_headers with new content
  for (const f of ['scripts/prerender.mjs', 'scripts/gen-sitemaps.mjs', 'vite.config.js']) assert.ok(!/writeFileSync\([^)]*_headers/.test(read(f)), f)
})

let Link
async function loadLink() {
  if (Link) return Link
  const dir = join(process.cwd(), 'node_modules', '.cache', 'morning-17b'); mkdirSync(dir, { recursive: true })
  const b = await rolldown({ input: 'src/screens/admin/MorningLink.jsx', external: ['react', 'react/jsx-runtime', /^react-dom/, /^react-router/], transform: { jsx: { runtime: 'automatic' } }, platform: 'node' })
  await b.write({ dir, format: 'esm', entryFileNames: 'link.mjs' })
  Link = await import(pathToFileURL(join(dir, 'link.mjs')).href + `?v=${Date.now()}`)
  return Link
}
test('B: the link is rendered, 48 px high, points to /admin/morning, in Hindi and English', async () => {
  const { default: L } = await loadLink()
  const en = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(L, { t: (k) => strings[k].en })))
  assert.ok(en.includes('data-testid="admin-morning-link"') && en.includes('href="/admin/morning"') && en.includes('min-h-[48px]') && en.includes('Morning post'))
  const hi = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(L, { t: (k) => strings[k].hi })))
  assert.ok(hi.includes('सुबह की पोस्ट'))
})
test('B: string has both languages; Admin.jsx shows the link only after the non-admin block (which stays)', () => {
  assert.ok(adminStrings.adm_morning_link.hi && adminStrings.adm_morning_link.en); assert.equal(strings.adm_morning_link.en, 'Morning post')
  const src = read('src/screens/Admin.jsx')
  const denied = src.indexOf("if (!user?.is_admin)"); const link = src.indexOf('<MorningLink')
  assert.ok(denied > 0 && link > denied, 'link is rendered after the access-denied early return')
  assert.ok(src.includes("t('access_denied')") && src.includes("from './admin/MorningLink'"))
  // the early-return block itself does not contain the link
  assert.ok(!src.slice(denied, src.indexOf('const go =')).includes('MorningLink'))
})
test('B: /admin/morning itself stays noindex, Disallowed, out of sitemap/prerender', () => {
  const src = read('src/screens/AdminMorning.jsx')
  assert.ok(src.includes('noindex') && src.includes('user?.is_admin'))
  assert.match(read('public/robots.txt'), /Disallow: \/admin/)
  for (const f of ['scripts/gen-sitemaps.mjs', 'scripts/prerender.mjs']) assert.ok(!/admin/i.test(read(f)), f)
})
