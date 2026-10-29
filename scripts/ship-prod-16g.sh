#!/usr/bin/env bash
# Batch 16G - the weather never shows yesterday's forecast as today's: the cached forecast is cut to "from now", its age is shown, and a
# forecast over 24 h old is hidden (src/lib/weather/*, src/screens/Mausam.jsx, the homepage weather tile). Site only. Copy of
# scripts/ship-prod-16g.sh. release-16g = tag ship-16f + 16G. Live now: Batch 16F (tag ship-16f, deployment
# d26acfd3-80c8-4e09-90c5-ed65a6a7d24c); that id is also the rollback target.
# NO DATABASE STEP in this batch (no migration, no write, no database probe). The auth switches (otp_required=true, session_enforced=false)
# are read before and after and must be identical; this script never sets a switch.
# The GitHub refresh job (scripts/refresh-data.mjs) is NOT part of this ship: GitHub's schedule reads main (see docs/review/batch16g/SHIP.md step 4).
#
#   bash scripts/ship-prod-16g.sh --dry-run   # validate preconditions + print every command; changes nothing
#   bash scripts/ship-prod-16g.sh             # the real ship (founder runs this)
#
# Ship tag: "$TAG" (default ship-16g) must be on the pushed HEAD of release-16g.
# Never touches git history, never pushes, never writes to any database.
set -uo pipefail

PROJECT="kissansahyog-prod"
SITE="https://kissansahyog.com"
BRANCH="release-16g"
TAG="${TAG:-ship-16g}"   # ship point of Batch 16G (pushed HEAD of release-16g)
GATE_TAG="ship-16f"   # the live Batch 16F tag; must be on origin
ID_11A_FALLBACK=""
CLOSE_11A="docs/review/batch11a/CLOSE_REPORT.md" # row "| New production deployment | `<id>` |"
PROD_REF="eltmcznjcqiahqhjvpjg"
STAGING_REF="wzxtqbqlahyahsnoqqva"
PROD_IMG_HOST="https://${PROD_REF}.supabase.co"
ACCOUNT_ID="${CF_ACCOUNT_ID:-9ad1ef464c60a7db797b4bb097d545e5}"
API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
B10="$ROOT/docs/review/batch16g/evidence"
EV="$B10/prod-ship"
NIGHT_SNAP="$B10/prod-before.json"           # read-only snapshot of the live deployment this ship replaces
NIGHT_META="$B10/prod-before.deployment.txt" # which deployment that snapshot describes
STAMP="$(date +%Y%m%d-%H%M%S)"
# Modified tracked files that may stay dirty: build output rewritten by every build and review
# documents (docs/ is not part of dist). Anything else dirty -> STOP.
ALLOW_DIRTY='^(public/search-index\.json|docs/review/.*)$'
MKT_MARKER='दमोह मंडी'            # 12B: Hindi label of every mandi (strings chunk)
HIST_MARKER='mandi_monthly_history'   # 15A: the history read (Msp chunk)
AVG_TESTID='msp-avg5-body'               # 15A: the 5-year-average block (Msp chunk)
NOTE_MARKER='अनुमान नहीं'                 # 15A: the "not a forecast" sentence (strings chunk, Hindi)
ANN_MARKER='get_active_announcements'   # 14A: the home announcement cards (Homepage chunk)
ANN_TESTID='announcement-card'           # 14A: the card component
ADMIN_MARKER='admin_get_security_status' # 14A: the security panel (Security tab chunk)
SHELL_MARKER='panel-search'              # 14A: the admin shell (panel search box)
LOGAPI_MARKER='admin_log_console_action' # 14A: the console action log wrapper (adminApi)
TICKER_MARKER='--ticker-duration'  # 12B: measured scroll duration (CSS + Homepage chunk)
FOOT_NEW_EN=' · India'                  # 13A: footer line (strings chunk, English)
FOOT_NEW_HI='</a> · भारत'               # 13A: footer line in the prerendered HTML (Hindi default)
FOOT_OLD_EN='· Madhya Pradesh, India'    # 13A: must be gone from the footer string
FOOT_OLD_HI='मध्यप्रदेश, भारत'            # 13A: must be gone from the prerendered footer
BROWSE_MARKERS=('browse-sections' 'section-empty-' 'popular-section' 'etag-block' 'applied-chips')  # 13A: Browse chunk
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
OTP_MARKER='app_login_otp'           # 11A: the OTP sign-in code (authService)
WA_URL='https://whatsapp.com/channel/0029VbDtjiJBqbr1a2Nv1F3I'   # 12A: the channel link
WA_REL='rel="noopener noreferrer"'
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
    -h|--help) sed -n 2,40p "$0"; exit 0 ;;
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
say "== G. first gate: Batch 16F (ship-16f) is live (tag $GATE_TAG on origin, $SITE/guide -> 200)"
GATE_OK=1
GATE_REMOTE="$(timeout 120 git ls-remote --tags origin "refs/tags/$GATE_TAG" 2>/dev/null | awk '{print $1}' | head -1)"
say "+ git ls-remote --tags origin $GATE_TAG -> ${GATE_REMOTE:0:7}"
[ -n "$GATE_REMOTE" ] || { GATE_OK=0; say "  tag $GATE_TAG is NOT on origin"; }
GUIDE_CODE="$(timeout 60 curl -sL --max-redirs 5 -o /dev/null -w '%{http_code}' "$SITE/guide?ks_ship=$STAMP-gate")"
say "+ curl -sL $SITE/guide -> $GUIDE_CODE"
[ "$GUIDE_CODE" = "200" ] || { GATE_OK=0; say "  $SITE/guide does not answer 200"; }
if [ "$GATE_OK" = 1 ]; then
  say "  = satisfied: Batch 16F ($GATE_TAG) is on origin"
else
  pending "the Batch 16F ship must be live first (tag $GATE_TAG on origin, $SITE/guide must answer 200)"
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
for f in functions/api/otp/send.js functions/api/otp/verify.js functions/api/otp/config.js functions/lib/otp-core.js scripts/batch11a/prod-probes.mjs; do
  [ -f "$f" ] || stop "$f missing — the OTP Pages Functions would not be deployed (wrong checkout?)"
done
command -v node >/dev/null && command -v npx >/dev/null && command -v curl >/dev/null || stop "node / npx / curl not found"

# ---------------------------------------------------------------- D12. the auth switches (read-only, public route)
# Production runs with otp_required = true and session_enforced = false on purpose. Read them BEFORE building;
# a different state means someone changed a switch since Batch 15A was prepared: STOP and change nothing.
say "== D12. read-only: GET $SITE/api/otp/config answers JSON; record the switches (must be otp_required=true, session_enforced=false)"
say "+ curl -s $SITE/api/otp/config"
CFG0="$(timeout 60 curl -s -H 'Accept: application/json' "$SITE/api/otp/config?ks_ship=$STAMP-pre" 2>/dev/null)"
OTP0="$(printf '%s' "$CFG0" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(typeof j.otp_required==='boolean'&&typeof j.session_enforced==='boolean'?'otp_required='+j.otp_required+' session_enforced='+j.session_enforced:'')}catch(e){console.log('')}})")"
say "  switches before the deploy: ${OTP0:-NOT READABLE}"
if [ "$OTP0" = "otp_required=true session_enforced=false" ]; then
  say "  = as expected (OTP ON, session enforcement OFF); the ship never changes them"
elif [ -z "$OTP0" ]; then
  stop "GET $SITE/api/otp/config did not answer JSON with both switches (answer: ${CFG0:0:120}). Nothing was changed."
else
  stop "the switches are not what Batch 16G expects (got: $OTP0; expected otp_required=true session_enforced=false). Someone changed a switch. Nothing was changed; ask the builder before shipping."
fi

# ---------------------------------------------------------------- P. production API address and anonymous key (read from .env.production; the key is never printed)
# Used only by the read-only gate probes in step 6. This ship has no database step.
PROD_URL="https://${PROD_REF}.supabase.co"
PROD_ANON="$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env.production | head -1 | cut -d= -f2- | tr -d '\"[:space:]')"
[ -n "$PROD_ANON" ] || stop ".env.production has no VITE_SUPABASE_ANON_KEY (nothing changed)"

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
# The Batch 11A production deployment id: its close report has the row "| New production deployment | \`<id>\` |".
ID_11A=""; SRC_11A=""
if [ -f "$CLOSE_11A" ]; then
  REPORT_11A="$(cat "$CLOSE_11A")"; SRC_11A="$CLOSE_11A"
else
  REPORT_11A="$(git show "origin/release-11a:$CLOSE_11A" 2>/dev/null || true)"; [ -n "$REPORT_11A" ] && SRC_11A="origin/release-11a:$CLOSE_11A"
fi
if [ -n "$REPORT_11A" ]; then
  ID_11A="$(grep -iE 'new[^|]*deployment' <<<"$REPORT_11A" | grep -viE 'previous|before|old' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
  say "  Batch 11A close report found ($SRC_11A): 11A production deployment ${ID_11A:-<not found in the report>}"
else
  say "  no Batch 11A close report ($CLOSE_11A) here or on origin/release-11a"
fi
# 16G: the deployment this ship replaces is the Batch 16F ship (tag ship-16f).
ID_11A="d26acfd3-80c8-4e09-90c5-ed65a6a7d24c"; SRC_11A="Batch 16F production deployment (tag ship-16f)"
say "  expected live deployment (Batch 16F, ship-16f): $ID_11A"
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
elif [ -n "$ID_11A" ] && [ "$BEFORE_ID" = "$ID_11A" ]; then LIVE_IS="Batch 16F ship-16f (from $SRC_11A; read from Cloudflare just now)"
fi
if [ -n "$LIVE_IS" ]; then
  say "  = live is the expected deployment: $LIVE_IS — rollback target $BEFORE_ID"
else
  MSG="the live deployment is $BEFORE_ID (source $BEFORE_SRC): it is not the Batch 16F deployment ($ID_11A) — someone deployed or rolled back since Batch 16G was prepared.
Check the Cloudflare dashboard; if this live version is the right one to replace, run again with:  KS_EXPECT_LIVE_ID=$BEFORE_ID bash scripts/ship-prod-16g.sh"
  if [ "$DRY" = 1 ]; then say "WARNING (a real run would STOP here): $MSG"; PENDING+=("live deployment $BEFORE_ID is not the expected Batch 16F one (d26acfd3...) (or KS_EXPECT_LIVE_ID)"); else stop "$MSG"; fi
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
CMD2a=(timeout 600 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$B10/prod-snapshot" --label prod-before-16g --checks snapshot --snapshot "$NIGHT_SNAP")
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
  grep -q "Prerendered 269/269" "$EV/build-prod-$STAMP.log" || stop "prerender did not report 269/269 routes — see the build log"
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
HIST_CHUNKS=(); AVG_CHUNKS=(); NOTE_CHUNKS=(); BROWSE_CHUNKS=(); STR_CHUNKS=(); ANN_CHUNKS=(); ADMIN_CHUNKS=(); SHELL_CHUNKS=(); LOGAPI_CHUNKS=(); MKT_CHUNKS=(); TICKER_CHUNKS=(); GUIDE_CHUNKS=(); LIVE_CHUNKS=(); SIGNUP_CHUNKS=(); BADGE_CHUNKS=(); LISTING_CHUNKS=(); OTP_CHUNKS=()
if [ -d dist/assets ]; then
  for a in dist/assets/GuideHub-*.js dist/assets/GuideDemoPage-*.js; do [ -f "$a" ] && GUIDE_CHUNKS+=("/${a#dist/}"); done
  while IFS= read -r a; do [ -n "$a" ] && BROWSE_CHUNKS+=("/${a#dist/}"); done < <(grep -l 'browse-sections' dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && STR_CHUNKS+=("/${a#dist/}"); done < <(grep -l 'footer_company_place:{hi' dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && HIST_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$HIST_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && AVG_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$AVG_TESTID" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && NOTE_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$NOTE_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && ANN_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$ANN_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && ADMIN_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$ADMIN_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && SHELL_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$SHELL_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && LOGAPI_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$LOGAPI_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && MKT_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$MKT_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && TICKER_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$TICKER_MARKER" dist/assets/*.css dist/assets/*.js 2>/dev/null | head -4)
  for a in dist/assets/LiveStage-*.js; do [ -f "$a" ] && LIVE_CHUNKS+=("/${a#dist/}"); done
  while IFS= read -r a; do [ -n "$a" ] && SIGNUP_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$SIGNUP_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && BADGE_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$BADGE_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && LISTING_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$LISTING_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && OTP_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$OTP_MARKER" dist/assets/*.js 2>/dev/null | head -3)
fi
say "guide chunks in dist: ${GUIDE_CHUNKS[*]:-none}"
say "LiveStage chunk in dist (must be none in 10F): ${LIVE_CHUNKS[*]:-none}"
say "chunk(s) calling $SIGNUP_MARKER in dist: ${SIGNUP_CHUNKS[*]:-none}"
say "chunk(s) holding the /msp badge ($BADGE_MARKER) in dist: ${BADGE_CHUNKS[*]:-none}"
say "chunk(s) calling $LISTING_MARKER (10G seller delete / disable) in dist: ${LISTING_CHUNKS[*]:-none}"
say "chunk(s) calling $OTP_MARKER (11A OTP sign-in) in dist: ${OTP_CHUNKS[*]:-none}"
# dist markers: a real run stops on any miss; the dry run reports them for the dist folder as it is now.
dist_markers() {
  local miss=0 a
  [ ${#GUIDE_CHUNKS[@]} -ge 2 ] || { say "  MISSING: GuideHub/GuideDemoPage chunks (the 10C guide is not in this build)"; miss=1; }
  for a in "${GUIDE_CHUNKS[@]}"; do grep -q "$GUIDE_MARKER" "dist$a" || { say "  MISSING: $GUIDE_MARKER in dist$a"; miss=1; }; done
  [ ${#LIVE_CHUNKS[@]} -eq 0 ] || { say "  STILL THERE: ${LIVE_CHUNKS[*]} (the removed 10D live hero stage)"; miss=1; }
  [ ${#SIGNUP_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $SIGNUP_MARKER (the 10E phone-only sign-up)"; miss=1; }
  [ ${#BADGE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $BADGE_MARKER (the 10F /msp last-price badge)"; miss=1; }
  [ ${#LISTING_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $LISTING_MARKER (the 10G seller delete / disable)"; miss=1; }
  [ ${#OTP_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $OTP_MARKER (the 11A OTP sign-in)"; miss=1; }
  [ ${#HIST_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js reads $HIST_MARKER (the 15A history read)"; miss=1; }
  [ ${#AVG_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $AVG_TESTID (the 15A 5-year-average block)"; miss=1; }
  [ ${#NOTE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds '$NOTE_MARKER' (the 15A not-a-forecast sentence)"; miss=1; }
  [ ${#ANN_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $ANN_MARKER (the 14A home announcement cards)"; miss=1; }
  grep -lq -- "$ANN_TESTID" dist/assets/*.js 2>/dev/null || { say "  MISSING: $ANN_TESTID in dist/assets/*.js (the 14A card component)"; miss=1; }
  [ ${#ADMIN_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $ADMIN_MARKER (the 14A security panel / admin chunk)"; miss=1; }
  [ ${#SHELL_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $SHELL_MARKER (the 14A admin shell)"; miss=1; }
  [ ${#LOGAPI_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $LOGAPI_MARKER (the 14A action-log wrapper)"; miss=1; }
  [ -s "dist/festival/neelkanth.webp" ] || { say "  MISSING: dist/festival/neelkanth.webp (kept for announcements)"; miss=1; }
  if grep -q 'data-testid="festival-card"\|data-testid="announcement-card"\|data-testid="announcements"' dist/index.html 2>/dev/null; then say "  STILL THERE: a festival / announcement card in dist/index.html (it must never be prerendered)"; miss=1; fi
  { [ -f functions/api/admin/sms-balance.js ] && [ -f functions/lib/admin-auth.js ]; } || { say "  MISSING: the admin Pages Functions (functions/api/admin/sms-balance.js, functions/lib/admin-auth.js)"; miss=1; }
  [ ${#MKT_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds '$MKT_MARKER' (the 12B Hindi mandi names)"; miss=1; }
  grep -lq -- "$TICKER_MARKER" dist/assets/*.css 2>/dev/null || { say "  MISSING: $TICKER_MARKER in dist/assets/*.css (the 12B ticker speed)"; miss=1; }
  grep -lq -- "$TICKER_MARKER" dist/assets/Homepage-*.js 2>/dev/null || { say "  MISSING: $TICKER_MARKER in the Homepage chunk (the 12B ticker speed)"; miss=1; }
  for a in "$HOME_MARKER" "${HERO_MARKERS[@]}"; do
    grep -q "$a" dist/index.html 2>/dev/null && say "  dist/index.html has $a" || { say "  MISSING: $a in dist/index.html"; miss=1; }
  done
  for a in "${REMOVED_MARKERS[@]}"; do
    grep -q "$a" dist/index.html 2>/dev/null && { say "  STILL THERE: $a in dist/index.html (removed in 10F)"; miss=1; } || say "  dist/index.html has no $a (removed in 10F)"
  done
  for f in dist/index.html dist/about/index.html; do
    grep -q "$WA_URL" "$f" 2>/dev/null && say "  $f has the WhatsApp channel link" || { say "  MISSING: the channel link $WA_URL in $f"; miss=1; }
    grep -q "$WA_REL" "$f" 2>/dev/null && say "  $f has $WA_REL" || { say "  MISSING: $WA_REL in $f"; miss=1; }
  done
  grep -q 'data-testid="wa-channel-link"' dist/about/index.html 2>/dev/null || { say "  MISSING: the footer channel link (wa-channel-link) in dist/about/index.html"; miss=1; }
  grep -q "$BADGE_MARKER" dist/msp/index.html 2>/dev/null && say "  dist/msp/index.html has $BADGE_MARKER" || { say "  MISSING: $BADGE_MARKER in dist/msp/index.html"; miss=1; }
  # 13A: footer wording + the Browse chunk's new test ids.
  grep -q -- "$FOOT_NEW_HI" dist/index.html 2>/dev/null && say "  dist/index.html footer has '· भारत'" || { say "  MISSING: the new footer line in dist/index.html"; miss=1; }
  grep -q -- "$FOOT_OLD_HI" dist/index.html 2>/dev/null && { say "  STILL THERE: '$FOOT_OLD_HI' in dist/index.html"; miss=1; } || true
  [ ${#STR_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no chunk holds footer_company_place"; miss=1; }
  for a in "${STR_CHUNKS[@]}"; do
    grep -q -- "$FOOT_NEW_EN" "dist$a" || { say "  MISSING: '$FOOT_NEW_EN' in dist$a"; miss=1; }
    grep -q -- "$FOOT_OLD_EN" "dist$a" && { say "  STILL THERE: '$FOOT_OLD_EN' in dist$a"; miss=1; }
  done
  [ ${#BROWSE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no Browse chunk holds browse-sections"; miss=1; }
  for a in "${BROWSE_CHUNKS[@]}"; do for m in "${BROWSE_MARKERS[@]}"; do grep -q -- "$m" "dist$a" || { say "  MISSING: $m in dist$a"; miss=1; }; done; done
  return $miss
}
say "+ dist markers: $HOME_MARKER + ${HERO_MARKERS[*]} in dist/index.html, none of ${REMOVED_MARKERS[*]}; no LiveStage-*.js; $BADGE_MARKER in dist/msp/index.html and a chunk; guide chunks hold '$GUIDE_MARKER'; a chunk holds '$SIGNUP_MARKER'"
if [ "$DRY" = 0 ]; then
  dist_markers || stop "the new build is missing a Batch 10C/10E/10F/10G/11A/12A/14A/15A marker or still has a removed 10D hero part (see above; nothing deployed)"
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
    grep -q "Prerendered 269/269" "$EV/reprerender-$STAMP-$attempt.log" || stop "the prerender re-run did not report 269/269 (nothing deployed)"
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
  # 12B: the new ticker code is live (Hindi mandi names chunk, measured-speed CSS / Homepage chunk).
  [ ${#MKT_CHUNKS[@]} -gt 0 ] || { say "FAIL  [12b_ticker] no chunk holding '$MKT_MARKER' found in dist"; ok=1; }
  for a in "${MKT_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '
%{http_code}' "$SITE$a")"; code="${body##*$'
'}"
    if [ "$code" = "200" ] && grep -q "$MKT_MARKER" <<<"$body"; then say "PASS  [12b_ticker] GET $a -> 200, holds the Hindi mandi names"; else say "FAIL  [12b_ticker] GET $a -> $code"; ok=1; fi
  done
  [ ${#TICKER_CHUNKS[@]} -gt 0 ] || { say "FAIL  [12b_ticker] no file holding $TICKER_MARKER found in dist"; ok=1; }
  for a in "${TICKER_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '
%{http_code}' "$SITE$a")"; code="${body##*$'
'}"
    if [ "$code" = "200" ] && grep -q -- "$TICKER_MARKER" <<<"$body"; then say "PASS  [12b_ticker] GET $a -> 200, holds $TICKER_MARKER"; else say "FAIL  [12b_ticker] GET $a -> $code"; ok=1; fi
  done
  # 14A: live chunks hold the announcement cards and the admin console; the admin function answers 401 without a session.
  for pair in "ANN:$ANN_MARKER" "ADMIN:$ADMIN_MARKER" "SHELL:$SHELL_MARKER" "LOGAPI:$LOGAPI_MARKER"; do
    var="${pair%%:*}_CHUNKS[@]"; mk="${pair#*:}"; found=0
    for a in "${!var}"; do
      found=1
      body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"; code="${body##*$'\n'}"
      if [ "$code" = "200" ] && grep -q -- "$mk" <<<"$body"; then say "PASS  [14a_chunks] GET $a -> 200, holds $mk"; else say "FAIL  [14a_chunks] GET $a -> $code (marker $mk)"; ok=1; fi
    done
    [ "$found" = 1 ] || { say "FAIL  [14a_chunks] no chunk holding $mk found in dist"; ok=1; }
  done
  code="$(timeout 60 curl -s -o /dev/null -w '%{http_code}' "$SITE/api/admin/sms-balance?ks_ship=$STAMP")"
  if [ "$code" = "401" ]; then say "PASS  [14a_admin_fn] GET /api/admin/sms-balance without a session -> 401"; else say "FAIL  [14a_admin_fn] GET /api/admin/sms-balance without a session -> $code (expected 401)"; ok=1; fi
  code="$(timeout 60 curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" -d '{}' "$PROD_URL/rest/v1/rpc/get_active_announcements")"
  if [ "$code" = "200" ]; then say "PASS  [14a_db] get_active_announcements() answers 200 on production"; else say "FAIL  [14a_db] get_active_announcements() -> $code"; ok=1; fi
  # 16G: the home page and /mausam answer 200 (read-only GETs).
  for pg in / /mausam; do
    code="$(timeout 60 curl -sL -o /dev/null --max-redirs 5 -w '%{http_code}' "$SITE$pg?ks_ship=$STAMP-16g")"
    if [ "$code" = "200" ]; then say "PASS  [16g_page] GET $pg -> 200"; else say "FAIL  [16g_page] GET $pg -> $code"; ok=1; fi
  done
  # 15A: the live chunks hold the history read, the 5-year-average block and the not-a-forecast sentence; the table answers 200.
  for pair in "HIST:$HIST_MARKER" "AVG:$AVG_TESTID" "NOTE:$NOTE_MARKER"; do
    var="${pair%%:*}_CHUNKS[@]"; mk="${pair#*:}"; found=0
    for a in "${!var}"; do
      found=1
      body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"; code="${body##*$'\n'}"
      if [ "$code" = "200" ] && grep -q -- "$mk" <<<"$body"; then say "PASS  [15a_chunks] GET $a -> 200, holds $mk"; else say "FAIL  [15a_chunks] GET $a -> $code (marker $mk)"; ok=1; fi
    done
    [ "$found" = 1 ] || { say "FAIL  [15a_chunks] no chunk holding $mk found in dist"; ok=1; }
  done
  code="$(timeout 60 curl -s -o /dev/null -w '%{http_code}' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" "$PROD_URL/rest/v1/mandi_monthly_history?select=commodity_en&limit=1")"
  if [ "$code" = "200" ]; then say "PASS  [15a_db] mandi_monthly_history answers 200 on production (anonymous select, one row)"; else say "FAIL  [15a_db] mandi_monthly_history -> $code"; ok=1; fi
  # 13A: live Browse chunk and footer string carry the new code.
  [ ${#BROWSE_CHUNKS[@]} -gt 0 ] || { say "FAIL  [13a_browse] no Browse chunk found in dist"; ok=1; }
  for a in "${BROWSE_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s "$SITE$a")"; hit=1
    for m in "${BROWSE_MARKERS[@]}"; do grep -q -- "$m" <<<"$body" || hit=0; done
    if [ "$hit" = 1 ]; then say "PASS  [13a_browse] GET $a holds the new Browse test ids"; else say "FAIL  [13a_browse] GET $a lacks a new Browse marker"; ok=1; fi
  done
  for a in "${STR_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s "$SITE$a")"
    if grep -q -- "$FOOT_NEW_EN" <<<"$body" && ! grep -q -- "$FOOT_OLD_EN" <<<"$body"; then say "PASS  [13a_footer] GET $a has '· India' and not '$FOOT_OLD_EN'"; else say "FAIL  [13a_footer] GET $a footer string wrong"; ok=1; fi
  done
  body="$(timeout 60 curl -s "$SITE/?ks_ship=$STAMP")"
  if grep -q -- "$FOOT_NEW_HI" <<<"$body" && ! grep -q -- "$FOOT_OLD_HI" <<<"$body"; then say "PASS  [13a_footer] GET / footer says '· भारत'"; else say "FAIL  [13a_footer] GET / footer line wrong"; ok=1; fi
  [ ${#BADGE_CHUNKS[@]} -gt 0 ] || { say "FAIL  [10f_msp] no chunk holding $BADGE_MARKER found in dist"; ok=1; }
  [ ${#LISTING_CHUNKS[@]} -gt 0 ] || { say "FAIL  [10g_listing] no chunk calling $LISTING_MARKER found in dist"; ok=1; }
  for a in "${LISTING_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$LISTING_MARKER" <<<"$body"; then say "PASS  [10g_listing] GET $a -> 200, holds $LISTING_MARKER"; else say "FAIL  [10g_listing] GET $a -> $code"; ok=1; fi
  done
  [ ${#OTP_CHUNKS[@]} -gt 0 ] || { say "FAIL  [11a_otp] no chunk calling $OTP_MARKER found in dist"; ok=1; }
  for a in "${OTP_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\n%{http_code}' "$SITE$a")"
    code="${body##*$'\n'}"
    if [ "$code" = "200" ] && grep -q "$OTP_MARKER" <<<"$body"; then say "PASS  [11a_otp] GET $a -> 200, holds $OTP_MARKER"; else say "FAIL  [11a_otp] GET $a -> $code"; ok=1; fi
  done
  # 12A: the OTP Pages Functions still answer; the switches are EXACTLY what they were before the deploy.
  timeout 120 node scripts/batch11a/prod-probes.mjs live "$SITE" || ok=1
  CFG1="$(timeout 60 curl -s -H 'Accept: application/json' "$SITE/api/otp/config?ks_ship=$STAMP-post" 2>/dev/null)"
  OTP1="$(printf '%s' "$CFG1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(typeof j.otp_required==='boolean'&&typeof j.session_enforced==='boolean'?'otp_required='+j.otp_required+' session_enforced='+j.session_enforced:'')}catch(e){console.log('')}})")"
  if [ -n "$OTP1" ] && [ "$OTP1" = "$OTP0" ]; then say "PASS  [12a_switches] /api/otp/config after the deploy: $OTP1 (same as before: $OTP0)"; else say "FAIL  [12a_switches] /api/otp/config after the deploy: '${OTP1:-not JSON}' (before: $OTP0)"; ok=1; fi
  # 12A: the new link is live on the home page and in the footer of a content page.
  for p in / /about; do
    body="$(timeout 60 curl -sL --max-redirs 5 "$SITE$p?ks_ship=$STAMP-wa")"
    if grep -q "$WA_URL" <<<"$body" && grep -q "$WA_REL" <<<"$body"; then say "PASS  [12a_whatsapp] GET $p has the channel link with $WA_REL"; else say "FAIL  [12a_whatsapp] GET $p lacks the channel link or $WA_REL"; ok=1; fi
  done
  body="$(timeout 60 curl -sL --max-redirs 5 "$SITE/about?ks_ship=$STAMP-wa2")"
  if grep -q 'data-testid="wa-channel-link"' <<<"$body"; then say "PASS  [12a_whatsapp] GET /about has the footer link"; else say "FAIL  [12a_whatsapp] GET /about has no footer link"; ok=1; fi
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
say "+ GET chunk(s) calling '$OTP_MARKER' -> 200 + marker; node scripts/batch11a/prod-probes.mjs live $SITE   (GET /api/otp/config -> JSON; POST /api/otp/send {phone:'123'} -> 400 invalid_phone; no SMS); then /api/otp/config must equal the pre-deploy switches (otp_required=true session_enforced=false); GET / and /about -> the channel link with rel=noopener noreferrer"
say "== 7. on any failure: bash scripts/rollback-prod-16g.sh $BEFORE_ID"
if [ "$DRY" = 1 ]; then
  say "+ (read-only check that the rollback path works)"
  bash scripts/rollback-prod-16g.sh --dry-run "$BEFORE_ID" | sed 's/^/    [rollback dry-run] /'
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
Undo after a ship:  bash scripts/rollback-prod-16g.sh $BEFORE_ID
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
  [ "${PIPESTATUS[0]}" = 0 ] || FAIL="a Batch 10F/10G/11A/14A/15A route, marker, OTP function, admin function, history table or CSP check failed (see $EV/prod-gates-$STAMP.txt)"
fi

if [ -z "$FAIL" ]; then
  loud "SHIP OK: kissansahyog.com now runs $(git rev-parse --short HEAD) (deployment $AFTER_ID).
All read-only prod gates passed. Report: $EV/prod-gates-$STAMP.txt
Previous deployment (rollback target): $BEFORE_ID ($LIVE_IS)
The auth switches are exactly as before (otp_required=true, session_enforced=false); this ship never touches them.
NEXT: follow docs/review/batch16g/SHIP.md step 5 (open /mausam and check the "Updated today ..." line and that the first row of the 7-day table is today).
If anything looks wrong later:  bash scripts/rollback-prod-16g.sh $BEFORE_ID"
  exit 0
fi

loud "SHIP FAILED: $FAIL
ROLLING BACK AUTOMATICALLY to deployment $BEFORE_ID (source $BEFORE_SRC)…"
bash scripts/rollback-prod-16g.sh "$BEFORE_ID"
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
