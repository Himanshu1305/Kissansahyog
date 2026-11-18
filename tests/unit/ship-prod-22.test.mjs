// Batch 22 - static checks of the production ship and rollback scripts (scripts/ship-prod-22.sh, scripts/rollback-prod-22.sh). Offline; reads files only.
// The end-to-end rehearsal with stub programs is scripts/batch22/rehearse-ship.sh (evidence: docs/review/batch22/evidence/ship-rehearsal.txt).
// Run: node --test "tests/unit/ship-prod-22.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const SHIP = 'scripts/ship-prod-22.sh'
const ROLL = 'scripts/rollback-prod-22.sh'
const read = (p) => readFileSync(p, 'utf8')
const code = (p) => read(p).split('\n').filter((l) => !/^\s*#/.test(l)).join('\n') // without comment-only lines

test('both scripts exist and are valid bash', () => {
  for (const f of [SHIP, ROLL]) {
    assert.ok(existsSync(f), `${f} missing`)
    const r = spawnSync('bash', ['-n', f], { encoding: 'utf8' })
    assert.equal(r.status, 0, `${f}: ${r.stderr}`)
  }
})

test('the Batch 20 scripts were not edited (the new ones are separate files)', () => {
  assert.ok(existsSync('scripts/ship-prod-20.sh') && existsSync('scripts/rollback-prod-20.sh'))
  assert.ok(!/ship-prod-22/.test(read('scripts/ship-prod-20.sh')))
})

test('never sets the OTP switches, never uses a service key, never writes to a database', () => {
  for (const f of [SHIP, ROLL]) {
    const c = code(f)
    // the switches may only be READ (GET /api/otp/config); no write verb on the same line as the switch names
    for (const line of c.split('\n')) {
      if (/otp_required|session_enforced/.test(line)) {
        assert.ok(!/(-X\s*(POST|PUT|PATCH|DELETE)|\bUPDATE\b|\bINSERT\b|admin_set|set_auth|app_set_auth|rpc\/set_)/i.test(line), `${f}: a switch name next to a write: ${line.trim()}`)
      }
    }
    assert.ok(!/service[_-]?role|SERVICE_ROLE|SUPABASE_SERVICE|sb_secret|SUPABASE_ACCESS_TOKEN/i.test(c), `${f}: mentions a service key`)
    assert.ok(!/\bpsql\b|supabase\s+(db|migration)|execute_sql|management\/projects/i.test(c), `${f}: a database tool`)
    assert.ok(!/^\s*(timeout \d+ )?git\s+(push|tag|commit|reset|rebase|merge|checkout)\b/m.test(c), `${f}: runs a git command that changes history or branches`)
  }
  // the only POSTs the ship script makes to the database are the anonymous read-only function probes
  for (const line of code(SHIP).split('\n').filter((l) => /-X POST/.test(l))) {
    assert.ok(/rest\/v1\/rpc\/(\$fn|get_active_announcements)/.test(line), `unexpected POST: ${line.trim().slice(0, 120)}`)
  }
})

test('ship: branch merge-22, HEAD must equal origin/main after a fetch, MIN_ROUTES 278', () => {
  const c = read(SHIP)
  assert.match(c, /^BRANCH="merge-22"/m)
  assert.match(c, /^MIN_ROUTES=278\b/m)
  assert.match(c, /git fetch origin/)
  assert.match(c, /git rev-parse HEAD/)
  assert.match(c, /git rev-parse --verify -q origin\/main/)
  assert.match(c, /\[ "\$HEAD_SHA" = "\$ORIGIN_MAIN" \]/)
  assert.match(c, /--expect-live/)
  assert.match(c, /ship-20/) // the gate tag is Batch 20 now
  assert.ok(!/release-20|ship-19/.test(code(SHIP)), 'a Batch 20 / 19 era gate is still in the code')
})

test('ship: the 0076/0077 pre-deploy gate is read-only, comes before the build, and refuses with the plain message', () => {
  const c = read(SHIP)
  for (const fn of ['my_mitra_choice_open', 'set_my_mitra_on_offer', 'admin_mitra_statement', 'admin_list_mitra_ads']) assert.ok(c.includes(fn), fn)
  assert.match(c, /PGRST202/)
  assert.match(c, /apply 0076 \/ 0077 first/)
  assert.ok(c.indexOf('check_db_gate ||') < c.indexOf('== 3. build'), 'the db gate must run before the build')
  assert.ok(c.indexOf('check_db_gate ||') < c.indexOf('"${DEPLOY[@]}"'), 'the db gate must run before the deploy')
  assert.match(c, /"p_mitra_id\\":null/) // set_my_mitra_on_offer is probed with a NULL Mitra: it cannot write
  assert.match(c, /ZERO_ID='00000000-0000-0000-0000-000000000000'/)
  assert.ok(c.includes('check_db_gate || ok=1'), 'the db gate is repeated after the deploy')
})

test('ship: automatic rollback to the recorded previous deployment; the sign-up page must lose the Mitra dropdown; main chunk must change', () => {
  const c = read(SHIP)
  assert.match(c, /ROLLING BACK AUTOMATICALLY to deployment \$BEFORE_ID/)
  assert.match(c, /bash scripts\/rollback-prod-22\.sh "\$BEFORE_ID"/)
  assert.match(c, /prod-deployment-before\.txt/)
  assert.match(c, /SIGNUP_FORBIDDEN=\(.*mitra-select.*\)/)
  assert.match(c, /\[22_signup\]/)
  assert.match(c, /\[22_main\]/)
  assert.match(c, /same main chunk/)
  // gates that asserted the OLD behaviour are gone
  assert.ok(!/MITRA_MARKER/.test(c), 'the Batch 20 sign-up dropdown marker gate is still there')
  assert.ok(!/list_active_mitras\b.*MISSING/.test(c), 'a gate still requires the sign-up dropdown call')
})

test('ship: still has the old safety gates', () => {
  const c = read(SHIP)
  for (const s of ['check-prod-env.mjs', 'npm run build:prod', 'check-no-localhost-dist.mjs', 'prerender_check', 'verify-batch9-live.mjs', '--checks pages,compare,cors,functions,static,sw,data', 'staging_refs_in_dist', 'csp_img_src_has_prod', 'D12', 'otp_required=true session_enforced=false', 'prod-probes.mjs']) {
    assert.ok(c.includes(s), `missing old gate: ${s}`)
  }
  assert.match(c, /--dry-run/)
})

test('rollback: header explains the database rollbacks; same method as Batch 20; no database change', () => {
  const c = read(ROLL)
  assert.match(c, /needs NO database change/)
  assert.match(c, /0077_mitra_statement_rollback\.sql/)
  assert.match(c, /0076_mitra_at_offer_rollback\.sql/)
  assert.match(c, /DELETES the ad-to-Mitra links/)
  assert.match(c, /--dry-run/)
  assert.match(c, /\/rollback"/) // the Cloudflare rollback endpoint
  assert.ok(existsSync('supabase/migrations/rollback/0077_mitra_statement_rollback.sql') && existsSync('supabase/migrations/rollback/0076_mitra_at_offer_rollback.sql'))
})

test('SHIP_PROD.md has the steps A-H in order and says database before site', () => {
  const m = read('docs/review/batch22/SHIP_PROD.md')
  const idx = ['## A.', '## B.', '## C.', '## D.', '## E.', '## F.', '## G.', '## H.'].map((h) => m.indexOf(h))
  assert.ok(idx.every((i) => i >= 0), `a step is missing: ${idx}`)
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'steps out of order')
  assert.match(m.slice(0, 1200), /database files BEFORE the site/i)
  assert.match(m.slice(0, 1200), /OTP switches are never touched/i)
  assert.match(m, /bash scripts\/ship-prod-22\.sh --dry-run/)
  assert.match(m, /bash scripts\/rollback-prod-22\.sh/)
  assert.match(m, /23de6b725c730d5daf7f6913c11675e80eddf251/)
})
