#!/usr/bin/env bash
# Batch 11A — roll kissansahyog.com (Pages project kissansahyog-prod) back to an earlier deployment.
# Copy of scripts/rollback-prod-10g.sh with Batch 11A paths and the Batch 10G deployment as the first fallback
# (batch 10C..10G files stay untouched).
#
# BEFORE a website rollback after 11A: switch BOTH auth flags OFF on production (instant, one SQL line, see
# docs/review/batch11a/SHIP.md step 10). An older website never sends the session token and signs phone users in
# through app_login, so with otp_required or session_enforced ON it cannot sign in or act. This script reads the
# flags (read-only, anon key) and prints a loud warning if either is ON; it never changes them.
# Migration 0066 may stay after a website rollback: with both flags OFF every old function behaves as before
# (proved on staging). Its rollback SQL (docs/review/batch11a/PROD_ROLLBACK_0066.sql) is a separate founder step,
# AFTER this one, and only with both flags OFF.
#
#   bash scripts/rollback-prod-11a.sh <deployment-id> # roll back to this production deployment (full id) — normal use;
#                                                     # ship-prod-11a.sh prints this id ("rollback target")
#   bash scripts/rollback-prod-11a.sh                 # roll back to the deployment recorded by ship-prod-11a.sh
#   bash scripts/rollback-prod-11a.sh --dry-run [id]  # validate + print every command; changes nothing
#
# Method (checked 2026-10-15, wrangler 4.151.x): wrangler has NO "pages rollback" command
# (`wrangler pages deployment` offers only list | create | tail | delete), so the rollback uses the
# Cloudflare API endpoint the dashboard "Rollback" button uses:
#   POST https://api.cloudflare.com/client/v4/accounts/{account}/pages/projects/kissansahyog-prod/deployments/{id}/rollback
# Auth: $CLOUDFLARE_API_TOKEN if set, otherwise wrangler's own OAuth login token (scope pages:write,
# read from wrangler's config file after a wrangler command has refreshed it). The token is never printed.
# No rebuild, no git command that writes, no database access.
#
# Database: this script changes NO database. Migration 0065 (Batch 10G) stays after a website rollback, and
# that is safe: it only ADDS a status value, columns, a log table, functions and a storage DELETE policy that
# only allows removing photos of listings that were already deleted; older websites never call it. Its
# rollback SQL (docs/review/batch10g/PROD_ROLLBACK_0065.sql) is a separate founder step, AFTER this.
# (Batch 10F had no database step.) Batch 10E's two database
# steps stay in place after a website rollback, and that is safe: migration 0064 only ADDS the function
# app_register_phone (an older website never calls it), and the mandi history backfill only ADDS price
# rows. Undoing 0064 is a separate, manual founder step (docs/review/batch10e/SHIP.md, step 2 rollback
# SQL) and must only be done AFTER a website rollback to a version without phone-only sign-up.
set -uo pipefail

PROJECT="kissansahyog-prod"
SITE="https://kissansahyog.com"
ACCOUNT_ID="${CF_ACCOUNT_ID:-9ad1ef464c60a7db797b4bb097d545e5}"
API="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EV="$ROOT/docs/review/batch11a/evidence/prod-ship"
RECORDED="$EV/prod-deployment-before.txt"
NIGHT_SNAP="$ROOT/docs/review/batch11a/evidence/prod-before.json"
ID_10C="7f5dc56a-9d1c-4bd2-8bde-a4512a96be20"   # prod Production deployment since the Batch 10C ship (source 40ddc4d, release-10c; main chunk /assets/index-NFbe6Fk2.js)
CLOSE_10D="docs/review/batch10d/CLOSE_REPORT.md" # exists only once Batch 10D was shipped and closed on its own
CLOSE_10E="docs/review/batch10e/CLOSE_REPORT.md" # exists only once Batch 10E was shipped and closed
CLOSE_10F="docs/review/batch10f/CLOSE_REPORT.md" # exists only once Batch 10F was shipped and closed
CLOSE_10G="docs/review/batch10g/CLOSE_REPORT.md" # exists only once Batch 10G was shipped and closed

DRY=0; TARGET=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,32p "$0"; exit 0 ;;
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
    say "target: recorded by ship-prod-11a.sh in $RECORDED -> $TARGET"
  else
    # Fallback = the deployment that was live before Batch 11A: Batch 10G if it shipped (its close report, here
    # or on origin/release-10g), else 10F, else 10E, else 10D if it shipped on its own, otherwise Batch 10C.
    REPORT_10G="$(cat "$CLOSE_10G" 2>/dev/null || git show "origin/release-10g:$CLOSE_10G" 2>/dev/null || true)"
    ID_10G="$(grep -iE 'new[^|]*deployment' <<<"$REPORT_10G" | grep -viE 'previous|before|old' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
    REPORT_10F="$(cat "$CLOSE_10F" 2>/dev/null || git show "origin/release-10f:$CLOSE_10F" 2>/dev/null || true)"
    ID_10F="$(grep -iE 'new[^|]*deployment' <<<"$REPORT_10F" | grep -viE 'previous|before|old' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
    REPORT_10E="$(cat "$CLOSE_10E" 2>/dev/null || git show "origin/release-10e:$CLOSE_10E" 2>/dev/null || true)"
    ID_10E="$(grep -iE 'new[^|]*deployment' <<<"$REPORT_10E" | grep -viE 'previous|before|old' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
    REPORT_10D="$(cat "$CLOSE_10D" 2>/dev/null || git show "origin/release-10d:$CLOSE_10D" 2>/dev/null || true)"
    ID_10D="$(grep -iE 'new[^|]*deployment' <<<"$REPORT_10D" | grep -viE 'previous|before|old' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
    if [ -n "$ID_10G" ]; then
      TARGET="$ID_10G"
      say "target: no recorded id ($RECORDED missing) -> fallback $TARGET (Batch 10G production deployment, from its close report)"
    elif [ -n "$ID_10F" ]; then
      TARGET="$ID_10F"
      say "target: no recorded id ($RECORDED missing) -> fallback $TARGET (Batch 10F production deployment, from its close report)"
    elif [ -n "$ID_10E" ]; then
      TARGET="$ID_10E"
      say "target: no recorded id ($RECORDED missing) -> fallback $TARGET (Batch 10E production deployment, from its close report)"
    elif [ -n "$ID_10D" ]; then
      TARGET="$ID_10D"
      say "target: no recorded id ($RECORDED missing) -> fallback $TARGET (Batch 10D production deployment, from its close report)"
    else
      TARGET="$ID_10C"
      say "target: no recorded id ($RECORDED missing) -> fallback $TARGET (Batch 10C; no Batch 10D close report found)"
    fi
    say "  (if unsure, pass the id that ship-prod-11a.sh printed as 'rollback target')"
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

# ---------- 11A: are the auth flags OFF on production? (read-only; anon key from .env.production, never printed)
say "+ node scripts/batch11a/prod-probes.mjs flags   (read-only: get_auth_flags on production)"
if [ "$DRY" = 1 ] && [ "${KS_SKIP_DB_PROBE:-}" = 1 ]; then
  FLAGS="FLAGS=not read in this dry run (KS_SKIP_DB_PROBE=1); a real run reads them"
else
  FLAGS="$(timeout 60 node scripts/batch11a/prod-probes.mjs flags 2>&1 | grep -o '^FLAGS=.*' | head -1)"
fi
say "  ${FLAGS:-FLAGS=unknown}"
if grep -q 'true' <<<"$FLAGS"; then
  loud "WARNING: an auth flag is ON on production. Switch BOTH flags OFF first (docs/review/batch11a/SHIP.md step 10),
or the older website will not be able to sign phone users in or let anyone act. This script does not change them."
fi

# ---------- the rollback ----------
say "+ POST $API/deployments/$TARGET/rollback   (Authorization: Bearer <token, not shown>)"
if [ "$DRY" = 1 ]; then
  say "+ (then) poll GET $API until canonical_deployment.id == $TARGET (max 3 min)"
  say "+ (then) node scripts/verify-batch9-live.mjs --base $SITE --out $EV/after-rollback --label prod-after-rollback --checks pages,compare --snapshot $SNAP"
  say "  (no database step: a website rollback leaves migration 0064 and the mandi backfill rows in place; both are additive and safe for the older website)"
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
