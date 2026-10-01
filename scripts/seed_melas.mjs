#!/usr/bin/env node
// SAMPLE Kisan Mela seed — a small set of REAL, recurring, institution-hosted Melas with their
// own official source pages, for UI demonstration + testing until the AI discovery pipeline runs
// (which needs ANTHROPIC_API_KEY). Honest dates: next-year dates that aren't officially confirmed
// are stored as is_date_confirmed=false + expected_period ("अपेक्षित"); one confirmed sample is
// included to demonstrate the confirmed-vs-expected UI distinction (clearly a seed sample).
// Idempotent (fixed UUIDs). Run: node --env-file=.env scripts/seed_melas.mjs
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const today = new Date().toISOString().slice(0, 10)
const plus = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

const ROWS = [
  {
    id: '11111111-0000-4000-8000-0000000000a1',
    name_hi: 'पीएयू किसान मेला, लुधियाना', name_en: 'PAU Kisan Mela, Ludhiana',
    organizer_name: 'Punjab Agricultural University (PAU)',
    venue: 'PAU Campus', address: 'Ferozepur Road, Ludhiana', state: 'Punjab', district: 'Ludhiana',
    latitude: 30.9010, longitude: 75.8073,
    event_date_start: null, event_date_end: null, is_date_confirmed: false, expected_period: 'Mar 2027',
    category_tags: ['seeds', 'machinery', 'scheme_scientist'],
    highlights_hi: 'नई किस्मों के बीज, कृषि यंत्र प्रदर्शन, वैज्ञानिकों से सीधी सलाह।',
    highlights_en: 'New variety seeds, farm-machinery demos, direct advice from scientists.',
    source_url: 'https://www.pau.edu/',
  },
  {
    id: '22222222-0000-4000-8000-0000000000a2',
    name_hi: 'पंतनगर किसान मेला, जी.बी. पंत कृषि विश्वविद्यालय', name_en: 'Pantnagar Kisan Mela, GBPUA&T',
    organizer_name: 'G.B. Pant University of Agriculture & Technology',
    venue: 'GBPUA&T Campus', address: 'Pantnagar, Udham Singh Nagar', state: 'Uttarakhand', district: 'Udham Singh Nagar',
    latitude: 29.0222, longitude: 79.4908,
    event_date_start: null, event_date_end: null, is_date_confirmed: false, expected_period: 'Oct 2026',
    category_tags: ['seeds', 'machinery', 'horticulture'],
    highlights_hi: 'बीज बिक्री, बागवानी प्रदर्शनी, कृषि यंत्र।',
    highlights_en: 'Seed sales, horticulture exhibition, farm machinery.',
    source_url: 'https://www.gbpuat.ac.in/',
  },
  {
    id: '33333333-0000-4000-8000-0000000000a3',
    name_hi: 'पूसा कृषि विज्ञान मेला, आई.ए.आर.आई', name_en: 'Pusa Krishi Vigyan Mela, IARI',
    organizer_name: 'Indian Agricultural Research Institute (IARI)',
    venue: 'IARI, Pusa', address: 'Pusa Campus, New Delhi', state: 'Delhi', district: 'New Delhi',
    latitude: 28.6389, longitude: 77.1570,
    event_date_start: null, event_date_end: null, is_date_confirmed: false, expected_period: 'Feb 2027',
    category_tags: ['seeds', 'scheme_scientist', 'horticulture', 'general'],
    highlights_hi: 'उन्नत बीज, कृषि तकनीक प्रदर्शन, वैज्ञानिक सलाह, योजना जानकारी।',
    highlights_en: 'Improved seeds, technology demos, scientist advice, scheme information.',
    source_url: 'https://www.iari.res.in/',
  },
  {
    // Confirmed sample (clearly a seed sample) — demonstrates the confirmed-date UI treatment.
    id: '44444444-0000-4000-8000-0000000000a4',
    name_hi: 'कृषि मेला, कृषि विज्ञान विश्वविद्यालय बेंगलुरु', name_en: 'Krishi Mela, UAS Bengaluru',
    organizer_name: 'University of Agricultural Sciences (UAS), Bengaluru',
    venue: 'GKVK Campus', address: 'GKVK, Bellary Road, Bengaluru', state: 'Karnataka', district: 'Bengaluru',
    latitude: 13.0784, longitude: 77.5793,
    event_date_start: plus(21), event_date_end: plus(24), is_date_confirmed: true, expected_period: null,
    category_tags: ['seeds', 'machinery', 'livestock', 'horticulture'],
    highlights_hi: 'बीज, पशुधन प्रदर्शनी, कृषि यंत्र, बागवानी।',
    highlights_en: 'Seeds, livestock show, farm machinery, horticulture.',
    source_url: 'https://uasbangalore.edu.in/',
    // Multi-source sample — corroborated by two independent sources → "कई स्रोतों से" badge (Phase 6a).
    source_urls: ['https://uasbangalore.edu.in/', 'https://krishimela.uasbangalore.edu.in/'],
  },
]

async function main() {
  let n = 0
  for (const r of ROWS) {
    const row = { ...r, last_checked_date: today, submitted_by_user: false, moderation_status: 'approved', is_active: true }
    const { error } = await db.from('kisan_mela').upsert(row, { onConflict: 'id' })
    if (error) { console.error(`seed failed (${r.name_en}): ${error.message}`); process.exit(1) }
    n += 1
  }
  const { count } = await db.from('kisan_mela').select('*', { count: 'exact', head: true }).eq('submitted_by_user', false)
  console.log(`seeded ${n} sample melas. total AI/seed rows now: ${count}`)
  console.log('NOTE: these are SAMPLE entries (real institutions + real source pages) for UI demo until the discovery pipeline runs with ANTHROPIC_API_KEY.')
}
main().catch((e) => { console.error('SEED ERROR:', e.message); process.exit(1) })
