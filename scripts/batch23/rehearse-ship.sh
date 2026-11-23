#!/usr/bin/env bash
# Batch 23 - rehearses scripts/ship-prod-23.sh and scripts/rollback-prod-23.sh end to end against STUBS. Nothing here can reach the internet or production:
#   * a stub `curl` (node) answers every request from local state/files and REFUSES (exit 6, logged) any host other than the three the scripts name; it never opens a socket;
#   * stub `wrangler`/`npx`/`npm`/`sleep`; a `git` wrapper that blocks `git push`; the node helper scripts (verify, prod-env guard, ...) are tiny stubs in a temporary copy of the repo
#     (except in the size cases, where the REAL scripts/batch10f/predeploy-size-check.mjs runs);
#   * the temporary copy has its own local bare "origin" folder (a path on this disk), the real git binary works inside it;
#   * the fake production "site" is a copy of this repo's own dist/ (a real Batch 23 `npm run build:prod` output), so the real bundle gates run on real files.
# Usage: bash scripts/batch23/rehearse-ship.sh   (writes docs/review/batch23/evidence/ship-rehearsal.txt, exit 0 only if every assertion passed)
set -uo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${OUT:-$REPO/docs/review/batch23/evidence/ship-rehearsal.txt}"
REAL_GIT="$(command -v git)"
REAL_DIST="$REPO/dist"
[ -f "$REAL_DIST/index.html" ] || { echo "need a built dist/ in the repo (npm run build:prod) for the rehearsal"; exit 2; }
OLD_ID="3c7be25f-78e5-4059-ba5e-0d04d5611e26"   # the Batch 22 production deployment (live now, the rollback target)
NEW_ID="11111111-2222-3333-4444-555555555555"
BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT
FAILS=0; PASSES=0
mkdir -p "$(dirname "$OUT")"; : > "$OUT"
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
const has = (f) => fs.existsSync(path.join(S, f))
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
const istToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
let p = decodeURIComponent(u.pathname)
const DIST = path.join(REPO, 'dist')
const RD = process.env.STUB_REAL_DIST   // the "live" (previous-batch) site before the deploy: real chunks of this repo's own dist
if (host === 'api.cloudflare.com') {
  const live = rd('live_id')
  const m = p.match(/\/projects\/kissansahyog-prod(?:\/deployments\/([0-9a-f-]+)(\/rollback)?)?$/)
  if (!m) json({ success: false, errors: ['bad path'] }, 404)
  else if (!m[1]) json({ success: true, result: { canonical_deployment: { id: live, deployment_trigger: { metadata: { commit_hash: '0123456789abcdef' } } } } })
  else if (m[2] && method === 'POST') {
    log('rollback.log', 'POST rollback to ' + m[1])
    fs.writeFileSync(path.join(S, 'live_id'), m[1])
    if (m[1] === rd('old_id')) { for (const f of ['deployed', 'deployed_old_html']) { try { fs.unlinkSync(path.join(S, f)) } catch {} } }
    json({ success: true, result: {} })
  } else json({ success: true, result: { id: m[1], environment: 'production', latest_stage: { status: 'success' }, created_on: '2026-11-07T00:00:00Z', deployment_trigger: { metadata: { commit_hash: 'e46b586' } } } })
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
  else if (p === '/rest/v1/mandi_prices') {
    log('prices.log', method + ' ' + u.search)
    if (method !== 'GET') json({ message: 'stub: price table is read-only here' }, 405)
    else if (has('price_http_fail')) json({ message: 'boom' }, 500)
    else {
      const age = Number(rd('price_age', '0'))
      const d = new Date(Date.parse(istToday() + 'T00:00:00Z') - age * 86400000).toISOString().slice(0, 10)
      json([{ price_date: d }])
    }
  } else json({ message: 'unknown' }, 404)
} else {
  const deployed = has('deployed')
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.json': 'application/json', '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain' }
  const OLDHTML = '<html><head><script type="module" src="/assets/index-OLDOLD11.js"></script></head><body>old site</body></html>'
  const distMain = () => (fs.readFileSync(path.join(RD, 'index.html'), 'utf8').match(/\/assets\/index-[A-Za-z0-9_-]*\.js/) || [''])[0]
  let buf = null
  const B22 = ['my_mitra_choice_open', 'set_my_mitra_on_offer', 'admin_mitra_statement', 'mitra-statement']
  if (p === '/api/otp/config') { const flip = deployed && has('otp_flips_after'); json({ otp_required: true, session_enforced: flip }) }
  else if (p === '/api/admin/sms-balance') { status = 401; ctype = 'application/json'; body = '{"error":"unauthorized"}' }
  else if (p === '/assets/index-OLDOLD11.js') { body = fs.readFileSync(path.join(RD, distMain()), 'utf8') + '\n/* old main */' ; ctype = 'text/javascript' }
  else if (/^\/assets\/.*\.js$/.test(p) && !deployed) {
    // before the deploy the "live" site is the previous batch: the same real chunks (so the Batch 22 markers are in them), unless a case removes the markers
    const f = path.join(RD, p)
    if (!fs.existsSync(f)) { status = 404; body = 'not found' }
    else { let t = fs.readFileSync(f, 'utf8'); if (has('b22_missing')) for (const m of B22) t = t.split(m).join('removed_marker'); body = t; ctype = 'text/javascript' }
  }
  else if (!deployed || has('deployed_old_html')) {
    body = OLDHTML
    if (/^\/assets\//.test(p)) { status = 404; body = 'not found' }
  } else if (head) {
    const h = fs.readFileSync(path.join(DIST, '_headers'), 'utf8').split('\n').find((l) => /content-security-policy/i.test(l)) || ''
    body = 'HTTP/2 200\r\ncontent-type: text/html\r\n' + h.trim() + '\r\n\r\n'
  } else {
    const tries = [p, p + '/index.html', p + '.html', p.replace(/\/$/, '') + '/index.html']
    let f = null
    for (const t of tries) { const q = path.join(DIST, t); if (q.startsWith(DIST) && fs.existsSync(q) && fs.statSync(q).isFile()) { f = q; break } }
    if (!f && /\.(js|css|svg|webp|png|xml|json|txt)$/.test(p)) { status = 404; body = 'not found' }
    else {
      f = f || path.join(DIST, 'index.html'); ctype = types[path.extname(f)] || 'text/html'; buf = fs.readFileSync(f)
      if (ctype === 'text/html' && has('live_stale_html') && (p === '/' || p === '/msp')) buf = Buffer.concat([buf, Buffer.from('<p>कल का भाव (21/11)</p>')])
      if (ctype === 'text/html' && has('live_no_placeholder') && p === '/msp') buf = Buffer.from(buf.toString('utf8').split('data-testid="snapshot-placeholder"').join('data-x="gone"'))
      if (/\.js$/.test(p) && has('live_labels_missing')) buf = Buffer.from(buf.toString('utf8').split('mandi_price_today').join('removed_label'))
    }
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
  echo "| Id | Environment | Branch | Source |"; echo "| $(cat "$S/old_id") | Production | main | e46b586 |"
  [ "$(cat "$S/live_id")" != "$(cat "$S/old_id")" ] && echo "| $(cat "$S/live_id") | Production | main | other |"
  exit 0
fi
if [ "$1 $2" = "pages deploy" ]; then
  echo "DEPLOY $*" >> "$S/deploys.log"
  [ -f "$S/deploy_fail" ] && { echo "stub wrangler: deploy failed"; exit 1; }
  [ -d dist ] || { echo "stub wrangler: no dist"; exit 1; }
  touch "$S/deployed"; [ -f "$S/main_unchanged" ] && touch "$S/deployed_old_html"
  cat "$S/new_id" > "$S/live_id"; echo "Deployment complete (stub)"; exit 0
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
# cases that put a forbidden string into the built static HTML (the gate must stop the ship before any deploy)
[ -f "$S/bad_msp_badge" ] && printf '<span class="ks-date-badge">x</span>' >> dist/msp/index.html
[ -f "$S/bad_msp_kal" ] && printf '<p>कल का भाव (21/11)</p>' >> dist/msp/index.html
[ -f "$S/bad_home_kal" ] && printf '<p>कल का भाव</p>' >> dist/index.html
[ -f "$S/bad_chana_pichla" ] && printf '<p>पिछला भाव (14/11)</p>' >> dist/msp/chana/index.html
[ -f "$S/bad_other_page" ] && printf '<p>पिछला भाव (14/11)</p>' >> dist/about/index.html
[ -f "$S/no_msp_placeholder" ] && sed -i 's/data-testid="snapshot-placeholder"/data-x="gone"/g' dist/msp/index.html
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
setup_case() { # sets T R S B O ; $1 = "realsize" to run the REAL predeploy-size-check.mjs
  T="$(mktemp -d -p "$BASE")"; R="$T/repo"; S="$T/state"; B="$T/bin"; O="$T/origin.git"
  mkdir -p "$S" "$R" "$T/home"; make_stubs "$B"
  echo "$OLD_ID" > "$S/old_id"; echo "$OLD_ID" > "$S/live_id"; echo "$NEW_ID" > "$S/new_id"
  "$REAL_GIT" init -q --bare "$O"
  mkdir -p "$R/scripts/lib" "$R/scripts/batch10f" "$R/scripts/batch11a" "$R/functions/api/otp" "$R/functions/api/admin" "$R/functions/lib" "$R/public" "$R/src" "$R/docs/review/batch22/evidence/prod-ship"
  for f in scripts/ship-prod-23.sh scripts/rollback-prod-23.sh scripts/lib/prerender-rule.sh; do cp "$REPO/$f" "$R/$f"; done
  for f in scripts/verify-batch9-live.mjs scripts/check-prod-env.mjs scripts/check-no-localhost-dist.mjs scripts/batch10f/predeploy-size-check.mjs scripts/batch11a/prod-probes.mjs scripts/prerender.mjs scripts/gen-sitemaps.mjs; do
    printf 'process.exit(0)\n' > "$R/$f"
  done
  [ "${1:-}" = realsize ] && cp "$REPO/scripts/batch10f/predeploy-size-check.mjs" "$R/scripts/batch10f/predeploy-size-check.mjs"
  # the re-prerender stubs print the same lines as the build stub
  printf 'console.log("Prerendering 278 routes"); console.log("Prerendered 278/278 routes. Failed: 0 (0 via fallback)")\n' > "$R/scripts/prerender.mjs"
  # the verify stub: writes the snapshot file when asked (a crafted one if state/snapshot.json exists), fails the "after" gate when state/gate_fail exists
  cat > "$R/scripts/verify-batch9-live.mjs" <<'JS'
import fs from 'node:fs'
const a = process.argv.slice(2); const g = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : '' }
fs.appendFileSync(process.env.STUB_DIR + '/verify.log', 'verify ' + g('--label') + ' ' + g('--checks') + '\n')
if (g('--checks') === 'snapshot') { const f = process.env.STUB_DIR + '/snapshot.json'; fs.writeFileSync(g('--snapshot'), fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '{"pages":{}}') }
if (g('--label') === 'prod-after' && fs.existsSync(process.env.STUB_DIR + '/gate_fail')) { console.log('FAIL  [stub] a post-deploy gate failed (injected)'); process.exit(1) }
console.log('stub verify ok ' + g('--label'))
JS
  for f in functions/api/otp/send.js functions/api/otp/verify.js functions/api/otp/config.js functions/lib/otp-core.js functions/api/admin/sms-balance.js functions/lib/admin-auth.js; do echo "// stub" > "$R/$f"; done
  echo '[]' > "$R/public/search-index.json"; echo 'export const x = 1' > "$R/src/app.js"
  printf 'VITE_SUPABASE_URL=https://eltmcznjcqiahqhjvpjg.supabase.co\nVITE_SUPABASE_ANON_KEY=fake-anon-key-for-rehearsal\n' > "$R/.env.production"
  printf 'deployment_id=%s\n' "$OLD_ID" > "$R/docs/review/batch22/evidence/prod-ship/prod-deployment-after.txt"
  ( cd "$R" && "$REAL_GIT" init -q -b release-23 && "$REAL_GIT" config core.autocrlf false && "$REAL_GIT" config user.email r@example.invalid && "$REAL_GIT" config user.name rehearsal \
    && "$REAL_GIT" add -A && "$REAL_GIT" commit -q -m "rehearsal repo" && "$REAL_GIT" remote add origin "$O" \
    && "$REAL_GIT" push -q origin release-23:main && "$REAL_GIT" fetch -q origin )
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
nothing_changed() { [ ! -s "$S/build.log" ] && [ ! -s "$S/deploys.log" ] && [ ! -s "$S/rollback.log" ] && grep -q "$OLD_ID" "$S/live_id"; }
touched_nothing() { [ ! -s "$S/deploys.log" ] && [ ! -s "$S/rollback.log" ] && grep -q "$OLD_ID" "$S/live_id"; }
# a crafted snapshot of the live site: the page sizes of the REAL dist divided by a ratio, so the new build is exactly that fraction of "live"
craft_snapshot() { # $1 = ratio for /msp ; writes $S/snapshot.json
  node -e "
const fs=require('fs');const D=process.argv[1],r=Number(process.argv[2]);
const sz=(f)=>fs.statSync(D+'/'+f).size;
const pages={'/':{bytes:Math.round(sz('index.html')/0.93),faq:false,status:200},'/msp':{bytes:Math.round(sz('msp/index.html')/r),faq:true,status:200},'/browse':{bytes:Math.round(sz('index.html')/0.93),faq:false,status:200}};
fs.writeFileSync(process.argv[3],JSON.stringify({base:'stub',pages}))" "$REAL_DIST" "$1" "$S/snapshot.json"
}

log "Batch 23 ship/rollback rehearsal - $(date -u +%Y-%m-%dT%H:%M:%SZ) - all stubs, nothing real is contacted"
log "stub curl allows only kissansahyog.com, the production Supabase host and api.cloudflare.com, answers them from local files, and exits 6 for anything else."

# ---- 0. the network guard itself
setup_case
log ""; log "CASE 0 (guard): a stub curl must refuse a real host"
G="$(run_in -c 'curl -s https://example.com/ ; echo "curl exit: $?"')"; log "$G"
assert "curl to example.com is blocked (exit 6, logged)" bash -c "grep -q 'curl exit: 6' <<<'$G' && grep -q 'BLOCKED real host' '$S/blocked.log'"

# ---- 1. happy path
setup_case
run_case "1 happy path (every gate passes, deploys once, records the previous deployment id)" scripts/ship-prod-23.sh
assert "exit 0 and SHIP OK" bash -c "[ $CODE = 0 ]"; assert "prints SHIP OK" has "SHIP OK"
assert "first gate proved Batch 22 is live from the live JS (all four markers)" bash -c "grep -q 'all four Batch 22 markers are in the live chunks' <<<\"\$OUTTXT\""
assert "price-data gate passed (newest price_date within 3 days)" bash -c "grep -q 'PASS  \[price_data\]' <<<\"\$OUTTXT\""
assert "price table read with ONE GET, never written" bash -c "[ \$(grep -c 'GET' '$S/prices.log') = 1 ] && ! grep -q 'POST\|PATCH\|DELETE\|PUT' '$S/prices.log'"
assert "DB gate ran before the build: all 4 Batch 22 functions PASS" bash -c "[ \$(grep -c 'PASS  \[db\]' <<<\"\$OUTTXT\") -ge 8 ]"
assert "built exactly once" bash -c "[ \$(wc -l < '$S/build.log') = 1 ]"
assert "deployed exactly once" bash -c "[ \$(wc -l < '$S/deploys.log') = 1 ]"
assert "no rollback happened" nofile rollback.log
assert "recorded the previous deployment id (the Batch 22 one)" bash -c "grep -q '^deployment_id=$OLD_ID' '$R/docs/review/batch23/evidence/prod-ship/prod-deployment-before.txt'"
assert "live deployment is now the new one" filehas live_id "$NEW_ID"
assert "printed HEAD and origin/main hashes" bash -c "grep -q 'git rev-parse HEAD  *-> [0-9a-f]\{40\}' <<<\"\$OUTTXT\" && grep -q 'git rev-parse origin/main -> [0-9a-f]\{40\}' <<<\"\$OUTTXT\""
assert "the OTP switches are only read (no write call): curl log has no POST to /api/otp" bash -c "! grep -q 'POST kissansahyog.com/api/otp' '$S/curl.log'"
assert "OTP switches before and after are the same" bash -c "grep -q 'PASS  \[12a_switches\]' <<<\"\$OUTTXT\""
assert "no real host was contacted, no git push attempted" nofile blocked.log
assert "post-deploy gates passed: static HTML (23_static), placeholders, labels, main chunk, Batch 22 regression, db" bash -c "grep -q 'PASS  \[23_static\] GET / ' <<<\"\$OUTTXT\" && grep -q 'PASS  \[23_static\] GET /msp ' <<<\"\$OUTTXT\" && grep -q 'PASS  \[23_static\] GET /msp/chana ' <<<\"\$OUTTXT\" && grep -q 'PASS  \[23_placeholder\]' <<<\"\$OUTTXT\" && grep -q 'PASS  \[23_labels\]' <<<\"\$OUTTXT\" && grep -q 'PASS  \[23_main\]' <<<\"\$OUTTXT\" && grep -q 'PASS  \[22_chunks\]' <<<\"\$OUTTXT\" && grep -q 'PASS  \[10f_msp\] GET /msp -> 200, new main chunk, has data-testid=\"snapshot-placeholder\"' <<<\"\$OUTTXT\" && ! grep -q 'FAIL' <<<\"\$OUTTXT\""
assert "the size gate ran with the 0.60 /msp floor" bash -c "grep -q 'msp=0.60' <<<\"\$OUTTXT\""
HAPPY_REPO="$R"; HAPPY_S="$S"; HAPPY_T="$T"; HAPPY_OUT="$OUTTXT"

# ---- 1b. run twice
log ""; log "CASE 1b run it a second time on the same state (the live deployment is now the new one, not the expected Batch 22 one)"
R="$HAPPY_REPO"; S="$HAPPY_S"; T="$HAPPY_T"; B="$T/bin"
run_case "1b second run" scripts/ship-prod-23.sh
assert "second run refuses before any change (live is not the expected deployment)" bash -c "[ $CODE = 1 ]"
assert "says SHIP STOPPED BEFORE ANY CHANGE" has "SHIP STOPPED BEFORE ANY CHANGE"
assert "still only one deploy and one build" bash -c "[ \$(wc -l < '$S/deploys.log') = 1 ] && [ \$(wc -l < '$S/build.log') = 1 ]"

# ---- 2. the live deployment is not the expected one
setup_case; echo "99999999-8888-7777-6666-555555555555" > "$S/live_id"
run_case "2 the live deployment is not the expected Batch 22 one -> refuses before building" scripts/ship-prod-23.sh
assert "refuses (exit 1), suggests --expect-live with the found id" bash -c "[ $CODE = 1 ] && grep -q -- '--expect-live 99999999-8888-7777-6666-555555555555' <<<\"\$OUTTXT\""
assert "nothing built, nothing deployed, no rollback" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ] && [ ! -s '$S/rollback.log' ]"
run_case "2b same, with --expect-live <that id>" scripts/ship-prod-23.sh --expect-live 99999999-8888-7777-6666-555555555555
assert "ships when the founder names the live id" bash -c "[ $CODE = 0 ] && grep -q 'SHIP OK' <<<\"\$OUTTXT\""
setup_case; rm -f "$R/docs/review/batch22/evidence/prod-ship/prod-deployment-after.txt"; ( cd "$R" && "$REAL_GIT" add -A && "$REAL_GIT" commit -q -m "no record" && "$REAL_GIT" push -q origin release-23:main && "$REAL_GIT" fetch -q origin )
run_case "2c the Batch 22 record file is missing: the built-in id (3c7be25f-...) is used" scripts/ship-prod-23.sh
assert "ships using the built-in Batch 22 id" bash -c "[ $CODE = 0 ] && grep -q 'the built-in Batch 22 deployment id' <<<\"\$OUTTXT\" && grep -q 'SHIP OK' <<<\"\$OUTTXT\""
run_case "2d the dry run prints the live id it found" scripts/ship-prod-23.sh --dry-run
assert "the dry run prints the live deployment id" has "live now: deployment"

# ---- 3. Batch 22 markers missing on the live site
setup_case; touch "$S/b22_missing"
run_case "3 Batch 22 markers are missing from the live JS -> refuses before building" scripts/ship-prod-23.sh
assert "refuses (exit 1)" bash -c "[ $CODE = 1 ]"
assert "names the missing markers" bash -c "grep -q 'NOT found in the live chunks' <<<\"\$OUTTXT\" && grep -q 'my_mitra_choice_open' <<<\"\$OUTTXT\""
assert "says Batch 22 must be the live version first" has "Batch 22 must be the live version first"
assert "nothing built, nothing deployed, no rollback" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ] && [ ! -s '$S/rollback.log' ]"
setup_case; touch "$S/b22_missing"
run_case "3b same, dry run" scripts/ship-prod-23.sh --dry-run
assert "dry run shows it as pending, ends with a pending count, deploys nothing" bash -c "grep -q 'Batch 22 must be the live version first' <<<\"\$OUTTXT\" && grep -q 'DRY RUN OK (' <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"

# ---- 4. price data not current / not readable
setup_case; echo 5 > "$S/price_age"
run_case "4 the newest price_date is 5 days old -> refuses before building" scripts/ship-prod-23.sh
assert "refuses (exit 1)" bash -c "[ $CODE = 1 ]"
assert "says the price data is not current" bash -c "grep -q 'FAIL  \[price_data\]' <<<\"\$OUTTXT\" && grep -q 'production price data is not current' <<<\"\$OUTTXT\""
assert "nothing built, nothing deployed, no rollback" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ] && [ ! -s '$S/rollback.log' ]"
setup_case; echo 3 > "$S/price_age"
run_case "4b exactly 3 days old is still accepted (limit is 3)" scripts/ship-prod-23.sh --dry-run
assert "price gate passes at 3 days" bash -c "grep -q 'PASS  \[price_data\]' <<<\"\$OUTTXT\""
setup_case; touch "$S/price_http_fail"
run_case "4c the price table cannot be read (HTTP 500) -> refuses before building" scripts/ship-prod-23.sh
assert "refuses; nothing built or deployed" bash -c "[ $CODE = 1 ] && grep -q 'not readable' <<<\"\$OUTTXT\" && [ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"

# ---- 5. post-deploy: the live HTML still has a stale price claim -> automatic rollback
setup_case; touch "$S/live_stale_html"
run_case "5 post-deploy gate fails: the live HTML still contains 'कल का भाव' -> automatic rollback" scripts/ship-prod-23.sh
assert "exit 1" bash -c "[ $CODE = 1 ]"
assert "the 23_static gate FAILED on the stale text" bash -c "grep -q 'FAIL  \[23_static\] GET / ' <<<\"\$OUTTXT\" || grep -q 'FAIL  \[23_static\] GET /msp ' <<<\"\$OUTTXT\""
assert "says it is ROLLING BACK AUTOMATICALLY to the recorded previous id" has "ROLLING BACK AUTOMATICALLY to deployment $OLD_ID"
assert "deployed once" bash -c "[ \$(wc -l < '$S/deploys.log') = 1 ]"
assert "rollback API POST went to the recorded previous id" filehas rollback.log "POST rollback to $OLD_ID"
assert "live deployment is the previous one again" filehas live_id "$OLD_ID"
assert "says the new version was NOT kept" has "the new version was NOT kept"
setup_case; touch "$S/live_no_placeholder"
run_case "5b post-deploy: /msp lost its placeholder -> automatic rollback" scripts/ship-prod-23.sh
assert "rolled back to the previous id" bash -c "[ $CODE = 1 ] && grep -q 'POST rollback to $OLD_ID' '$S/rollback.log' && grep -q 'FAIL  \[10f_msp\]' <<<\"\$OUTTXT\""
setup_case; touch "$S/live_labels_missing"
run_case "5c post-deploy: the live strings chunk lacks the new labels -> automatic rollback" scripts/ship-prod-23.sh
assert "rolled back to the previous id" bash -c "[ $CODE = 1 ] && grep -q 'POST rollback to $OLD_ID' '$S/rollback.log' && grep -q 'FAIL  \[23_labels\]' <<<\"\$OUTTXT\""
setup_case; touch "$S/otp_flips_after"
run_case "5d post-deploy: an OTP switch is different after the deploy -> automatic rollback" scripts/ship-prod-23.sh
assert "rolled back to the previous id" bash -c "[ $CODE = 1 ] && grep -q 'POST rollback to $OLD_ID' '$S/rollback.log' && grep -q 'FAIL  \[12a_switches\]' <<<\"\$OUTTXT\""
setup_case; touch "$S/gate_fail"
run_case "5e post-deploy: the prod verifier (compare/data/...) fails -> automatic rollback" scripts/ship-prod-23.sh
assert "rolled back to the previous id" bash -c "[ $CODE = 1 ] && grep -q 'POST rollback to $OLD_ID' '$S/rollback.log' && grep -q 'ROLLING BACK AUTOMATICALLY' <<<\"\$OUTTXT\""

# ---- 6. post-deploy: the live main chunk did not change
setup_case; touch "$S/main_unchanged"
run_case "6 post-deploy: the live main chunk did not change (still the old site) -> automatic rollback" scripts/ship-prod-23.sh
assert "exit 1, says the site does not serve the new build" bash -c "[ $CODE = 1 ] && grep -q 'does not serve the new build' <<<\"\$OUTTXT\""
assert "automatic rollback to the recorded previous id" bash -c "grep -q 'ROLLING BACK AUTOMATICALLY to deployment $OLD_ID' <<<\"\$OUTTXT\" && grep -q 'POST rollback to $OLD_ID' '$S/rollback.log'"
assert "live deployment is the previous one again" filehas live_id "$OLD_ID"

# ---- 6b/c. deploy fails, build fails
setup_case; touch "$S/deploy_fail"
run_case "6b wrangler deploy itself fails -> automatic rollback path" scripts/ship-prod-23.sh
assert "refused; the automatic rollback ran and found the previous deployment still live" bash -c "[ $CODE = 1 ] && grep -q 'ROLLING BACK AUTOMATICALLY' <<<\"\$OUTTXT\" && grep -q 'the new version was NOT kept' <<<\"\$OUTTXT\" && grep -q '$OLD_ID' '$S/live_id'"
setup_case; touch "$S/build_fail"
run_case "6c the production build fails -> nothing deployed" scripts/ship-prod-23.sh
assert "refuses before any deploy" bash -c "[ $CODE = 1 ] && [ ! -s '$S/deploys.log' ] && [ ! -s '$S/rollback.log' ]"

# ---- 7. wrong branch
setup_case; ( cd "$R" && "$REAL_GIT" checkout -q -b release-22 )
run_case "7 wrong branch (release-22)" scripts/ship-prod-23.sh
assert "refuses" bash -c "[ $CODE = 1 ]"; assert "names the branch rule" has "not on branch release-23"
assert "nothing built, nothing deployed" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"
run_case "7b wrong branch, dry run" scripts/ship-prod-23.sh --dry-run
assert "dry run refuses too" bash -c "[ $CODE = 1 ]"; assert "names the branch rule" has "not on branch release-23"

# ---- 8. HEAD differs from origin/main
setup_case; ( cd "$R" && echo 'export const y = 2' > src/app.js && "$REAL_GIT" add -A && "$REAL_GIT" commit -q -m "local only" )
run_case "8 HEAD differs from origin/main (a local commit that was not pushed)" scripts/ship-prod-23.sh
assert "refuses" bash -c "[ $CODE = 1 ]"; assert "says HEAD is not origin/main" has "is not origin/main"
assert "nothing built, nothing deployed" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"

# ---- 9. dirty tree
setup_case; ( cd "$R" && echo 'export const z = 3' > src/app.js )
run_case "9 dirty tree (a tracked source file changed)" scripts/ship-prod-23.sh
assert "refuses" bash -c "[ $CODE = 1 ]"; assert "says modified tracked files would change what ships" has "modified tracked files would change what ships"
assert "nothing built, nothing deployed" bash -c "[ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"
setup_case; ( cd "$R" && echo '[1]' > public/search-index.json )
run_case "9b only the build-output file public/search-index.json differs (allowed, as in the old scripts)" scripts/ship-prod-23.sh --dry-run
assert "not refused for that" bash -c "[ $CODE = 0 ]"

# ---- 10. dry run
setup_case
run_case "10 --dry-run (builds, checks everything; deploys nothing; rolls nothing back)" scripts/ship-prod-23.sh --dry-run
assert "exit 0 and DRY RUN OK" bash -c "[ $CODE = 0 ]"; assert "prints DRY RUN OK" has "DRY RUN OK"
assert "no pending lines on a clean run" bash -c "! grep -q 'DRY RUN OK (' <<<\"\$OUTTXT\" && ! grep -q 'WARNING (pending' <<<\"\$OUTTXT\""
assert "ran the first gate, the DB gate and the price gate" bash -c "grep -q 'all four Batch 22 markers' <<<\"\$OUTTXT\" && grep -q 'PASS  \[db\] admin_mitra_statement exists on production' <<<\"\$OUTTXT\" && grep -q 'PASS  \[price_data\]' <<<\"\$OUTTXT\""
assert "BUILT the production site (build.log has exactly one build)" bash -c "[ \$(wc -l < '$S/build.log') = 1 ] && [ -f '$R/dist/index.html' ]"
assert "ran the dist marker gates on the fresh build" bash -c "grep -q 'dist/msp/index.html has data-testid=\"snapshot-placeholder\"' <<<\"\$OUTTXT\" && ! grep -q 'MISSING' <<<\"\$OUTTXT\" && ! grep -q 'STILL THERE' <<<\"\$OUTTXT\""
assert "ran the page-size check on the fresh build (dry run)" has "the same size check on the freshly built dist"
assert "nothing deployed" nofile deploys.log; assert "no rollback POST" nofile rollback.log
assert "rolled back nothing (rollback script only validated, with its own --dry-run)" has "[rollback dry-run]"
assert "live deployment untouched" filehas live_id "$OLD_ID"
setup_case; echo "admin_list_mitra_ads" > "$S/db_missing"
run_case "10b --dry-run with a missing Batch 22 database function" scripts/ship-prod-23.sh --dry-run
assert "dry run reports it as pending (a real run would stop) and still deploys nothing" bash -c "grep -q 'Batch 22 database functions are not all on production' <<<\"\$OUTTXT\" && grep -q 'DRY RUN OK (' <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"
setup_case; echo "all" > "$S/db_missing"
run_case "10c a real run with the Batch 22 functions missing" scripts/ship-prod-23.sh
assert "refuses, nothing built or deployed" bash -c "[ $CODE = 1 ] && [ ! -s '$S/build.log' ] && [ ! -s '$S/deploys.log' ]"

# ---- 11. rollback script
setup_case; echo "$NEW_ID" > "$S/live_id"; touch "$S/deployed"
run_case "11a rollback script --dry-run" scripts/rollback-prod-23.sh "$OLD_ID" --dry-run
assert "DRY RUN OK, no POST, live deployment unchanged" bash -c "[ $CODE = 0 ] && grep -q 'DRY RUN OK' <<<\"\$OUTTXT\" && [ ! -s '$S/rollback.log' ] && grep -q '$NEW_ID' '$S/live_id'"
assert "says no database step is needed" has "no database step in this batch"
run_case "11b rollback script (real, stubbed)" scripts/rollback-prod-23.sh "$OLD_ID"
assert "ROLLBACK DONE, POST went to the given id, live is the old deployment" bash -c "[ $CODE = 0 ] && grep -q 'ROLLBACK DONE' <<<\"\$OUTTXT\" && grep -q 'POST rollback to $OLD_ID' '$S/rollback.log' && grep -q '$OLD_ID' '$S/live_id'"
run_case "11c rollback script again (already live)" scripts/rollback-prod-23.sh "$OLD_ID"
assert "NOTHING TO DO, no second POST" bash -c "[ $CODE = 0 ] && grep -q 'NOTHING TO DO' <<<\"\$OUTTXT\" && [ \$(wc -l < '$S/rollback.log') = 1 ]"
run_case "11d rollback script with a malformed id" scripts/rollback-prod-23.sh not-an-id
assert "refuses a malformed id, no further POST" bash -c "[ $CODE = 1 ] && grep -q 'is not a full deployment id' <<<\"\$OUTTXT\" && [ \$(wc -l < '$S/rollback.log') = 1 ]"
echo "$NEW_ID" > "$S/live_id"; touch "$S/deployed"
run_case "11e rollback script with NO id (default target) --dry-run" scripts/rollback-prod-23.sh --dry-run
assert "default target is the Batch 22 deployment" bash -c "[ $CODE = 0 ] && grep -q 'Batch 22 deployment $OLD_ID' <<<\"\$OUTTXT\""
rm -f "$R/docs/review/batch22/evidence/prod-ship/prod-deployment-after.txt"
run_case "11f rollback script with NO id and no record file: the built-in Batch 22 id" scripts/rollback-prod-23.sh --dry-run
assert "falls back to the built-in Batch 22 id" bash -c "[ $CODE = 0 ] && grep -q 'built-in id' <<<\"\$OUTTXT\" && grep -q '$OLD_ID' <<<\"\$OUTTXT\""

# ---- 12. the size gate (REAL predeploy-size-check.mjs; crafted snapshot of the live site)
setup_case realsize; craft_snapshot 0.736
run_case "12a size gate: a /msp page of ratio 0.736 against the live snapshot, msp=0.60 -> PASSES" scripts/ship-prod-23.sh
assert "ship OK" bash -c "[ $CODE = 0 ] && grep -q 'SHIP OK' <<<\"\$OUTTXT\""
assert "the size line for /msp shows ratio 0.736 with the allowed range 0.6-1.15" bash -c "grep -q 'PASS  \[predeploy_size\] /msp:.*= 0.736 (allowed 0.6–1.15' <<<\"\$OUTTXT\""
setup_case realsize; craft_snapshot 0.736
run_case "12a2 same in the dry run" scripts/ship-prod-23.sh --dry-run
assert "dry run passes the same check, no pending" bash -c "[ $CODE = 0 ] && grep -q 'PASS  \[predeploy_size\] /msp:.*= 0.736' <<<\"\$OUTTXT\" && ! grep -q 'DRY RUN OK (' <<<\"\$OUTTXT\""
setup_case realsize; craft_snapshot 0.5
run_case "12b size gate: a /msp page of ratio 0.5 -> FAILS, nothing deployed" scripts/ship-prod-23.sh
assert "refuses before any deploy, shows the failing /msp line" bash -c "[ $CODE = 1 ] && grep -q 'FAIL  \[predeploy_size\] /msp:.*= 0.500' <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ] && [ ! -s '$S/rollback.log' ]"
assert "says a page is still outside the compare-gate size limits" has "still outside the compare-gate size limits"
setup_case realsize; craft_snapshot 0.5
run_case "12c same, dry run: 0.5 is reported as pending" scripts/ship-prod-23.sh --dry-run
assert "dry run shows the FAIL and a pending count; nothing deployed" bash -c "grep -q 'FAIL  \[predeploy_size\] /msp' <<<\"\$OUTTXT\" && grep -q 'DRY RUN OK (' <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"
SHIP_SHRINK="$(grep -o "^HOME_SHRINK='[^']*'" "$REPO/scripts/ship-prod-23.sh")"
assert "the script's own limits are exactly root=0.70,browse=0.70,msp=0.60" bash -c "[ \"$SHIP_SHRINK\" = \"HOME_SHRINK='root=0.70,browse=0.70,msp=0.60'\" ]"
assert "the /msp growth limit is back to the default (no msp= in HOME_GROWTH)" bash -c "grep -q \"^HOME_GROWTH='root=1.40,browse=1.40'\" '$REPO/scripts/ship-prod-23.sh'"

# ---- 13. a built dist/msp/index.html that still has the old badge or the old wording stops the ship before any deploy
setup_case; touch "$S/bad_msp_badge"
run_case "13a dist/msp/index.html still contains ks-date-badge" scripts/ship-prod-23.sh
assert "stops before any deploy and names the string" bash -c "[ $CODE = 1 ] && grep -q \"STILL THERE: 'ks-date-badge' in dist/msp/index.html\" <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ] && [ ! -s '$S/rollback.log' ]"
setup_case; touch "$S/bad_msp_kal"
run_case "13b dist/msp/index.html still contains कल का भाव" scripts/ship-prod-23.sh
assert "stops before any deploy" bash -c "[ $CODE = 1 ] && grep -q \"STILL THERE: 'कल का भाव' in dist/msp/index.html\" <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"
setup_case; touch "$S/bad_home_kal"
run_case "13c dist/index.html still contains कल का भाव" scripts/ship-prod-23.sh
assert "stops before any deploy" bash -c "[ $CODE = 1 ] && grep -q \"STILL THERE: 'कल का भाव' in dist/index.html\" <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"
setup_case; touch "$S/bad_chana_pichla"
run_case "13d dist/msp/chana/index.html still contains पिछला भाव" scripts/ship-prod-23.sh
assert "stops before any deploy" bash -c "[ $CODE = 1 ] && grep -q \"STILL THERE: 'पिछला भाव' in dist/msp/chana/index.html\" <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"
setup_case; touch "$S/bad_other_page"
run_case "13e some OTHER prerendered page (/about) contains पिछला भाव" scripts/ship-prod-23.sh
assert "the loop over every dist/**/index.html stops the ship before any deploy" bash -c "[ $CODE = 1 ] && grep -q \"STILL THERE: 'पिछला भाव' in\" <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"
setup_case; touch "$S/no_msp_placeholder"
run_case "13f dist/msp/index.html has no snapshot-placeholder" scripts/ship-prod-23.sh
assert "stops before any deploy" bash -c "[ $CODE = 1 ] && grep -q 'MISSING: data-testid=\"snapshot-placeholder\" in dist/msp/index.html' <<<\"\$OUTTXT\" && [ ! -s '$S/deploys.log' ]"

# ---- 14. line endings and syntax of every .sh file written for this batch
for f in scripts/ship-prod-23.sh scripts/rollback-prod-23.sh scripts/batch23/rehearse-ship.sh; do
  assert "$f has no carriage return" bash -c "[ \$(tr -cd '\r' < '$REPO/$f' | wc -c) = 0 ]"
  assert "$f passes bash -n" bash -n "$REPO/$f"
done
assert "neither script ever sets the OTP switches or uses a service key" bash -c "! grep -qiE 'service_role|SERVICE_KEY|SUPABASE_SERVICE' '$REPO/scripts/ship-prod-23.sh' '$REPO/scripts/rollback-prod-23.sh' && ! grep -qE 'set_otp|UPDATE .*otp_required|otp_required *= *(true|false)[^ ]*.*PATCH' '$REPO/scripts/ship-prod-23.sh'"
assert "the old scripts were not edited (git shows no change to ship-prod-20/22, rollback-prod-22)" bash -c "cd '$REPO' && [ -z \"\$(git status --porcelain -- scripts/ship-prod-20.sh scripts/ship-prod-22.sh scripts/rollback-prod-22.sh scripts/rollback-prod-20.sh)\" ]"

log ""; log "=================================================================="
log "SUMMARY: $PASSES assertions passed, $FAILS failed"
[ "$FAILS" = 0 ]
