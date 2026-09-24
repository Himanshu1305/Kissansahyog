// Generates the SEED SQL for migration 0023 from the /tmp/seeds/*.json datasets
// (videos, Kisan Sawaal Q&A, MP state schemes, central-scheme FAQ/doc backfill).
// Deterministic UUIDs so related_video_id cross-links resolve. Emits to stdout.
import { readFileSync } from 'node:fs'

const S = process.env.SEEDS || '/tmp/seeds'
const videos = JSON.parse(readFileSync(`${S}/videos.json`, 'utf8'))
const qa = JSON.parse(readFileSync(`${S}/qa.json`, 'utf8'))
const mp = JSON.parse(readFileSync(`${S}/mp-schemes.json`, 'utf8'))
const central = JSON.parse(readFileSync(`${S}/central-faqs.json`, 'utf8'))

const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const jb = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
const vId = (i) => `00000000-0000-4000-d000-${String(i + 1).padStart(12, '0')}`
const sId = (i) => `00000000-0000-4000-e000-${String(i + 1).padStart(12, '0')}`
const mId = (i) => `00000000-0000-4000-c000-${String(9 + i).padStart(12, '0')}`

const FEAT_SORT = { '2fOVTX4mDZ8': 1, 'ULZg7ewKOsY': 2, 'O0PMu9lfboY': 3 }
const out = []

out.push('\n-- F1. videos seed (16 verified Hindi farming videos; thumbnails self-hosted)')
videos.forEach((v, i) => {
  const feat = !!v.featured
  const sort = feat ? (FEAT_SORT[v.youtube_id] || 5) : 10 + i
  out.push(`insert into public.videos (id,youtube_id,title_hi,title_en,channel_name,duration,category,thumbnail_url,is_featured,is_active,sort_order) values (${q(vId(i))},${q(v.youtube_id)},${q(v.title_hi)},${q(v.title_en)},${q(v.channel_name)},${q(v.duration)},${q(v.category)},${q(v.thumbnail_url)},${feat},true,${sort}) on conflict (id) do nothing;`)
})

out.push('\n-- F2. kisan_sawaal seed (16 published Q&A; crop/symptom_tag for pest banner)')
qa.forEach((r, i) => {
  out.push(`insert into public.kisan_sawaal (id,question_hi,answer_hi,category,asked_by_village,answered_by,is_published,is_featured,crop,symptom_tag) values (${q(sId(i))},${q(r.question_hi)},${q(r.answer_hi)},${q(r.category)},${q(r.asked_by_village)},'Team Kisan Sahyog',true,false,${q(r.crop)},${q(r.symptom_tag)}) on conflict (id) do nothing;`)
})

// related_video_id cross-links: qa-index -> video youtube_id
const vIndexOf = (yid) => videos.findIndex((v) => v.youtube_id === yid)
const LINKS = [[3, 'FHFBalwAKPE'], [4, 'FHFBalwAKPE'], [2, 'ULZg7ewKOsY'], [10, '3elbm0sQOyI']]
out.push('\n-- F3. related_video_id cross-links (Q&A <-> matching video)')
for (const [qi, yid] of LINKS) {
  const vi = vIndexOf(yid)
  if (vi >= 0) out.push(`update public.kisan_sawaal set related_video_id=${q(vId(vi))} where id=${q(sId(qi))};`)
}

out.push('\n-- F5. MP state schemes seed (verified, government_level=state)')
mp.forEach((s, i) => {
  out.push(`insert into public.sarkari_yojana (id,scheme_name_hi,scheme_name_en,ministry_hi,ministry_en,category,description_hi,description_en,benefit_hi,benefit_en,eligibility_hi,eligibility_en,how_to_apply_hi,how_to_apply_en,official_website,helpline,is_active,is_featured,sort_order,slug,government_level,faqs,documents_required_hi,documents_required_en,source_url,last_verified_date) values (${q(mId(i))},${q(s.scheme_name_hi)},${q(s.scheme_name_en)},${q(s.ministry_hi)},${q(s.ministry_en)},${q(s.category)},${q(s.summary_hi)},${q(s.summary_en)},${q(s.benefit_hi)},${q(s.benefit_en)},${q(s.eligibility_hi)},${q(s.eligibility_en)},${q(s.how_to_apply_hi)},${q(s.how_to_apply_en)},${q(s.official_website)},${q(s.helpline)},true,false,${20 + i},${q(s.slug)},'state',${jb(s.faqs)},${q(s.documents_required_hi)},${q(s.documents_required_en)},${q(s.source_url)},${q(s.last_verified_date)}) on conflict (id) do nothing;`)
})

out.push('\n-- F6. central-scheme FAQ/doc/source backfill (by slug)')
for (const [slug, d] of Object.entries(central)) {
  out.push(`update public.sarkari_yojana set faqs=${jb(d.faqs)}, documents_required_hi=${q(d.documents_required_hi)}, documents_required_en=${q(d.documents_required_en)}, source_url=${q(d.source_url)}, last_verified_date=${q(d.last_verified_date)} where slug=${q(slug)};`)
}

process.stdout.write(out.join('\n') + '\n')
