#!/usr/bin/env bash
# Batch 10C — ship branch release-10c to PRODUCTION (kissansahyog.com = Pages project kissansahyog-prod),
# check it with read-only gates, and roll back by itself if any gate fails.
# Same structure as scripts/ship-prod-9.sh; Batch 10C has NO database step (no migrations).
#
#   bash scripts/ship-prod-10c.sh --dry-run   # validate preconditions + print every command; changes nothing
#   bash scripts/ship-prod-10c.sh             # the real ship (founder runs this)
#
# Steps (real run):
#   0  preconditions: on release-10c, no modified tracked files that ship (see ALLOW_DIRTY), tag
#      pre-10c-ship exists locally and on origin, HEAD is pushed (= origin/release-10c), .env.production
#      present, the prod snapshot docs/review/batch10c/evidence/prod-before.json present, wrangler logged
#      in, Cloudflare API reachable with pages access (needed for the rollback)
#   1  record the live prod deployment id (read-only `wrangler pages deployment list` + API). It must be
#      the expected one (0845c733-…, Batch 10A) — a real run STOPS if it is not (dry run: warning only);
#      after checking, override with KS_EXPECT_LIVE_ID=<live id>
#   2  read-only: live prod still matches the snapshot prod-before.json; take a fresh snapshot
#   3  npm run build:prod (env guard + prerender + sitemaps + dist guard); dist sanity checks
#   4  deploy: npx wrangler pages deploy dist --project-name kissansahyog-prod --branch main --commit-dirty=true
#   5  wait until kissansahyog.com serves the new build
#   6  prod gates, READ-ONLY (no sign-up, no post, no feedback POST, browser writes aborted):
#      pages + compare (prod-before-ship) + cors + functions + static + sw + data,
#      then 10C routes / /signup /browse /guide /guide/{register,post,find,tour} answer 200 with the new
#      build (plain GETs), the guide chunks (GuideHub-*.js, GuideDemoPage-*.js) are served with the guide
#      code in them (marker "ksg-"), and / carries the new top-bar Guide pill (marker nav-guide)
#   7  any failure in 4-6 -> scripts/rollback-prod-10c.sh <recorded id> (Cloudflare Pages rollback),
#      which re-runs gate (a); the verdict is printed in a box at the end.
# Never touches git history, never pushes, never writes to any database.
set -uo pipefail

PROJECT="kissansahyog-prod"
SITE="https://kissansahyog.com"
BRANCH="release-10c"
TAG="pre-10c-ship"
EXPECT_LIVE_ID="${KS_EXPECT_LIVE_ID:-0845c733-e8d0-4553-957c-10f3db23ecca}"   # prod since 2026-10-17 18:28 (source 17d77e8, Batch 10A)
ACCOUNT_ID="${CF_ACCOUNT_ID:-9ad1ef464c60a7db797b4bb097d545e5}"
API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
B10="$ROOT/docs/review/batch10c/evidence"
EV="$B10/prod-ship"
NIGHT_SNAP="$B10/prod-before.json"   # read-only snapshot of live prod taken while preparing Batch 10C
STAMP="$(date +%Y%m%d-%H%M%S)"
# Modified tracked files that may stay dirty: build output rewritten by every build (~/ship-prod.sh
# excludes it too) and review documents (docs/ is not part of dist). Anything else dirty -> STOP.
ALLOW_DIRTY='^(public/search-index\.json|docs/review/.*)$'
ROUTES_10C=(/ /signup /browse /guide /guide/register /guide/post /guide/find /guide/tour)
# Bundle markers: the lazy guide chunks must be served and hold the guide code; / must have the nav pill.
GUIDE_MARKER='ksg-'
HOME_MARKER='nav-guide'

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
REMOTE_TAG="$(timeout 120 git ls-remote --tags origin "refs/tags/$TAG^{}" "refs/tags/$TAG" 2>/dev/null | sort -k2 -r | head -1 | awk '{print $1}')"
say "+ git ls-remote --tags origin $TAG (peeled) -> ${REMOTE_TAG:0:7}"
[ -n "$REMOTE_TAG" ] || stop "tag $TAG is not on origin"
[ "$REMOTE_TAG" = "$(git rev-parse "$TAG^{commit}")" ] || stop "tag $TAG on origin points somewhere else than the local tag"
HEAD_SHA="$(git rev-parse HEAD)"
REMOTE_HEAD="$(timeout 120 git ls-remote origin "refs/heads/$BRANCH" 2>/dev/null | awk '{print $1}')"
say "+ HEAD ${HEAD_SHA:0:7}  origin/$BRANCH ${REMOTE_HEAD:0:7}"
[ "$HEAD_SHA" = "$REMOTE_HEAD" ] || stop "HEAD is not what origin/$BRANCH has (push it first, or pull) — prod must ship a pushed commit"
[ -f .env.production ] || stop ".env.production missing (the prod build needs it)"
[ -s "$NIGHT_SNAP" ] || stop "$NIGHT_SNAP missing"
command -v node >/dev/null && command -v npx >/dev/null && command -v curl >/dev/null || stop "node / npx / curl not found"
say "  (Batch 10C has no database change: no migration step)"

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
grep -q "$BEFORE_ID" <<<"$LIST" || stop "API live id $BEFORE_ID is not in the wrangler deployment list"
BEFORE_MAIN="$(timeout 60 curl -s "$SITE/?ks_ship=$STAMP" | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
say "live now: deployment $BEFORE_ID (source $BEFORE_SRC), main chunk $BEFORE_MAIN"
if [ "$BEFORE_ID" != "$EXPECT_LIVE_ID" ]; then
  MSG="the live deployment is $BEFORE_ID (source $BEFORE_SRC), not the expected $EXPECT_LIVE_ID — someone deployed or rolled back since Batch 10C was prepared, and prod-before.json may describe another version.
Check the Cloudflare dashboard; if this live version is the right one to replace, run again with:  KS_EXPECT_LIVE_ID=$BEFORE_ID bash scripts/ship-prod-10c.sh"
  if [ "$DRY" = 1 ]; then say "WARNING (a real run would STOP here): $MSG"; else stop "$MSG"; fi
else
  say "  = the expected live deployment ($EXPECT_LIVE_ID)"
fi
if [ "$DRY" = 0 ]; then
  mkdir -p "$EV"
  { echo "deployment_id=$BEFORE_ID"; echo "source=$BEFORE_SRC"; echo "main_chunk=$BEFORE_MAIN"; echo "recorded_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"; echo "shipping=$HEAD_SHA"; } > "$EV/prod-deployment-before.txt"
  printf '%s\n' "$LIST" > "$EV/prod-deployments-before-ship.txt"
else
  say "+ (would write) $EV/prod-deployment-before.txt  deployment_id=$BEFORE_ID"
fi

# ---------------------------------------------------------------- 2. live prod vs snapshot
say "== 2. read-only: live prod still matches the snapshot $NIGHT_SNAP; fresh snapshot"
CMD2=(timeout 900 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/pre" --label prod-pre-ship --checks compare --snapshot "$NIGHT_SNAP")
CMD2b=(timeout 600 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/pre" --label prod-pre-snapshot --checks snapshot --snapshot "$EV/prod-before-ship.json")
say "+ ${CMD2[*]}"
say "+ ${CMD2b[*]}"
if [ "$DRY" = 0 ]; then
  "${CMD2[@]}" || stop "live prod no longer matches $NIGHT_SNAP (someone deployed since it was taken?) — see $EV/pre/"
  "${CMD2b[@]}" || stop "fresh snapshot failed — see $EV/pre/"
fi

# ---------------------------------------------------------------- 3. build
say "== 3. build"
say "+ timeout 1500 npm run build:prod   > $EV/build-prod-$STAMP.log"
if [ "$DRY" = 0 ]; then
  timeout 1500 npm run build:prod > "$EV/build-prod-$STAMP.log" 2>&1 || stop "npm run build:prod failed — see $EV/build-prod-$STAMP.log (nothing deployed)"
  grep -q "Prerendered 268/268" "$EV/build-prod-$STAMP.log" || stop "prerender did not report 268/268 routes — see the build log"
  BAD="$(find dist \( -name '.dev.vars' -o -name '.env*' -o -name '*.apk' -o -name '*.aab' -o -name '*.jks' -o -name '*.keystore' -o -path 'dist/android*' \) | head -5)"
  [ -z "$BAD" ] || stop "dist contains files that must never ship: $BAD"
  ! grep -rqs "wzxtqbqlahyahsnoqqva" dist || stop "dist references the STAGING Supabase project"
  [ -f dist/_routes.json ] || stop "dist/_routes.json missing (functions would run on every path)"
fi
NEW_MAIN="$( [ -f dist/index.html ] && grep -o '/assets/index-[A-Za-z0-9_-]*\.js' dist/index.html | head -1 )"
if [ "$DRY" = 1 ]; then say "main chunk of the dist folder as it is now (a real run rebuilds it first): ${NEW_MAIN:-no dist}"; else say "new main chunk (from dist/index.html): ${NEW_MAIN:-unknown}"; fi
# Without the new main chunk name the "is the new build live?" checks below would pass on anything.
[ "$DRY" = 1 ] || [ -n "$NEW_MAIN" ] || stop "could not read the main chunk name from dist/index.html (nothing deployed)"
# The lazy guide chunks of this build (bundle markers, checked again after the deploy).
GUIDE_CHUNKS=()
if [ -d dist/assets ]; then
  for a in dist/assets/GuideHub-*.js dist/assets/GuideDemoPage-*.js; do [ -f "$a" ] && GUIDE_CHUNKS+=("/${a#dist/}"); done
fi
say "guide chunks in dist: ${GUIDE_CHUNKS[*]:-none}"
if [ "$DRY" = 0 ]; then
  [ ${#GUIDE_CHUNKS[@]} -ge 2 ] || stop "dist has no GuideHub/GuideDemoPage chunk — the guide is not in this build (nothing deployed)"
  for a in "${GUIDE_CHUNKS[@]}"; do grep -q "$GUIDE_MARKER" "dist$a" || stop "dist$a does not contain $GUIDE_MARKER (nothing deployed)"; done
  grep -q "$HOME_MARKER" dist/index.html || stop "dist/index.html has no $HOME_MARKER (the new nav is not prerendered; nothing deployed)"
fi

# ---------------------------------------------------------------- 4-7. deploy, gates, rollback
GATES=(timeout 1500 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/after" --label prod-after --checks pages,compare,cors,functions,static,sw,data --snapshot "$EV/prod-before-ship.json")
DEPLOY=(timeout 900 npx wrangler pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true)
# 10C routes: plain read-only GETs; redirects are followed (Cloudflare Pages 308s /guide -> /guide/), and the
# final answer must be 200 and serve the new main chunk. Then the guide
# chunks named in the new dist must be served with the guide code, and / must carry the Guide pill.
check_routes_10c() {
  local p code body ok=0 a
  for p in "${ROUTES_10C[@]}"; do
    body="$(timeout 60 curl -sL --max-redirs 5 -w '\n%{http_code}' "$SITE$p?ks_ship=$STAMP")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$NEW_MAIN" <<<"$body"; then
      say "PASS  [10c_routes] GET $p -> 200, serves $NEW_MAIN"
    else
      say "FAIL  [10c_routes] GET $p -> $code (new main chunk $NEW_MAIN present: $(grep -q "$NEW_MAIN" <<<"$body" && echo yes || echo no))"
      ok=1
    fi
  done
  body="$(timeout 60 curl -s "$SITE/?ks_ship=$STAMP-home")"
  if grep -q "$HOME_MARKER" <<<"$body"; then say "PASS  [10c_markers] / has $HOME_MARKER"; else say "FAIL  [10c_markers] / has no $HOME_MARKER"; ok=1; fi
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
  return $ok
}
say "== 4. deploy"
say "+ ${DEPLOY[*]}   > $EV/deploy-$STAMP.log"
say "== 5. wait until $SITE/ serves the new main chunk (max 5 min)"
say "== 6. prod gates (read-only; the verifier refuses any POST/sign-up on production)"
say "+ ${GATES[*]}"
say "+ GET $SITE{$(IFS=,; echo "${ROUTES_10C[*]}")} -> 200 + new main chunk   (read-only)"
say "+ GET guide chunks -> 200 + '$GUIDE_MARKER'; GET / -> '$HOME_MARKER'   (read-only)"
say "== 7. on any failure: bash scripts/rollback-prod-10c.sh $BEFORE_ID"
if [ "$DRY" = 1 ]; then
  say "+ (read-only check that the rollback path works)"
  bash scripts/rollback-prod-10c.sh --dry-run "$BEFORE_ID" | sed 's/^/    [rollback dry-run] /'
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
  check_routes_10c 2>&1 | tee -a "$EV/prod-gates-$STAMP.txt"
  [ "${PIPESTATUS[0]}" = 0 ] || FAIL="a Batch 10C route or guide marker check failed (see $EV/prod-gates-$STAMP.txt)"
fi

if [ -z "$FAIL" ]; then
  loud "SHIP OK: kissansahyog.com now runs $(git rev-parse --short HEAD) (deployment $AFTER_ID).
All read-only prod gates passed. Report: $EV/prod-gates-$STAMP.txt
If anything looks wrong later:  bash scripts/rollback-prod-10c.sh $BEFORE_ID"
  exit 0
fi

loud "SHIP FAILED: $FAIL
ROLLING BACK AUTOMATICALLY to deployment $BEFORE_ID (source $BEFORE_SRC)…"
bash scripts/rollback-prod-10c.sh "$BEFORE_ID"
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
