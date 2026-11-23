// Batch 23 - static checks of the production ship and rollback scripts (scripts/ship-prod-23.sh, scripts/rollback-prod-23.sh). Offline; reads files only.
// The end-to-end rehearsal with stub programs is scripts/batch23/rehearse-ship.sh (evidence: docs/review/batch23/evidence/ship-rehearsal.txt).
// Run: node --test "tests/unit/ship-prod-23.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const SHIP = 'scripts/ship-prod-23.sh'
const ROLL = 'scripts/rollback-prod-23.sh'
const read = (p) => readFileSync(p, 'utf8')
const code = (p) => read(p).split('\n').filter((l) => !/^\s*#/.test(l)).join('\n') // without comment-only lines

test('both scripts exist, are LF-only and valid bash', () => {
  for (const f of [SHIP, ROLL]) {
    assert.ok(existsSync(f), `${f} missing`)
    assert.ok(!read(f).includes('\r'), `${f} has a carriage return (bash would fail on CRLF)`)
    const r = spawnSync('bash', ['-n', f], { encoding: 'utf8' })
    assert.equal(r.status, 0, `${f}: ${r.stderr}`)
  }
  assert.match(read('.gitattributes'), /\*\.sh\s+text\s+eol=lf/)
})

test('the earlier scripts were not edited (the new ones are separate files)', () => {
  for (const f of ['scripts/ship-prod-20.sh', 'scripts/ship-prod-22.sh', 'scripts/rollback-prod-22.sh']) assert.ok(existsSync(f), f)
  assert.ok(!/ship-prod-23/.test(read('scripts/ship-prod-22.sh')))
  assert.ok(!/rollback-prod-23/.test(read('scripts/rollback-prod-22.sh')))
})

test('never sets the OTP switches, never uses a service key, never writes to a database', () => {
  for (const f of [SHIP, ROLL]) {
    const c = code(f)
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

test('ship: branch release-23, HEAD must equal origin/main after a fetch, MIN_ROUTES 278, --expect-live', () => {
  const c = read(SHIP)
  assert.match(c, /^BRANCH="release-23"/m)
  assert.match(c, /^MIN_ROUTES=278\b/m)
  assert.match(c, /git fetch origin/)
  assert.match(c, /git rev-parse HEAD/)
  assert.match(c, /git rev-parse --verify -q origin\/main/)
  assert.match(c, /\[ "\$HEAD_SHA" = "\$ORIGIN_MAIN" \]/)
  assert.match(c, /--expect-live/)
  assert.ok(!/merge-22|release-22|ship-20|ship-19/.test(code(SHIP)), 'an older batch gate is still in the code')
})

test('ship: expected live deployment is the Batch 22 one (recorded file, built-in default, --expect-live)', () => {
  const c = read(SHIP)
  assert.match(c, /B22_DEFAULT_ID='3c7be25f-78e5-4059-ba5e-0d04d5611e26'/)
  assert.match(c, /docs\/review\/batch22\/evidence\/prod-ship\/prod-deployment-after\.txt/)
  assert.match(read('docs/review/batch22/evidence/prod-ship/prod-deployment-after.txt'), /deployment_id=3c7be25f-78e5-4059-ba5e-0d04d5611e26/)
  assert.match(c, /canonical_deployment\.id/)
})

test('ship: Batch 22 is proved live by reading the live site (no tag): /guide 200 + the four markers', () => {
  const c = read(SHIP)
  assert.match(c, /B22_MARKERS=\(my_mitra_choice_open set_my_mitra_on_offer admin_mitra_statement mitra-statement\)/)
  assert.match(c, /live_b22_markers/)
  assert.match(c, /\$SITE\/guide/)
  assert.ok(!/git ls-remote --tags/.test(code(SHIP)), 'the old tag gate is still there')
})

test('ship: price-data read gate (one anonymous GET, newest price_date within 3 days of today in India) before the build', () => {
  const c = read(SHIP)
  assert.match(c, /PRICE_MAX_AGE_DAYS=3/)
  assert.match(c, /rest\/v1\/mandi_prices\?select=price_date&order=price_date\.desc&limit=1/)
  assert.match(c, /Asia\/Kolkata/)
  assert.ok(c.indexOf('check_price_data ||') > 0 && c.indexOf('check_price_data ||') < c.indexOf('== 3. build'), 'the price gate must run before the build')
  assert.ok(c.indexOf('check_price_data ||') < c.indexOf('"${DEPLOY[@]}"'), 'the price gate must run before the deploy')
  // the key is read from .env.production and never printed
  assert.ok(!/echo[^\n]*\$PROD_ANON|say[^\n]*\$PROD_ANON/.test(code(SHIP)), 'the anon key is printed')
})

test('ship: Batch 22 database functions are still probed read-only (before and after), with a NULL Mitra and the all-zero actor', () => {
  const c = read(SHIP)
  for (const fn of ['my_mitra_choice_open', 'set_my_mitra_on_offer', 'admin_mitra_statement', 'admin_list_mitra_ads']) assert.ok(c.includes(fn), fn)
  assert.match(c, /PGRST202/)
  assert.match(c, /"p_mitra_id\\":null/)
  assert.match(c, /ZERO_ID='00000000-0000-0000-0000-000000000000'/)
  assert.ok(c.indexOf('check_db_gate ||') < c.indexOf('== 3. build'), 'the db gate must run before the build')
  assert.ok(c.includes('check_db_gate || ok=1'), 'the db gate is repeated after the deploy')
  assert.ok(!/0076_|0077_|apply 0076 \/ 0077 first/.test(code(SHIP)), 'there is no migration step in Batch 23')
})

test('ship: static-HTML gates (snapshot-placeholder, none of the three strings, every page), labels, and the msp=0.60 size floor', () => {
  const c = read(SHIP)
  assert.match(c, /data-testid="snapshot-placeholder"/)
  assert.match(c, /data-testid="ticker-placeholder"/)
  assert.match(c, /STALE_FORBIDDEN=\('कल का भाव' 'पिछला भाव' 'ks-date-badge'\)/)
  assert.match(c, /grep -rl --include=index\.html/)
  assert.match(c, /dist\/msp\/chana\/index\.html/)
  assert.match(c, /HOME_SHRINK='root=0\.70,browse=0\.70,msp=0\.60'/)
  assert.match(c, /HOME_GROWTH='root=1\.40,browse=1\.40'/)
  assert.ok(!/ks-date-badge in dist\/msp\/index\.html/.test(code(SHIP)), 'the old "badge must be in the static /msp" gate is still there')
  assert.match(c, /\[23_static\]/); assert.match(c, /\[23_placeholder\]/); assert.match(c, /\[23_labels\]/); assert.match(c, /\[23_main\]/)
  assert.match(c, /LABELS23=\(.*'आज का भाव देखें'.*"Today's price".*\)/)
  assert.match(c, /REAL test of the new price code/)
  // the verifier and the size check accept a 0.60 floor (they take 0.5 up to 0.85)
  assert.match(read('scripts/batch10f/predeploy-size-check.mjs'), /v >= 0\.5 && v < 0\.85/)
  assert.match(read('scripts/verify-batch9-live.mjs'), /v >= 0\.5 && v < 0\.85/)
})

test('ship: the dry run BUILDS (and deploys / rolls back nothing); the build is not behind a "not a dry run" condition', () => {
  const c = read(SHIP)
  assert.match(c, /DRY RUN OK/)
  const b = c.indexOf('npm run build:prod > "$EV/build-prod-$STAMP.log"')
  assert.ok(b > 0)
  // the line before the build must not be a "DRY = 0" if
  assert.ok(!/\[ "\$DRY" = 0 \]; then\n\s*timeout 1500 npm run build:prod/.test(c))
  assert.match(c, /bash scripts\/rollback-prod-23\.sh --dry-run/)
  assert.match(c, /\(\$\{#PENDING\[@\]\} pending\)/)
})

test('ship: automatic rollback to the recorded previous deployment, main chunk must change, OTP switches compared before and after', () => {
  const c = read(SHIP)
  assert.match(c, /ROLLING BACK AUTOMATICALLY to deployment \$BEFORE_ID/)
  assert.match(c, /bash scripts\/rollback-prod-23\.sh "\$BEFORE_ID"/)
  assert.match(c, /prod-deployment-before\.txt/)
  assert.match(c, /same main chunk/)
  assert.match(c, /\[12a_switches\]/)
  assert.match(c, /otp_required=true session_enforced=false/)
})

test('ship: still has the old safety gates', () => {
  const c = read(SHIP)
  for (const s of ['check-prod-env.mjs', 'npm run build:prod', 'check-no-localhost-dist.mjs', 'prerender_check', 'verify-batch9-live.mjs', '--checks pages,compare,cors,functions,static,sw,data', 'staging_refs_in_dist', 'csp_media_src_ok', 'ALLOW_DIRTY']) {
    assert.ok(c.includes(s), `missing old gate: ${s}`)
  }
  assert.match(c, /--dry-run/)
})

test('rollback: no database change, same API method, default target is the Batch 22 deployment, workflow note', () => {
  const c = read(ROLL)
  assert.match(c, /NO database change/)
  assert.match(c, /needs NOTHING else/)
  assert.match(c, /refresh-mandi-prices\.yml/)
  assert.match(c, /3c7be25f-78e5-4059-ba5e-0d04d5611e26/)
  assert.match(c, /--dry-run/)
  assert.match(c, /\/rollback"/)
})

test('SHIP_PROD.md has the steps A-G in order, with the plain sentence at the top', () => {
  const m = read('docs/review/batch23/SHIP_PROD.md')
  const idx = ['## A.', '## B.', '## C.', '## D.', '## E.', '## F.', '## G.'].map((h) => m.indexOf(h))
  assert.ok(idx.every((i) => i >= 0), `a step is missing: ${idx}`)
  assert.deepEqual([...idx].sort((a, b) => a - b), idx, 'steps out of order')
  assert.match(m.slice(0, 700), /no database change/i)
  assert.match(m.slice(0, 700), /OTP switches are never touched/i)
  assert.match(m.slice(0, 700), /rolls back by itself/i)
  assert.match(m, /npm run build:prod/); assert.match(m, /npx vite preview --port 4173/)
  assert.match(m, /e46b586a5aff310fcc7cff98e5f0d0aeca4e6ebc/)
  assert.match(m, /git push origin release-23:main/)
  assert.match(m, /\|\| echo "STOPPED/)
  assert.ok(!/^\s*exit\b/m.test(m), 'the checklist must never tell the founder to run exit')
  assert.match(m, /bash scripts\/ship-prod-23\.sh --dry-run 2>&1 \| tail -60/)
  assert.match(m, /bash scripts\/ship-prod-23\.sh 2>&1 \| tail -60/)
  assert.match(m, /15:47 IST/)
  assert.match(m, /bash scripts\/rollback-prod-23\.sh/)
})
