#!/usr/bin/env bash
# Batch 10C — roll kissansahyog.com (Pages project kissansahyog-prod) back to an earlier deployment.
# Copy of scripts/rollback-prod-10a.sh with Batch 10C paths (batch 10A files stay untouched).
#
#   bash scripts/rollback-prod-10c.sh                 # roll back to the deployment recorded by ship-prod-10c.sh
#   bash scripts/rollback-prod-10c.sh <deployment-id> # roll back to this production deployment (full id)
#   bash scripts/rollback-prod-10c.sh --dry-run [id]  # validate + print every command; changes nothing
#
# Method (checked 2026-10-15, wrangler 4.151.x): wrangler has NO "pages rollback" command
# (`wrangler pages deployment` offers only list | create | tail | delete), so the rollback uses the
# Cloudflare API endpoint the dashboard "Rollback" button uses:
#   POST https://api.cloudflare.com/client/v4/accounts/{account}/pages/projects/kissansahyog-prod/deployments/{id}/rollback
# Auth: $CLOUDFLARE_API_TOKEN if set, otherwise wrangler's own OAuth login token (scope pages:write,
# read from wrangler's config file after a wrangler command has refreshed it). The token is never printed.
# No rebuild, no git command that writes, no database access.
#
# Database: Batch 10C has NO database change, so there is nothing to undo in any database.
set -uo pipefail

PROJECT="kissansahyog-prod"
SITE="https://kissansahyog.com"
ACCOUNT_ID="${CF_ACCOUNT_ID:-9ad1ef464c60a7db797b4bb097d545e5}"
API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EV="$ROOT/docs/review/batch10c/evidence/prod-ship"
RECORDED="$EV/prod-deployment-before.txt"
NIGHT_SNAP="$ROOT/docs/review/batch10c/evidence/prod-before.json"
FALLBACK_ID="0845c733-e8d0-4553-957c-10f3db23ecca"   # prod Production deployment since 2026-10-17 18:28 (source 17d77e8 = Batch 10A, release-10a)

DRY=0; TARGET=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,17p "$0"; exit 0 ;;
    *) TARGET="$a" ;;
  esac
done

say()  { printf '%s\n' "$*"; }
loud() { printf '\n==================================================================\n%s\n==================================================================\n' "$*"; }
die()  { loud "ROLLBACK STOPPED: $*"; exit 1; }

cd "$ROOT" || exit 1
[ "$DRY" = 1 ] && say "*** DRY RUN — nothing will be changed ***"

# ---------- which deployment ----------
if [ -z "$TARGET" ]; then
  if [ -s "$RECORDED" ]; then
    TARGET="$(grep -o '^deployment_id=[0-9a-f-]*' "$RECORDED" | head -1 | cut -d= -f2)"
    say "target: recorded by ship-prod-10c.sh in $RECORDED -> $TARGET"
  else
    TARGET="$FALLBACK_ID"
    say "target: no recorded id ($RECORDED missing) -> built-in fallback $TARGET (prod before Batch 10C)"
  fi
fi
[[ "$TARGET" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]] || die "'$TARGET' is not a full deployment id (use the long id from: npx wrangler pages deployment list --project-name $PROJECT)"

# ---------- credentials (read-only checks are done in dry-run too) ----------
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
say "+ timeout 120 npx wrangler pages deployment list --project-name $PROJECT   (read-only; also refreshes wrangler's login token)"
LIST="$(timeout 120 npx wrangler pages deployment list --project-name "$PROJECT" 2>&1)" || die "wrangler cannot list deployments (not logged in? run: npx wrangler login)"
[ "$DRY" = 1 ] || mkdir -p "$EV"
TOKEN="$(get_token)"; [ -n "$TOKEN" ] || die "no Cloudflare token (set CLOUDFLARE_API_TOKEN or run: npx wrangler login)"

api() { # method path [extra curl args]  — prints the JSON body
  local m="$1" p="$2"; shift 2
  timeout 120 curl -sS -X "$m" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$API$p" "$@"
}
jget() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);const f=new Function('j','return '+process.argv[1]);const v=f(j);console.log(v===undefined||v===null?'':typeof v==='object'?JSON.stringify(v):v)}catch(e){console.log('')}})" "$1"; }

say "+ GET $API/deployments/$TARGET   (read-only)"
DEP="$(api GET "/deployments/$TARGET")"
[ "$(printf '%s' "$DEP" | jget 'j.success')" = "true" ] || die "deployment $TARGET not found in $PROJECT (API: $(printf '%s' "$DEP" | jget 'j.errors'))"
ENVN="$(printf '%s' "$DEP" | jget 'j.result.environment')"
STAT="$(printf '%s' "$DEP" | jget 'j.result.latest_stage.status')"
SRC="$(printf '%s' "$DEP" | jget '(j.result.deployment_trigger&&j.result.deployment_trigger.metadata&&j.result.deployment_trigger.metadata.commit_hash||"").slice(0,7)')"
say "target deployment: env=$ENVN status=$STAT source=$SRC created=$(printf '%s' "$DEP" | jget 'j.result.created_on')"
[ "$ENVN" = "production" ] || die "target is a '$ENVN' deployment; only a production deployment can be rolled back to"
[ "$STAT" = "success" ] || die "target deployment status is '$STAT', not success"

say "+ GET $API   (read-only: which deployment is live now)"
CUR="$(api GET "" | jget 'j.result.canonical_deployment.id')"
say "live production deployment now: ${CUR:-unknown}"
if [ "$CUR" = "$TARGET" ]; then
  if [ "$DRY" = 1 ]; then
    say "(note: $TARGET is live right now, so a real run at this moment would stop with 'nothing to do'; the commands it runs after a ship are printed below)"
  else
    loud "NOTHING TO DO: $TARGET is already the live production deployment of $PROJECT"
    exit 0
  fi
fi

SNAP="$EV/prod-before-ship.json"; [ -s "$SNAP" ] || SNAP="$NIGHT_SNAP"

# ---------- the rollback ----------
say "+ POST $API/deployments/$TARGET/rollback   (Authorization: Bearer <token, not shown>)"
if [ "$DRY" = 1 ]; then
  say "+ (then) poll GET $API until canonical_deployment.id == $TARGET (max 3 min)"
  say "+ (then) node scripts/verify-batch9-live.mjs --base $SITE --out $EV/after-rollback --label prod-after-rollback --checks pages,compare --snapshot $SNAP"
  say "  (no database step: Batch 10C changed no database)"
  loud "DRY RUN OK — preconditions valid; rollback target $TARGET (source $SRC); nothing was changed"
  exit 0
fi
RES="$(api POST "/deployments/$TARGET/rollback")"
if [ "$(printf '%s' "$RES" | jget 'j.success')" != "true" ]; then
  loud "ROLLBACK API CALL FAILED: $(printf '%s' "$RES" | jget 'j.errors')
Do it by hand: Cloudflare dashboard -> Workers & Pages -> $PROJECT -> Deployments -> the deployment $TARGET -> ... -> Rollback to this deployment"
  exit 2
fi
say "rollback accepted by the API; waiting until it is live…"
NOW=""
for i in $(seq 1 36); do
  NOW="$(api GET "" | jget 'j.result.canonical_deployment.id')"
  [ "$NOW" = "$TARGET" ] && break
  sleep 5
done
say "live production deployment after rollback: $NOW"
{ echo "time=$(date -u +%Y-%m-%dT%H:%M:%SZ)"; echo "rolled_back_to=$TARGET"; echo "source=$SRC"; echo "previous_live=$CUR"; echo "live_after=$NOW"; } > "$EV/rollback-$(date +%Y%m%d-%H%M%S).txt" 2>/dev/null || true
sleep 20   # let the edge pick it up before the read-only check

say "+ node scripts/verify-batch9-live.mjs --base $SITE --out $EV/after-rollback --label prod-after-rollback --checks pages,compare --snapshot $SNAP"
timeout 1500 node scripts/verify-batch9-live.mjs --base "$SITE" --out "$EV/after-rollback" --label prod-after-rollback --checks pages,compare --snapshot "$SNAP"
G=$?
if [ "$NOW" = "$TARGET" ] && [ $G -eq 0 ]; then
  loud "ROLLBACK DONE: kissansahyog.com is back on deployment $TARGET (source $SRC) and the read-only page check passed."
  exit 0
fi
loud "ROLLBACK FINISHED WITH PROBLEMS: live deployment = $NOW (wanted $TARGET), page check exit code = $G.
Check the Cloudflare dashboard (Workers & Pages -> $PROJECT -> Deployments) and the report in $EV/after-rollback/"
exit 3
