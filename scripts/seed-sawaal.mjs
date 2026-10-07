#!/usr/bin/env node
// V2 Phase 12 — seed the Kisan Sawaal knowledge base into kisan_sawaal.
//   node --env-file=.env scripts/seed-sawaal.mjs
// Upserts the authored Q&As (src/content/qa/*.js) by slug, and backfills slugs
// + published_at on the existing (legacy) published rows so they get pages too.
import { createClient } from '@supabase/supabase-js'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const QADIR = join(HERE, '..', 'src/content/qa')
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)

async function main() {
  // 1. authored Q&As
  const files = readdirSync(QADIR).filter((f) => f.endsWith('.js'))
  let inserted = 0, updated = 0
  for (const f of files) {
    const mod = await import(join(QADIR, f))
    const recs = mod.default || []
    for (const q of recs) {
      const { data: existing } = await db.from('kisan_sawaal').select('id').eq('slug', q.slug).maybeSingle()
      const row = {
        question_hi: q.question_hi,
        question_en: q.question_en || null,
        answer_hi: q.short_hi,
        answer_en: q.short_en || null,
        answered_by: 'Team Kissan Sahyog',
        is_published: q.unpublish ? false : true,
        crop: q.crop || null,
        category: q.category,
        season: q.season || 'all',
        slug: q.slug,
        answer_blocks: q.unpublish ? (q.blocks || null) : q.blocks,
        answer_blocks_en: q.blocks_en || null,
        sources: q.sources,
        updated_at: new Date().toISOString(),
      }
      if (existing) {
        await db.from('kisan_sawaal').update(row).eq('id', existing.id)
        updated++
      } else {
        await db.from('kisan_sawaal').insert({ ...row, published_at: new Date().toISOString() })
        inserted++
      }
    }
  }

  // 2. backfill slugs/published_at on legacy published rows without a slug
  const { data: legacy } = await db.from('kisan_sawaal').select('id, question_en, category, slug, is_published, published_at').is('slug', null)
  let backfilled = 0
  const used = new Set()
  for (const r of legacy || []) {
    if (!r.is_published) continue
    let base = r.question_en ? slugify(r.question_en) : `sawaal-${r.category || 'prashna'}`
    if (!base) base = 'sawaal'
    let slug = base, n = 1
    // ensure uniqueness
    while (used.has(slug) || (await db.from('kisan_sawaal').select('id').eq('slug', slug).maybeSingle()).data) { slug = `${base}-${++n}` }
    used.add(slug)
    await db.from('kisan_sawaal').update({ slug, published_at: r.published_at || new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id)
    backfilled++
  }

  const { count } = await db.from('kisan_sawaal').select('id', { count: 'exact', head: true }).not('slug', 'is', null).eq('is_published', true)
  console.log(`Seeded: ${inserted} inserted, ${updated} updated; ${backfilled} legacy slugs backfilled. Published-with-slug total: ${count}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
