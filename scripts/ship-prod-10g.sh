#!/usr/bin/env bash
# Batch 10G — ship branch release-10g to PRODUCTION (kissansahyog.com = Pages project kissansahyog-prod),
# check it with read-only gates, and roll back by itself if any gate fails.
# Copy of scripts/ship-prod-10f.sh with Batch 10G names and gates; EVERY 10F (and 10E) gate is kept.
# release-10g contains 10C + 10D + 10E + 10F + 10G: use this script INSTEAD of ship-prod-10f.sh. If
# 10D / 10E / 10F were never shipped on their own, this ship carries them too.
#
#   bash scripts/ship-prod-10g.sh --dry-run   # validate preconditions + print every command; changes nothing
#   bash scripts/ship-prod-10g.sh             # the real ship (founder runs this)
#
# Ship tag: "ship-10g" (created on the final HEAD of release-10g and pushed). NOT "pre-10g-ship": that is
# the safety tag on the release-10f head (c44c418) and must never be moved.
#
# Database: BEFORE this script, production needs migration 0064 (Batch 10E, app_register_phone) AND
# migration 0065 (Batch 10G, listing disable / permanent delete; docs/review/batch10g/PROD_MIGRATION_0065.sql).
# Step D proves both with harmless read-only probes and STOPS before building if either is missing.
# The 10E mandi history backfill SQL (docs/review/batch10e/backfill-prod/) is pasted AFTER this ship if
# it was not pasted yet — see docs/review/batch10g/SHIP.md.
#
# Steps (real run):
#   G  first gate: Batch 10C shipped and closed (tag prod-10c on origin, $SITE/guide -> 200).
#   0  preconditions: on release-10g, no modified tracked files that ship (see ALLOW_DIRTY), tag ship-10g
#      exists locally and on origin and is HEAD, HEAD pushed, .env.production present, wrangler logged in,
#      Cloudflare API reachable with pages access (needed for the rollback).
#      Dry run: a missing tag / unpushed HEAD / dirty file is a WARNING ("pending"); a real run STOPS.
#   D  read-only probes on the PRODUCTION Supabase (anon key from .env.production, never printed):
#      0064 (10E gate, unchanged): app_register_phone with arguments that fail validation before any
#      insert must answer HTTP 400 "name_required".
#      0065 (10G): delete_my_listing(two random UUIDs) must answer the application error "not_found"
#      (the listing does not exist, nothing is deleted) and admin_delete_listing(random actor) must
#      answer "not_admin" (refused before anything else). 404 / PGRST202 = function missing -> STOP before
#      anything is built and print the migration step.
#      (Dry run: KS_SKIP_DB_PROBE=1 skips them in a dry run only — a real run always probes.)
#   1  record the live prod deployment id (read-only). It must be ONE of: the Batch 10C deployment
#      7f5dc56a-…, the Batch 10D production deployment (docs/review/batch10d/CLOSE_REPORT.md, here or on
#      origin/release-10d), the Batch 10E production deployment (docs/review/batch10e/CLOSE_REPORT.md, here
#      or on origin/release-10e), the Batch 10F production deployment (docs/review/batch10f/CLOSE_REPORT.md,
#      here or on origin/release-10f), or KS_EXPECT_LIVE_ID=<id>. It prints which one is live; that id is
#      the rollback target.
#   2  read-only snapshot docs/review/batch10g/evidence/prod-before.json of that live deployment (taken if
#      missing or of another deployment); live prod must match it; then a fresh prod-before-ship.json.
#   3  npm run build:prod (env guard + prerender 268/268 + sitemaps + dist guard + localhost gate), then
#      again on their own: check-prod-env --dist, check-no-localhost-dist; no staging ref in dist except
#      the two CSP img-src host tokens of dist/_headers; dist/_headers img-src lists the prod storage host;
#      10C markers (nav-guide, guide chunks with "ksg-"), 10E marker (a chunk calling app_register_phone),
#      10F markers: dist/index.html HAS the static hero (home-hero, home-hero-demo, both big buttons) and
#      has NONE of the removed 10D hero parts (home-live, home-field, home-band, home-facts) and there is
#      no LiveStage chunk; dist/msp/index.html and a JS chunk carry the last-price badge (ks-date-badge);
#      10G marker: a JS chunk calls delete_my_listing (the seller delete / disable screens).
#   3b NEW in 10F: the size part of the compare gate is run on dist BEFORE deploying (predeploy-size-check):
#      a page captured by the prerender in its loading state, or without its FAQ block, would fail the
#      gate after the deploy and roll back. On a failure the prerender is re-run (max 2 times); if it still
#      fails, the ship STOPS before deploying.
#   4  deploy: npx wrangler pages deploy dist --project-name kissansahyog-prod --branch main --commit-dirty=true
#   5  wait until kissansahyog.com serves the new build
#   6  prod gates, READ-ONLY: pages + compare (prod-before-ship; / and /browse may be 30 % smaller — the 10D
#      hero is gone — or up to 40 % bigger; /msp up to 60 % bigger: badge, chart labels, table) + cors +
#      functions + static + sw + data; then / /signup /browse /guide /msp /post /guide/post /mausam answer
#      200 with the new main chunk (redirects followed); / has the 10F hero markers and none of the removed
#      ones; / has nav-guide; guide and sign-up chunks served with their markers; /msp has the badge and the
#      badge chunk is served; the home page CSP img-src contains https://eltmcznjcqiahqhjvpjg.supabase.co.
#   7  any failure in 4-6 -> scripts/rollback-prod-10g.sh <recorded id> (Cloudflare Pages rollback),
#      which re-runs the page check; the verdict is printed in a box at the end.
# Never touches git history, never pushes, never writes to any database.
set -uo pipefail

PROJECT="kissansahyog-prod"
SITE="https://kissansahyog.com"
BRANCH="release-10g"
TAG="ship-10g"        # ship point of Batch 10G (pre-10g-ship is the 10F-head safety tag; never reuse it)
GATE_TAG="prod-10c"   # Batch 10C close tag; must be on origin
ID_10C="7f5dc56a-9d1c-4bd2-8bde-a4512a96be20"   # prod since the Batch 10C ship (source 40ddc4d, main chunk /assets/index-NFbe6Fk2.js)
CLOSE_10D="docs/review/batch10d/CLOSE_REPORT.md" # exists only once Batch 10D was shipped and closed on its own
CLOSE_10E="docs/review/batch10e/CLOSE_REPORT.md" # exists only once Batch 10E was shipped and closed
CLOSE_10F="docs/review/batch10f/CLOSE_REPORT.md" # exists only once Batch 10F was shipped and closed
PROD_REF="eltmcznjcqiahqhjvpjg"
STAGING_REF="wzxtqbqlahyahsnoqqva"
PROD_IMG_HOST="https://${PROD_REF}.supabase.co"
ACCOUNT_ID="${CF_ACCOUNT_ID:-9ad1ef464c60a7db797b4bb097d545e5}"
API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
B10="$ROOT/docs/review/batch10g/evidence"
EV="$B10/prod-ship"
NIGHT_SNAP="$B10/prod-before.json"           # read-only snapshot of the live deployment this ship replaces
NIGHT_META="$B10/prod-before.deployment.txt" # which deployment that snapshot describes
STAMP="$(date +%Y%m%d-%H%M%S)"
# Modified tracked files that may stay dirty: build output rewritten by every build and review
# documents (docs/ is not part of dist). Anything else dirty -> STOP.
ALLOW_DIRTY='^(public/search-index\.json|docs/review/.*)$'
ROUTES_10F=(/ /signup /browse /guide /msp /post /guide/post /mausam)
# Bundle markers. 10C: nav Guide pill on /, lazy guide chunks holding the guide code. 10E: the phone-only
# sign-up RPC name inside the built JS (authService). 10F: the static hero (and NOT the removed 10D live
# hero / field band / facts row / LiveStage chunk), the one demo button, both big buttons (Hindi text, the
# prerender language), and the /msp last-price badge class in the prerendered /msp and in a JS chunk.
GUIDE_MARKER='ksg-'
HOME_MARKER='nav-guide'
SIGNUP_MARKER='app_register_phone'
HERO_MARKERS=('data-testid="home-hero"' 'data-testid="home-hero-demo"' 'मुझे कुछ चाहिए' 'मेरे पास कुछ है')
REMOVED_MARKERS=('data-testid="home-live"' 'data-testid="home-field"' 'data-testid="home-band"' 'data-testid="home-facts"')
BADGE_MARKER='ks-date-badge'
LISTING_MARKER='delete_my_listing'   # 10G: the seller delete / disable code
# Compare-gate limits for this ship. / and /browse (served the homepage html): the 10D hero is removed in
# 10F, so they may be up to 30 % smaller than a live 10D/10E homepage, and up to 40 % bigger than a live
# 10C one (10F keeps the 10D-era sections). /msp: up to 60 % bigger (last-price badge, chart labels and the
# trend table in the prerendered html). Title, h1 and the ErrorBoundary check are unchanged.
HOME_GROWTH='root=1.40,browse=1.40,msp=1.60'
HOME_SHRINK='root=0.70,browse=0.70'

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,66p "$0"; exit 0 ;;
    *) echo "unknown argument: $a"; exit 2 ;;
  esac
done

say()  { printf '%s\n' "$*"; }
loud() { printf '\n##################################################################\n%s\n##################################################################\n' "$*"; }
stop() { loud "SHIP STOPPED BEFORE ANY CHANGE TO PRODUCTION: $*"; exit 1; }
PENDING=()   # dry run only: things a real run would stop on, which are expected to be done later
pending() { if [ "$DRY" = 1 ]; then say "WARNING (pending — a real run would STOP here): $*"; PENDING+=("$*"); else stop "$*"; fi; }
cd "$ROOT" || exit 1
[ "$DRY" = 1 ] && say "*** DRY RUN — nothing will be built, deployed, rolled back or written (except the read-only snapshot file, if missing) ***"

# ---------------------------------------------------------------- G. Batch 10C must be live and closed
say "== G. first gate: Batch 10C shipped and closed (tag $GATE_TAG on origin, $SITE/guide -> 200)"
GATE_OK=1
GATE_REMOTE="$(timeout 120 git ls-remote --tags origin "refs/tags/$GATE_TAG" 2>/dev/null | awk '{print $1}' | head -1)"
say "+ git ls-remote --tags origin $GATE_TAG -> ${GATE_REMOTE:0:7}"
[ -n "$GATE_REMOTE" ] || { GATE_OK=0; say "  tag $GATE_TAG is NOT on origin"; }
GUIDE_CODE="$(timeout 60 curl -sL --max-redirs 5 -o /dev/null -w '%{http_code}' "$SITE/guide?ks_ship=$STAMP-gate")"
say "+ curl -sL $SITE/guide -> $GUIDE_CODE"
[ "$GUIDE_CODE" = "200" ] || { GATE_OK=0; say "  $SITE/guide does not answer 200"; }
if [ "$GATE_OK" = 1 ]; then
  say "  = satisfied: Batch 10C is live and closed"
else
  pending "Batch 10C must be shipped and closed first (tag $GATE_TAG on origin, $SITE/guide must answer 200)"
fi
TAG10D="$(timeout 120 git ls-remote --tags origin refs/tags/prod-10d 2>/dev/null | awk '{print $1}' | head -1)"
if [ -n "$TAG10D" ]; then say "  (tag prod-10d is on origin: Batch 10D was shipped on its own)"
else say "  (tag prod-10d is not on origin: Batch 10D has not shipped on its own)"; fi
TAG10E="$(timeout 120 git ls-remote --tags origin refs/tags/prod-10e 2>/dev/null | awk '{print $1}' | head -1)"
if [ -n "$TAG10E" ]; then say "  (tag prod-10e is on origin: Batch 10E was shipped and closed)"
else say "  (tag prod-10e is not on origin: Batch 10E has not shipped — this ship carries it; migration 0064 must be on production first, step D)"; fi

# ---------------------------------------------------------------- 0. preconditions (read-only)
say "== 0. preconditions"
CURB="$(git branch --show-current)"
say "+ git branch --show-current -> $CURB"
[ "$CURB" = "$BRANCH" ] || stop "not on branch $BRANCH (on '$CURB'): git checkout $BRANCH"
DIRTY="$(git status --porcelain --untracked-files=no | sed 's/^...//' | grep -Ev "$ALLOW_DIRTY" || true)"
say "+ git status --porcelain --untracked-files=no  (allowed to be dirty: public/search-index.json, docs/review/**)"
[ -z "$DIRTY" ] || pending "modified tracked files would change what ships (commit them first):
$DIRTY"
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  say "+ git rev-parse $TAG -> $(git rev-parse --short "$TAG^{commit}")"
  REMOTE_TAG="$(timeout 120 git ls-remote --tags origin "refs/tags/$TAG^{}" "refs/tags/$TAG" 2>/dev/null | sort -k2 -r | head -1 | awk '{print $1}')"
  say "+ git ls-remote --tags origin $TAG (peeled) -> ${REMOTE_TAG:0:7}"
  if [ -z "$REMOTE_TAG" ]; then pending "tag $TAG is not on origin (git push origin $TAG)"
  elif [ "$REMOTE_TAG" != "$(git rev-parse "$TAG^{commit}")" ]; then stop "tag $TAG on origin points somewhere else than the local tag"
  fi
  [ "$(git rev-parse "$TAG^{commit}")" = "$(git rev-parse HEAD)" ] || pending "tag $TAG ($(git rev-parse --short "$TAG^{commit}")) is not on HEAD ($(git rev-parse --short HEAD))"
else
  pending "tag $TAG missing (to be created on the final HEAD and pushed: git tag $TAG && git push origin $TAG)"
fi
HEAD_SHA="$(git rev-parse HEAD)"
REMOTE_HEAD="$(timeout 120 git ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | awk '{print $1}')"
say "+ HEAD ${HEAD_SHA:0:7}  origin/$BRANCH ${REMOTE_HEAD:0:7}"
[ "$HEAD_SHA" = "$REMOTE_HEAD" ] || pending "HEAD is not what origin/$BRANCH has (push it first, or pull) — prod must ship a pushed commit"
[ -f .env.production ] || stop ".env.production missing (the prod build needs it)"
[ -f supabase/migrations/0064_app_register_phone.sql ] || stop "supabase/migrations/0064_app_register_phone.sql missing — wrong checkout?"
command -v node >/dev/null && command -v npx >/dev/null && command -v curl >/dev/null || stop "node / npx / curl not found"

# ---------------------------------------------------------------- D. migration 0064 on production (read-only probe)
# app_register_phone checks, in this order and BEFORE any table read or insert:
#   coalesce(trim(p_full_name),'') = ''  -> raise 'name_required'
#   phone not 10 digits                   -> raise 'invalid_phone'
#   p_disclaimer_accepted is not true     -> raise 'disclaimer_not_accepted'
# The probe sends an EMPTY name, an EMPTY mobile and acknowledgment FALSE, so the very first check
# raises and the function returns before it reaches the phone lookup or the insert; each of the three
# arguments alone would stop it before the insert. PostgREST runs the call in a transaction that the
# exception rolls back (and "Prefer: tx=rollback" asks it to roll back anyway). Nothing is written.
say "== D. read-only probe: is migration 0064 (app_register_phone) on the PRODUCTION database?"
say "+ POST <VITE_SUPABASE_URL of .env.production>/rest/v1/rpc/app_register_phone  {p_full_name:'', p_phone:'', p_disclaimer_accepted:false, …}  (anon key from .env.production, not shown)"
say "  expected: HTTP 400 with 'name_required' (validation error raised before any insert)"
MIGRATION_HELP="Apply migration 0064 to the PRODUCTION database first, then run this script again:
  1. Open https://supabase.com/dashboard -> the PRODUCTION project (ref $PROD_REF, NOT staging $STAGING_REF)
  2. SQL Editor -> New query
  3. Paste the whole file supabase/migrations/0064_app_register_phone.sql (docs/review/batch10e/SHIP.md, step 2; docs/review/batch10g/SHIP.md step 2) -> Run
  4. Expected: 'Success. No rows returned'. Check: select proname from pg_proc where proname = 'app_register_phone';  -> one row"
if [ "$DRY" = 1 ] && [ "${KS_SKIP_DB_PROBE:-}" = 1 ]; then
  say "  SKIPPED in this dry run (KS_SKIP_DB_PROBE=1). A real run always runs this probe and stops if 0064 is missing."
  PENDING+=("migration 0064 probe not run in this dry run (KS_SKIP_DB_PROBE=1); the real run will probe")
else
  PROBE="$(timeout 60 node - <<'JS' 2>&1
const fs = require('node:fs')
const env = {}
for (const l of fs.readFileSync('.env.production', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2')
}
const url = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (!url || !key) { console.log('RESULT=NOENV'); process.exit(0) }
if (!url.includes('eltmcznjcqiahqhjvpjg') || url.includes('wzxtqbqlahyahsnoqqva')) { console.log('RESULT=NOTPROD'); process.exit(0) }
const body = { p_full_name: '', p_phone: '', p_village_town: '', p_latitude: null, p_longitude: null, p_language: 'hi', p_disclaimer_accepted: false, p_show_details: false }
fetch(url + '/rest/v1/rpc/app_register_phone', {
  method: 'POST',
  headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'tx=rollback' },
  body: JSON.stringify(body),
}).then(async (r) => {
  const t = await r.text()
  let j = {}; try { j = JSON.parse(t) } catch {}
  console.log('HTTP=' + r.status)
  console.log('CODE=' + String(j.code || '').slice(0, 40))
  console.log('MESSAGE=' + String(j.message || t).replace(/\s+/g, ' ').slice(0, 200))
  console.log('RESULT=' + (r.status === 400 && /name_required/.test(t) ? 'PRESENT' : (r.status === 404 || j.code === 'PGRST202') ? 'MISSING' : 'UNEXPECTED'))
}).catch((e) => { console.log('RESULT=NETWORK ' + String(e && e.message || e).slice(0, 120)) })
JS
)"
  PRES="$(grep -o '^RESULT=.*' <<<"$PROBE" | head -1 | cut -d= -f2-)"
  say "  $(grep -E '^(HTTP|CODE|MESSAGE)=' <<<"$PROBE" | tr '\n' ' ')"
  case "$PRES" in
    PRESENT) say "  = migration 0064 is on production (app_register_phone answered name_required; nothing written)";;
    MISSING) pending "migration 0064 is NOT on the production database (app_register_phone not found).
$MIGRATION_HELP";;
    NOENV)   stop ".env.production has no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY";;
    NOTPROD) stop ".env.production VITE_SUPABASE_URL is not the production project";;
    *)       pending "the app_register_phone probe gave an unexpected answer (${PRES:-no answer}) — check the production project; if 0064 is missing:
$MIGRATION_HELP";;
  esac
fi

# ---------------------------------------------------------------- D2. migration 0065 on production (read-only probes)
# delete_my_listing(p_actor_id, p_listing_id) looks the listing up FIRST and raises 'not_found' when it does not
# exist (two random UUIDs: it cannot exist), so nothing can be deleted. admin_delete_listing runs
# require_admin(p_actor_id) FIRST and raises 'not_admin' for a random actor. "Prefer: tx=rollback" as well.
say "== D2. read-only probes: is migration 0065 (listing disable / permanent delete) on the PRODUCTION database?"
say "+ POST <VITE_SUPABASE_URL of .env.production>/rest/v1/rpc/delete_my_listing  {two random UUIDs}  -> expected: not_found"
say "+ POST <VITE_SUPABASE_URL of .env.production>/rest/v1/rpc/admin_delete_listing {random actor}    -> expected: not_admin"
MIGRATION_HELP_65="Apply migration 0065 to the PRODUCTION database first, then run this script again:
  1. Open https://supabase.com/dashboard -> the PRODUCTION project (ref $PROD_REF, NOT staging $STAGING_REF)
  2. SQL Editor -> New query
  3. Paste the whole file docs/review/batch10g/PROD_MIGRATION_0065.sql (= supabase/migrations/0065_listing_delete_disable.sql) -> Run
  4. Expected: 'Success. No rows returned'. Check: select proname from pg_proc where proname in ('delete_my_listing','admin_delete_listing','set_my_listing_disabled','admin_set_listing_disabled');  -> four rows"
if [ "$DRY" = 1 ] && [ "${KS_SKIP_DB_PROBE:-}" = 1 ]; then
  say "  SKIPPED in this dry run (KS_SKIP_DB_PROBE=1). A real run always runs these probes and stops if 0065 is missing."
  PENDING+=("migration 0065 probes not run in this dry run (KS_SKIP_DB_PROBE=1); the real run will probe")
else
  PROBE65="$(timeout 60 node - <<'JS' 2>&1
const fs = require('node:fs')
const crypto = require('node:crypto')
const env = {}
for (const l of fs.readFileSync('.env.production', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2')
}
const url = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (!url || !key) { console.log('RESULT=NOENV'); process.exit(0) }
if (!url.includes('eltmcznjcqiahqhjvpjg') || url.includes('wzxtqbqlahyahsnoqqva')) { console.log('RESULT=NOTPROD'); process.exit(0) }
const call = (fn, body, want) => fetch(url + '/rest/v1/rpc/' + fn, {
  method: 'POST',
  headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'tx=rollback' },
  body: JSON.stringify(body),
}).then(async (r) => {
  const t = await r.text()
  let j = {}; try { j = JSON.parse(t) } catch {}
  const res = r.status === 400 && new RegExp(want).test(t) ? 'PRESENT' : (r.status === 404 || j.code === 'PGRST202') ? 'MISSING' : 'UNEXPECTED'
  console.log(`${fn}: HTTP=${r.status} CODE=${String(j.code || '').slice(0, 20)} MESSAGE=${String(j.message || t).replace(/\s+/g, ' ').slice(0, 120)} -> ${res}`)
  return res
})
Promise.all([
  call('delete_my_listing', { p_actor_id: crypto.randomUUID(), p_listing_id: crypto.randomUUID() }, 'not_found'),
  call('admin_delete_listing', { p_actor_id: crypto.randomUUID(), p_listing_id: crypto.randomUUID(), p_reason: 'ship probe' }, 'not_admin'),
]).then((r) => console.log('RESULT=' + (r.every((x) => x === 'PRESENT') ? 'PRESENT' : r.includes('MISSING') ? 'MISSING' : 'UNEXPECTED')))
  .catch((e) => console.log('RESULT=NETWORK ' + String(e && e.message || e).slice(0, 120)))
JS
)"
  PRES65="$(grep -o '^RESULT=.*' <<<"$PROBE65" | head -1 | cut -d= -f2-)"
  grep -E '^(delete_my_listing|admin_delete_listing):' <<<"$PROBE65" | sed 's/^/  /'
  case "$PRES65" in
    PRESENT) say "  = migration 0065 is on production (both probes answered their application error; nothing written)";;
    MISSING) pending "migration 0065 is NOT on the production database (delete_my_listing / admin_delete_listing not found).
$MIGRATION_HELP_65";;
    NOENV)   stop ".env.production has no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY";;
    NOTPROD) stop ".env.production VITE_SUPABASE_URL is not the production project";;
    *)       pending "the 0065 probes gave an unexpected answer (${PRES65:-no answer}) — check the production project; if 0065 is missing:
$MIGRATION_HELP_65";;
  esac
fi

say "+ timeout 120 npx wrangler pages deployment list --project-name $PROJECT   (read-only)"
LIST="$(timeout 120 npx wrangler pages deployment list --project-name "$PROJECT" 2>&1)" || stop "wrangler cannot list deployments (run: npx wrangler login)"

wrangler_cfg() {
  for f in "${APPDATA:-}/xdg.config/.wrangler/config/default.toml" "${XDG_CONFIG_HOME:-$HOME/.config}/.wrangler/config/default.toml" "$HOME/.wrangler/config/default.toml" "$HOME/Library/Preferences/.wrangler/config/default.toml"; do
    [ -f "$f" ] && { printf '%s' "$f"; return 0; }
  done
  return 1
}
get_token() {
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then printf '%s' "$CLOUDFLARE_API_TOKEN"; return 0; fi
  local cfg; cfg="$(wrangler_cfg)" || return 1
  grep -o '^oauth_token = "[^"]*"' "$cfg" | head -1 | sed 's/^oauth_token = "//; s/"$//'
}
TOKEN="$(get_token)"; [ -n "$TOKEN" ] || stop "no Cloudflare token for the rollback API (set CLOUDFLARE_API_TOKEN or run: npx wrangler login)"
api() { local m="$1" p="$2"; shift 2; timeout 120 curl -sS -X "$m" -H "Authorization: Bearer $TOKEN" "$API$p" "$@"; }
jget() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const f=new Function('j','return '+process.argv[1]);const v=f(j);console.log(v===undefined||v===null?'':typeof v==='object'?JSON.stringify(v):v)}catch(e){console.log('')}})" "$1"; }

# ---------------------------------------------------------------- 1. record the live deployment
say "== 1. record the live production deployment (read-only)"
# The Batch 10D production deployment id, if 10D was shipped and closed on its own: its close report
# (here, or on origin/release-10d where the 10D close commits it) names the new deployment.
ID_10D=""; SRC_10D=""
if [ -f "$CLOSE_10D" ]; then
  REPORT_10D="$(cat "$CLOSE_10D")"; SRC_10D="$CLOSE_10D"
else
  REPORT_10D="$(git show "origin/release-10d:$CLOSE_10D" 2>/dev/null || true)"; [ -n "$REPORT_10D" ] && SRC_10D="origin/release-10d:$CLOSE_10D"
fi
if [ -n "$REPORT_10D" ]; then
  ID_10D="$(grep -iE 'new[^|]*deployment' <<<"$REPORT_10D" | grep -viE 'previous|before|old' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
  say "  Batch 10D close report found ($SRC_10D): 10D production deployment ${ID_10D:-<not found in the report>}"
else
  say "  no Batch 10D close report ($CLOSE_10D) here or on origin/release-10d: 10D has not shipped on its own"
fi
# The Batch 10E production deployment id, once 10E was shipped and closed: its close report (here, or on
# origin/release-10e where the 10E close commits it) has the row "| New production deployment | `<id>` |".
ID_10E=""; SRC_10E=""
if [ -f "$CLOSE_10E" ]; then
  REPORT_10E="$(cat "$CLOSE_10E")"; SRC_10E="$CLOSE_10E"
else
  REPORT_10E="$(git show "origin/release-10e:$CLOSE_10E" 2>/dev/null || true)"; [ -n "$REPORT_10E" ] && SRC_10E="origin/release-10e:$CLOSE_10E"
fi
if [ -n "$REPORT_10E" ]; then
  ID_10E="$(grep -iE 'new[^|]*deployment' <<<"$REPORT_10E" | grep -viE 'previous|before|old' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
  say "  Batch 10E close report found ($SRC_10E): 10E production deployment ${ID_10E:-<not found in the report>}"
else
  say "  no Batch 10E close report ($CLOSE_10E) here or on origin/release-10e: 10E has not shipped (or not closed)"
fi
# The Batch 10F production deployment id, once 10F was shipped and closed (same report format).
ID_10F=""; SRC_10F=""
if [ -f "$CLOSE_10F" ]; then
  REPORT_10F="$(cat "$CLOSE_10F")"; SRC_10F="$CLOSE_10F"
else
  REPORT_10F="$(git show "origin/release-10f:$CLOSE_10F" 2>/dev/null || true)"; [ -n "$REPORT_10F" ] && SRC_10F="origin/release-10f:$CLOSE_10F"
fi
if [ -n "$REPORT_10F" ]; then
  ID_10F="$(grep -iE 'new[^|]*deployment' <<<"$REPORT_10F" | grep -viE 'previous|before|old' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
  say "  Batch 10F close report found ($SRC_10F): 10F production deployment ${ID_10F:-<not found in the report>}"
else
  say "  no Batch 10F close report ($CLOSE_10F) here or on origin/release-10f: 10F has not shipped (or not closed)"
fi
say "+ GET $API   (Authorization: Bearer <token, not shown>)"
PROJ="$(api GET "")"
[ "$(printf '%s' "$PROJ" | jget 'j.success')" = "true" ] || stop "Cloudflare API refused the project read — the automatic rollback would not work: $(printf '%s' "$PROJ" | jget 'j.errors')"
BEFORE_ID="$(printf '%s' "$PROJ" | jget 'j.result.canonical_deployment.id')"
BEFORE_SRC="$(printf '%s' "$PROJ" | jget '(j.result.canonical_deployment.deployment_trigger.metadata.commit_hash||"").slice(0,7)')"
[[ "$BEFORE_ID" =~ ^[0-9a-f-]{36}$ ]] || stop "could not read the live deployment id"
grep -q "$BEFORE_ID" <<<"$LIST" || stop "API live id $BEFORE_ID is not in the wrangler deployment list"
BEFORE_MAIN="$(timeout 60 curl -s "$SITE/?ks_ship=$STAMP" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
say "live now: deployment $BEFORE_ID (source $BEFORE_SRC), main chunk $BEFORE_MAIN"
LIVE_IS=""
if [ -n "${KS_EXPECT_LIVE_ID:-}" ] && [ "$BEFORE_ID" = "$KS_EXPECT_LIVE_ID" ]; then LIVE_IS="KS_EXPECT_LIVE_ID override"
elif [ "$BEFORE_ID" = "$ID_10C" ]; then LIVE_IS="Batch 10C (prod-10c)"
elif [ -n "$ID_10D" ] && [ "$BEFORE_ID" = "$ID_10D" ]; then LIVE_IS="Batch 10D (from $SRC_10D)"
elif [ -n "$ID_10E" ] && [ "$BEFORE_ID" = "$ID_10E" ]; then LIVE_IS="Batch 10E (from $SRC_10E)"
elif [ -n "$ID_10F" ] && [ "$BEFORE_ID" = "$ID_10F" ]; then LIVE_IS="Batch 10F (from $SRC_10F)"
fi
if [ -n "$LIVE_IS" ]; then
  say "  = live is the expected deployment: $LIVE_IS — rollback target $BEFORE_ID"
else
  MSG="the live deployment is $BEFORE_ID (source $BEFORE_SRC): it is not Batch 10C ($ID_10C), not the Batch 10D deployment (${ID_10D:-unknown: no 10D close report}) not the Batch 10E deployment (${ID_10E:-unknown: no 10E close report}) and not the Batch 10F deployment (${ID_10F:-unknown: no 10F close report}) — someone deployed or rolled back since Batch 10G was prepared.
Check the Cloudflare dashboard; if this live version is the right one to replace, run again with:  KS_EXPECT_LIVE_ID=$BEFORE_ID bash scripts/ship-prod-10g.sh"
  if [ "$DRY" = 1 ]; then say "WARNING (a real run would STOP here): $MSG"; PENDING+=("live deployment $BEFORE_ID is not an expected one (10C / 10D / 10E / 10F / KS_EXPECT_LIVE_ID)"); else stop "$MSG"; fi
fi
if [ "$DRY" = 0 ]; then
  mkdir -p "$EV"
  { echo "deployment_id=$BEFORE_ID"; echo "source=$BEFORE_SRC"; echo "main_chunk=$BEFORE_MAIN"; echo "live_is=${LIVE_IS:-unexpected}"; echo "recorded_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"; echo "shipping=$HEAD_SHA"; } > "$EV/prod-deployment-before.txt"
  printf '%s\n' "$LIST" > "$EV/prod-deployments-before-ship.txt"
else
  say "+ (would write) $EV/prod-deployment-before.txt  deployment_id=$BEFORE_ID"
fi

# ---------------------------------------------------------------- 2. live prod vs snapshot
say "== 2. read-only snapshot of the live deployment: $NIGHT_SNAP"
SNAP_FOR="$( [ -s "$NIGHT_META" ] && grep -o '^deployment_id=[0-9a-f-]*' "$NIGHT_META" | head -1 | cut -d= -f2 )"
CMD2a=(timeout 600 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$B10/prod-snapshot" --label prod-before-10g --checks snapshot --snapshot "$NIGHT_SNAP")
if [ -s "$NIGHT_SNAP" ] && [ "$SNAP_FOR" = "$BEFORE_ID" ]; then
  say "  snapshot present, taken of $BEFORE_ID (the live deployment) — reused"
else
  if [ -s "$NIGHT_SNAP" ]; then say "  snapshot present but taken of '${SNAP_FOR:-unknown}', not of the live $BEFORE_ID — taking a new one (read-only GETs)"
  else say "  snapshot missing — taking it now (read-only GETs; writes only the local file)"; fi
  say "+ ${CMD2a[*]}"
  mkdir -p "$B10"
  "${CMD2a[@]}" || stop "the read-only snapshot of live prod failed — see $B10/prod-snapshot/"
  { echo "deployment_id=$BEFORE_ID"; echo "source=$BEFORE_SRC"; echo "main_chunk=$BEFORE_MAIN"; echo "taken_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"; } > "$NIGHT_META"
fi
CMD2=(timeout 900 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/pre" --label prod-pre-ship --checks compare --snapshot "$NIGHT_SNAP")
CMD2b=(timeout 600 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/pre" --label prod-pre-snapshot --checks snapshot --snapshot "$EV/prod-before-ship.json")
say "+ ${CMD2[*]}"
say "+ ${CMD2b[*]}"
if [ "$DRY" = 0 ]; then
  "${CMD2[@]}" || stop "live prod no longer matches $NIGHT_SNAP (someone deployed since it was taken? delete $NIGHT_SNAP and $NIGHT_META to retake it) — see $EV/pre/"
  "${CMD2b[@]}" || stop "fresh snapshot failed — see $EV/pre/"
fi

# ---------------------------------------------------------------- 3. build
say "== 3. build"
say "+ timeout 1500 npm run build:prod   > $EV/build-prod-$STAMP.log"
say "+ node --env-file=.env.production scripts/check-prod-env.mjs --dist   (prod refs only; the two CSP img-src host tokens of _headers allowed)"
say "+ node scripts/check-no-localhost-dist.mjs dist"
say "+ staging ref '$STAGING_REF' nowhere in dist except as the exact CSP img-src host token in dist/_headers"
say "+ dist/_headers Content-Security-Policy img-src contains $PROD_IMG_HOST"
# dist/_headers lists BOTH Supabase storage hosts in the CSP img-src (DECISIONS 8). Strip exactly those two
# host tokens from the Content-Security-Policy line only; any other mention of the staging ref refuses.
staging_refs_in_dist() {
  local hits
  hits="$(grep -rls "$STAGING_REF" dist 2>/dev/null | grep -v '^dist/_headers$' || true)"
  [ -z "$hits" ] || { say "  staging ref in: $(head -5 <<<"$hits" | tr '\n' ' ')"; return 1; }
  if [ -f dist/_headers ] && sed -E "/^[[:space:]]*[Cc]ontent-[Ss]ecurity-[Pp]olicy:/ s#https://($STAGING_REF|$PROD_REF)\\.supabase\\.co([[:space:];]|\$)#\\2#g" dist/_headers | grep -q "$STAGING_REF"; then
    say "  staging ref in dist/_headers outside the CSP img-src host token"; return 1
  fi
  return 0
}
csp_img_src_has_prod() { # stdin: header text -> 0 if the CSP img-src directive lists the prod storage host
  tr -d '\r' | grep -i '^[[:space:]]*content-security-policy:' | head -1 | tr ';' '\n' | grep -E '^[[:space:]]*img-src[[:space:]]' | grep -qF "$PROD_IMG_HOST"
}
if [ "$DRY" = 0 ]; then
  timeout 1500 npm run build:prod > "$EV/build-prod-$STAMP.log" 2>&1 || stop "npm run build:prod failed — see $EV/build-prod-$STAMP.log (nothing deployed)"
  grep -q "Prerendered 268/268" "$EV/build-prod-$STAMP.log" || stop "prerender did not report 268/268 routes — see the build log"
  BAD="$(find dist \( -name '.dev.vars' -o -name '.env*' -o -name '*.apk' -o -name '*.aab' -o -name '*.jks' -o -name '*.keystore' -o -path 'dist/android*' \) | head -5)"
  [ -z "$BAD" ] || stop "dist contains files that must never ship: $BAD"
  node --env-file=.env.production scripts/check-prod-env.mjs --dist || stop "prod dist guard refused (see above; nothing deployed)"
  node scripts/check-no-localhost-dist.mjs dist || stop "dist contains localhost links (see above; nothing deployed)"
  staging_refs_in_dist || stop "dist references the STAGING Supabase project (nothing deployed)"
  csp_img_src_has_prod < dist/_headers || stop "dist/_headers CSP img-src does not list $PROD_IMG_HOST (listing photos would be blocked; nothing deployed)"
  [ -f dist/_routes.json ] || stop "dist/_routes.json missing (functions would run on every path)"
fi
NEW_MAIN="$( [ -f dist/index.html ] && grep -o '/assets/index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1 )"
if [ "$DRY" = 1 ]; then say "main chunk of the dist folder as it is now (a real run rebuilds it first): ${NEW_MAIN:-no dist}"; else say "new main chunk (from dist/index.html): ${NEW_MAIN:-unknown}"; fi
# Without the new main chunk name the "is the new build live?" checks below would pass on anything.
[ "$DRY" = 1 ] || [ -n "$NEW_MAIN" ] || stop "could not read the main chunk name from dist/index.html (nothing deployed)"
# The lazy chunks of this build (bundle markers, checked again after the deploy).
GUIDE_CHUNKS=(); LIVE_CHUNKS=(); SIGNUP_CHUNKS=(); BADGE_CHUNKS=(); LISTING_CHUNKS=()
if [ -d dist/assets ]; then
  for a in dist/assets/GuideHub-*.js dist/assets/GuideDemoPage-*.js; do [ -f "$a" ] && GUIDE_CHUNKS+=("/${a#dist/}"); done
  for a in dist/assets/LiveStage-*.js; do [ -f "$a" ] && LIVE_CHUNKS+=("/${a#dist/}"); done
  while IFS= read -r a; do [ -n "$a" ] && SIGNUP_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$SIGNUP_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && BADGE_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$BADGE_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && LISTING_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$LISTING_MARKER" dist/assets/*.js 2>/dev/null | head -3)
fi
say "guide chunks in dist: ${GUIDE_CHUNKS[*]:-none}"
say "LiveStage chunk in dist (must be none in 10F): ${LIVE_CHUNKS[*]:-none}"
say "chunk(s) calling $SIGNUP_MARKER in dist: ${SIGNUP_CHUNKS[*]:-none}"
say "chunk(s) holding the /msp badge ($BADGE_MARKER) in dist: ${BADGE_CHUNKS[*]:-none}"
say "chunk(s) calling $LISTING_MARKER (10G seller delete / disable) in dist: ${LISTING_CHUNKS[*]:-none}"
# dist markers: a real run stops on any miss; the dry run reports them for the dist folder as it is now.
dist_markers() {
  local miss=0 a
  [ ${#GUIDE_CHUNKS[@]} -ge 2 ] || { say "  MISSING: GuideHub/GuideDemoPage chunks (the 10C guide is not in this build)"; miss=1; }
  for a in "${GUIDE_CHUNKS[@]}"; do grep -q "$GUIDE_MARKER" "dist$a" || { say "  MISSING: $GUIDE_MARKER in dist$a"; miss=1; }; done
  [ ${#LIVE_CHUNKS[@]} -eq 0 ] || { say "  STILL THERE: ${LIVE_CHUNKS[*]} (the removed 10D live hero stage)"; miss=1; }
  [ ${#SIGNUP_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $SIGNUP_MARKER (the 10E phone-only sign-up)"; miss=1; }
  [ ${#BADGE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $BADGE_MARKER (the 10F /msp last-price badge)"; miss=1; }
  [ ${#LISTING_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $LISTING_MARKER (the 10G seller delete / disable)"; miss=1; }
  for a in "$HOME_MARKER" "${HERO_MARKERS[@]}"; do
    grep -q "$a" dist/index.html 2>/dev/null && say "  dist/index.html has $a" || { say "  MISSING: $a in dist/index.html"; miss=1; }
  done
  for a in "${REMOVED_MARKERS[@]}"; do
    grep -q "$a" dist/index.html 2>/dev/null && { say "  STILL THERE: $a in dist/index.html (removed in 10F)"; miss=1; } || say "  dist/index.html has no $a (removed in 10F)"
  done
  grep -q "$BADGE_MARKER" dist/msp/index.html 2>/dev/null && say "  dist/msp/index.html has $BADGE_MARKER" || { say "  MISSING: $BADGE_MARKER in dist/msp/index.html"; miss=1; }
  return $miss
}
say "+ dist markers: $HOME_MARKER + ${HERO_MARKERS[*]} in dist/index.html, none of ${REMOVED_MARKERS[*]}; no LiveStage-*.js; $BADGE_MARKER in dist/msp/index.html and a chunk; guide chunks hold '$GUIDE_MARKER'; a chunk holds '$SIGNUP_MARKER'"
if [ "$DRY" = 0 ]; then
  dist_markers || stop "the new build is missing a Batch 10C/10E/10F/10G marker or still has a removed 10D hero part (see above; nothing deployed)"
else
  if [ -f dist/index.html ]; then
    dist_markers && say "  (dist as it is now carries every marker; a real run checks the fresh build again)" \
                 || say "  (note: dist as it is now misses a marker; a real run rebuilds first and stops if the fresh build misses one)"
    say "  (dist as it is now may be a STAGING build; the prod-only dist checks — prod guard, staging refs, CSP host — run in a real run after build:prod)"
  else
    say "  (no dist folder now; a real run builds it first)"
  fi
fi

# ---------------------------------------------------------------- 3b. compare-gate sizes, before deploying
PRESIZE=(node scripts/batch10f/predeploy-size-check.mjs "$EV/prod-before-ship.json" dist --max-growth "$HOME_GROWTH" --min-ratio "$HOME_SHRINK")
REPRERENDER='node --env-file=.env.production scripts/prerender.mjs && node --env-file=.env.production scripts/gen-sitemaps.mjs && node --env-file=.env.production scripts/check-prod-env.mjs --dist && node scripts/check-no-localhost-dist.mjs dist'
say "== 3b. the compare gate's page sizes on the new dist, BEFORE deploying (a loading-state capture would fail after the deploy)"
say "+ ${PRESIZE[*]}"
say "  on a failure: re-run the prerender (max 2 times): $REPRERENDER"
if [ "$DRY" = 0 ]; then
  SIZE_OK=0
  for attempt in 1 2 3; do
    if "${PRESIZE[@]}" 2>&1 | tee "$EV/predeploy-size-$STAMP-$attempt.txt"; [ "${PIPESTATUS[0]}" = 0 ]; then SIZE_OK=1; break; fi
    [ "$attempt" = 3 ] && break
    say "  a page is outside the compare limits (prerender captured it while loading?) — re-running the prerender (attempt $attempt of 2)"
    timeout 1500 bash -c "$REPRERENDER" > "$EV/reprerender-$STAMP-$attempt.log" 2>&1 || stop "the prerender re-run failed — see $EV/reprerender-$STAMP-$attempt.log (nothing deployed)"
    grep -q "Prerendered 268/268" "$EV/reprerender-$STAMP-$attempt.log" || stop "the prerender re-run did not report 268/268 (nothing deployed)"
    NEW_MAIN2="$(grep -o '/assets/index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1)"
    [ "$NEW_MAIN2" = "$NEW_MAIN" ] || stop "the main chunk changed during the prerender re-run ($NEW_MAIN -> $NEW_MAIN2; nothing deployed)"
    node scripts/check-no-localhost-dist.mjs dist || stop "dist contains localhost links after the prerender re-run (nothing deployed)"
    dist_markers || stop "a marker is missing after the prerender re-run (nothing deployed)"
  done
  [ "$SIZE_OK" = 1 ] || stop "after 2 prerender re-runs a page is still outside the compare-gate size limits (see $EV/predeploy-size-$STAMP-*.txt). Nothing deployed. Run the ship again later; if it repeats, send the files to the builder."
elif [ -f dist/index.html ] && [ -s "$NIGHT_SNAP" ]; then
  say "  (dry run, informational only: dist as it is now may be a STAGING build, compared with $NIGHT_SNAP)"
  node scripts/batch10f/predeploy-size-check.mjs "$NIGHT_SNAP" dist --max-growth "$HOME_GROWTH" --min-ratio "$HOME_SHRINK" | sed 's/^/    [info] /' || true
fi

# ---------------------------------------------------------------- 4-7. deploy, gates, rollback
GATES=(timeout 1500 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/after" --label prod-after --checks pages,compare,cors,functions,static,sw,data --snapshot "$EV/prod-before-ship.json" --max-growth "$HOME_GROWTH" --min-ratio "$HOME_SHRINK")
DEPLOY=(timeout 900 npx wrangler pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true)
# 10F routes: plain read-only GETs; redirects are followed (Cloudflare Pages 308s /guide -> /guide/; a
# logged-out /post may end on the login page), and the final answer must be 200 and serve the new main
# chunk. Then the 10F hero markers (and none of the removed 10D ones), the /msp badge, the 10C markers,
# the 10E sign-up chunk, and the photo CSP header.
check_routes_10g() {
  local p code body ok=0 a m hdr
  for p in "${ROUTES_10F[@]}"; do
    body="$(timeout 60 curl -sL --max-redirs 5 -w '\n%{http_code}' "$SITE$p?ks_ship=$STAMP")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$NEW_MAIN" <<<"$body"; then
      say "PASS  [10f_routes] GET $p -> 200, serves $NEW_MAIN"
    else
      say "FAIL  [10f_routes] GET $p -> $code (new main chunk $NEW_MAIN present: $(grep -q "$NEW_MAIN" <<<"$body" && echo yes || echo no))"
      ok=1
    fi
  done
  body="$(timeout 60 curl -sL --max-redirs 5 "$SITE/?ks_ship=$STAMP-home")"
  for m in "$HOME_MARKER" "${HERO_MARKERS[@]}"; do
    if grep -q "$m" <<<"$body"; then say "PASS  [10f_home] / has $m"; else say "FAIL  [10f_home] / has no $m"; ok=1; fi
  done
  for m in "${REMOVED_MARKERS[@]}"; do
    if grep -q "$m" <<<"$body"; then say "FAIL  [10f_home] / still has $m (removed in 10F)"; ok=1; else say "PASS  [10f_home] / has no $m (removed in 10F)"; fi
  done
  body="$(timeout 60 curl -sL --max-redirs 5 -w '\n%{http_code}' "$SITE/msp?ks_ship=$STAMP-msp")"
  code="${body##*$'\n'}"
  if [ "$code" = "200" ] && grep -q "$NEW_MAIN" <<<"$body" && grep -q "$BADGE_MARKER" <<<"$body"; then
    say "PASS  [10f_msp] GET /msp -> 200, new main chunk, has $BADGE_MARKER"
  else
    say "FAIL  [10f_msp] GET /msp -> $code (new main chunk: $(grep -q "$NEW_MAIN" <<<"$body" && echo yes || echo no), $BADGE_MARKER: $(grep -q "$BADGE_MARKER" <<<"$body" && echo yes || echo no))"
    ok=1
  fi
  [ ${#BADGE_CHUNKS[@]} -gt 0 ] || { say "FAIL  [10f_msp] no chunk holding $BADGE_MARKER found in dist"; ok=1; }
  [ ${#LISTING_CHUNKS[@]} -gt 0 ] || { say "FAIL  [10g_listing] no chunk calling $LISTING_MARKER found in dist"; ok=1; }
  for a in "${LISTING_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$LISTING_MARKER" <<<"$body"; then say "PASS  [10g_listing] GET $a -> 200, holds $LISTING_MARKER"; else say "FAIL  [10g_listing] GET $a -> $code"; ok=1; fi
  done
  for a in "${BADGE_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$BADGE_MARKER" <<<"$body"; then say "PASS  [10f_msp] GET $a -> 200, holds $BADGE_MARKER"; else say "FAIL  [10f_msp] GET $a -> $code"; ok=1; fi
  done
  [ ${#GUIDE_CHUNKS[@]} -gt 0 ] || { say "FAIL  [10c_markers] no guide chunk names found in dist"; ok=1; }
  for a in "${GUIDE_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$GUIDE_MARKER" <<<"$body"; then
      say "PASS  [10c_markers] GET $a -> 200, holds $GUIDE_MARKER"
    else
      say "FAIL  [10c_markers] GET $a -> $code (marker $GUIDE_MARKER present: $(grep -q "$GUIDE_MARKER" <<<"$body" && echo yes || echo no))"
      ok=1
    fi
  done
  [ ${#SIGNUP_CHUNKS[@]} -gt 0 ] || { say "FAIL  [10e_markers] no chunk calling $SIGNUP_MARKER found in dist"; ok=1; }
  for a in "${SIGNUP_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$SIGNUP_MARKER" <<<"$body"; then
      say "PASS  [10e_markers] GET $a -> 200, holds $SIGNUP_MARKER"
    else
      say "FAIL  [10e_markers] GET $a -> $code (marker $SIGNUP_MARKER present: $(grep -q "$SIGNUP_MARKER" <<<"$body" && echo yes || echo no))"
      ok=1
    fi
  done
  hdr="$(timeout 60 curl -sI "$SITE/?ks_ship=$STAMP-csp")"
  if csp_img_src_has_prod <<<"$hdr"; then
    say "PASS  [10e_csp] GET / Content-Security-Policy img-src contains $PROD_IMG_HOST"
  else
    say "FAIL  [10e_csp] GET / Content-Security-Policy img-src does not contain $PROD_IMG_HOST (listing photos blocked)"
    ok=1
  fi
  return $ok
}
say "== 4. deploy"
say "+ ${DEPLOY[*]}   > $EV/deploy-$STAMP.log"
say "== 5. wait until $SITE/ serves the new main chunk (max 5 min)"
say "== 6. prod gates (read-only; the verifier refuses any POST/sign-up on production)"
say "+ ${GATES[*]}"
say "+ GET $SITE{$(IFS=,; echo "${ROUTES_10F[*]}")} -> 200 + new main chunk   (read-only, redirects followed)"
say "+ GET / -> '$HOME_MARKER' + the 10F hero markers, none of the removed 10D ones; GET /msp -> '$BADGE_MARKER'; GET badge chunk; GET guide chunks -> 200 + '$GUIDE_MARKER'; GET sign-up chunk -> 200 + '$SIGNUP_MARKER'   (read-only)"
say "+ curl -sI $SITE/ -> Content-Security-Policy img-src contains $PROD_IMG_HOST"
say "== 7. on any failure: bash scripts/rollback-prod-10g.sh $BEFORE_ID"
if [ "$DRY" = 1 ]; then
  say "+ (read-only check that the rollback path works)"
  bash scripts/rollback-prod-10g.sh --dry-run "$BEFORE_ID" | sed 's/^/    [rollback dry-run] /'
  RBD="${PIPESTATUS[0]}"
  [ "$RBD" = 0 ] || stop "the rollback dry run failed (exit $RBD) — the automatic rollback would not work"
  NOTE=""
  if [ ${#PENDING[@]} -gt 0 ]; then
    NOTE="
Pending before the real run (a real run stops until these are done):"
    for p in "${PENDING[@]}"; do NOTE="$NOTE
  - $p"; done
  fi
  loud "A real run would ship $(git rev-parse --short HEAD) to $SITE,
replacing deployment $BEFORE_ID (source $BEFORE_SRC; ${LIVE_IS:-NOT an expected deployment}).
Undo after a ship:  bash scripts/rollback-prod-10g.sh $BEFORE_ID
Nothing was changed.$NOTE"
  SUFFIX=""; [ ${#PENDING[@]} -eq 0 ] || SUFFIX=" (${#PENDING[@]} pending)"
  say "DRY RUN OK$SUFFIX"
  exit 0
fi

FAIL=""
"${DEPLOY[@]}" > "$EV/deploy-$STAMP.log" 2>&1 || FAIL="wrangler deploy failed (see $EV/deploy-$STAMP.log)"
AFTER_ID=""
if [ -z "$FAIL" ]; then
  for i in $(seq 1 30); do
    LIVE_MAIN="$(timeout 60 curl -s "$SITE/?ks_ship=$STAMP-$i" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
    [ "$LIVE_MAIN" = "$NEW_MAIN" ] && break
    sleep 10
  done
  AFTER_ID="$(api GET "" | jget 'j.result.canonical_deployment.id')"
  say "live now: deployment $AFTER_ID, main chunk $LIVE_MAIN"
  echo "deployment_id=$AFTER_ID" > "$EV/prod-deployment-after.txt"
  [ "$LIVE_MAIN" = "$NEW_MAIN" ] || FAIL="the site does not serve the new build after 5 min (live $LIVE_MAIN, expected $NEW_MAIN)"
fi
if [ -z "$FAIL" ]; then
  "${GATES[@]}" 2>&1 | tee "$EV/prod-gates-$STAMP.txt"
  [ "${PIPESTATUS[0]}" = 0 ] || FAIL="a prod gate failed (see $EV/prod-gates-$STAMP.txt)"
fi
if [ -z "$FAIL" ]; then
  check_routes_10g 2>&1 | tee -a "$EV/prod-gates-$STAMP.txt"
  [ "${PIPESTATUS[0]}" = 0 ] || FAIL="a Batch 10F/10G route, marker or CSP check failed (see $EV/prod-gates-$STAMP.txt)"
fi

if [ -z "$FAIL" ]; then
  loud "SHIP OK: kissansahyog.com now runs $(git rev-parse --short HEAD) (deployment $AFTER_ID).
All read-only prod gates passed. Report: $EV/prod-gates-$STAMP.txt
Previous deployment (rollback target): $BEFORE_ID ($LIVE_IS)
NEXT: if not done yet, paste the 10E mandi history backfill (docs/review/batch10g/SHIP.md step 6), then BATCH10G_CLOSE_PROMPT.md.
If anything looks wrong later:  bash scripts/rollback-prod-10g.sh $BEFORE_ID"
  exit 0
fi

loud "SHIP FAILED: $FAIL
ROLLING BACK AUTOMATICALLY to deployment $BEFORE_ID (source $BEFORE_SRC)…"
bash scripts/rollback-prod-10g.sh "$BEFORE_ID"
RB=$?
if [ $RB -eq 0 ]; then
  loud "RESULT: the new version was NOT kept. kissansahyog.com is back on the previous version ($BEFORE_ID) and its page check passed.
Why it failed: $FAIL
If the 10E mandi backfill is not pasted yet: do NOT paste it until a ship with the paged /msp reads succeeds."
else
  loud "RESULT: SHIP FAILED AND THE AUTOMATIC ROLLBACK DID NOT CONFIRM (exit $RB).
Do this now: Cloudflare dashboard -> Workers & Pages -> $PROJECT -> Deployments -> $BEFORE_ID -> Rollback.
Why the ship failed: $FAIL"
fi
exit 1
