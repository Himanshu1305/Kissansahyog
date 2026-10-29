#!/usr/bin/env bash
# Batch 16E rollback - stop the production mandi fetcher: unschedule both cron jobs and delete the Edge Function.
# Stored prices stay. The website is not touched.
#
#   bash scripts/rollback-prod-16e.sh --dry-run
#   bash scripts/rollback-prod-16e.sh
set -uo pipefail

PROD_REF="eltmcznjcqiahqhjvpjg"
FN="mandi-refresh"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,6p "$0"; exit 0 ;;
    *) echo "unknown option: $a"; exit 2 ;;
  esac
done

say() { printf '%s\n' "$*"; }
die() { printf '\nSTOPPED: %s\n' "$*"; exit 1; }

if [ "$DRY" = 1 ]; then say "DRY RUN - nothing is changed"; else say "Batch 16E rollback on PRODUCTION ($PROD_REF)"; fi
say ""
say "Step 1: unschedule both cron jobs. Paste this in the production SQL editor (https://supabase.com/dashboard/project/$PROD_REF/sql/new) and press Run:"
say "------------------------------------------------------------------"
cat supabase/migrations/rollback/0071_mandi_refresh_schedule_rollback.sql
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
say "Function deleted. Stored prices are untouched. Optional, in the SQL editor: delete from vault.secrets where name in ('project_url','mandi_cron_secret');"
