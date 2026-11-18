#!/usr/bin/env bash
# Batch 22 - rehearses scripts/ship-prod-22.sh and scripts/rollback-prod-22.sh end to end against STUBS. Nothing here can reach the internet or production:
#   * a stub `curl` (node) answers every request from local state/files and REFUSES (exit 6, logged) any host other than the three the scripts name; it never opens a socket;
#   * stub `wrangler`/`npx`/`npm`/`sleep`; a `git` wrapper that blocks `git push`; the node helper scripts (verify, prod-env guard, ...) are tiny stubs in a temporary copy of the repo;
#   * the temporary copy has its own local bare "origin" folder (a path on this disk), the real git binary works inside it;
#   * the fake production "site" after a deploy is a copy of this repo's own dist/ (a real Batch 22 build, staging ref rewritten to the prod ref), so the real bundle gates run on real files.
# Usage: bash scripts/batch22/rehearse-ship.sh   (writes docs/review/batch22/evidence/ship-rehearsal.txt, exit 0 only if every assertion passed)
set -uo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${OUT:-$REPO/docs/review/batch22/evidence/ship-rehearsal.txt}"
REAL_GIT="$(command -v git)"
REAL_DIST="$REPO/dist"
[ -f "$REAL_DIST/index.html" ] || { echo "need a built dist/ in the repo (npm run build) for the rehearsal"; exit 2; }
OLD_ID="e2b01aeb-b5a7-4df3-b66b-988e9625546f"   # the recorded Batch 20 deployment id
NEW_ID="11111111-2222-3333-4444-555555555555"
BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT
FAILS=0; PASSES=0
: > "$OUT"
log()  { printf '%s\n' "$*" | tee -a "$OUT" >/dev/null; printf '%s\n' "$*"; }
assert() { # desc, then a command whose exit status is the verdict
  local d="$1"; shift
  if "$@" >/dev/null 2>&1; then PASSES=$((PASSES+1)); log "  ASSERT PASS: $d"; else FAILS=$((FAILS+1)); log "  ASSERT FAIL: $d"; fi
}

# ------------------------------------------------------------------ stubs
make_stubs() { # $1 = bin dir
  local B="$1"; mkdir -p "$B"
  cat > "$B/curl" <<'JS'
#!/usr/bin/env node
const fs = require('fs'), path = require('path')
const S = process.env.STUB_DIR, REPO = process.env.STUB_REPO
const rd = (f, d = '') => { try { return fs.readFileSync(path.join(S, f), 'utf8').trim() } catch { return d } }
const log = (f, l) => fs.appendFileSync(path.join(S, f), l + '\n')
const a = process.argv.slice(2)
let method = 'GET', out = null, wo = null, head = false, url = null
for (let i = 0; i < a.length; i++) {
  const x = a[i]
  if (x === '-X') method = a[++i]
  else if (x === '-o') out = a[++i]
  else if (x === '-w') wo = a[++i]
  else if (x === '-H' || x === '-d' || x === '--max-redirs') i++
  else if (/^-[sSLI]+$/.test(x)) { if (x.includes('I')) head = true }
  else if (/^https?:\/\//.test(x)) url = x
}
if (!url) { console.error('stub curl: no url'); process.exit(2) }
const u = new URL(url), host = u.hostname
const ALLOWED = ['kissansahyog.com', 'eltmcznjcqiahqhjvpjg.supabase.co', 'api.cloudflare.com']
if (!ALLOWED.includes(host)) { log('blocked.log', 'BLOCKED real host: ' + url); console.error('stub curl: BLOCKED (not a stubbed host): ' + host); process.exit(6) }
log('curl.log', method + ' ' + host + u.pathname)
let status = 200, ctype = 'text/html', body = ''
const json = (o, s = 200) => { status = s; ctype = 'application/json'; body = JSON.stringify(o) }
let p = decodeURIComponent(u.pathname)
if (host === 'api.cloudflare.com') {
  const live = rd('live_id')
  const m = p.match(/\/projects\/kissansahyog-prod(?:\/deployments\/([0-9a-f-]+)(\/rollback)?)?$/)
  if (!m) json({ success: false, errors: ['bad path'] }, 404)
  else if (!m[1]) json({ success: true, result: { canonical_deployment: { id: live, deployment_trigger: { metadata: { commit_hash: '0123456789abcdef' } } } } })
  else if (m[2] && method === 'POST') {
    log('rollback.log', 'POST rollback to ' + m[1])
    fs.writeFileSync(path.join(S, 'live_id'), m[1])
    if (m[1] === rd('old_id')) { try { fs.unlinkSync(path.join(S, 'deployed')) } catch {} }
    json({ success: true, result: {} })
  } else json({ success: true, result: { id: m[1], environment: 'production', latest_stage: { status: 'success' }, created_on: '2026-11-07T00:00:00Z', deployment_trigger: { metadata: { commit_hash: '051bdca' } } } })
} else if (host.endsWith('.supabase.co')) {
  const missing = rd('db_missing').split(/\s+/).filter(Boolean)
  const m = p.match(/^\/rest\/v1\/rpc\/(\w+)$/)
  if (m && method === 'POST') {
    log('rpc.log', m[1])
    if (['my_mitra_choice_open', 'set_my_mitra_on_offer', 'admin_mitra_statement', 'admin_list_mitra_ads'].includes(m[1])) {
      if (missing.includes(m[1]) || missing.includes('all')) json({ code: 'PGRST202', message: 'Could not find the function public.' + m[1] }, 404)
      else json({ code: 'P0001', message: 'not_admin' }, 400)
    } else if (m[1] === 'get_active_announcements') json([])
    else json({ message: 'unknown' }, 404)
  } else if (p === '/rest/v1/mandi_monthly_history') json([])
  else json({ message: 'unknown' }, 404)
} else {
  const deployed = fs.existsSync(path.join(S, 'deployed'))
  const DIST = path.join(REPO, 'dist')
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.json': 'application/json', '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain' }
  let buf = null
  if (p === '/api/otp/config') json({ otp_required: true, session_enforced: false })
  else if (p === '/api/admin/sms-balance') { status = 401; ctype = 'application/json'; body = '{"error":"unauthorized"}' }
  else if (!deployed) { body = '<html><head><script type="module" src="/assets/index-OLDOLD11.js"></script></head><body>old site</body></html>' }
  else if (head) {
    const h = fs.readFileSync(path.join(DIST, '_headers'), 'utf8').split('\n').find((l) => /content-security-policy/i.test(l)) || ''
    body = 'HTTP/2 200\r\ncontent-type: text/html\r\n' + h.trim() + '\r\n\r\n'
  } else {
    const tries = [p, p + '/index.html', p + '.html', p.replace(/\/$/, '') + '/index.html']
    let f = null
    for (const t of tries) { const q = path.join(DIST, t); if (q.startsWith(DIST) && fs.existsSync(q) && fs.statSync(q).isFile()) { f = q; break } }
    if (!f && /\.(js|css|svg|webp|png|xml|json|txt)$/.test(p)) { status = 404; body = 'not found' }
    else { f = f || path.join(DIST, 'index.html'); ctype = types[path.extname(f)] || 'text/html'; buf = fs.readFileSync(f) }
  }
  if (buf) body = buf
}
const bodyBuf = Buffer.isBuffer(body) ? body : Buffer.from(body)
if (out && out !== '/dev/null') fs.writeFileSync(out, bodyBuf); else if (!out) process.stdout.write(bodyBuf)
if (wo) process.stdout.write(wo.split('\\n').join('\n').replace('%{http_code}', String(status)).replace('%{content_type}', ctype))
process.exit(0)
JS
  cat > "$B/wrangler" <<'SH'
#!/usr/bin/env bash
S="$STUB_DIR"
if [ "$1 $2 $3" = "pages deployment list" ]; then
  echo "| Id | Environment | Branch | Source |"; echo "| $(cat "$S/old_id") | Production | main | 051bdca |"
  [ "$(cat "$S/live_id")" != "$(cat "$S/old_id")" ] && echo "| $(cat "$S/live_id") | Production | main | other |"
  exit 0
fi
if [ "$1 $2" = "pages deploy" ]; then
  echo "DEPLOY $*" >> "$S/deploys.log"
  [ -f "$S/deploy_fail" ] && { echo "stub wrangler: deploy failed"; exit 1; }
  [ -d dist ] || { echo "stub wrangler: no dist"; exit 1; }
  touch "$S/deployed"; cat "$S/new_id" > "$S/live_id"; echo "Deployment complete (stub)"; exit 0
fi
echo "stub wrangler: unsupported: $*" >&2; exit 1
SH
  cat > "$B/npx" <<'SH'
#!/usr/bin/env bash
[ "$1" = wrangler ] || { echo "stub npx: only wrangler" >&2; exit 1; }
shift; exec wrangler "$@"
SH
  cat > "$B/npm" <<'SH'
#!/usr/bin/env bash
S="$STUB_DIR"
[ "$1 $2" = "run build:prod" ] || { echo "stub npm: unsupported: $*" >&2; exit 1; }
echo "BUILD build:prod" >> "$S/build.log"
[ -f "$S/build_fail" ] && { echo "stub npm: build failed"; exit 1; }
rm -rf dist; cp -r "$STUB_REAL_DIST" dist
grep -rl wzxtqbqlahyahsnoqqva dist 2>/dev/null | xargs -r sed -i 's/wzxtqbqlahyahsnoqqva/eltmcznjcqiahqhjvpjg/g'
echo "Prerendering 278 routes"; echo "Prerendered 278/278 routes. Failed: 0 (0 via fallback)"
exit 0
SH
  printf '#!/usr/bin/env bash\necho "sleep $*" >> "$STUB_DIR/sleep.log"\nexit 0\n' > "$B/sleep"
  cat > "$B/git" <<'SH'
#!/usr/bin/env bash
for a in "$@"; do if [ "$a" = push ]; then echo "git push BLOCKED by the rehearsal stub" >&2; echo "push $*" >> "$STUB_DIR/blocked.log"; exit 1; fi; done
exec "$STUB_REAL_GIT" "$@"
SH
  chmod +x "$B"/*
}

# ------------------------------------------------------------------ a fresh temporary copy of the repo for each case
setup_case() { # sets T R S B O
  T="$(mktemp -d -p "$BASE")"; R="$T/repo"; S="$T/state"; B="$T/bin"; O="$T/origin.git"
  mkdir -p "$S" "$R" "$T/home"; make_stubs "$B"
  echo "$OLD_ID" > "$S/old_id"; echo "$OLD_ID" > "$S/live_id"; echo "$NEW_ID" > "$S/new_id"
  "$REAL_GIT" init -q --bare "$O"
  mkdir -p "$R/scripts/lib" "$R/scripts/batch10f" "$R/scripts/batch11a" "$R/functions/api/otp" "$R/functions/api/admin" "$R/functions/lib" "$R/public" "$R/src" "$R/docs/review/batch20/evidence/prod-ship"
  for f in scripts/ship-prod-22.sh scripts/rollback-prod-22.sh scripts/lib/prerender-rule.sh; do cp "$REPO/$f" "$R/$f"; done
  for f in scripts/verify-batch9-live.mjs scripts/check-prod-env.mjs scripts/check-no-localhost-dist.mjs scripts/batch10f/predeploy-size-check.mjs scripts/batch11a/prod-probes.mjs; do
    printf 'process.exit(0)\n' > "$R/$f"
  done
  # the verify stub: writes the snapshot file when asked, fails the "after" gate when state/gate_fail exists
  cat > "$R/scripts/verify-batch9-live.mjs" <<'JS'
import fs from 'node:fs'
const a = process.argv.slice(2); const g = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : '' }
fs.appendFileSync(process.env.STUB_DIR + '/verify.log', 'verify ' + g('--label') + ' ' + g('--checks') + '\n')
if (g('--checks') === 'snapshot') fs.writeFileSync(g('--snapshot'), '{}')
if (g('--label') === 'prod-after' && fs.existsSync(process.env.STUB_DIR + '/gate_fail')) { console.log('FAIL  [stub] a post-deploy gate failed (injected)'); process.exit(1) }
console.log('stub verify ok ' + g('--label'))
JS
  for f in functions/api/otp/send.js functions/api/otp/verify.js functions/api/otp/config.js functions/lib/otp-core.js functions/api/admin/sms-balance.js functions/lib/admin-auth.js; do echo "// stub" > "$R/$f"; done
  echo '[]' > "$R/public/search-index.json"; echo 'export const x = 1' > "$R/src/app.js"
  printf 'VITE_SUPABASE_URL=https://eltmcznjcqiahqhjvpjg.supabase.co\nVITE_SUPABASE_ANON_KEY=fake-anon-key-for-rehearsal\n' > "$R/.env.production"
  printf 'deployment_id=%s\n' "$OLD_ID" > "$R/docs/review/batch20/evidence/prod-ship/prod-deployment-after.txt"
  ( cd "$R" && "$REAL_GIT" init -q -b merge-22 && "$REAL_GIT" config core.autocrlf false && "$REAL_GIT" config user.email r@example.invalid && "$REAL_GIT" config user.name rehearsal \
    && "$REAL_GIT" add -A && "$REAL_GIT" commit -q -m "rehearsal repo" && "$REAL_GIT" remote add origin "$O" \
    && "$REAL_GIT" push -q origin merge-22:main && "$REAL_GIT" tag ship-20 && "$REAL_GIT" push -q origin ship-20 && "$REAL_GIT" fetch -q origin )
}
run_in() { # run a command inside the case's repo with the stub PATH; prints output and the exit code
  ( cd "$R" && env PATH="$B:$PATH" STUB_DIR="$S" STUB_REPO="$R" STUB_REAL_DIST="$REAL_DIST" STUB_REAL_GIT="$REAL_GIT" HOME="$T/home" CLOUDFLARE_API_TOKEN=fake-token-not-real \
      bash "$@" 2>&1 )
}
CODE=0; OUTTXT=""
run_case() { # name, args...   (output kept in $OUTTXT, exit code in $CODE; both written to the evidence file)
  local name="$1"; shift
  log ""; log "=================================================================="; log "CASE $name"; log "\$ bash $*"; log "------------------------------------------------------------------"
  OUTTXT="$(run_in "$@")"; CODE=$?; export OUTTXT
  printf '%s\n' "$OUTTXT" >> "$OUT"
  log "------------------------------------------------------------------"; log "exit code: $CODE"
}
has()      { grep -qF -- "$1" <<<"$OUTTXT"; }
nofile()   { [ ! -s "$S/$1" ]; }
filehas()  { grep -qF -- "$2" "$S/$1" 2>/dev/null; }

log "Batch 22 ship/rollback rehearsal - $(date -u +%Y-%m-%dT%H:%M:%SZ) - all stubs, nothing real is contacted"
log "stub curl allows only kissansahyog.com, the production Supabase host and api.cloudflare.com, answers them from local files, and exits 6 for anything else."

# ---- 0. the network guard itself
setup_case
log ""; log "CASE 0 (guard): a stub curl must refuse a real host"
G="$(run_in -c 'curl -s https://example.com/ ; echo "curl exit: $?"')"; log "$G"
assert "curl to example.com is blocked (exit 6, logged)" bash -c "grep -q 'curl exit: 6' <<<'$G' && grep -q 'BLOCKED real host' '$S/blocked.log'"

# ---- 1. happy path
setup_case
run_case "1 happy path (every gate passes, deploys, records the previous deployment id)" scripts/ship-prod-22.sh
assert "exit 0 and SHIP OK" bash -c "[ $CODE = 0 ]"; assert "prints SHIP OK" has "SHIP OK"
assert "DB gate ran before the build: all 4 functions PASS" bash -c "[ \$(grep -c 'PASS  \[db\]' <<<\"\$OUTTXT\") -ge 8 ]"
assert "built exactly once" bash -c "[ \$(wc -l < '$S/build.log') = 1 ]"
assert "deployed exactly once" bash -c "[ \$(wc -l < '$S/deploys.log') = 1 ]"
assert "no rollback happened" nofile rollback.log
assert "recorded the previous deployment id" bash -c "grep -q '^deployment_id=$OLD_ID' '$R/docs/review/batch22/evidence/prod-ship/prod-deployment-before.txt'"
assert "live deployment is now the new one" filehas live_id "$NEW_ID"
assert "printed HEAD and origin/main hashes" bash -c "grep -q 'git rev-parse HEAD  *-> [0-9a-f]\{40\}' <<<\"\$OUTTXT\" && grep -q 'git rev-parse origin/main -> [0-9a-f]\{40\}' <<<\"\$OUTTXT\""
assert "the OTP switches are only read (no write call): curl log has no POST to /api/otp" bash -c "! grep -q 'POST kissansahyog.com/api/otp' '$S/curl.log'"
assert "no real host was contacted" nofile blocked.log
assert "no git push attempted" nofile blocked.log
assert "post-deploy Mitra gates passed (22_signup, 22_chunks, 22_main, db)" bash -c "grep -q 'PASS  \[22_signup\]' <<<\"\$OUTTXT\" && grep -q 'PASS  \[22_chunks\]' <<<\"\$OUTTXT\" && grep -q 'PASS  \[22_main\]' <<<\"\$OUTTXT\" && ! grep -q 'FAIL' <<<\"\$OUTTXT\""
HAPPY_REPO="$R"; HAPPY_S="$S"; HAPPY_T="$T"; HAPPY_OUT="$OUTTXT"

# ---- 1b. run twice (safe to run twice): second run on the same state, live is now the NEW one
log ""; log "CASE 1b run it a second time on the same state (the live deployment is now the new one, not the expected Batch 20 one)"
R="$HAPPY_REPO"; S="$HAPPY_S"; T="$HAPPY_T"; B="$T/bin"
run_case "1b second run" scripts/ship-prod-22.sh
assert "second run refuses before any change (live is not the expected deployment)" bash -c "[ $CODE = 1 ]"
assert "says SHIP STOPPED BEFORE ANY CHANGE" has "SHIP STOPPED BEFORE ANY CHANGE"
assert "still only one deploy and one build" bash -c "[ \$(wc -l < '$S/deploys.log') = 1 ] && [ \$(wc -l < '$S/build.log') = 1 ]"

# ---- 2. database gate fails
setup_case; echo "admin_mitra_statement" > "$S/db_missing"
run_case "2 the 0076/0077 pre-deploy gate fails (0077 function missing)" scripts/ship-prod-22.sh
assert "refuses (exit 1)" bash -c "[ $CODE = 1 ]"
assert "plain message: apply 0076 / 0077 first" has "apply 0076 / 0077 first"
assert "nothing built" nofile build.log
assert "nothing deployed" nofile deploys.log
assert "no rollback" nofile rollback.log
assert "live deployment untouched" filehas live_id "$OLD_ID"
setup_case; echo "all" > "$S/db_missing"
run_case "2b same, both migrations missing" scripts/ship-prod-22.sh
assert "refuses, nothing built or deployed" bash -c "[ $CODE = 1 ] && [ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"

# ---- 3. post-deploy gate fails -> automatic rollback
setup_case; touch "$S/gate_fail"
run_case "3 a post-deploy gate fails -> automatic rollback to the recorded previous deployment" scripts/ship-prod-22.sh
assert "exit 1" bash -c "[ $CODE = 1 ]"
assert "says it is ROLLING BACK AUTOMATICALLY" has "ROLLING BACK AUTOMATICALLY to deployment $OLD_ID"
assert "deployed once" bash -c "[ \$(wc -l < '$S/deploys.log') = 1 ]"
assert "rollback API POST went to the recorded previous id" filehas rollback.log "POST rollback to $OLD_ID"
assert "live deployment is the previous one again" filehas live_id "$OLD_ID"
assert "says the new version was NOT kept" has "the new version was NOT kept"

# ---- 3b. deploy command itself fails -> rollback too
setup_case; touch "$S/deploy_fail"
run_case "3b wrangler deploy itself fails -> automatic rollback" scripts/ship-prod-22.sh
has_all() { [ "$CODE" = 1 ] && has 'ROLLING BACK AUTOMATICALLY' && has 'the new version was NOT kept' && filehas live_id "$OLD_ID"; }
assert "refused; the automatic rollback ran and found the previous deployment still live (nothing had gone live, so no POST)" has_all

# ---- 3c. build fails -> nothing deployed
setup_case; touch "$S/build_fail"
run_case "3c the production build fails -> nothing deployed" scripts/ship-prod-22.sh
assert "refuses before any deploy" bash -c "[ $CODE = 1 ] && [ ! -s '$S/deploys.log' ] && [ ! -s '$S/rollback.log' ]"

# ---- 4. wrong branch
setup_case; ( cd "$R" && "$REAL_GIT" checkout -q -b release-22 )
run_case "4 wrong branch (release-22)" scripts/ship-prod-22.sh
assert "refuses" bash -c "[ $CODE = 1 ]"; assert "names the branch rule" has "not on branch merge-22"
assert "nothing built, nothing deployed" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"
run_case "4b wrong branch, dry run" scripts/ship-prod-22.sh --dry-run
assert "dry run refuses too" bash -c "[ $CODE = 1 ]" ; assert "names the branch rule" has "not on branch merge-22"

# ---- 5. HEAD differs from origin/main
setup_case; ( cd "$R" && echo 'export const y = 2' > src/app.js && "$REAL_GIT" add -A && "$REAL_GIT" commit -q -m "local only" )
run_case "5 HEAD differs from origin/main (a local commit that was not pushed)" scripts/ship-prod-22.sh
assert "refuses" bash -c "[ $CODE = 1 ]"; assert "says HEAD is not origin/main" has "is not origin/main"
assert "nothing built, nothing deployed" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"

# ---- 6. dirty tree
setup_case; ( cd "$R" && echo 'export const z = 3' > src/app.js )
run_case "6 dirty tree (a tracked source file changed)" scripts/ship-prod-22.sh
assert "refuses" bash -c "[ $CODE = 1 ]"; assert "says modified tracked files would change what ships" has "modified tracked files would change what ships"
assert "nothing built, nothing deployed" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"
setup_case; ( cd "$R" && echo '[1]' > public/search-index.json )
run_case "6b only the build-output file public/search-index.json differs (allowed, as in the old scripts)" scripts/ship-prod-22.sh --dry-run
assert "not refused for that" bash -c "[ $CODE = 0 ]"

# ---- 7. dry run
setup_case
run_case "7 --dry-run (everything read-only; deploys nothing; rolls nothing back)" scripts/ship-prod-22.sh --dry-run
assert "exit 0 and DRY RUN OK" bash -c "[ $CODE = 0 ]"; assert "prints DRY RUN OK" has "DRY RUN OK"
assert "ran the DB gate" has "PASS  [db] admin_mitra_statement exists on production"
assert "nothing built" nofile build.log; assert "nothing deployed" nofile deploys.log; assert "no rollback POST" nofile rollback.log
assert "rolled back nothing (rollback script only validated)" has "[rollback dry-run]"
assert "live deployment untouched" filehas live_id "$OLD_ID"
setup_case; echo "admin_list_mitra_ads" > "$S/db_missing"
run_case "7b --dry-run with a missing database function" scripts/ship-prod-22.sh --dry-run
assert "dry run reports it as pending (a real run would stop) and still deploys nothing" bash -c "grep -q 'apply 0076 / 0077 first' <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ] && [ ! -s '$S/build.log' ]"

# ---- 9. live is not the expected deployment / --expect-live
setup_case; echo "99999999-8888-7777-6666-555555555555" > "$S/live_id"
run_case "9 the live deployment is not the recorded Batch 20 one" scripts/ship-prod-22.sh
assert "refuses before any change and suggests --expect-live" bash -c "[ $CODE = 1 ] && grep -q -- '--expect-live 99999999-8888-7777-6666-555555555555' <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"
run_case "9b same, with --expect-live <that id>" scripts/ship-prod-22.sh --expect-live 99999999-8888-7777-6666-555555555555
assert "ships when the founder names the live id" bash -c "[ $CODE = 0 ] && grep -q 'SHIP OK' <<<\"\$OUTTXT\""
setup_case; rm -f "$R/docs/review/batch20/evidence/prod-ship/prod-deployment-after.txt"
run_case "9c no recorded id in the repo and no --expect-live" scripts/ship-prod-22.sh
assert "refuses without it" bash -c "[ $CODE = 1 ] && grep -q 'give  --expect-live' <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"

# ---- 8. rollback script
setup_case; echo "$NEW_ID" > "$S/live_id"; touch "$S/deployed"
run_case "8a rollback script --dry-run" scripts/rollback-prod-22.sh "$OLD_ID" --dry-run
assert "DRY RUN OK, no POST, live deployment unchanged" bash -c "[ $CODE = 0 ] && grep -q 'DRY RUN OK' <<<\"\$OUTTXT\" && [ ! -s '$S/rollback.log' ] && grep -q '$NEW_ID' '$S/live_id'"
run_case "8b rollback script (real, stubbed)" scripts/rollback-prod-22.sh "$OLD_ID"
assert "ROLLBACK DONE, POST went to the given id, live is the old deployment" bash -c "[ $CODE = 0 ] && grep -q 'ROLLBACK DONE' <<<\"\$OUTTXT\" && grep -q 'POST rollback to $OLD_ID' '$S/rollback.log' && grep -q '$OLD_ID' '$S/live_id'"
run_case "8c rollback script again (already live)" scripts/rollback-prod-22.sh "$OLD_ID"
assert "NOTHING TO DO, no second POST" bash -c "[ $CODE = 0 ] && grep -q 'NOTHING TO DO' <<<\"\$OUTTXT\" && [ \$(wc -l < '$S/rollback.log') = 1 ]"
run_case "8d rollback script with a bad id" scripts/rollback-prod-22.sh not-an-id
assert "refuses a malformed id" bash -c "[ $CODE = 1 ] && grep -q 'is not a full deployment id' <<<\"\$OUTTXT\" && [ \$(wc -l < '$S/rollback.log') = 1 ]"
echo "$NEW_ID" > "$S/live_id"; touch "$S/deployed"
run_case "8e rollback script without an id (falls back to the recorded Batch 20 id) --dry-run" scripts/rollback-prod-22.sh --dry-run
assert "uses the recorded Batch 20 deployment" bash -c "[ $CODE = 0 ] && grep -q 'Batch 20 deployment $OLD_ID' <<<\"\$OUTTXT\""

log ""; log "=================================================================="
log "SUMMARY: $PASSES assertions passed, $FAILS failed"
[ "$FAILS" = 0 ]
