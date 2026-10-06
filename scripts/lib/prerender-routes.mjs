// Shared route list for prerendering (scripts/prerender.mjs) and sitemap
// generation (Phase 14). Static public routes + data-driven slugs. Auth-gated
// routes are intentionally excluded.
import { createClient } from '@supabase/supabase-js'
import { CROPS } from '../../src/content/crops.js'

// Public, non-auth content routes that always exist.
export const STATIC_ROUTES = [
  '/',
  '/privacy',
  '/terms',
  '/grievance',
  '/contact',
  '/cold-storage',
  '/greenhouse',
  '/carbon-credit',
  '/carbon-credit/niti-sujhav',
  '/jugaad',
  '/articles',
  '/resources',
  '/info',
  '/sawaal',
  '/safalta',
  '/yojana',
  '/yojana/central',
  '/yojana/mp',
  '/videos',
  '/drone-didi',
  '/mausam',
  '/fasal-salah',
  '/agro-forestry',
  '/msp',
  '/credits',
  '/kisan-mela',
  '/kisan-mela/submit',
  // V2 routes are appended to this list as their screens land, each in its phase:
  //   Phase 4 '/grievance'; Phase 6 '/cold-storage'(+districts); Phase 7 '/greenhouse';
  //   Phase 8 '/carbon-credit','/carbon-credit/niti-sujhav'; Phase 9 '/jugaad'.
]

// Routes that must NEVER be prerendered (auth-gated / app shell / dynamic app).
export const EXCLUDE = ['/home', '/browse', '/post', '/my', '/experts', '/profile', '/admin', '/login', '/signup', '/welcome', '/listing', '/search']

async function supa() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function getRoutes({ verbose = false } = {}) {
  const routes = new Set(STATIC_ROUTES)

  // MSP per-crop pages (static content list).
  for (const c of CROPS) if (c.slug) routes.add(`/msp/${c.slug}`)

  const db = await supa()
  if (db) {
    try {
      const { data: schemes } = await db.from('sarkari_yojana').select('slug').eq('is_active', true)
      for (const s of schemes || []) if (s.slug) routes.add(`/yojana/${s.slug}`)
    } catch (e) { if (verbose) console.warn('schemes fetch failed', e.message) }
    try {
      const { data: arts } = await db.from('articles').select('slug').not('published_at', 'is', null)
      for (const a of arts || []) if (a.slug) routes.add(`/articles/${a.slug}`)
    } catch (e) { if (verbose) console.warn('articles fetch failed', e.message) }
    // Cold storage districts + Q&A slugs (tables arrive in Phases 6/12 — fail-soft).
    try {
      const { data: cs } = await db.from('cold_storage_public').select('district')
      const districts = [...new Set((cs || []).map((r) => r.district).filter(Boolean))]
      for (const d of districts) routes.add(`/cold-storage/${slugifyDistrict(d)}`)
    } catch { /* table not created yet */ }
    try {
      const { data: qa } = await db.from('kisan_sawaal').select('slug,crop,category').not('slug', 'is', null).eq('is_published', true)
      const crops = new Set(), cats = new Set()
      for (const q of qa || []) {
        if (q.slug) routes.add(`/sawaal/${q.slug}`)
        if (q.crop) crops.add(q.crop)
        if (q.category) cats.add(q.category)
      }
      // Crop hubs (/fasal/<crop>/samasya) and category hubs (/sawaal/vishay/<cat>).
      for (const c of crops) routes.add(`/fasal/${c}/samasya`)
      for (const c of cats) routes.add(`/sawaal/vishay/${c}`)
    } catch { /* column not added yet */ }
  } else if (verbose) {
    console.warn('No Supabase env — prerendering static routes only.')
  }

  return [...routes].filter((r) => !EXCLUDE.some((e) => r === e || r.startsWith(e + '/')))
}

export function slugifyDistrict(d) {
  return String(d).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
