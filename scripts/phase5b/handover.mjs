// Batch 9 Phase 5B.7 — writes the login hand-over:
//   C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md   (outside the repo: e-mails, mobiles, shared password)
//   docs/review/batch9/TEST_ACCOUNTS_INDEX.md          (repo: names, roles, listing ids ONLY)
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as L from './lib.mjs'

const state = L.loadState()
const P = L.personas()
const pw = L.password()
const lst = (id) => (state.listings || []).filter((l) => l.persona === id && l.id)
const title = (l) => `${l.category} / ${l.type} / ${l.source} — ${l.village}`
const gate = (id) => state.personas[id]?.gate || null

let out = `STAGING ONLY\n\n# Kisan Sahyog — STAGING test personas (fake data)\n\nSite: https://staging.kissansahyog.com and the STAGING app flavour (staging Supabase project).\n` +
  `These accounts do NOT exist on the live site/app (kissansahyog.com) — never try them there.\n` +
  `Shared password for every persona: ${pw}\n` +
  `Sign in either with e-mail + password, or with the mobile number alone (no OTP yet).\n` +
  `Mobiles are deliberately impossible numbers (start with 0) so no real person can be called.\n\n` +
  `Generated ${new Date().toISOString()} by scripts/phase5b/handover.mjs.\n\n`
for (const p of P) {
  const s = state.personas[p.id] || {}
  out += `## ${p.id} — ${p.name}\n- What it is: ${p.role}\n- E-mail: ${p.email}${p.id === 'P9' ? '  (typed with mixed case at signup; any case works)' : ''}\n- Mobile: ${p.mobile}\n- Password: (shared, above)\n` +
    `- Village/town: ${p.town} (${L.town(p.town).district})\n- Language: ${p.lang === 'hi' ? 'Hindi' : 'English'}\n- Contact details: ${p.show ? 'SHOWN' : 'HIDDEN'}\n- Profile id: ${s.profileId || '-'}\n` +
    `- Web login gate (last run): ${gate(p.id) ? `${gate(p.id).email ? 'e-mail OK' : 'e-mail FAILED'}, ${gate(p.id).mobile ? 'mobile OK' : 'mobile FAILED'} (${gate(p.id).at})` : 'not run yet'}\n- App login gate: NOT-RUN (no emulator this session)\n`
  const ls = lst(p.id)
  out += ls.length ? `- Listings owned:\n${ls.map((l) => `  - ${l.id} — ${title(l)}${l.closed ? ' (closed in test)' : ''}`).join('\n')}\n\n` : '- Listings owned: none\n\n'
}
writeFileSync(join(L.SECRETS_DIR, 'TEST_ACCOUNTS.md'), out)

let idx = `# Batch 9 Phase 5B — test persona index (STAGING only)\n\n` +
  `Names, roles and listing ids only. **E-mails, mobiles and the shared password are NOT in the repo**; they are in\n` +
  `\`C:\\Users\\usdvi\\ks-test-accounts\\TEST_ACCOUNTS.md\` on the founder's PC (outside the repo). All accounts were created\n` +
  `through the staging WEBSITE's own sign-up form (same Signup.jsx, same staging Supabase project as the staging app).\n\n` +
  `| Persona | Name | Role | Details | Town | Lang | Profile id | Web gate (e-mail / mobile) | App gate | Listing ids |\n|---|---|---|---|---|---|---|---|---|---|\n`
for (const p of P) {
  const s = state.personas[p.id] || {}
  const g = gate(p.id)
  idx += `| ${p.id} | ${p.name} | ${p.role} | ${p.show ? 'SHOWN' : 'HIDDEN'} | ${p.town} | ${p.lang} | \`${s.profileId || '-'}\` | ${g ? `${g.email ? 'RAN-PASSED' : 'RAN-FAILED'} / ${g.mobile ? 'RAN-PASSED' : 'RAN-FAILED'}` : 'not run'} | NOT-RUN (no emulator) | ${lst(p.id).map((l) => `\`${l.id}\` (${l.category}/${l.type})`).join('<br>') || '-'} |\n`
}
writeFileSync(resolve('docs/review/batch9/TEST_ACCOUNTS_INDEX.md'), idx)
L.log('hand-over written (outside file + repo index)')
