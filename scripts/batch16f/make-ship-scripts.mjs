#!/usr/bin/env node
// DO NOT RE-RUN after hand edits. One-off generator: builds scripts/ship-prod-16f.sh and scripts/rollback-prod-16f.sh from the 16B scripts
// (same pattern as scripts/batch15b/make-ship-scripts.mjs).   node scripts/batch16f/make-ship-scripts.mjs
import { readFileSync, writeFileSync } from 'node:fs'
const rd = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const wr = (p, s) => writeFileSync(new URL(`../../${p}`, import.meta.url), s, { encoding: 'utf8' })
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error('anchor missing: ' + a.slice(0, 90)); return s.split(a).join(b) }
const LIVE_16B = '6cf93531-4284-4ef3-ab23-f041cbebe7af'
const RENAMES = [['ship-prod-16b.sh', 'ship-prod-16f.sh'], ['rollback-prod-16b.sh', 'rollback-prod-16f.sh'], ['release-16b', 'release-16f'],
  ['batch16b', 'batch16f'], ['pre-16b', 'pre-16f'], ['prod-before-16b', 'prod-before-16f']]

// ------------------------------------------------------------------ ship
let s = rd('scripts/ship-prod-16b.sh')
for (const [a, b] of RENAMES) s = s.split(a).join(b)
const i = s.indexOf('set -uo pipefail')
if (i < 0) throw new Error('set anchor')
s = `#!/usr/bin/env bash
# Batch 16F - the homepage price tile ("Today's price") shows the same price, mandi and date as the mandi strip. Site code only
# (src/lib/today/forFarmer.js, src/screens/Homepage.jsx). Copy of scripts/ship-prod-16b.sh. release-16f = main (16E merged) + 16F.
# Live now: Batch 16B (tag ship-16b, deployment ${LIVE_16B}); that id is also the rollback target.
# NO DATABASE STEP in this batch (no migration, no write). The one database contact of a REAL run is the same read-only anonymous
# probe 16B had (morning_post_context with a WRONG secret must answer forbidden): it only proves 16B's migration is still there.
# In --dry-run the probe is NOT sent. The auth switches (otp_required=true, session_enforced=false) are read before and after and
# must be identical; this script never sets a switch.
#
#   bash scripts/ship-prod-16f.sh --dry-run   # validate preconditions + print every command; changes nothing
#   bash scripts/ship-prod-16f.sh             # the real ship (founder runs this)
#
# Ship tag: "$TAG" (default ship-16f) must be on the pushed HEAD of release-16f.
# Never touches git history, never pushes, never writes to any database.
` + s.slice(i)
s = rep(s, 'TAG="${TAG:-ship-16b}"   # ship point of Batch 16B (pushed HEAD of release-16f)', 'TAG="${TAG:-ship-16f}"   # ship point of Batch 16F (pushed HEAD of release-16f)')
s = rep(s, 'GATE_TAG="ship-15b2"   # the live 15B follow-up tag; must be on origin', 'GATE_TAG="ship-16b"   # the live Batch 16B tag; must be on origin')
s = rep(s, 'ID_11A="f0973175-2eac-4c95-bbd2-09f48e644735"; SRC_11A="Batch 15B follow-up production deployment (source 775ffd7, tag ship-15b2)"',
  `ID_11A="${LIVE_16B}"; SRC_11A="Batch 16B production deployment (tag ship-16b)"`)
s = rep(s, 'expected live deployment (15B follow-up, ship-15b2)', 'expected live deployment (Batch 16B, ship-16b)')
s = rep(s, 'LIVE_IS="15B follow-up ship-15b2 (from', 'LIVE_IS="Batch 16B ship-16b (from')
s = rep(s, 'it is not the 15B follow-up deployment', 'it is not the Batch 16B deployment')
s = rep(s, 'since this follow-up was prepared', 'since Batch 16F was prepared')
s = rep(s, 'is not the expected 15B follow-up one (f0973175...)', 'is not the expected Batch 16B one (6cf93531...)')
s = rep(s, 'NEXT: follow docs/review/batch16f/SHIP.md step 6 (workflow file on the default branch) and step 7 (run the workflow once, open /admin/morning on the phone).', 'NEXT: follow docs/review/batch16f/SHIP.md step 4 (open the homepage and compare the price tile with the mandi strip).')
wr('scripts/ship-prod-16f.sh', s)

// ------------------------------------------------------------------ rollback
let r = rd('scripts/rollback-prod-16b.sh')
for (const [a, b] of RENAMES) r = r.split(a).join(b)
r = rep(r, 'Batch 16B - roll kissansahyog.com', 'Batch 16F - roll kissansahyog.com')
r = rep(r, 'The rollback target after the 16B ship is the 15B follow-up deployment\n# f0973175-2eac-4c95-bbd2-09f48e644735 (source 775ffd7, tag ship-15b2);', `The rollback target after the 16F ship is the Batch 16B deployment\n# ${LIVE_16B} (tag ship-16b);`)
r = rep(r, 'Copy of scripts/rollback-prod-15b.sh.', 'Copy of scripts/rollback-prod-16b.sh.')
wr('scripts/rollback-prod-16f.sh', r)
console.log('ok')
