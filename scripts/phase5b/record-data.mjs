// Batch 9 Phase 5B — merges what 5B created (from evidence/phase5b/state.json) into
// docs/review/batch9/staging-test-data.json. Ids, markers, times only — no passwords, e-mails or mobiles.
// keep:true = KSTEST-KEEP (spare at cleanup); keep:false = KSTEST noise (may be removed).
import { readFileSync, writeFileSync } from 'node:fs'
import * as L from './lib.mjs'

const FILE = 'docs/review/batch9/staging-test-data.json'
const data = JSON.parse(readFileSync(FILE, 'utf8'))
data.rows = (data.rows || []).filter((r) => r.phase !== 'Phase 5B')
const st = L.loadState()
const site = 'https://staging.kissansahyog.com (website, Playwright phone viewport)'
for (const p of Object.values(st.personas)) {
  if (!p.profileId) continue
  data.rows.push({ phase: 'Phase 5B', keep: true, time: p.createdAt, kind: 'profile + Supabase Auth user (signup through the website form)', site, persona: p.id, full_name: p.name, profile_id: p.profileId, marker: 'KSTEST-KEEP', note: 'e-mail/mobile kept outside the repo (TEST_ACCOUNTS.md); mobile pattern 00000555NN' })
}
for (const l of st.listings || []) {
  if (!l.id) continue
  data.rows.push({ phase: 'Phase 5B', keep: l.keep !== false, time: l.at, kind: 'listing (posted through the website Post form)', site, persona: l.persona, listing_id: l.id, category: l.category, listing_type: l.type, listing_source: l.source, village: l.village, wide_visibility: !!l.wide, closed_in_test: !!l.closed, photo: !!l.photo, marker: l.keep === false ? 'KSTEST' : 'KSTEST-KEEP', side_rows: 'a pending village_coordinates row named like the village may be created by create_listing' })
}
for (const n of st.noise || []) data.rows.push({ phase: 'Phase 5B', keep: false, site, ...n })
for (const r of st.rows || []) data.rows.push({ phase: 'Phase 5B', site, ...r })
const text = JSON.stringify(data, null, 2)
for (const v of L.secretValues()) if (text.includes(v)) throw new Error('secret value would be written — aborting')
writeFileSync(FILE, text + '\n')
L.log(`staging-test-data.json: ${data.rows.filter((r) => r.phase === 'Phase 5B').length} Phase 5B rows`)
