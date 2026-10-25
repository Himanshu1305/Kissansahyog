// Batch 9 Phase 5B — builds docs/review/batch9/results-phase5b.json (report.mjs format) from state.json,
// then: node scripts/android/report.mjs --out docs/review/batch9/results-phase5b.json
import { writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import * as L from './lib.mjs'

const st = L.loadState()
const tests = []
const ev = (dir) => { const d = join(L.EV, dir); return existsSync(d) ? readdirSync(d).map((f) => `docs/review/batch9/evidence/phase5b/${dir}/${f}`) : [] }
const add = (t) => tests.push({ evidenceFiles: [], notes: '', ...t })

for (const p of Object.values(st.personas)) {
  const steps = ['signup', 'loginEmail', 'loginPhone', 'reloadPersists', 'langPersists', 'profileData', 'profileEdit']
  const bad = steps.filter((s) => !st.personas[p.id].steps[s]?.ok)
  add({ id: `5B.1-${p.id}`, name: `${p.id} ${p.role} (${p.details}) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists`, status: bad.length ? 'RAN-FAILED' : 'RAN-PASSED', assertion: bad.length ? `failed: ${bad.join(', ')}` : 'all 7 steps passed on the staging website', evidenceFiles: ev(p.id), notes: L.scrub(JSON.stringify(Object.fromEntries(Object.entries(p.steps).map(([k, v]) => [k, v.detail])))).slice(0, 900) })
  add({ id: `5B.1-${p.id}-app`, name: `${p.id} same flow in the staging APP (kill/reopen, native WebView)`, status: 'NOT-RUN', assertion: '—', notes: 'no emulator this session (low memory)' })
}
for (const l of (st.listings || []).sort((a, b) => (a.lid < b.lid ? -1 : 1))) {
  add({ id: `5B.3-${l.lid}`, name: `${l.category} × ${l.type} × ${l.source} by ${l.persona}${l.wide ? ' (wide)' : ''}${l.photo ? ' (+photo via setInputFiles)' : ''}${l.note ? ' — ' + l.note : ''}`, status: l.result, assertion: l.id ? `listing ${l.id}` : (l.error || ''), evidenceFiles: ev(l.evidence.replace('evidence/phase5b/', '').replace(/\/$/, '')), notes: L.scrub(JSON.stringify(l.server || {})) })
}
for (const r of st.results || []) add({ id: `${r.area}-${r.id}`, name: r.title, status: r.status, assertion: (r.detail || '').slice(0, 300), notes: r.detail || '', evidenceFiles: [] })
// findings observed in evidence (not separate scripted assertions)
add({ id: '5B.3-F-village', name: 'Asset village typed on Post step 3 is shown on the listing card / detail page', status: 'RAN-FAILED', assertion: 'not shown: create_listing stores it in listings.village_name, ListingCard/ListingDetail render village_town || pincode (both empty for new listings)', evidenceFiles: ['docs/review/batch9/evidence/phase5b/visibility/V2-shown-loggedin.jpg'], notes: 'src/components/ListingCard.jsx:68, src/screens/ListingDetail.jsx:148, supabase/migrations/0053_building_materials_category.sql:199' })
add({ id: '5B.3-F-photohelp', name: 'Photo help text matches the per-category limit (warehouse/land/greenhouse = 5)', status: 'RAN-FAILED', assertion: 'counter says "1/5" but the help says "ज़्यादा से ज़्यादा 3 फोटो" — duplicate key photos_help in strings.js (863 and 894, the later one wins)', evidenceFiles: ['docs/review/batch9/evidence/phase5b/listings/L13-warehouse-offer/step2.jpg'], notes: 'src/lib/i18n/strings.js:869 vs :894' })
const nr = (id, name, why) => add({ id, name, status: 'NOT-RUN', assertion: '—', notes: why })
nr('5B.3-camera', 'Real camera / gallery photo picker', 'web used Playwright setInputFiles with a generated JPEG; the real picker needs the phone/emulator')
nr('5B.4-O7', 'HIDDEN poster number absent from the APP offline cache (O7 scan)', 'no emulator this session (low memory); on the web the DOM/network/share scan ran (V2)')
nr('5B.2-K1', 'Sign-up with the keyboard open on the lowest field (K1 rules)', 'needs the soft keyboard of the app/emulator')
nr('5B.5-availability-calendar', 'Equipment availability calendar (set_listing_unavailable)', 'only owners of equipment offers can write it; the only one (L01) is a KEEP listing — left untouched; time')
nr('5B.5-delete-account', 'Profile → Delete account', 'never delete data (hard rule)')
const data = { phase: 'Batch 9 Phase 5B (web only, staging)', base: L.BASE, generatedAt: new Date().toISOString(), tests }
const text = JSON.stringify(data, null, 1)
for (const v of L.secretValues()) if (text.includes(v)) throw new Error('secret in results')
writeFileSync('docs/review/batch9/results-phase5b.json', text)
L.log(`results-phase5b.json: ${tests.length} tests`)
