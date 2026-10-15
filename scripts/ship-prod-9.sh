#!/usr/bin/env bash
# Batch 9 — ship branch release-9 to PRODUCTION (kissansahyog.com = Pages project kissansahyog-prod),
# check it with read-only gates, and roll back by itself if any gate fails.
#
#   bash scripts/ship-prod-9.sh --dry-run   # validate preconditions + print every command; changes nothing
#   bash scripts/ship-prod-9.sh             # the real ship (founder runs this in the morning)
#
# Steps (real run):
#   0  preconditions: on release-9, no modified tracked files that ship (see ALLOW_DIRTY), tag pre-9-ship
#      exists locally and on origin, HEAD is pushed (= origin/release-9), .env.production present,
#      wrangler logged in, Cloudflare API reachable with pages access (needed for the rollback)
#   1  record the live prod deployment id (read-only `wrangler pages deployment list` + API)
#   2  read-only: live prod still matches the night snapshot prod-before.json; take a fresh snapshot
#   3  npm run build:prod (env guard + prerender + sitemaps + dist guard); dist sanity checks
#   4  deploy: npx wrangler pages deploy dist --project-name kissansahyog-prod --branch main --commit-dirty=true
#      (the documented prod command, PREFLIGHT.md 0.2 / ~/ship-prod.sh line 27)
#   5  wait until kissansahyog.com serves the new build
#   6  prod gates, READ-ONLY (no sign-up, no feedback POST, browser writes aborted):
#      pages + compare (prod-before) + cors + functions + static + sw + data
#   7  any failure in 4-6 -> scripts/rollback-prod-9.sh <recorded id> (Cloudflare Pages rollback),
#      which re-runs gate (a); the verdict is printed in a box at the end.
# Never touches git history, never pushes, never writes to any database.
set -uo pipefail

PROJECT="kissansahyog-prod"
SITE="https://kissansahyog.com"
BRANCH="release-9"
TAG="pre-9-ship"
ACCOUNT_ID="${CF_ACCOUNT_ID:-9ad1ef464c60a7db797b4bb097d545e5}"
API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
P4="$ROOT/docs/review/batch9/evidence/phase4"
EV="$P4/prod-ship"
NIGHT_SNAP="$P4/prod-before.json"
STAMP="$(date +%Y%m%d-%H%M%S)"
# Modified tracked files that may stay dirty: build output rewritten by every build (~/ship-prod.sh
# excludes it too) and review documents (docs/ is not part of dist). Anything else dirty -> STOP.
ALLOW_DIRTY='^(public/search-index\.json|docs/review/.*)$'

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,26p "$0"; exit 0 ;;
    *) echo "unknown argument: $a"; exit 2 ;;
  esac
done

say()  { printf '%s\n' "$*"; }
loud() { printf '\n##################################################################\n%s\n##################################################################\n' "$*"; }
stop() { loud "SHIP STOPPED BEFORE ANY CHANGE TO PRODUCTION: $*"; exit 1; }
cd "$ROOT" || exit 1
[ "$DRY" = 1 ] && say "*** DRY RUN — nothing will be built, deployed, rolled back or written ***"

# ---------------------------------------------------------------- 0. preconditions (read-only)
say "== 0. preconditions"
CURB="$(git branch --show-current)"
say "+ git branch --show-current -> $CURB"
[ "$CURB" = "$BRANCH" ] || stop "not on branch $BRANCH (on '$CURB'): git checkout $BRANCH"
DIRTY="$(git status --porcelain --untracked-files=no | sed 's/^...//' | grep -Ev "$ALLOW_DIRTY" || true)"
say "+ git status --porcelain --untracked-files=no  (allowed to be dirty: public/search-index.json, docs/review/**)"
[ -z "$DIRTY" ] || stop "modified tracked files would change what ships:
$DIRTY"
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null || stop "tag $TAG missing locally"
say "+ git rev-parse $TAG -> $(git rev-parse --short "$TAG^{commit}")"
REMOTE_TAG="$(timeout 120 git ls-remote --tags origin "refs/tags/$TAG" 2>/dev/null | awk '{print $1}')"
say "+ git ls-remote --tags origin $TAG -> ${REMOTE_TAG:0:7}"
[ -n "$REMOTE_TAG" ] || stop "tag $TAG is not on origin"
HEAD_SHA="$(git rev-parse HEAD)"
REMOTE_HEAD="$(timeout 120 git ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | awk '{print $1}')"
say "+ HEAD ${HEAD_SHA:0:7}  origin/$BRANCH ${REMOTE_HEAD:0:7}"
[ "$HEAD_SHA" = "$REMOTE_HEAD" ] || stop "HEAD is not what origin/$BRANCH has (push it first, or pull) — prod must ship a pushed commit"
[ -f .env.production ] || stop ".env.production missing (the prod build needs it)"
[ -s "$NIGHT_SNAP" ] || stop "$NIGHT_SNAP missing"
command -v node >/dev/null && command -v npx >/dev/null && command -v curl >/dev/null || stop "node / npx / curl not found"

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
say "+ GET $API   (Authorization: Bearer <token, not shown>)"
PROJ="$(api GET "")"
[ "$(printf '%s' "$PROJ" | jget 'j.success')" = "true" ] || stop "Cloudflare API refused the project read — the automatic rollback would not work: $(printf '%s' "$PROJ" | jget 'j.errors')"
BEFORE_ID="$(printf '%s' "$PROJ" | jget 'j.result.canonical_deployment.id')"
BEFORE_SRC="$(printf '%s' "$PROJ" | jget '(j.result.canonical_deployment.deployment_trigger.metadata.commit_hash||"").slice(0,7)')"
[[ "$BEFORE_ID" =~ ^[0-9a-f-]{36}$ ]] || stop "could not read the live deployment id"
printf '%s\n' "$LIST" | grep -q "$BEFORE_ID" || stop "API live id $BEFORE_ID is not in the wrangler deployment list"
BEFORE_MAIN="$(timeout 60 curl -s "$SITE/?ks_ship=$STAMP" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
say "live now: deployment $BEFORE_ID (source $BEFORE_SRC), main chunk $BEFORE_MAIN"
if [ "$DRY" = 0 ]; then
  mkdir -p "$EV"
  { echo "deployment_id=$BEFORE_ID"; echo "source=$BEFORE_SRC"; echo "main_chunk=$BEFORE_MAIN"; echo "recorded_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"; echo "shipping=$HEAD_SHA"; } > "$EV/prod-deployment-before.txt"
  printf '%s\n' "$LIST" > "$EV/prod-deployments-before-ship.txt"
else
  say "+ (would write) $EV/prod-deployment-before.txt  deployment_id=$BEFORE_ID"
fi

# ---------------------------------------------------------------- 2. live prod vs night snapshot
say "== 2. read-only: live prod still matches the night snapshot; fresh snapshot"
CMD2=(timeout 900 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/pre" --label prod-pre-ship --checks compare --snapshot "$NIGHT_SNAP")
CMD2b=(timeout 600 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/pre" --label prod-pre-snapshot --checks snapshot --snapshot "$EV/prod-before-ship.json")
say "+ ${CMD2[*]}"
say "+ ${CMD2b[*]}"
if [ "$DRY" = 0 ]; then
  "${CMD2[@]}" || stop "live prod no longer matches $NIGHT_SNAP (someone deployed since the night?) — see $EV/pre/"
  "${CMD2b[@]}" || stop "fresh snapshot failed — see $EV/pre/"
fi

# ---------------------------------------------------------------- 3. build
say "== 3. build"
say "+ timeout 1500 npm run build:prod   > $EV/build-prod-$STAMP.log"
if [ "$DRY" = 0 ]; then
  timeout 1500 npm run build:prod > "$EV/build-prod-$STAMP.log" 2>&1 || stop "npm run build:prod failed — see $EV/build-prod-$STAMP.log (nothing deployed)"
  grep -q "Prerendered 263/263" "$EV/build-prod-$STAMP.log" || stop "prerender did not report 263/263 routes — see the build log"
  BAD="$(find dist \( -name '.dev.vars' -o -name '.env*' -o -name '*.apk' -o -name '*.aab' -o -name '*.jks' -o -name '*.keystore' -o -path 'dist/android*' \) | head -5)"
  [ -z "$BAD" ] || stop "dist contains files that must never ship: $BAD"
  ! grep -rqs "wzxtqbqlahyahsnoqqva" dist || stop "dist references the STAGING Supabase project"
  [ -f dist/_routes.json ] || stop "dist/_routes.json missing (functions would run on every path)"
fi
NEW_MAIN="$( [ -f dist/index.html ] && grep -o '/assets/index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1 )"
if [ "$DRY" = 1 ]; then say "main chunk of the dist folder as it is now (a real run rebuilds it first): ${NEW_MAIN:-no dist}"; else say "new main chunk (from dist/index.html): ${NEW_MAIN:-unknown}"; fi

# ---------------------------------------------------------------- 4-7. deploy, gates, rollback
GATES=(timeout 1500 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/after" --label prod-after --checks pages,compare,cors,functions,static,sw,data --snapshot "$EV/prod-before-ship.json")
DEPLOY=(timeout 900 npx wrangler pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true)
say "== 4. deploy"
say "+ ${DEPLOY[*]}   > $EV/deploy-$STAMP.log"
say "== 5. wait until $SITE/ serves the new main chunk (max 5 min)"
say "== 6. prod gates (read-only; the script refuses any POST/sign-up on production)"
say "+ ${GATES[*]}"
say "== 7. on any failure: bash scripts/rollback-prod-9.sh $BEFORE_ID"
if [ "$DRY" = 1 ]; then
  say "+ (read-only check that the rollback path works)"
  bash scripts/rollback-prod-9.sh --dry-run "$BEFORE_ID" | sed 's/^/    [rollback dry-run] /'
  loud "DRY RUN OK — all preconditions valid. A real run would ship $(git rev-parse --short HEAD) to $SITE,
replacing deployment $BEFORE_ID (source $BEFORE_SRC). Nothing was changed."
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
  loud "SHIP OK: kissansahyog.com now runs $(git rev-parse --short HEAD) (deployment $AFTER_ID).
All read-only prod gates passed. Report: $EV/prod-gates-$STAMP.txt
If anything looks wrong later:  bash scripts/rollback-prod-9.sh $BEFORE_ID"
  exit 0
fi

loud "SHIP FAILED: $FAIL
ROLLING BACK AUTOMATICALLY to deployment $BEFORE_ID (source $BEFORE_SRC)…"
bash scripts/rollback-prod-9.sh "$BEFORE_ID"
RB=$?
if [ $RB -eq 0 ]; then
  loud "RESULT: the new version was NOT kept. kissansahyog.com is back on the previous version ($BEFORE_ID) and its page check passed.
Why it failed: $FAIL"
else
  loud "RESULT: SHIP FAILED AND THE AUTOMATIC ROLLBACK DID NOT CONFIRM (exit $RB).
Do this now: Cloudflare dashboard -> Workers & Pages -> $PROJECT -> Deployments -> $BEFORE_ID -> Rollback.
Why the ship failed: $FAIL"
fi
exit 1
