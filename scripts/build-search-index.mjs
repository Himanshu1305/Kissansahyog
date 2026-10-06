#!/usr/bin/env node
// Phase 10 — build the static site-wide search index.
//   node --env-file=.env scripts/build-search-index.mjs
// Queries published/public content from Supabase (service role, read-only) and
// writes public/search-index.json: a flat array of searchable items. The runtime
// (src/lib/search/searchApi.js) fetches this once and does substring+synonym
// scoring on the client; live listings are layered on top via an RPC at query time.
//
// Every DB query is wrapped in try/catch and defaults to [] so a missing table or
// column can NEVER fail the build — the index just loses that content type.
import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CROPS } from '../src/content/crops.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'search-index.json')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

// Lowercased, space-joined searchable terms. Drops empties/nullish.
const kw = (...parts) => parts
  .filter((p) => p != null && String(p).trim())
  .map((p) => String(p).trim())
  .join(' ')
  .toLowerCase()

// District slug for cold-storage detail URLs: lowercase, spaces→-, strip non-alnum/-.
const slugifyDistrict = (d) => String(d || '')
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')

// Run a loader defensively — a thrown error or a Supabase error becomes [].
async function safe(label, fn) {
  try {
    const items = await fn()
    const arr = Array.isArray(items) ? items.filter(Boolean) : []
    console.log(`  ${label}: ${arr.length}`)
    return arr
  } catch (e) {
    console.warn(`  ${label}: skipped (${e?.message || e})`)
    return []
  }
}

const items = []

// --- Articles ---
items.push(...await safe('articles', async () => {
  const { data, error } = await sb
    .from('articles')
    .select('slug,title_hi,title_en,summary_hi,summary_en,published_at')
    .not('published_at', 'is', null)
  if (error) throw error
  return (data || []).filter((r) => r.slug).map((r) => ({
    type: 'article',
    title_hi: r.title_hi || '',
    title_en: r.title_en || '',
    subtitle_hi: r.summary_hi || '',
    subtitle_en: r.summary_en || '',
    url: `/articles/${r.slug}`,
    keywords: kw(r.title_hi, r.title_en, r.summary_hi, r.summary_en),
  }))
}))

// --- Schemes (sarkari yojana) ---
items.push(...await safe('schemes', async () => {
  const { data, error } = await sb
    .from('sarkari_yojana')
    .select('slug,scheme_name_hi,scheme_name_en,ministry_hi,ministry_en')
    .eq('is_active', true)
  if (error) throw error
  return (data || []).filter((r) => r.slug).map((r) => ({
    type: 'scheme',
    title_hi: r.scheme_name_hi || '',
    title_en: r.scheme_name_en || '',
    subtitle_hi: r.ministry_hi || '',
    subtitle_en: r.ministry_en || '',
    url: `/yojana/${r.slug}`,
    keywords: kw(r.scheme_name_hi, r.scheme_name_en, r.ministry_hi, r.ministry_en),
  }))
}))

// --- Videos ---
items.push(...await safe('videos', async () => {
  const { data, error } = await sb
    .from('videos')
    .select('title_hi,title_en,channel_name')
    .eq('is_active', true)
  if (error) throw error
  return (data || []).map((r) => ({
    type: 'video',
    title_hi: r.title_hi || '',
    title_en: r.title_en || '',
    subtitle_hi: r.channel_name || '',
    subtitle_en: r.channel_name || '',
    url: '/videos',
    keywords: kw(r.title_hi, r.title_en, r.channel_name),
  }))
}))

// --- Kisan Sawaal (Q&A) ---
items.push(...await safe('sawaal', async () => {
  // Select '*' so a missing optional column (e.g. slug) never breaks the query.
  const { data, error } = await sb
    .from('kisan_sawaal')
    .select('*')
    .eq('is_published', true)
  if (error) throw error
  return (data || []).map((r) => {
    const ansHi = String(r.answer_hi || '').slice(0, 160)
    const ansEn = String(r.answer_en || '').slice(0, 160)
    return {
      type: 'sawaal',
      title_hi: r.question_hi || '',
      title_en: r.question_en || '',
      subtitle_hi: ansHi,
      subtitle_en: ansEn,
      url: r.slug ? `/sawaal/${r.slug}` : '/sawaal',
      keywords: kw(r.question_hi, r.question_en, r.crop, r.category, ansHi, ansEn),
    }
  })
}))

// --- Cold storage (public view) ---
items.push(...await safe('cold_storage', async () => {
  const { data, error } = await sb
    .from('cold_storage_public')
    .select('name,city,district')
    .limit(300)
  if (error) throw error
  return (data || []).filter((r) => r.name).map((r) => ({
    type: 'cold_storage',
    title_hi: r.name || '',
    title_en: r.name || '',
    subtitle_hi: kw(r.city, r.district),
    subtitle_en: kw(r.city, r.district),
    url: `/cold-storage/${slugifyDistrict(r.district)}`,
    keywords: kw(r.name, r.city, r.district, 'cold storage godown warehouse'),
  }))
}))

// --- Kisan Mela ---
items.push(...await safe('mela', async () => {
  const { data, error } = await sb
    .from('kisan_mela')
    .select('*')
    .eq('is_active', true)
  if (error) throw error
  return (data || []).map((r) => ({
    type: 'mela',
    title_hi: r.name_hi || r.name || r.title_hi || r.title || '',
    title_en: r.name_en || r.name || r.title_en || r.title || '',
    subtitle_hi: kw(r.district, r.state, r.venue),
    subtitle_en: kw(r.district, r.state, r.venue),
    url: '/kisan-mela',
    keywords: kw(r.name_hi, r.name_en, r.name, r.title, r.district, r.state, r.venue, 'kisan mela'),
  }))
}))

// --- Resources ---
items.push(...await safe('resources', async () => {
  const { data, error } = await sb
    .from('resources')
    .select('name_hi,name_en,district,resource_type')
    .eq('is_active', true)
  if (error) throw error
  return (data || []).map((r) => ({
    type: 'resource',
    title_hi: r.name_hi || '',
    title_en: r.name_en || '',
    subtitle_hi: kw(r.district, r.resource_type),
    subtitle_en: kw(r.district, r.resource_type),
    url: '/resources',
    keywords: kw(r.name_hi, r.name_en, r.district, r.resource_type),
  }))
}))

// --- Experts ---
items.push(...await safe('experts', async () => {
  // '*' + defensive mapping — specialization column naming varies.
  const { data, error } = await sb
    .from('experts')
    .select('*')
    .eq('is_active', true)
  if (error) throw error
  return (data || []).map((r) => {
    const specHi = r.specialisation_hi || r.specialization_hi || ''
    const specEn = r.specialisation_en || r.specialization_en || ''
    return {
      type: 'expert',
      title_hi: r.name_hi || r.name || '',
      title_en: r.name_en || r.name || '',
      subtitle_hi: specHi,
      subtitle_en: specEn,
      url: '/experts',
      keywords: kw(r.name, r.name_hi, r.name_en, specHi, specEn, r.organisation),
    }
  })
}))

// --- Crops / MSP (static content) ---
items.push(...await safe('msp', async () => {
  return (CROPS || []).filter((c) => c.slug).map((c) => {
    const titleHi = c.name_hi || c.hi || ''
    const titleEn = c.name_en || c.en || ''
    return {
      type: 'msp',
      title_hi: titleHi,
      title_en: titleEn,
      subtitle_hi: '',
      subtitle_en: '',
      url: `/msp/${c.slug}`,
      keywords: kw(titleHi, titleEn, c.mandi_en, c.msp_en, c.slug, 'msp mandi'),
    }
  })
}))

// --- Hub pages (static) ---
const HUBS = [
  { title_hi: 'ग्रीनहाउस / पॉलीहाउस — वेंडर व ज़रूरतें', title_en: 'Greenhouse / Polyhouse — vendors & needs', url: '/greenhouse', keywords: 'greenhouse polyhouse vendor ग्रीनहाउस पॉलीहाउस वेंडर' },
  { title_hi: 'ग्रीनहाउस / पॉलीहाउस सब्सिडी गाइड (मध्य प्रदेश)', title_en: 'Greenhouse / Polyhouse Subsidy Guide (MP)', url: '/greenhouse/subsidy', keywords: 'greenhouse polyhouse subsidy MP cost norm ग्रीनहाउस पॉलीहाउस सब्सिडी लागत' },
  { title_hi: 'कार्बन क्रेडिट', title_en: 'Carbon Credit', url: '/carbon-credit', keywords: 'carbon credit कार्बन क्रेडिट' },
  { title_hi: 'जुगाड़ — ग्रामीण नवाचार बाज़ार', title_en: 'Jugaad — rural innovation marketplace', url: '/jugaad', keywords: 'jugaad innovation marketplace जुगाड़ नवाचार बाज़ार' },
  { title_hi: 'जुगाड़ की जानकारी और नियम', title_en: 'Jugaad information and rules', url: '/jugaad/jankari', keywords: 'jugaad guide rules legal जुगाड़ जानकारी नियम' },
  { title_hi: 'कोल्ड स्टोरेज खोजें', title_en: 'Cold Storage Finder', url: '/cold-storage', keywords: 'cold storage godown warehouse कोल्ड स्टोरेज गोदाम' },
  { title_hi: 'कृषि वानिकी', title_en: 'Agro Forestry', url: '/agro-forestry', keywords: 'agro forestry agroforestry कृषि वानिकी' },
  { title_hi: 'मौसम', title_en: 'Weather / Mausam', url: '/mausam', keywords: 'mausam weather rain मौसम बारिश' },
  { title_hi: 'मंडी भाव / MSP', title_en: 'Mandi Prices / MSP', url: '/msp', keywords: 'msp mandi price मंडी भाव न्यूनतम समर्थन मूल्य' },
  { title_hi: 'ड्रोन दीदी', title_en: 'Drone Didi', url: '/drone-didi', keywords: 'drone didi ड्रोन दीदी spraying' },
  { title_hi: 'किसान सवाल', title_en: 'Kisan Sawaal', url: '/sawaal', keywords: 'sawaal question answer किसान सवाल जवाब' },
  { title_hi: 'किसान मेला', title_en: 'Kisan Mela', url: '/kisan-mela', keywords: 'kisan mela fair किसान मेला' },
]
items.push(...HUBS.map((h) => ({
  type: 'hub',
  title_hi: h.title_hi,
  title_en: h.title_en,
  subtitle_hi: '',
  subtitle_en: '',
  url: h.url,
  keywords: h.keywords.toLowerCase(),
})))
console.log(`  hubs: ${HUBS.length}`)

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(items, null, 2) + '\n', 'utf8')
console.log(`\nWrote ${items.length} items to public/search-index.json`)
