#!/usr/bin/env node
// Batch 23 - makes scripts/ship-prod-23.sh and scripts/rollback-prod-23.sh from the Batch 22 pair (scripts/ship-prod-22.sh and
// scripts/rollback-prod-22.sh, which stay untouched), changing only what must change. Re-run it to regenerate. Writes only the two new files.
//   node scripts/batch23/make-ship-scripts.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const fix = (x) => x.split('@{').join('${')
const read = (f) => readFileSync(f, 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10))
function once(s, a) {
  const n = s.split(a).length - 1
  if (n !== 1) throw new Error(`expected exactly 1 occurrence (found ${n}) of: ${a.slice(0, 80)}`)
}
function sub(s, a, b) { once(s, a); return s.split(a).join(b) }
function subAll(s, a, b) { if (!s.includes(a)) throw new Error(`missing text: ${a.slice(0, 70)}`); return s.split(a).join(b) }
function between(s, from, to, repl) { // replace s[from .. to) (to excluded)
  once(s, from)
  const a = s.indexOf(from); const b = s.indexOf(to, a + 1)
  if (a < 0 || b < 0) throw new Error(`block not found: ${from.slice(0, 50)} .. ${to.slice(0, 50)}`)
  return s.slice(0, a) + repl + s.slice(b)
}

// =================================================================== ship
let s = read('scripts/ship-prod-22.sh')

const HEAD = fix(String.raw`#!/usr/bin/env bash
# Batch 23 - one mandi-price rule for the home strip, /msp and the daily check; no stale price date in the static HTML; stricter watchdog
# (docs/review/batch23/SHIP_PROD.md). Adapted copy of ship-prod-22.sh (which stays as it was).
#   bash scripts/ship-prod-23.sh --dry-run [--expect-live <id>]   # every read-only gate + the production BUILD and size/marker checks; deploys nothing, rolls nothing back
#   bash scripts/ship-prod-23.sh [--expect-live <id>]             # the real ship (founder runs this)
#
# THIS SCRIPT NEVER TOUCHES A DATABASE: it never writes, never uses the service key, never sets the OTP switches (they are only READ from the public
# /api/otp/config, before and after, and must be otp_required=true session_enforced=false both times). Batch 23 has NO migration; the ship is a site deploy only.
#
# WHAT IT SHIPS: exactly the commit that was pushed to origin/main. It refuses unless the branch is release-23 (the founder pushes release-23:main first),
# the tracked files are clean, and  git rev-parse HEAD  EQUALS  git rev-parse origin/main  (after a git fetch). Both hashes are printed.
#
# THE LIVE DEPLOYMENT THIS SHIP REPLACES (and the rollback target) is the Batch 22 deployment, id 3c7be25f-78e5-4059-ba5e-0d04d5611e26. Its id is read from
# docs/review/batch22/evidence/prod-ship/prod-deployment-after.txt when that file is here, else that built-in id is used; to override both give
#   --expect-live <long deployment id>
# The script reads the id of the deployment that is live right now from Cloudflare (canonical_deployment.id) and refuses unless it is the expected one.
# The dry run prints the id it found, so a dry run tells you what to pass. Batch 22 has no git tag, so the first gate proves it is live by reading the LIVE
# site: GET /guide answers 200 and the live JS chunks hold the Batch 22 markers (my_mitra_choice_open, set_my_mitra_on_offer, admin_mitra_statement, mitra-statement).
#
# GATE "price data" (read-only): ONE anonymous GET of the price table (select=price_date, newest first, limit 1) with the public anon key from
# .env.production (the key is never printed). The newest price_date must be within 3 days of today in India (IST); otherwise the ship is refused,
# because the new strip reads those prices live and a stale table would show nothing useful.
#
# GATE "db" (Batch 22 functions still there) - read-only, cannot write. For each of my_mitra_choice_open, set_my_mitra_on_offer, admin_mitra_statement and
# admin_list_mitra_ads it sends ONE anonymous PostgREST call (anon key from .env.production, never printed) with an all-zero actor id and no session,
# and only asks "is the function there?": HTTP 404 with PostgREST code PGRST202 = function not found -> refuse; any other
# answer from the database (200, or 400/401/403 with an error from the function's own guard) = it exists. Why this cannot write: production runs with
# session_enforced=false, so require_actor() lets the call through - therefore set_my_mitra_on_offer is sent a NULL Mitra id, and it returns
# {status:none} on its first statement after the guard, before any table is read or written; the all-zero actor has no profile row either. The admin
# functions raise not_admin for a person who does not exist (require_admin_session does not depend on the switches), and my_mitra_choice_open /
# admin_mitra_statement / admin_list_mitra_ads only read. The same four calls are repeated after the deploy.
#
# THE DRY RUN BUILDS: it runs the production build into the normal dist/ folder so every dist marker, the static-HTML checks and the page-size comparison
# are exercised before the real run. Only the deploy and the rollback are skipped. It ends with DRY RUN OK (and "(N pending)" lines for anything a real run would stop on).
#
# Safe to run twice: a failed gate BEFORE the deploy changes nothing; a failed gate AFTER the deploy rolls back by itself to the recorded previous
# deployment (scripts/rollback-prod-23.sh). Never touches git history, never pushes, never tags, never writes to any database.
`)
s = s.slice(s.indexOf('set -uo pipefail'))

s = sub(s, 'BRANCH="merge-22"   # local main is stale: the founder pushes merge-22:main, then this script runs on merge-22 with HEAD == origin/main',
  'BRANCH="release-23"   # the founder pushes release-23:main, then this script runs on release-23 with HEAD == origin/main')
s = sub(s, 'GATE_TAG="ship-20"   # the live Batch 20 tag; must be on origin\n', '')
s = sub(s, 'B10="$ROOT/docs/review/batch22/evidence"', 'B10="$ROOT/docs/review/batch23/evidence"')

// ---- new constants (after the 22 Mitra constants)
s = sub(s, "ZERO_ID='00000000-0000-0000-0000-000000000000'\n", fix(String.raw`ZERO_ID='00000000-0000-0000-0000-000000000000'
B22_DEFAULT_ID='3c7be25f-78e5-4059-ba5e-0d04d5611e26'   # the Batch 22 production deployment (live now; the rollback target)
B22_MARKERS=(my_mitra_choice_open set_my_mitra_on_offer admin_mitra_statement mitra-statement)   # 23: how the live site proves Batch 22 is live (no git tag exists)
STALE_FORBIDDEN=('कल का भाव' 'पिछला भाव' 'ks-date-badge')   # 23: none of these may be in the static HTML of /, /msp, /msp/chana (nor, for the first two, in ANY page)
LABELS23=('आज का भाव देखें' 'आज का भाव' 'mandi_view_today' 'mandi_price_today' "See today's price" "Today's price" "Yesterday's price" 'Previous price' 'कल का भाव' 'पिछला भाव')   # 23: the strings chunk
PRICE_MAX_AGE_DAYS=3   # 23: newest price_date must be within this many days of today (IST)
`))

// ---- size limits
s = between(s, '# Compare-gate limits for this ship.', "\nDRY=0; EXPECT_ARG=\"\"", fix(String.raw`# Compare-gate limits for this ship (23). / and /browse (served the homepage html): the price strip is now a neutral placeholder, so the page is a little smaller;
# 0.70 is kept as in 22. /msp: the static page no longer carries the all-crops table, the latest price and the per-crop price table (measured against the real
# Batch 22 snapshot: 0.774), so its lower limit is 0.60 (the verifier accepts 0.5 to 0.85); the growth limit for /msp is back to the default (1.15).
HOME_GROWTH='root=1.40,browse=1.40'
HOME_SHRINK='root=0.70,browse=0.70,msp=0.60'
`))

s = sub(s, 'sed -n 2,40p "$0"', 'sed -n 2,37p "$0"')
s = sub(s, '[ "$DRY" = 1 ] && say "*** DRY RUN — nothing will be built, deployed, rolled back or written (except the read-only snapshot file, if missing) ***"',
  '[ "$DRY" = 1 ] && say "*** DRY RUN — builds the site here (production build into dist/) and reads production; nothing is deployed, rolled back or written to any database (only local files: the read-only snapshot, the build) ***"')

// ---- G: Batch 22 is live (no tag)
s = between(s, '# ---------------------------------------------------------------- G. Batch 10C must be live and closed', '# ---------------------------------------------------------------- 0. preconditions (read-only)', fix(String.raw`# ---------------------------------------------------------------- G. Batch 22 must be live (no tag exists: it is proved by reading the LIVE site)
# live_b22_markers: walks the live JS chunks, starting with the live main chunk, and looks for every Batch 22 marker. It fetches likely chunks first
# (names with Post / Mitra / People / Admin), stops as soon as all markers are found, and never fetches more than 400 files. Read-only GETs.
live_b22_markers() { # $1 = main chunk path (/assets/index-xxxx.js). Sets LIVE_B22_MISSING and LIVE_B22_FETCHED; returns 0 only if every marker was found
  local body code ref cur m n=0 seen=" " q_pri=() q_rest=() left=("@{B22_MARKERS[@]}") nleft=()
  q_pri=("@{1#/}")
  while [ "$n" -lt 400 ] && [ $((@{#q_pri[@]} + @{#q_rest[@]})) -gt 0 ]; do
    if [ @{#q_pri[@]} -gt 0 ]; then cur="@{q_pri[0]}"; q_pri=("@{q_pri[@]:1}"); else cur="@{q_rest[0]}"; q_rest=("@{q_rest[@]:1}"); fi
    case "$seen" in *" $cur "*) continue ;; esac
    seen="$seen$cur "; n=$((n + 1))
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE/$cur")"; code="@{body##*$'\n'}"; body="@{body%$'\n'*}"
    [ "$code" = "200" ] || continue
    nleft=()
    for m in "@{left[@]}"; do if grep -q -- "$m" <<<"$body"; then say "  live chunk /$cur holds $m"; else nleft+=("$m"); fi; done
    left=("@{nleft[@]}")
    [ @{#left[@]} -eq 0 ] && break
    while IFS= read -r ref; do
      case "$seen" in *" $ref "*) continue ;; esac
      if [[ "$ref" =~ (Post|[Mm]itra|People|Admin) ]]; then q_pri+=("$ref"); else q_rest+=("$ref"); fi
    done < <(grep -o 'assets/[A-Za-z0-9_.-]*\.js' <<<"$body" | sort -u)
  done
  LIVE_B22_MISSING="@{left[*]:-}"; LIVE_B22_FETCHED="$n"
  [ @{#left[@]} -eq 0 ]
}
say "== G. first gate: Batch 22 is the live version (no tag: $SITE/guide -> 200 and the live JS holds @{B22_MARKERS[*]})"
GATE_OK=1
GUIDE_CODE="$(timeout 60 curl -sL --max-redirs 5 -o /dev/null -w '%{http_code}' "$SITE/guide?ks_ship=$STAMP-gate")"
say "+ curl -sL $SITE/guide -> $GUIDE_CODE"
[ "$GUIDE_CODE" = "200" ] || { GATE_OK=0; say "  $SITE/guide does not answer 200"; }
LIVE0_MAIN="$(timeout 60 curl -sL --max-redirs 5 "$SITE/?ks_ship=$STAMP-gate" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
say "+ GET $SITE/ -> live main chunk @{LIVE0_MAIN:-<not found>}; then the live chunks, looking for: @{B22_MARKERS[*]}"
if [ -z "$LIVE0_MAIN" ]; then
  GATE_OK=0; say "  could not read the live main chunk name from $SITE/"
elif live_b22_markers "$LIVE0_MAIN"; then
  say "  all four Batch 22 markers are in the live chunks (looked at $LIVE_B22_FETCHED file(s))"
else
  GATE_OK=0; say "  NOT found in the live chunks (looked at $LIVE_B22_FETCHED file(s)): $LIVE_B22_MISSING"
fi
if [ "$GATE_OK" = 1 ]; then
  say "  = satisfied: Batch 22 is live ($SITE/guide answers 200 and its code holds the Batch 22 markers)"
else
  pending "Batch 22 must be the live version first ($SITE/guide must answer 200 and the live chunks must hold @{B22_MARKERS[*]})"
fi

`))

// ---- DB gate wording + the price-data gate
s = sub(s, 'say "FAIL  [db] $fn does NOT exist on production (HTTP 404 PGRST202): apply 0076 / 0077 first"; bad=1',
  'say "FAIL  [db] $fn does NOT exist on production (HTTP 404 PGRST202): it was part of Batch 22, which must be live with its database files 0076 / 0077"; bad=1')
s = sub(s, 'say "FAIL  [db] $fn: unclear answer (HTTP ${code:-none}); cannot prove 0076 / 0077 are applied"; bad=1',
  'say "FAIL  [db] $fn: unclear answer (HTTP ${code:-none}); cannot prove the Batch 22 functions are there"; bad=1')
s = sub(s, '# ---------------------------------------------------------------- DB. migrations 0076 + 0077 must already be on production (read-only)',
  '# ---------------------------------------------------------------- DB. the Batch 22 functions (0076 + 0077) must still be on production (read-only; Batch 23 has no migration)')
s = between(s, 'say "== DB. database before site:', 'say "+ timeout 120 npx wrangler pages deployment list', fix(String.raw`say "== DB. the Batch 22 database functions are still on production (read-only, cannot write; see the header). Batch 23 has NO migration."
say "+ POST $PROD_URL/rest/v1/rpc/{@{DB_FUNCS[*]}}  (anon key not shown; all-zero actor; no session)"
check_db_gate || pending "the Batch 22 database functions are not all on production: this ship has no database step, so something is wrong; do not continue (ask the builder). Nothing was built or deployed."

# ---------------------------------------------------------------- PRICE. production price data is readable and current (read-only, one anonymous SELECT)
check_price_data() { # returns 0 when the newest price_date is within PRICE_MAX_AGE_DAYS of today in India (IST)
  local resp code body newest age
  resp="$(timeout 60 curl -sS -w '\n%{http_code}' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" "$PROD_URL/rest/v1/mandi_prices?select=price_date&order=price_date.desc&limit=1" 2>/dev/null)"
  code="@{resp##*$'\n'}"; body="@{resp%$'\n'*}"
  newest="$(printf '%s' "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const d=Array.isArray(j)&&j[0]&&j[0].price_date;console.log(/^\d{4}-\d\d-\d\d$/.test(d)?d:'')}catch(e){console.log('')}})")"
  if [ "$code" != "200" ] || [ -z "$newest" ]; then say "FAIL  [price_data] the price table is not readable (HTTP @{code:-none}, answer: @{body:0:80})"; return 1; fi
  age="$(node -e "const t=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());console.log(Math.round((Date.parse(t)-Date.parse(process.argv[1]))/864e5))" "$newest")"
  if [ -z "$age" ]; then say "FAIL  [price_data] could not work out the age of $newest"; return 1; fi
  if [ "$age" -le "$PRICE_MAX_AGE_DAYS" ]; then say "PASS  [price_data] newest price_date on production is $newest ($age day(s) before today in India; limit $PRICE_MAX_AGE_DAYS)"; return 0; fi
  say "FAIL  [price_data] newest price_date on production is $newest, $age days before today in India (limit $PRICE_MAX_AGE_DAYS): the daily price refresh has stopped"; return 1
}
say "== PRICE. production price data is readable and current (read-only: one anonymous GET of the price table, newest price_date, limit 1; anon key not shown)"
say "+ GET $PROD_URL/rest/v1/mandi_prices?select=price_date&order=price_date.desc&limit=1"
check_price_data || pending "the production price data is not current (newest price_date older than $PRICE_MAX_AGE_DAYS days) or not readable: the new strip reads it live. Fix the daily refresh first. Nothing was built or deployed."

`))

// ---- section 1: the expected live deployment is the Batch 22 one
s = between(s, '# 22: the deployment this ship replaces is the Batch 20 ship (tag ship-20)', 'say "+ GET $API   (Authorization: Bearer <token, not shown>)"', fix(String.raw`# 23: the deployment this ship replaces is the Batch 22 ship (no tag); it is also the rollback target. Its id was recorded when Batch 22 shipped
# (prod-deployment-after.txt); if that file is missing the built-in id is used; --expect-live <id> (or KS_EXPECT_LIVE_ID) overrides both.
ID_11A=""; SRC_11A="the built-in Batch 22 deployment id"
B22_AFTER="$ROOT/docs/review/batch22/evidence/prod-ship/prod-deployment-after.txt"
if [ -s "$B22_AFTER" ]; then ID_11A="$(grep -o '^deployment_id=[0-9a-f-]*' "$B22_AFTER" | head -1 | cut -d= -f2)"; SRC_11A="$B22_AFTER"; fi
[ -n "$ID_11A" ] || { ID_11A="$B22_DEFAULT_ID"; SRC_11A="the built-in Batch 22 deployment id"; }
EXPECT_LIVE="@{EXPECT_ARG:-@{KS_EXPECT_LIVE_ID:-}}"
say "  expected live deployment (Batch 22): @{EXPECT_LIVE:-$ID_11A}   (from @{EXPECT_LIVE:+--expect-live / KS_EXPECT_LIVE_ID}@{EXPECT_LIVE:-$SRC_11A})"
`))
s = between(s, 'LIVE_IS=""\n', 'if [ "$DRY" = 0 ]; then\n  mkdir -p "$EV"', fix(String.raw`LIVE_IS=""
if [ -n "$EXPECT_LIVE" ] && [ "$BEFORE_ID" = "$EXPECT_LIVE" ]; then LIVE_IS="--expect-live / KS_EXPECT_LIVE_ID"
elif [ -z "$EXPECT_LIVE" ] && [ "$BEFORE_ID" = "$ID_11A" ]; then LIVE_IS="Batch 22 (from $SRC_11A; read from Cloudflare just now)"
fi
if [ -n "$LIVE_IS" ]; then
  say "  = live is the expected deployment: $LIVE_IS — rollback target $BEFORE_ID"
else
  MSG="the live deployment is $BEFORE_ID (source $BEFORE_SRC): it is not the expected Batch 22 deployment (@{EXPECT_LIVE:-$ID_11A}) — someone deployed or rolled back since Batch 22 was shipped.
Check the Cloudflare dashboard; if this live version is the right one to replace, run again with:  bash scripts/ship-prod-23.sh --expect-live $BEFORE_ID"
  if [ "$DRY" = 1 ]; then say "WARNING (a real run would STOP here): $MSG"; PENDING+=("live deployment $BEFORE_ID is not the expected Batch 22 one (if it is the right one: --expect-live $BEFORE_ID)"); else stop "$MSG"; fi
fi
`))
s = sub(s, 'CMD2a=(timeout 600 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$B10/prod-snapshot" --label prod-before-22 ', 'CMD2a=(timeout 600 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$B10/prod-snapshot" --label prod-before-23 ')

// ---- 3. build: the dry run builds too
s = between(s, 'if [ "$DRY" = 0 ]; then\n  timeout 1500 npm run build:prod', 'NEW_MAIN="$( [ -f dist/index.html ]', fix(String.raw`mkdir -p "$EV"   # the build log (a dry run builds too: it needs the same log folder)
timeout 1500 npm run build:prod > "$EV/build-prod-$STAMP.log" 2>&1 || stop "npm run build:prod failed — see $EV/build-prod-$STAMP.log (nothing deployed)"
PR_WHY="$(prerender_check "$EV/build-prod-$STAMP.log" "$MIN_ROUTES")" || stop "prerender check failed: $PR_WHY — see the build log"
BAD="$(find dist \( -name '.dev.vars' -o -name '.env*' -o -name '*.apk' -o -name '*.aab' -o -name '*.jks' -o -name '*.keystore' -o -path 'dist/android*' \) | head -5)"
[ -z "$BAD" ] || stop "dist contains files that must never ship: $BAD"
node --env-file=.env.production scripts/check-prod-env.mjs --dist || stop "prod dist guard refused (see above; nothing deployed)"
node scripts/check-no-localhost-dist.mjs dist || stop "dist contains localhost links (see above; nothing deployed)"
staging_refs_in_dist || stop "dist references the STAGING Supabase project (nothing deployed)"
csp_media_src_ok < dist/_headers || stop "dist/_headers CSP has no media-src with data: (the voice on /admin/morning would stay blocked; nothing deployed)"
csp_img_src_has_prod < dist/_headers || stop "dist/_headers CSP img-src does not list $PROD_IMG_HOST (listing photos would be blocked; nothing deployed)"
[ -f dist/_routes.json ] || stop "dist/_routes.json missing (functions would run on every path)"
`))
s = between(s, 'NEW_MAIN="$( [ -f dist/index.html ]', '# The lazy chunks of this build', fix(String.raw`NEW_MAIN="$( [ -f dist/index.html ] && grep -o '/assets/index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1 )"
say "new main chunk (from dist/index.html): @{NEW_MAIN:-unknown}"
# Without the new main chunk name the "is the new build live?" checks below would pass on anything.
[ -n "$NEW_MAIN" ] || stop "could not read the main chunk name from dist/index.html (nothing deployed)"
# 23: the new build must differ from what is live (else this ship would change nothing, or the build is the old one).
if [ "$NEW_MAIN" = "$BEFORE_MAIN" ]; then stop "the new build has the same main chunk ($NEW_MAIN) as the live site: it is not a new build (nothing deployed)"; fi
`))

// ---- chunk arrays: the strings chunk
s = sub(s, 'SIGNUPPAGE_CHUNKS=()\n', 'SIGNUPPAGE_CHUNKS=(); STR23_CHUNKS=()\n')
s = sub(s, '  for a in dist/assets/Signup-*.js; do [ -f "$a" ] && SIGNUPPAGE_CHUNKS+=("/${a#dist/}"); done\n',
  '  for a in dist/assets/Signup-*.js; do [ -f "$a" ] && SIGNUPPAGE_CHUNKS+=("/${a#dist/}"); done\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && STR23_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "mandi_view_today:{hi" dist/assets/*.js 2>/dev/null | head -3)   # 23: the strings chunk with the new labels\n')
s = sub(s, 'say "chunk(s) holding the /msp badge ($BADGE_MARKER) in dist: ${BADGE_CHUNKS[*]:-none}"',
  'say "chunk(s) holding the /msp badge class ($BADGE_MARKER; it lives in the app code, not in the static HTML) in dist: ${BADGE_CHUNKS[*]:-none}"\nsay "strings chunk(s) holding the 23 labels (mandi_view_today) in dist: ${STR23_CHUNKS[*]:-none}"')

// ---- dist markers: the static HTML now has a placeholder and no price date
s = sub(s, '  grep -q "$BADGE_MARKER" dist/msp/index.html 2>/dev/null && say "  dist/msp/index.html has $BADGE_MARKER" || { say "  MISSING: $BADGE_MARKER in dist/msp/index.html"; miss=1; }\n',
  fix(String.raw`  # 23: the static HTML holds NO price, NO price date and NO "कल का भाव / पिछला भाव" claim; the neutral placeholders are there instead.
  grep -q 'data-testid="snapshot-placeholder"' dist/msp/index.html 2>/dev/null && say "  dist/msp/index.html has data-testid=\"snapshot-placeholder\"" || { say "  MISSING: data-testid=\"snapshot-placeholder\" in dist/msp/index.html"; miss=1; }
  grep -q 'data-testid="snapshot-placeholder"' dist/msp/chana/index.html 2>/dev/null && say "  dist/msp/chana/index.html has data-testid=\"snapshot-placeholder\"" || { say "  MISSING: data-testid=\"snapshot-placeholder\" in dist/msp/chana/index.html"; miss=1; }
  grep -q 'data-testid="ticker-placeholder"' dist/index.html 2>/dev/null && say "  dist/index.html has data-testid=\"ticker-placeholder\"" || { say "  MISSING: data-testid=\"ticker-placeholder\" in dist/index.html"; miss=1; }
  for f in dist/index.html dist/msp/index.html dist/msp/chana/index.html; do
    [ -f "$f" ] || { say "  MISSING: $f"; miss=1; continue; }
    for m in "@{STALE_FORBIDDEN[@]}"; do grep -q -- "$m" "$f" && { say "  STILL THERE: '$m' in $f (the static HTML must carry no price date claim)"; miss=1; }; done
  done
  for m in 'कल का भाव' 'पिछला भाव'; do
    hits="$(grep -rl --include=index.html -- "$m" dist 2>/dev/null | head -3 | tr '\n' ' ')"
    [ -z "$hits" ] || { say "  STILL THERE: '$m' in $hits(and maybe more: no prerendered page may carry it)"; miss=1; }
  done
  [ @{#STR23_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds mandi_view_today (the 23 labels)"; miss=1; }
  for a in "@{STR23_CHUNKS[@]}"; do for m in "@{LABELS23[@]}"; do grep -q -- "$m" "dist$a" || { say "  MISSING: '$m' in dist$a"; miss=1; }; done; done
`))
s = sub(s, 'say "+ dist markers: $HOME_MARKER + ${HERO_MARKERS[*]} in dist/index.html, none of ${REMOVED_MARKERS[*]}; no LiveStage-*.js; $BADGE_MARKER in dist/msp/index.html and a chunk; guide chunks hold \'$GUIDE_MARKER\'; a chunk holds \'$SIGNUP_MARKER\'"',
  'say "+ dist markers: $HOME_MARKER + ${HERO_MARKERS[*]} in dist/index.html, none of ${REMOVED_MARKERS[*]}; no LiveStage-*.js; snapshot-placeholder in dist/msp/ (and /msp/chana) and none of ${STALE_FORBIDDEN[*]} in dist/index.html, dist/msp/index.html, dist/msp/chana/index.html; no prerendered page with the two label texts; $BADGE_MARKER in a JS chunk; the 23 labels in the strings chunk; guide chunks hold \'$GUIDE_MARKER\'; a chunk holds \'$SIGNUP_MARKER\'"')
s = between(s, 'if [ "$DRY" = 0 ]; then\n  dist_markers || stop "the new build is missing', '# ---------------------------------------------------------------- 3b.', fix(String.raw`dist_markers || stop "the new build is missing a marker, still has a removed 10D hero part, or its static HTML still carries a price date claim (see above; nothing deployed)"

`))

// ---- 3b: the dry run checks the sizes too (against the snapshot of the live site)
s = sub(s, 'PRESIZE=(node scripts/batch10f/predeploy-size-check.mjs "$EV/prod-before-ship.json" dist --max-growth "$HOME_GROWTH" --min-ratio "$HOME_SHRINK")\n',
  'PRESIZE=(node scripts/batch10f/predeploy-size-check.mjs "$EV/prod-before-ship.json" dist --max-growth "$HOME_GROWTH" --min-ratio "$HOME_SHRINK")\nPRESIZE_DRY=(node scripts/batch10f/predeploy-size-check.mjs "$NIGHT_SNAP" dist --max-growth "$HOME_GROWTH" --min-ratio "$HOME_SHRINK")\n')
s = between(s, 'elif [ -f dist/index.html ] && [ -s "$NIGHT_SNAP" ]; then', '# ---------------------------------------------------------------- 4-7. deploy, gates, rollback', fix(String.raw`elif [ -s "$NIGHT_SNAP" ]; then
  say "  (dry run: the same size check on the freshly built dist against the read-only snapshot of the live site, $NIGHT_SNAP)"
  say "+ @{PRESIZE_DRY[*]}"
  "@{PRESIZE_DRY[@]}" 2>&1 | sed 's/^/    /'
  [ "@{PIPESTATUS[0]}" = 0 ] || pending "a page of the new build is outside the compare-gate size limits against the live snapshot (a real run re-runs the prerender up to 2 times first; if it repeats, send the output to the builder)"
else
  pending "no snapshot of the live site ($NIGHT_SNAP) to compare the page sizes with"
fi

`))

// ---- post-deploy gates
s = sub(s, 'say "== 6. prod gates (read-only; the verifier refuses any POST/sign-up on production)"',
  'say "== 6. prod gates (read-only; the verifier refuses any POST/sign-up on production). The \'data\' gate (the green strip must show a rupee price within 30 s of loading) is the REAL test of the new price code: the static HTML no longer holds any price, so a broken price read can no longer hide behind baked-in prices."')
s = sub(s, fix(String.raw`  body="$(timeout 60 curl -sL --max-redirs 5 -w '\n%{http_code}' "$SITE/msp?ks_ship=$STAMP-msp")"
  code="@{body##*$'\n'}"
  if [ "$code" = "200" ] && grep -q "$NEW_MAIN" <<<"$body" && grep -q "$BADGE_MARKER" <<<"$body"; then
    say "PASS  [10f_msp] GET /msp -> 200, new main chunk, has $BADGE_MARKER"
  else
    say "FAIL  [10f_msp] GET /msp -> $code (new main chunk: $(grep -q "$NEW_MAIN" <<<"$body" && echo yes || echo no), $BADGE_MARKER: $(grep -q "$BADGE_MARKER" <<<"$body" && echo yes || echo no))"
    ok=1
  fi
`).split("@{").join("${"), fix(String.raw`  body="$(timeout 60 curl -sL --max-redirs 5 -w '\n%{http_code}' "$SITE/msp?ks_ship=$STAMP-msp")"
  code="@{body##*$'\n'}"
  if [ "$code" = "200" ] && grep -q "$NEW_MAIN" <<<"$body" && grep -q 'data-testid="snapshot-placeholder"' <<<"$body"; then
    say "PASS  [10f_msp] GET /msp -> 200, new main chunk, has data-testid=\"snapshot-placeholder\""
  else
    say "FAIL  [10f_msp] GET /msp -> $code (new main chunk: $(grep -q "$NEW_MAIN" <<<"$body" && echo yes || echo no), snapshot-placeholder: $(grep -q 'data-testid="snapshot-placeholder"' <<<"$body" && echo yes || echo no))"
    ok=1
  fi
  # 23: the live HTML holds no price date claim and no old badge; the neutral placeholders are there.
  for p in / /msp /msp/chana; do
    body="$(timeout 60 curl -sL --max-redirs 5 -w '\n%{http_code}' "$SITE$p?ks_ship=$STAMP-23s")"; code="@{body##*$'\n'}"; hit=""
    for m in "@{STALE_FORBIDDEN[@]}"; do grep -q -- "$m" <<<"$body" && hit="$hit '$m'"; done
    if [ "$code" = "200" ] && [ -z "$hit" ]; then say "PASS  [23_static] GET $p -> 200, none of @{STALE_FORBIDDEN[*]} in the live HTML"; else say "FAIL  [23_static] GET $p -> $code (the live HTML still has:@{hit:- nothing})"; ok=1; fi
    if [ "$p" = "/" ]; then ph='data-testid="ticker-placeholder"'; else ph='data-testid="snapshot-placeholder"'; fi
    if grep -q -- "$ph" <<<"$body"; then say "PASS  [23_placeholder] GET $p has $ph"; else say "FAIL  [23_placeholder] GET $p has no $ph"; ok=1; fi
  done
  # 23: the live strings chunk holds the new labels (Hindi and English).
  [ @{#STR23_CHUNKS[@]} -gt 0 ] || { say "FAIL  [23_labels] no strings chunk holding mandi_view_today found in dist"; ok=1; }
  for a in "@{STR23_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"; code="@{body##*$'\n'}"; hit=""
    for m in "@{LABELS23[@]}"; do grep -q -- "$m" <<<"$body" || hit="$hit '$m'"; done
    if [ "$code" = "200" ] && [ -z "$hit" ]; then say "PASS  [23_labels] GET $a -> 200, holds the new labels (आज का भाव, आज का भाव देखें, Today's price, ...)"; else say "FAIL  [23_labels] GET $a -> $code (missing:@{hit:- none})"; ok=1; fi
  done
`))

s = sub(s, 'say "PASS  [22_main] the live main chunk is the new one ($LIVE_NOW_MAIN), not the previous ($BEFORE_MAIN)"; else say "FAIL  [22_main] live main chunk',
  'say "PASS  [23_main] the live main chunk is the new one ($LIVE_NOW_MAIN), not the previous ($BEFORE_MAIN)"; else say "FAIL  [23_main] live main chunk')
s = sub(s, '  # 22: the main chunk really changed; the sign-up page has no Mitra dropdown; the offer form, ads and statement code are live; the database still has 0076 + 0077.',
  '  # 23: the main chunk really changed. 22 (regression): the sign-up page has no Mitra dropdown; the offer form, ads and statement code are live; the database still has the four Batch 22 functions.')

// ---- dry-run summary + the failure texts
s = sub(s, 'FAIL="a Batch 22 (Mitra) / 19 / 17 / 15A / 14A / 11A / 10 route, marker, OTP function, admin function, history table, database function or CSP check failed (see $EV/prod-gates-$STAMP.txt)"',
  'FAIL="a Batch 23 (price strip, static HTML, labels) / 22 (Mitra) / 19 / 17 / 15A / 14A / 11A / 10 route, marker, OTP function, admin function, history table, database function or CSP check failed (see $EV/prod-gates-$STAMP.txt)"')
s = sub(s, 'NEXT: docs/review/batch22/SHIP_PROD.md step G (the 5-line check on production).', 'NEXT: docs/review/batch23/SHIP_PROD.md step E (the 5-line check on production), then step F (the GitHub run).')
s = sub(s, 'say "+ GET $SITE{$(IFS=,; echo "${ROUTES_10F[*]}")} -> 200 + new main chunk   (read-only, redirects followed)"',
  'say "+ GET $SITE{$(IFS=,; echo "${ROUTES_10F[*]}")} -> 200 + new main chunk   (read-only, redirects followed)"\nsay "+ (23) GET /, /msp, /msp/chana -> none of ${STALE_FORBIDDEN[*]}; / has ticker-placeholder, /msp and /msp/chana have snapshot-placeholder; the strings chunk holds the new labels; the main chunk is not the previous one; /api/otp/config is the same as before"')

// ---- names: this batch's branch and scripts
s = s.split('ship-prod-22.sh').join('ship-prod-23.sh')
s = s.split('rollback-prod-22.sh').join('rollback-prod-23.sh')
s = s.split('merge-22').join('release-23')
writeFileSync('scripts/ship-prod-23.sh', (HEAD + s), { encoding: 'utf8' })

// =================================================================== rollback
let r = read('scripts/rollback-prod-22.sh')
const RHEAD = String.raw`#!/usr/bin/env bash
# Batch 23 - roll kissansahyog.com (Pages project kissansahyog-prod) back to an earlier deployment.
# Adapted copy of rollback-prod-22.sh (which stays as it was). The rollback target after the 23 ship is the Batch 22 deployment
# (3c7be25f-78e5-4059-ba5e-0d04d5611e26); ship-prod-23.sh records and prints its id (docs/review/batch23/evidence/prod-ship/prod-deployment-before.txt).
# Give the id yourself if that file is not here.
#
#   bash scripts/rollback-prod-23.sh <deployment-id> [--dry-run]   # roll back to this production deployment (full id) - normal use
#   bash scripts/rollback-prod-23.sh [--dry-run]                   # roll back to the Batch 22 deployment (recorded by ship-prod-23.sh, else the Batch 22 record, else the built-in id)
#
# DATABASE: this batch has NO database change, so a site rollback needs NOTHING else. The old site simply shows the old price strip and the old /msp page.
# This script changes no database and never touches the auth switches (otp_required ON, session_enforced OFF in production): they are read (public /api/otp/config) and printed only.
# NOT UNDONE BY A SITE ROLLBACK: the GitHub workflow change (.github/workflows/refresh-mandi-prices.yml, the stricter daily check) lives on main in git. To undo it,
# revert that one file in git (git revert the commit that changed it, or restore the file from the Batch 22 commit e46b586) and push it to main.
#
# Method: wrangler has NO "pages rollback" command, so this uses the Cloudflare API endpoint the dashboard "Rollback" button uses:
#   POST https://api.cloudflare.com/client/v4/accounts/{account}/pages/projects/kissansahyog-prod/deployments/{id}/rollback
# Auth: $CLOUDFLARE_API_TOKEN if set, otherwise wrangler's own OAuth login token. The token is never printed.
`
r = r.slice(r.indexOf('set -uo pipefail'))
r = sub(r, 'EV="$ROOT/docs/review/batch22/evidence/prod-ship"', 'EV="$ROOT/docs/review/batch23/evidence/prod-ship"')
r = sub(r, 'NIGHT_SNAP="$ROOT/docs/review/batch22/evidence/prod-before.json"', 'NIGHT_SNAP="$ROOT/docs/review/batch23/evidence/prod-before.json"')
r = between(r, '    B20="$ROOT/docs/review/batch20/evidence/prod-ship/prod-deployment-after.txt"', '[[ "$TARGET" =~', fix(String.raw`    B22="$ROOT/docs/review/batch22/evidence/prod-ship/prod-deployment-after.txt"; [ -s "$B22" ] && TARGET="$(grep -o '^deployment_id=[0-9a-f-]*' "$B22" | head -1 | cut -d= -f2)"
    if [ -n "$TARGET" ]; then say "target: Batch 22 deployment $TARGET (from $B22)"; else TARGET="3c7be25f-78e5-4059-ba5e-0d04d5611e26"; say "target: Batch 22 deployment $TARGET (built-in id; no record found)"; fi
  fi
fi
`))
r = sub(r, 'SNAP="$EV/prod-before-ship.json"; [ -s "$SNAP" ] || SNAP="$NIGHT_SNAP"\n',
  'SNAP="$EV/prod-before-ship.json"; [ -s "$SNAP" ] || SNAP="$NIGHT_SNAP"\nCHECKS="pages,compare"\nif [ ! -s "$SNAP" ]; then CHECKS="pages"; say "  (no snapshot of the old site here: after the rollback only the page check runs, without the size comparison)"; fi\n')
r = subAll(r, '--checks pages,compare --snapshot $SNAP', '--checks $CHECKS --snapshot $SNAP')
r = sub(r, '--checks pages,compare --snapshot "$SNAP"', '--checks "$CHECKS" --snapshot "$SNAP"')
r = sub(r, 'say "target: recorded by ship-prod-22.sh in $RECORDED -> $TARGET"', 'say "target: recorded by ship-prod-23.sh in $RECORDED -> $TARGET"')
r = sub(r, "-h|--help) sed -n 2,40p \"$0\"", "-h|--help) sed -n 2,17p \"$0\"")
r = sub(r, 'say "  (no database step; no switch was changed)"', 'say "  (no database step in this batch; no switch was changed)"')
writeFileSync('scripts/rollback-prod-23.sh', (RHEAD + r), { encoding: 'utf8' })
console.log('wrote scripts/ship-prod-23.sh and scripts/rollback-prod-23.sh')
