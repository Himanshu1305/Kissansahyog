#!/usr/bin/env node
// Batch 22 - makes scripts/ship-prod-22.sh and scripts/rollback-prod-22.sh from the Batch 20 pair (scripts/ship-prod-20.sh and
// scripts/rollback-prod-20.sh, which stay untouched), changing only what must change. Re-run it to regenerate. Writes only the two new files.
import { readFileSync, writeFileSync } from 'node:fs'

const fix = (x) => x.split('@{').join('${')
const read = (f) => readFileSync(f, 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10))
function sub(s, a, b) {
  if (!s.includes(a)) throw new Error(`missing text: ${a.slice(0, 70)}`)
  return s.split(a).join(b)
}
function between(s, from, to, repl) { // replace s[from .. to) (to excluded)
  const a = s.indexOf(from); const b = s.indexOf(to, a + 1)
  if (a < 0 || b < 0) throw new Error(`block not found: ${from.slice(0, 50)} .. ${to.slice(0, 50)}`)
  return s.slice(0, a) + repl + s.slice(b)
}

// =================================================================== ship
let s = read('scripts/ship-prod-20.sh')

const HEAD = fix(String.raw`#!/usr/bin/env bash
# Batch 22 (+22D) - Kissan Mitra at the first offer, Mitra on ads, Mitra statement (docs/review/batch22/SHIP_PROD.md).
# Adapted copy of ship-prod-20.sh (which stays as it was). THIS SCRIPT NEVER TOUCHES A DATABASE: it never writes, never uses the service key,
# never sets the OTP switches (they are only READ from the public /api/otp/config, before and after, and must be identical).
#
# ORDER ON PRODUCTION: the database files come BEFORE the site. 0076_mitra_at_offer.sql and 0077_mitra_statement.sql are applied BY THE FOUNDER in the
# production SQL editor first (SHIP_PROD.md steps A-C). This script then PROVES it, read-only, before it builds or deploys anything (gate "db").
#
# WHAT IT SHIPS: exactly the commit that was pushed to origin/main. It refuses unless the branch is merge-22 (local main is stale; the founder pushes
# merge-22:main first), the tracked files are clean, and  git rev-parse HEAD  EQUALS  git rev-parse origin/main  (after a git fetch). Both hashes are printed.
#
# THE LIVE DEPLOYMENT THIS SHIP REPLACES (and the rollback target) is the Batch 20 deployment. Its id is read from
# docs/review/batch20/evidence/prod-ship/prod-deployment-after.txt when that file is here; otherwise, or to override it, give it with
#   --expect-live <long deployment id>
# The script reads the id of the deployment that is live right now from Cloudflare (the same API call the Batch 20 script used, canonical_deployment.id)
# and refuses unless it is the expected one. The dry run prints the id it found, so a dry run tells you what to pass.
#
# GATE "db" (database before site) - read-only, cannot write. For each of my_mitra_choice_open, set_my_mitra_on_offer, admin_mitra_statement and
# admin_list_mitra_ads it sends ONE anonymous PostgREST call (anon key from .env.production, never printed) with an all-zero actor id and no session,
# and only asks "is the function there?": HTTP 404 with PostgREST code PGRST202 = function not found -> refuse ("apply 0076 / 0077 first"); any other
# answer from the database (200, or 400/401/403 with an error from the function's own guard) = it exists. Why this cannot write: production runs with
# session_enforced=false, so require_actor() lets the call through - therefore set_my_mitra_on_offer is sent a NULL Mitra id, and it returns
# {status:none} on its first statement after the guard, before any table is read or written; the all-zero actor has no profile row either. The admin
# functions raise not_admin for a person who does not exist (require_admin_session does not depend on the switches), and my_mitra_choice_open /
# admin_mitra_statement / admin_list_mitra_ads only read. The same four calls are repeated after the deploy.
#
#   bash scripts/ship-prod-22.sh --dry-run [--expect-live <id>]   # every read-only gate + the build check; deploys nothing, rolls nothing back
#   bash scripts/ship-prod-22.sh [--expect-live <id>]             # the real ship (founder runs this)
#
# Safe to run twice: a failed gate BEFORE the deploy changes nothing; a failed gate AFTER the deploy rolls back by itself to the recorded previous
# deployment (scripts/rollback-prod-22.sh). Never touches git history, never pushes, never tags, never writes to any database.
`)
s = HEAD + s.slice(s.indexOf('set -uo pipefail'))

s = sub(s, 'BRANCH="release-20"', 'BRANCH="merge-22"   # local main is stale: the founder pushes merge-22:main, then this script runs on merge-22 with HEAD == origin/main')
s = sub(s, 'TAG="${TAG:-ship-20}"   # ship point of Batch 20 (pushed HEAD of release-20)\n', '')
s = sub(s, 'GATE_TAG="ship-19"   # the live Batch 19 tag; must be on origin', 'GATE_TAG="ship-20"   # the live Batch 20 tag; must be on origin')
s = sub(s, 'B10="$ROOT/docs/review/batch20/evidence"', 'B10="$ROOT/docs/review/batch22/evidence"')
s = sub(s, "MITRA_MARKER='list_active_mitras'     # 20: the sign-up dropdown call (a chunk of the built app)\n",
  "MITRA_OFFER_MARKER='mitra-select'      # 22: the dropdown on the LAST step of the offer form (the Post chunk) - and NOT in the sign-up chunk\n" +
  "MITRA_CHOICE_RPC='my_mitra_choice_open'   # 22: may the offer form show the dropdown (first offer only)\n" +
  "MITRA_SAVE_RPC='set_my_mitra_on_offer'    # 22: saves the Mitra with the first offer (Post chunk)\n" +
  "MITRA_STMT_RPC='admin_mitra_statement'    # 22D: the Statement call\n" +
  "MITRA_STMT_UI='mitra-statement'           # 22D: the Statement button on a Mitra card (People tab chunk)\n" +
  "MITRA_ADS_RPC='admin_list_mitra_ads'      # 22: a Mitra's ads\n" +
  "MITRA_ADFIELD='ann-mitra-field'           # 22: the Kissan Mitra pick in the announcement form (Content tab chunk)\n" +
  "SIGNUP_FORBIDDEN=('mitra-select' 'mitra-field' 'mitra_offer_label' 'list_active_mitras')   # 22: the sign-up page must no longer hold ANY Mitra dropdown text\n" +
  "DB_FUNCS=(my_mitra_choice_open set_my_mitra_on_offer admin_mitra_statement admin_list_mitra_ads)   # 0076 + 0077, checked read-only before the build and again after the deploy\n" +
  "ZERO_ID='00000000-0000-0000-0000-000000000000'\n")
s = sub(s, "MITRA_PANEL_MARKER='mitra-reminder'   # 20: the admin Kissan Mitra panel (People tab chunk)", "MITRA_PANEL_MARKER='mitra-reminder'   # 20 (kept): the admin Kissan Mitra panel (People tab chunk)")

// argument parsing: --expect-live <id>
s = between(s, 'DRY=0\nfor a in "$@"; do', 'say()  {', fix(String.raw`DRY=0; EXPECT_ARG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --expect-live) shift; EXPECT_ARG="@{1:-}"; [ -n "$EXPECT_ARG" ] || { echo "--expect-live needs the long deployment id"; exit 2; } ;;
    --expect-live=*) EXPECT_ARG="@{1#--expect-live=}" ;;
    -h|--help) sed -n 2,40p "$0"; exit 0 ;;
    *) echo "unknown argument: $1"; exit 2 ;;
  esac
  shift
done
[ -z "$EXPECT_ARG" ] || [[ "$EXPECT_ARG" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] || { echo "--expect-live '$EXPECT_ARG' is not a full deployment id (use the long id)"; exit 2; }

`))

// gate G: Batch 20 must be live
s = sub(s, 'say "== G. first gate: Batch 19 (ship-19) is live', 'say "== G. first gate: Batch 20 (ship-20) is live')
s = sub(s, 'say "  = satisfied: Batch 19 ($GATE_TAG) is on origin"', 'say "  = satisfied: Batch 20 ($GATE_TAG) is on origin"')
s = sub(s, 'pending "the Batch 19 ship must be live first', 'pending "the Batch 20 ship must be live first')

// preconditions: branch, clean tree, HEAD == origin/main (no tag gate)
s = between(s, 'say "== 0. preconditions"', '[ -f .env.production ] ||', fix(String.raw`say "== 0. preconditions"
CURB="$(git branch --show-current)"
say "+ git branch --show-current -> $CURB"
[ "$CURB" = "$BRANCH" ] || stop "not on branch $BRANCH (on '$CURB'): git checkout $BRANCH   (this script ships only merge-22, the branch pushed to origin/main)"
DIRTY="$(git status --porcelain --untracked-files=no | sed 's/^...//' | grep -Ev "$ALLOW_DIRTY" || true)"
say "+ git status --porcelain --untracked-files=no  (only build output public/search-index.json and review documents docs/review/** may differ; nothing else)"
[ -z "$DIRTY" ] || pending "modified tracked files would change what ships (commit them or discard them first):
$DIRTY"
say "+ git fetch origin"
timeout 120 git fetch origin >/dev/null 2>&1 || stop "git fetch origin failed (no network?): cannot prove that HEAD is what was pushed"
HEAD_SHA="$(git rev-parse HEAD)"
ORIGIN_MAIN="$(git rev-parse --verify -q origin/main || true)"
say "+ git rev-parse HEAD        -> $HEAD_SHA"
say "+ git rev-parse origin/main -> @{ORIGIN_MAIN:-<missing>}"
[ -n "$ORIGIN_MAIN" ] || stop "origin/main not found after the fetch"
[ "$HEAD_SHA" = "$ORIGIN_MAIN" ] || pending "HEAD ($HEAD_SHA) is not origin/main ($ORIGIN_MAIN): what goes live must be exactly what was pushed (git push origin merge-22:main first, then git fetch origin)"
`))

// database before site gate, right after the anonymous key is read
s = between(s, '# 17F: no migration, so no database probe here', 'say "+ timeout 120 npx wrangler pages deployment list', fix(String.raw`# ---------------------------------------------------------------- DB. migrations 0076 + 0077 must already be on production (read-only)
# See the header: one anonymous PostgREST call per function, all-zero actor, no session; only "function not found" (404 PGRST202) is a refusal.
check_db_gate() { # prints PASS/FAIL lines; returns 1 if any function is missing or the answer is unclear
  local fn json resp code body bad=0
  for fn in "@{DB_FUNCS[@]}"; do
    case "$fn" in
      set_my_mitra_on_offer) json="{\"p_actor_id\":\"$ZERO_ID\",\"p_mitra_id\":null,\"p_listing_id\":\"$ZERO_ID\"}" ;;  # NULL Mitra: returns {status:none} first, writes nothing
      admin_mitra_statement|admin_list_mitra_ads) json="{\"p_actor\":\"$ZERO_ID\",\"p_mitra_id\":\"$ZERO_ID\"}" ;;
      *) json="{\"p_actor_id\":\"$ZERO_ID\"}" ;;
    esac
    resp="$(timeout 60 curl -sS -w '\n%{http_code}' -X POST -H 'content-type: application/json' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" -d "$json" "$PROD_URL/rest/v1/rpc/$fn" 2>/dev/null)"
    code="@{resp##*$'\n'}"; body="@{resp%$'\n'*}"
    if [ "$code" = "404" ] && grep -q 'PGRST202' <<<"$body"; then
      say "FAIL  [db] $fn does NOT exist on production (HTTP 404 PGRST202): apply 0076 / 0077 first"; bad=1
    elif [[ "$code" =~ ^(200|204|400|401|403|409|422)$ ]] && ! grep -q 'PGRST202' <<<"$body"; then
      say "PASS  [db] $fn exists on production (answered HTTP $code)"
    else
      say "FAIL  [db] $fn: unclear answer (HTTP @{code:-none}); cannot prove 0076 / 0077 are applied"; bad=1
    fi
  done
  return $bad
}
say "== DB. database before site: migrations 0076 + 0077 are on production (read-only, cannot write; see the header)"
say "+ POST $PROD_URL/rest/v1/rpc/{@{DB_FUNCS[*]}}  (anon key not shown; all-zero actor; no session)"
check_db_gate || pending "the database is not ready: apply 0076 / 0077 first (SHIP_PROD.md steps B and C), then run this again. Nothing was built or deployed."

`))

// expected live deployment: Batch 20
s = between(s, '# 20: the deployment this ship replaces is the Batch 19 ship', 'say "+ GET $API   (Authorization', fix(String.raw`# 22: the deployment this ship replaces is the Batch 20 ship (tag ship-20); it is also the rollback target. Its id was recorded when Batch 20 shipped,
# or it is given with --expect-live <id> (also accepted from KS_EXPECT_LIVE_ID).
ID_11A=""; SRC_11A="Batch 20 production deployment (tag ship-20)"
B20_AFTER="$ROOT/docs/review/batch20/evidence/prod-ship/prod-deployment-after.txt"
if [ -s "$B20_AFTER" ]; then ID_11A="$(grep -o '^deployment_id=[0-9a-f-]*' "$B20_AFTER" | head -1 | cut -d= -f2)"; SRC_11A="$B20_AFTER"; fi
EXPECT_LIVE="@{EXPECT_ARG:-@{KS_EXPECT_LIVE_ID:-}}"
say "  expected live deployment (Batch 20, ship-20): @{EXPECT_LIVE:-@{ID_11A:-<unknown: give --expect-live <long id>>}}"
if [ -z "$EXPECT_LIVE" ] && [ -z "$ID_11A" ]; then
  pending "no recorded Batch 20 deployment id here: give  --expect-live <long deployment id>  (the dry run prints the id that is live now: if that is the Batch 20 deployment, use it)"
fi
`))
s = between(s, 'LIVE_IS=""\nif [ -n "${KS_EXPECT_LIVE_ID:-}"', 'if [ "$DRY" = 0 ]; then\n  mkdir -p "$EV"', fix(String.raw`LIVE_IS=""
if [ -n "$EXPECT_LIVE" ] && [ "$BEFORE_ID" = "$EXPECT_LIVE" ]; then LIVE_IS="--expect-live / KS_EXPECT_LIVE_ID"
elif [ -z "$EXPECT_LIVE" ] && [ -n "$ID_11A" ] && [ "$BEFORE_ID" = "$ID_11A" ]; then LIVE_IS="Batch 20 ship-20 (from $SRC_11A; read from Cloudflare just now)"
fi
if [ -n "$LIVE_IS" ]; then
  say "  = live is the expected deployment: $LIVE_IS — rollback target $BEFORE_ID"
else
  MSG="the live deployment is $BEFORE_ID (source $BEFORE_SRC): it is not the expected Batch 20 deployment (@{EXPECT_LIVE:-$ID_11A}) — someone deployed or rolled back since Batch 20 was shipped.
Check the Cloudflare dashboard; if this live version is the right one to replace, run again with:  bash scripts/ship-prod-22.sh --expect-live $BEFORE_ID"
  if [ "$DRY" = 1 ]; then say "WARNING (a real run would STOP here): $MSG"; PENDING+=("live deployment $BEFORE_ID is not the expected Batch 20 one (if it is the right one: --expect-live $BEFORE_ID)"); else stop "$MSG"; fi
fi
`))

s = sub(s, 'prod-before-19', 'prod-before-22')
s = sub(s, 'ship-prod-20.sh', 'ship-prod-22.sh')
s = sub(s, 'rollback-prod-20.sh', 'rollback-prod-22.sh')

// dist scan: new chunk lists
s = sub(s, 'OTP_CHUNKS=()\nif [ -d dist/assets ]; then', 'OTP_CHUNKS=()\nOFFER_CHUNKS=(); CHOICE_CHUNKS=(); SAVE_CHUNKS=(); STMT_CHUNKS=(); STMTUI_CHUNKS=(); ADS_CHUNKS=(); ADFIELD_CHUNKS=(); PANEL_CHUNKS=(); SIGNUPPAGE_CHUNKS=()\nif [ -d dist/assets ]; then')
s = sub(s, '  while IFS= read -r a; do [ -n "$a" ] && OTP_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$OTP_MARKER" dist/assets/*.js 2>/dev/null | head -3)\n',
  '  while IFS= read -r a; do [ -n "$a" ] && OTP_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$OTP_MARKER" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && OFFER_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$MITRA_OFFER_MARKER" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && CHOICE_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$MITRA_CHOICE_RPC" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && SAVE_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$MITRA_SAVE_RPC" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && STMT_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$MITRA_STMT_RPC" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && STMTUI_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$MITRA_STMT_UI" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && ADS_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$MITRA_ADS_RPC" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && ADFIELD_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$MITRA_ADFIELD" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  while IFS= read -r a; do [ -n "$a" ] && PANEL_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$MITRA_PANEL_MARKER" dist/assets/*.js 2>/dev/null | head -3)\n' +
  '  for a in dist/assets/Signup-*.js; do [ -f "$a" ] && SIGNUPPAGE_CHUNKS+=("/${a#dist/}"); done\n')

// dist markers: replace the two Batch 20 Mitra lines
s = between(s, '  grep -l "$MITRA_MARKER" dist/assets/*.js', '  [ ${#LINK_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $LINK_MARKER', fix(String.raw`  # 22: Mitra at the offer, on ads, and the statement; and NOT on the sign-up page any more.
  [ @{#OFFER_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $MITRA_OFFER_MARKER (the 22 Mitra dropdown on the offer form)"; miss=1; }
  [ @{#CHOICE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $MITRA_CHOICE_RPC (the 22 first-offer check)"; miss=1; }
  [ @{#SAVE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $MITRA_SAVE_RPC (the 22 save of the Mitra with the first offer)"; miss=1; }
  [ @{#STMT_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $MITRA_STMT_RPC (the 22D statement)"; miss=1; }
  [ @{#STMTUI_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $MITRA_STMT_UI (the 22D Statement button)"; miss=1; }
  [ @{#ADS_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $MITRA_ADS_RPC (the 22 Mitra ads list)"; miss=1; }
  [ @{#ADFIELD_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $MITRA_ADFIELD (the 22 Mitra pick in the announcement form)"; miss=1; }
  [ @{#PANEL_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $MITRA_PANEL_MARKER (the admin Kissan Mitra panel)"; miss=1; }
  [ @{#SIGNUPPAGE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/Signup-*.js (the sign-up page chunk cannot be checked)"; miss=1; }
  for a in "@{SIGNUPPAGE_CHUNKS[@]}"; do for m in "@{SIGNUP_FORBIDDEN[@]}"; do grep -q -- "$m" "dist$a" && { say "  STILL THERE: '$m' in dist$a (the sign-up page must no longer have the Mitra dropdown)"; miss=1; }; done; done
  if [ -f dist/signup/index.html ]; then for m in "@{SIGNUP_FORBIDDEN[@]}"; do grep -q -- "$m" dist/signup/index.html && { say "  STILL THERE: '$m' in dist/signup/index.html"; miss=1; }; done; fi
`))

// main chunk must change
s = sub(s, '[ "$DRY" = 1 ] || [ -n "$NEW_MAIN" ] || stop "could not read the main chunk name from dist/index.html (nothing deployed)"\n',
  '[ "$DRY" = 1 ] || [ -n "$NEW_MAIN" ] || stop "could not read the main chunk name from dist/index.html (nothing deployed)"\n' +
  '# 22: the new build must differ from what is live (else this ship would change nothing, or the build is the old one).\n' +
  'if [ "$DRY" = 0 ] && [ "$NEW_MAIN" = "$BEFORE_MAIN" ]; then stop "the new build has the same main chunk ($NEW_MAIN) as the live site: it is not a new build (nothing deployed)"; fi\n')

// post-deploy gates
s = between(s, '  return $ok\n}\nsay "== 4. deploy"', 'say "== 4. deploy"', fix(String.raw`  # 22: the main chunk really changed; the sign-up page has no Mitra dropdown; the offer form, ads and statement code are live; the database still has 0076 + 0077.
  body="$(timeout 60 curl -sL --max-redirs 5 "$SITE/?ks_ship=$STAMP-22main")"
  LIVE_NOW_MAIN="$(printf '%s' "$body" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
  if [ -n "$LIVE_NOW_MAIN" ] && [ "$LIVE_NOW_MAIN" = "$NEW_MAIN" ] && [ "$LIVE_NOW_MAIN" != "$BEFORE_MAIN" ]; then say "PASS  [22_main] the live main chunk is the new one ($LIVE_NOW_MAIN), not the previous ($BEFORE_MAIN)"; else say "FAIL  [22_main] live main chunk '$LIVE_NOW_MAIN' (expected the new $NEW_MAIN, previous was $BEFORE_MAIN)"; ok=1; fi
  [ @{#SIGNUPPAGE_CHUNKS[@]} -gt 0 ] || { say "FAIL  [22_signup] no Signup chunk found in dist"; ok=1; }
  for a in "@{SIGNUPPAGE_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"; code="@{body##*$'\n'}"; hit=""
    for m in "@{SIGNUP_FORBIDDEN[@]}"; do grep -q -- "$m" <<<"$body" && hit="$hit $m"; done
    if [ "$code" = "200" ] && [ -z "$hit" ]; then say "PASS  [22_signup] GET $a -> 200, the sign-up page has no Mitra dropdown text"; else say "FAIL  [22_signup] GET $a -> $code (Mitra dropdown text still in it:@{hit:- none})"; ok=1; fi
  done
  body="$(timeout 60 curl -sL --max-redirs 5 "$SITE/signup?ks_ship=$STAMP-22su")"; hit=""
  for m in "@{SIGNUP_FORBIDDEN[@]}"; do grep -q -- "$m" <<<"$body" && hit="$hit $m"; done
  if [ -z "$hit" ]; then say "PASS  [22_signup] GET /signup html has no Mitra dropdown text"; else say "FAIL  [22_signup] GET /signup html has:$hit"; ok=1; fi
  for pair in "OFFER:$MITRA_OFFER_MARKER" "CHOICE:$MITRA_CHOICE_RPC" "SAVE:$MITRA_SAVE_RPC" "STMT:$MITRA_STMT_RPC" "STMTUI:$MITRA_STMT_UI" "ADS:$MITRA_ADS_RPC" "ADFIELD:$MITRA_ADFIELD" "PANEL:$MITRA_PANEL_MARKER"; do
    var="@{pair%%:*}_CHUNKS[@]"; mk="@{pair#*:}"; found=0
    for a in "@{!var}"; do
      found=1
      body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"; code="@{body##*$'\n'}"
      if [ "$code" = "200" ] && grep -q -- "$mk" <<<"$body"; then say "PASS  [22_chunks] GET $a -> 200, holds $mk"; else say "FAIL  [22_chunks] GET $a -> $code (marker $mk)"; ok=1; fi
    done
    [ "$found" = 1 ] || { say "FAIL  [22_chunks] no chunk holding $mk found in dist"; ok=1; }
  done
  check_db_gate || ok=1
  return $ok
}
`))

// messages
s = sub(s, 'say "== 7. on any failure:', 'say "== 7. on any failure (a failed gate after the deploy rolls back by itself):')
s = sub(s, 'a Batch 10F/10G/11A/14A/15A/16B/17B/17D/17E route, marker, OTP function, admin function, history table or CSP check failed', 'a Batch 22 (Mitra) / 19 / 17 / 15A / 14A / 11A / 10 route, marker, OTP function, admin function, history table, database function or CSP check failed')
s = sub(s, 'NEXT: follow docs/review/batch19/SHIP.md step 5 (phone check of the hub and every page, Google rich-result test for the FAQ markup), then step 6 (merge to main with the worktree method) and step 7 (the 15 November check: update the desi cow status and details).',
  'NEXT: docs/review/batch22/SHIP_PROD.md step G (the 5-line check on production).')
writeFileSync('scripts/ship-prod-22.sh', s)

// =================================================================== rollback
let r = read('scripts/rollback-prod-20.sh')
const RHEAD = fix(String.raw`#!/usr/bin/env bash
# Batch 22 - roll kissansahyog.com (Pages project kissansahyog-prod) back to an earlier deployment.
# Adapted copy of rollback-prod-20.sh (which stays as it was). The rollback target after the 22 ship is the Batch 20 deployment;
# ship-prod-22.sh records and prints its id (docs/review/batch22/evidence/prod-ship/prod-deployment-before.txt). Give the id yourself if that file is not here.
#
#   bash scripts/rollback-prod-22.sh <deployment-id> [--dry-run]   # roll back to this production deployment (full id) - normal use
#   bash scripts/rollback-prod-22.sh [--dry-run]                   # roll back to the deployment recorded by ship-prod-22.sh (else you must give the id)
#
# DATABASE: this script changes NO database, and a site rollback needs NO database change: the old site ignores the new database objects
# (0076 and 0077 stay in place, harmless). The OPTIONAL database rollbacks, run by hand in the SQL editor, 0077 FIRST:
#   supabase/migrations/rollback/0077_mitra_statement_rollback.sql    drops the one Statement function; loses no data
#   supabase/migrations/rollback/0076_mitra_at_offer_rollback.sql     DELETES the ad-to-Mitra links (Mitras already saved on profiles stay)
# The auth switches (otp_required ON, session_enforced OFF in production) are read (public /api/otp/config) and printed; never changed.
#
# Method: wrangler has NO "pages rollback" command, so this uses the Cloudflare API endpoint the dashboard "Rollback" button uses:
#   POST https://api.cloudflare.com/client/v4/accounts/{account}/pages/projects/kissansahyog-prod/deployments/{id}/rollback
# Auth: $CLOUDFLARE_API_TOKEN if set, otherwise wrangler's own OAuth login token. The token is never printed.
`)
r = RHEAD + r.slice(r.indexOf('set -uo pipefail'))
r = sub(r, 'EV="$ROOT/docs/review/batch20/evidence/prod-ship"', 'EV="$ROOT/docs/review/batch22/evidence/prod-ship"')
r = sub(r, 'NIGHT_SNAP="$ROOT/docs/review/batch20/evidence/prod-before.json"', 'NIGHT_SNAP="$ROOT/docs/review/batch22/evidence/prod-before.json"')
r = sub(r, 'DEFAULT_17B=""   # no built-in target: the Batch 19 deployment id is recorded by ship-prod-20.sh (or read from batch19 evidence)\n', '')
r = between(r, '    B19="$ROOT/docs/review/batch19', '[[ "$TARGET" =~', '    B20="$ROOT/docs/review/batch20/evidence/prod-ship/prod-deployment-after.txt"; [ -s "$B20" ] && TARGET="$(grep -o \'^deployment_id=[0-9a-f-]*\' "$B20" | head -1 | cut -d= -f2)"\n    [ -n "$TARGET" ] || die "no recorded deployment id: give the long id of the Batch 20 deployment (npx wrangler pages deployment list --project-name $PROJECT)"\n    say "target: Batch 20 deployment $TARGET (from $B20)"\n  fi\nfi\n')
r = sub(r, 'recorded by ship-prod-20.sh', 'recorded by ship-prod-22.sh')
r = sub(r, 'sed -n 2,32p', 'sed -n 2,40p')
writeFileSync('scripts/rollback-prod-22.sh', r)
console.log('wrote scripts/ship-prod-22.sh and scripts/rollback-prod-22.sh')
