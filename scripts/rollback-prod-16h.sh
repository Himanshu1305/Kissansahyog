#!/usr/bin/env bash
# Batch 16H rollback - stop the production weather timer: unschedule both cron jobs and delete the Edge Function.
# Stored weather stays. The website and the GitHub job are not touched (the GitHub job keeps refreshing weather).
#
#   bash scripts/rollback-prod-16h.sh --dry-run
#   bash scripts/rollback-prod-16h.sh
set -uo pipefail

PROD_REF="eltmcznjcqiahqhjvpjg"
FN="weather-refresh"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,7p "$0"; exit 0 ;;
    *) echo "unknown option: $a"; exit 2 ;;
  esac
done

say() { printf '%s\n' "$*"; }
die() { printf '\nSTOPPED: %s\n' "$*"; exit 1; }

if [ "$DRY" = 1 ]; then say "DRY RUN - nothing is changed"; else say "Batch 16H rollback on PRODUCTION ($PROD_REF)"; fi
say ""
say "Step 1: unschedule both cron jobs. Paste this in the production SQL editor (https://supabase.com/dashboard/project/$PROD_REF/sql/new) and press Run:"
say "------------------------------------------------------------------"
cat supabase/migrations/rollback/0072_weather_refresh_schedule_rollback.sql
say "------------------------------------------------------------------"
say ""
say "Step 2: delete the function"
if [ "$DRY" = 1 ]; then
  say "  [dry-run] would run: supabase functions delete $FN --project-ref $PROD_REF"
  exit 0
fi
read -rp "Type the production ref to confirm deleting the function: " TYPED
[ "$TYPED" = "$PROD_REF" ] || die "ref did not match; nothing was changed"
supabase functions delete "$FN" --project-ref "$PROD_REF" || die "delete failed"
say "Function deleted. Stored weather is untouched. The Vault secrets and the mandi timer are left alone (the mandi fetcher still needs them)."
