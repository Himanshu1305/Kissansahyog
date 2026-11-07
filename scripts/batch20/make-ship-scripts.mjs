#!/usr/bin/env node
// Batch 20 - makes scripts/ship-prod-20.sh and scripts/rollback-prod-20.sh from the Batch 19 pair (the newest on origin/main),
// changing only what must change. Re-run it to regenerate. Writes only those two files.
import { readFileSync, writeFileSync } from 'node:fs'

function make(src, edits) {
  let s = readFileSync(src, 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10))
  for (const [a, b] of edits) {
    if (!s.includes(a)) throw new Error(`${src}: missing text: ${a.slice(0, 60)}`)
    s = s.split(a).join(b)
  }
  return s
}

// ---------- ship ----------
let ship = make('scripts/ship-prod-19.sh', [
  ['STAMP-19"', 'STAMP-20"'],
  ['BRANCH="release-19"', 'BRANCH="release-20"'],
  ['TAG="${TAG:-ship-19}"   # ship point of Batch 19 (pushed HEAD of release-19)', 'TAG="${TAG:-ship-20}"   # ship point of Batch 20 (pushed HEAD of release-20)'],
  ['GATE_TAG="ship-17f"   # the live Batch 17F tag; must be on origin', 'GATE_TAG="ship-19"   # the live Batch 19 tag; must be on origin'],
  ['batch19/evidence', 'batch20/evidence'],
  ['Batch 17F (ship-17f) is live', 'Batch 19 (ship-19) is live'],
  ['Batch 17F ($GATE_TAG) is on origin', 'Batch 19 ($GATE_TAG) is on origin'],
  ['the Batch 17F ship must be live first', 'the Batch 19 ship must be live first'],
  ['ship-prod-19.sh', 'ship-prod-20.sh'],
  ['rollback-prod-19.sh', 'rollback-prod-20.sh'],
  ['Batch 17F ship-17f (from', 'Batch 19 ship-19 (from'],
  ['it is not the Batch 17F deployment', 'it is not the Batch 19 deployment'],
  ['since Batch 17F was prepared', 'since Batch 19 was shipped'],
  ['is not the expected Batch 17F one (8df469ad...) (or KS_EXPECT_LIVE_ID)', 'is not the expected Batch 19 one (give KS_EXPECT_LIVE_ID=<id> if it is the right one)'],
  ["SIGNUP_MARKER='app_register_phone'", "SIGNUP_MARKER='app_register_phone'\nMITRA_MARKER='list_active_mitras'     # 20: the sign-up dropdown call (a chunk of the built app)\nMITRA_PANEL_MARKER='mitra-reminder'   # 20: the admin Kissan Mitra panel (People tab chunk)"],
])
const head = String.raw`#!/usr/bin/env bash
# Batch 20 - Kissan Mitra: a helper dropdown on the sign-up form and an admin panel with a payment ledger (docs/review/batch20/SHIP.md).
# Copy of the Batch 19 ship script (the newest on origin/main), changed only where it had to change. The DATABASE part (migration
# 0075_kissan_mitra.sql) is applied BY THE FOUNDER in the Supabase SQL editor BEFORE this script, staging first (SHIP.md steps 3-4).
# THIS SCRIPT NEVER TOUCHES A DATABASE. release-20 = origin/main (which holds Batch 19, tag ship-19) + 20. This batch adds NO route, so MIN_ROUTES is the
# Batch 19 floor. Live now (before this ship): Batch 19; its deployment id is read from docs/review/batch19/evidence/prod-ship/prod-deployment-after.txt
# when that file exists, else it must be given as KS_EXPECT_LIVE_ID=<id>. That id is also the rollback target. Gates added in 20: the sign-up list call
# (list_active_mitras) and the admin panel (mitra-reminder) are in the built bundle; the 19/17F/17E markers are checked as before.
# The auth switches (otp_required=true, session_enforced=false) are read before and after and must be identical; this script never sets one.
#
#   bash scripts/ship-prod-20.sh --dry-run   # validate preconditions + print every command; changes nothing
#   bash scripts/ship-prod-20.sh             # the real ship (founder runs this)
#
# Ship tag: "$TAG" (default ship-20) must be on the pushed HEAD of release-20.
# Never touches git history, never pushes, never writes to any database.
`
ship = head + ship.slice(ship.indexOf('set -uo pipefail'))
const a = ship.indexOf('# 19: the deployment this ship replaces')
const b = ship.indexOf('say "+ GET $API')
if (a < 0 || b < 0) throw new Error('expected-live block not found')
ship = ship.slice(0, a) + String.raw`# 20: the deployment this ship replaces is the Batch 19 ship (tag ship-19); it is also the rollback target. Its id was recorded when Batch 19 shipped.
ID_11A=""; SRC_11A="Batch 19 production deployment (tag ship-19)"
B19_AFTER="$ROOT/docs/review/batch19/evidence/prod-ship/prod-deployment-after.txt"
if [ -s "$B19_AFTER" ]; then ID_11A="$(grep -o '^deployment_id=[0-9a-f-]*' "$B19_AFTER" | head -1 | cut -d= -f2)"; SRC_11A="$B19_AFTER"; fi
say "  expected live deployment (Batch 19, ship-19): @@{ID_11A:-<unknown here: give KS_EXPECT_LIVE_ID=<id>>}"
`.replace('@@{', '${') + ship.slice(b)
const otpLine = '  [ ${#OTP_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $OTP_MARKER (the 11A OTP sign-in)"; miss=1; }\n'
if (!ship.includes(otpLine)) throw new Error('OTP gate line not found')
ship = ship.replace(otpLine, otpLine
  + '  grep -l "$MITRA_MARKER" dist/assets/*.js >/dev/null 2>&1 || { say "  MISSING: no dist/assets/*.js calls $MITRA_MARKER (the 20 sign-up helper dropdown)"; miss=1; }\n'
  + '  grep -l "$MITRA_PANEL_MARKER" dist/assets/*.js >/dev/null 2>&1 || { say "  MISSING: no dist/assets/*.js holds $MITRA_PANEL_MARKER (the 20 admin Kissan Mitra panel)"; miss=1; }\n')
writeFileSync('scripts/ship-prod-20.sh', ship)

// ---------- rollback ----------
let rb = make('scripts/rollback-prod-19.sh', [
  ['Batch 19 - roll', 'Batch 20 - roll'],
  ['rollback-prod-19.sh', 'rollback-prod-20.sh'],
  ['ship-prod-19.sh', 'ship-prod-20.sh'],
  ['batch19/evidence', 'batch20/evidence'],
  ['# Copy of the Batch 17F rollback script. The rollback target after the 19 ship is the Batch 17F deployment\n# 8df469ad-2535-44a8-81e9-003dcde97938 (tag ship-17f); ship-prod-20.sh prints the id it recorded.',
    '# Copy of the Batch 19 rollback script. The rollback target after the 20 ship is the Batch 19 deployment (tag ship-19);\n# ship-prod-20.sh records and prints its id (prod-deployment-before.txt). Give the id yourself if that file is not here.'],
  ['else to the 17F one named above', 'else you must give the id'],
  ['DATABASE: this script changes NO database, and Batch 19 has no migration, so nothing in the database needs undoing after a site rollback.',
    'DATABASE: this script changes NO database. Batch 20 HAS a migration (0075_kissan_mitra.sql). A site rollback leaves the new tables and columns in place (harmless: the old site ignores them). To remove them too, run supabase/migrations/rollback/0075_kissan_mitra_rollback.sql yourself - it DELETES the recorded Kissan Mitra data.'],
])
const c = rb.indexOf('DEFAULT_17B=')
const d = rb.indexOf('\n', c)
rb = rb.slice(0, c) + 'DEFAULT_17B=""   # no built-in target: the Batch 19 deployment id is recorded by ship-prod-20.sh (or read from batch19 evidence)' + rb.slice(d)
rb = rb.split('TARGET="$DEFAULT_17B"; say "target: no recorded id here, using the Batch 17F deployment $TARGET (tag ship-17f)"').join(
  'B19="$ROOT/docs/review/batch19/evidence/prod-ship/prod-deployment-after.txt"; [ -s "$B19" ] && TARGET="$(grep -o \'^deployment_id=[0-9a-f-]*\' "$B19" | head -1 | cut -d= -f2)"\n    [ -n "$TARGET" ] || die "no recorded deployment id: give the long id of the Batch 19 deployment (npx wrangler pages deployment list --project-name $PROJECT)"\n    say "target: Batch 19 deployment $TARGET (from $B19)"')
writeFileSync('scripts/rollback-prod-20.sh', rb)
console.log('written scripts/ship-prod-20.sh and scripts/rollback-prod-20.sh')
