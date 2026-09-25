// Generates SEED SQL for migration 0024 from /tmp/seeds/*.json (page FAQs,
// procurement centres, Bhavantar scheme row). Emits to stdout.
import { readFileSync } from 'node:fs'
const S = process.env.SEEDS || '/tmp/seeds'
const faqs = JSON.parse(readFileSync(`${S}/page_faqs.json`, 'utf8'))
const proc = JSON.parse(readFileSync(`${S}/procurement.json`, 'utf8'))
const bh = JSON.parse(readFileSync(`${S}/bhavantar.json`, 'utf8'))

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const jb = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
const arr = (a) => `array[${(a || []).map((x) => `'${String(x).replace(/'/g, "''")}'`).join(',')}]::text[]`
const out = []

out.push('\n-- Seed: page FAQs (mausam + msp)')
faqs.forEach((f) => {
  out.push(`insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values (${q(f.page_key)},${q(f.q_hi)},${q(f.q_en)},${q(f.a_hi)},${q(f.a_en)},${f.sort_order}) on conflict do nothing;`)
})

out.push('\n-- Seed: procurement centres (e-Uparjan, e-NAM)')
proc.forEach((p) => {
  out.push(`insert into public.procurement_centres (name_hi,location,district,crops,season,portal_url,notes_hi,is_active) values (${q(p.name_hi)},${q(p.location)},${q(p.district)},${arr(p.crops)},${q(p.season)},${q(p.portal_url)},${q(p.notes_hi)},true) on conflict do nothing;`)
})

out.push('\n-- Seed: Bhavantar Bhugtan Yojana (MP state scheme) in sarkari_yojana')
out.push(`insert into public.sarkari_yojana (id,scheme_name_hi,scheme_name_en,ministry_hi,ministry_en,category,description_hi,description_en,benefit_hi,benefit_en,eligibility_hi,eligibility_en,how_to_apply_hi,how_to_apply_en,official_website,helpline,is_active,is_featured,sort_order,slug,government_level,faqs,documents_required_hi,documents_required_en,source_url,last_verified_date) values ('00000000-0000-4000-c000-00000000000d',${q(bh.scheme_name_hi)},${q(bh.scheme_name_en)},${q(bh.ministry_hi)},${q(bh.ministry_en)},${q(bh.category)},${q(bh.summary_hi)},${q(bh.summary_en)},${q(bh.benefit_hi)},${q(bh.benefit_en)},${q(bh.eligibility_hi)},${q(bh.eligibility_en)},${q(bh.how_to_apply_hi)},${q(bh.how_to_apply_en)},${q(bh.official_website)},${q(bh.helpline)},true,false,25,${q(bh.slug)},'state',${jb(bh.faqs)},${q(bh.documents_required_hi)},${q(bh.documents_required_en)},${q(bh.source_url)},${q(bh.last_verified_date)}) on conflict (slug) do nothing;`)

process.stdout.write(out.join('\n') + '\n')
