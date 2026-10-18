#!/usr/bin/env bash
# Batch 10D — ship branch release-10d to PRODUCTION (kissansahyog.com = Pages project kissansahyog-prod),
# check it with read-only gates, and roll back by itself if any gate fails.
# Copy of scripts/ship-prod-10c.sh with Batch 10D names; Batch 10D has NO database step (no migrations).
#
#   bash scripts/ship-prod-10d.sh --dry-run   # validate preconditions + print every command; changes nothing
#   bash scripts/ship-prod-10d.sh             # the real ship (founder runs this)
#
# Steps (real run):
#   G  first gate: Batch 10C must be shipped and closed — tag prod-10c on origin AND
#      https://kissansahyog.com/guide answers 200 (10D contains the 10C code). Real run: STOP if not.
#      Dry run: check everything else and end "DRY RUN OK (10C gate pending)".
#   0  preconditions: on release-10d, no modified tracked files that ship (see ALLOW_DIRTY), tag
#      pre-10d-ship exists locally and on origin, HEAD is pushed (= origin/release-10d), .env.production
#      present, the prod snapshot docs/review/batch10d/evidence/prod-before.json present, wrangler logged
#      in, Cloudflare API reachable with pages access (needed for the rollback).
#      Dry run: a missing tag / unpushed HEAD / dirty file is a WARNING ("pending"); a real run STOPS.
#   1  record the live prod deployment id (read-only `wrangler pages deployment list` + API). It must be
#      the expected one (7f5dc56a-…, Batch 10C) — a real run STOPS if it is not (dry run: warning only);
#      after checking, override with KS_EXPECT_LIVE_ID=<live id>
#   2  read-only: live prod still matches the snapshot prod-before.json; take a fresh snapshot
#   3  npm run build:prod (env guard + prerender 268/268 + sitemaps + dist guard); dist sanity checks;
#      10D markers in dist/index.html (data-testid="home-live", data-testid="home-field"), a LiveStage-*.js
#      chunk, and the 10C markers (nav-guide on /, GuideHub/GuideDemoPage chunks holding "ksg-")
#   4  deploy: npx wrangler pages deploy dist --project-name kissansahyog-prod --branch main --commit-dirty=true
#   5  wait until kissansahyog.com serves the new build
#   6  prod gates, READ-ONLY (no sign-up, no post, no feedback POST, browser writes aborted):
#      pages + compare (prod-before-ship; / and /browse may grow up to +40%, see HOME_GROWTH) + cors +
#      functions + static + sw + data, then routes / /signup /browse /guide answer 200 with the new build
#      (plain GETs, redirects followed), / carries home-live + nav-guide, the LiveStage chunk is served,
#      and the guide chunks are served with the guide code in them (marker "ksg-")
#   7  any failure in 4-6 -> scripts/rollback-prod-10d.sh <recorded id> (Cloudflare Pages rollback),
#      which re-runs gate (a); the verdict is printed in a box at the end.
# Never touches git history, never pushes, never writes to any database.
set -uo pipefail

PROJECT="kissansahyog-prod"
SITE="https://kissansahyog.com"
BRANCH="release-10d"
TAG="pre-10d-ship"
GATE_TAG="prod-10c"   # Batch 10C close tag; must be on origin before 10D can ship
EXPECT_LIVE_ID="${KS_EXPECT_LIVE_ID:-7f5dc56a-9d1c-4bd2-8bde-a4512a96be20}"   # prod since the Batch 10C ship (source 40ddc4d, main chunk /assets/index-NFbe6Fk2.js)
ACCOUNT_ID="${CF_ACCOUNT_ID:-9ad1ef464c60a7db797b4bb097d545e5}"
API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
B10="$ROOT/docs/review/batch10d/evidence"
EV="$B10/prod-ship"
NIGHT_SNAP="$B10/prod-before.json"   # read-only snapshot of live prod (10C) taken while preparing Batch 10D
STAMP="$(date +%Y%m%d-%H%M%S)"
# Modified tracked files that may stay dirty: build output rewritten by every build (~/ship-prod.sh
# excludes it too) and review documents (docs/ is not part of dist). Anything else dirty -> STOP.
ALLOW_DIRTY='^(public/search-index\.json|docs/review/.*)$'
ROUTES_10D=(/ /signup /browse /guide)
# Bundle markers. 10D: the live hero and the Morning Field band are prerendered into /, and the hero
# stage is its own lazy chunk (LiveStage-*.js). 10C (must still be there): the nav Guide pill on / and
# the lazy guide chunks holding the guide code.
LIVE_MARKER='data-testid="home-live"'
FIELD_MARKER='data-testid="home-field"'
GUIDE_MARKER='ksg-'
HOME_MARKER='nav-guide'
# The 10D homepage HTML is deliberately bigger (hero, Morning Field band, facts row): same-mode
# builds measured 101,762 B (baseline) -> 122,218 B (10D) = +20.1%, i.e. +20,456 B; on the live prod
# page (79,827 B) the same added markup is about +25.6%. / and /browse (served the same index.html)
# may therefore grow up to +40% in the compare gate; title, h1, the -15% floor and the ErrorBoundary
# check are unchanged, and every other page keeps its usual limit.
HOME_GROWTH='root=1.40,browse=1.40'

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,33p "$0"; exit 0 ;;
    *) echo "unknown argument: $a"; exit 2 ;;
  esac
done

say()  { printf '%s\n' "$*"; }
loud() { printf '\n##################################################################\n%s\n##################################################################\n' "$*"; }
stop() { loud "SHIP STOPPED BEFORE ANY CHANGE TO PRODUCTION: $*"; exit 1; }
PENDING=()   # dry run only: things a real run would stop on, which are expected to be done later
pending() { if [ "$DRY" = 1 ]; then say "WARNING (pending — a real run would STOP here): $*"; PENDING+=("$*"); else stop "$*"; fi; }
cd "$ROOT" || exit 1
[ "$DRY" = 1 ] && say "*** DRY RUN — nothing will be built, deployed, rolled back or written ***"

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
elif [ "$DRY" = 1 ]; then
  say "WARNING (a real run would STOP here): Batch 10C is not shipped and closed yet — checking everything else"
else
  stop "Batch 10D contains the Batch 10C code: ship and close Batch 10C first (tag $GATE_TAG on origin, $SITE/guide must answer 200)"
fi

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
[ -s "$NIGHT_SNAP" ] || stop "$NIGHT_SNAP missing"
command -v node >/dev/null && command -v npx >/dev/null && command -v curl >/dev/null || stop "node / npx / curl not found"
say "  (Batch 10D has no database change: no migration step)"

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
  MSG="the live deployment is $BEFORE_ID (source $BEFORE_SRC), not the expected $EXPECT_LIVE_ID — someone deployed or rolled back since Batch 10D was prepared, and prod-before.json may describe another version.
Check the Cloudflare dashboard; if this live version is the right one to replace, run again with:  KS_EXPECT_LIVE_ID=$BEFORE_ID bash scripts/ship-prod-10d.sh"
  if [ "$DRY" = 1 ]; then say "WARNING (a real run would STOP here): $MSG"; PENDING+=("live deployment is not the expected $EXPECT_LIVE_ID"); else stop "$MSG"; fi
else
  say "  = the expected live deployment ($EXPECT_LIVE_ID, Batch 10C)"
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
# The lazy chunks of this build (bundle markers, checked again after the deploy).
GUIDE_CHUNKS=(); LIVE_CHUNKS=()
if [ -d dist/assets ]; then
  for a in dist/assets/GuideHub-*.js dist/assets/GuideDemoPage-*.js; do [ -f "$a" ] && GUIDE_CHUNKS+=("/${a#dist/}"); done
  for a in dist/assets/LiveStage-*.js; do [ -f "$a" ] && LIVE_CHUNKS+=("/${a#dist/}"); done
fi
say "guide chunks in dist: ${GUIDE_CHUNKS[*]:-none}"
say "LiveStage chunk in dist: ${LIVE_CHUNKS[*]:-none}"
# dist markers: a real run stops on any miss; the dry run reports them for the dist folder as it is now.
dist_markers() {
  local miss=0 a
  [ ${#GUIDE_CHUNKS[@]} -ge 2 ] || { say "  MISSING: GuideHub/GuideDemoPage chunks (the 10C guide is not in this build)"; miss=1; }
  for a in "${GUIDE_CHUNKS[@]}"; do grep -q "$GUIDE_MARKER" "dist$a" || { say "  MISSING: $GUIDE_MARKER in dist$a"; miss=1; }; done
  [ ${#LIVE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: dist/assets/LiveStage-*.js (the 10D live hero stage)"; miss=1; }
  for a in "$HOME_MARKER" "$LIVE_MARKER" "$FIELD_MARKER"; do
    grep -q "$a" dist/index.html 2>/dev/null && say "  dist/index.html has $a" || { say "  MISSING: $a in dist/index.html"; miss=1; }
  done
  return $miss
}
say "+ dist markers: $LIVE_MARKER, $FIELD_MARKER, $HOME_MARKER in dist/index.html; LiveStage-*.js; guide chunks hold '$GUIDE_MARKER'"
if [ "$DRY" = 0 ]; then
  dist_markers || stop "the new build is missing a Batch 10C/10D marker (see above; nothing deployed)"
else
  if [ -f dist/index.html ]; then
    dist_markers && say "  (dist as it is now carries every marker; a real run checks the fresh build again)" \
                 || say "  (note: dist as it is now misses a marker; a real run rebuilds first and stops if the fresh build misses one)"
  else
    say "  (no dist folder now; a real run builds it first)"
  fi
fi

# ---------------------------------------------------------------- 4-7. deploy, gates, rollback
GATES=(timeout 1500 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/after" --label prod-after --checks pages,compare,cors,functions,static,sw,data --snapshot "$EV/prod-before-ship.json" --max-growth "$HOME_GROWTH")
DEPLOY=(timeout 900 npx wrangler pages deploy dist --project-name "$PROJECT" --branch main --commit-dirty=true)
# 10D routes: plain read-only GETs; redirects are followed (Cloudflare Pages 308s /guide -> /guide/), and the
# final answer must be 200 and serve the new main chunk. Then / must carry the live hero and the Guide
# pill, the LiveStage chunk must be served, and the guide chunks must be served with the guide code.
check_routes_10d() {
  local p code body ok=0 a m
  for p in "${ROUTES_10D[@]}"; do
    body="$(timeout 60 curl -sL --max-redirs 5 -w '\n%{http_code}' "$SITE$p?ks_ship=$STAMP")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$NEW_MAIN" <<<"$body"; then
      say "PASS  [10d_routes] GET $p -> 200, serves $NEW_MAIN"
    else
      say "FAIL  [10d_routes] GET $p -> $code (new main chunk $NEW_MAIN present: $(grep -q "$NEW_MAIN" <<<"$body" && echo yes || echo no))"
      ok=1
    fi
  done
  body="$(timeout 60 curl -sL --max-redirs 5 "$SITE/?ks_ship=$STAMP-home")"
  for m in "$LIVE_MARKER" "$FIELD_MARKER" "$HOME_MARKER"; do
    if grep -q "$m" <<<"$body"; then say "PASS  [10d_markers] / has $m"; else say "FAIL  [10d_markers] / has no $m"; ok=1; fi
  done
  [ ${#LIVE_CHUNKS[@]} -gt 0 ] || { say "FAIL  [10d_markers] no LiveStage chunk name found in dist"; ok=1; }
  for a in "${LIVE_CHUNKS[@]}"; do
    code="$(timeout 60 curl -s -o /dev/null -w '%{http_code}' "$SITE$a")"
    if [ "$code" = "200" ]; then say "PASS  [10d_markers] GET $a -> 200"; else say "FAIL  [10d_markers] GET $a -> $code"; ok=1; fi
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
  return $ok
}
say "== 4. deploy"
say "+ ${DEPLOY[*]}   > $EV/deploy-$STAMP.log"
say "== 5. wait until $SITE/ serves the new main chunk (max 5 min)"
say "== 6. prod gates (read-only; the verifier refuses any POST/sign-up on production)"
say "+ ${GATES[*]}"
say "+ GET $SITE{$(IFS=,; echo "${ROUTES_10D[*]}")} -> 200 + new main chunk   (read-only, redirects followed)"
say "+ GET / -> '$LIVE_MARKER', '$FIELD_MARKER', '$HOME_MARKER'; GET LiveStage chunk -> 200; GET guide chunks -> 200 + '$GUIDE_MARKER'   (read-only)"
say "== 7. on any failure: bash scripts/rollback-prod-10d.sh $BEFORE_ID"
if [ "$DRY" = 1 ]; then
  say "+ (read-only check that the rollback path works)"
  bash scripts/rollback-prod-10d.sh --dry-run "$BEFORE_ID" | sed 's/^/    [rollback dry-run] /'
  RBD="${PIPESTATUS[0]}"
  [ "$RBD" = 0 ] || stop "the rollback dry run failed (exit $RBD) — the automatic rollback would not work"
  SUFFIX=""; [ "$GATE_OK" = 1 ] || SUFFIX=" (10C gate pending)"
  NOTE=""
  if [ ${#PENDING[@]} -gt 0 ]; then
    NOTE="
Pending before the real run (a real run stops until these are done):"
    for p in "${PENDING[@]}"; do NOTE="$NOTE
  - $p"; done
  fi
  loud "A real run would ship $(git rev-parse --short HEAD) to $SITE,
replacing deployment $BEFORE_ID (source $BEFORE_SRC). Nothing was changed.$NOTE"
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
  check_routes_10d 2>&1 | tee -a "$EV/prod-gates-$STAMP.txt"
  [ "${PIPESTATUS[0]}" = 0 ] || FAIL="a Batch 10D route or marker check failed (see $EV/prod-gates-$STAMP.txt)"
fi

if [ -z "$FAIL" ]; then
  loud "SHIP OK: kissansahyog.com now runs $(git rev-parse --short HEAD) (deployment $AFTER_ID).
All read-only prod gates passed. Report: $EV/prod-gates-$STAMP.txt
If anything looks wrong later:  bash scripts/rollback-prod-10d.sh $BEFORE_ID"
  exit 0
fi

loud "SHIP FAILED: $FAIL
ROLLING BACK AUTOMATICALLY to deployment $BEFORE_ID (source $BEFORE_SRC)…"
bash scripts/rollback-prod-10d.sh "$BEFORE_ID"
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
