#!/usr/bin/env bash
# Batch 16H - put the weather refresher (Supabase Edge Function "weather-refresh", runs in Mumbai) on PRODUCTION and start its timer.
# The founder runs this AFTER release-16h is merged to main. It does not build or deploy the website. It asks for no key and makes no secret:
# the function secrets (CRON_SECRET, EXPECT_PROJECT_REF) and the Vault secrets (project_url, mandi_cron_secret) already exist from Batch 16E.
#
#   bash scripts/ship-prod-16h.sh --dry-run   # prints every step, changes nothing, asks nothing, never touches Supabase
#   bash scripts/ship-prod-16h.sh             # the real thing
#
# What a real run does:
#   1. checks you are on main with the function files committed and the Supabase CLI logged in
#   2. shows the production project ref and makes you type it to confirm
#   3. checks (names only) that the two function secrets exist, then deploys the function (no JWT check; the secret header is the lock)
#   4. prints SQL block 1 for the production SQL editor: the timer (migration 0072; it stops with a clear message if the Vault secrets are missing)
#   5. prints SQL block 2 (fires the function once through the database, using the Vault secret, so no secret is shown) and block 3 (the check)
#   6. tells you what healthy looks like
# Rollback: bash scripts/rollback-prod-16h.sh
set -uo pipefail

PROD_REF="eltmcznjcqiahqhjvpjg"
STAGING_REF="wzxtqbqlahyahsnoqqva"
FN="weather-refresh"
MIGRATION="supabase/migrations/0072_weather_refresh_schedule.sql"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,17p "$0"; exit 0 ;;
    *) echo "unknown option: $a"; exit 2 ;;
  esac
done

say()  { printf '%s\n' "$*"; }
loud() { printf '\n==================================================================\n%s\n==================================================================\n' "$*"; }
die()  { loud "STOPPED: $*"; exit 1; }
# Dry run: a problem is a warning ("pending"); a real run stops.
need() { if [ "$DRY" = 1 ]; then say "  [pending] $*"; else die "$*"; fi; }

[ "$PROD_REF" != "$STAGING_REF" ] || die "internal error: refs are equal"
if [ "$DRY" = 1 ]; then loud "DRY RUN - nothing is changed, no key is asked, no command touches Supabase"; else loud "Batch 16H - PRODUCTION ship of the weather refresher"; fi

say "Step 1: preconditions"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$BRANCH" = "main" ]; then say "  on main: ok"; else need "you are on '$BRANCH'; merge release-16h into main first and run this on main"; fi
DIRTY="$(git status --porcelain -- supabase/functions "$MIGRATION" scripts/ship-prod-16h.sh scripts/rollback-prod-16h.sh 2>/dev/null)"
if [ -z "$DIRTY" ]; then say "  function + migration files committed: ok"; else need "uncommitted changes in the files this script needs"; fi
for f in supabase/functions/weather-refresh/index.ts supabase/functions/_shared/weather-core.js "$MIGRATION"; do
  if [ -f "$f" ]; then say "  found $f"; else need "missing $f"; fi
done
if command -v supabase >/dev/null 2>&1; then
  say "  Supabase CLI: $(supabase --version 2>/dev/null | head -1)"
else
  need "Supabase CLI not found. Install it once:  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git  then  scoop install supabase  then  supabase login"
fi
if [ "$DRY" = 0 ]; then supabase projects list >/dev/null 2>&1 || die "Supabase CLI is not logged in. Run: supabase login"; fi

say ""
say "Step 2: confirm the target"
say "  PRODUCTION project ref: $PROD_REF"
if [ "$DRY" = 1 ]; then
  say "  [dry-run] would ask you to type that ref to confirm"
else
  read -rp "  Type the production ref to confirm: " TYPED
  [ "$TYPED" = "$PROD_REF" ] || die "ref did not match; nothing was changed"
fi

say ""
say "Step 3: deploy the function (no key is asked, no secret is made)"
if [ "$DRY" = 1 ]; then
  say "  [dry-run] would check the NAMES of the production function secrets: CRON_SECRET and EXPECT_PROJECT_REF must be listed (from Batch 16E)"
  say "  [dry-run] would run: supabase functions deploy $FN --project-ref $PROD_REF --no-verify-jwt --use-api"
else
  NAMES="$(supabase secrets list --project-ref "$PROD_REF" 2>/dev/null | awk -F'|' '{gsub(/ /,"",$1); print $1}')"
  for n in CRON_SECRET EXPECT_PROJECT_REF; do
    printf '%s\n' "$NAMES" | grep -qx "$n" || die "the production function secret $n is not set (it comes from Batch 16E). Nothing was changed."
  done
  say "  function secrets present: ok (values not read)"
  supabase functions deploy "$FN" --project-ref "$PROD_REF" --no-verify-jwt --use-api || die "deploy failed"
fi

say ""
say "Step 4: SQL block 1 - the timer. Open https://supabase.com/dashboard/project/$PROD_REF/sql/new , paste everything between the lines, press Run."
say "  If it says the Vault secrets are missing, stop and tell the architect. Running it twice is safe."
SQL_MIG="$(cat "$MIGRATION")"
say "------------------------------------------------------------------"
printf '%s\n' "$SQL_MIG"
say "------------------------------------------------------------------"
if printf '%s' "$SQL_MIG" | LC_ALL=C grep -qP '[^\x00-\x7F]'; then need "the SQL block is not pure ASCII"; fi

say ""
say "Step 5: SQL block 2 - fire the function once now (new SQL tab). The password comes from the Vault; it is not shown."
SQL_FIRE="select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/weather-refresh',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-region', 'ap-south-1',
    'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'mandi_cron_secret')
  ),
  body := '{\"mode\":\"forecast\",\"limit\":60}'::jsonb,
  timeout_milliseconds := 120000
) as request_id;"
say "------------------------------------------------------------------"
printf '%s\n' "$SQL_FIRE"
say "------------------------------------------------------------------"
say ""
say "Step 5b: SQL block 3 - wait about 30 seconds, then run this read-only check (new SQL tab)."
SQL_CHECK="select
  (select jsonb_agg(t) from (select grid_key, fetched_at, now() - fetched_at as age from public.weather_cache_v2 order by fetched_at desc limit 10) t) as newest_10_rows,
  (select jsonb_agg(r) from (select id, status_code, left(content::text, 400) as reply, created from net._http_response order by created desc limit 3) r) as last_3_replies;"
say "------------------------------------------------------------------"
printf '%s\n' "$SQL_CHECK"
say "------------------------------------------------------------------"
if printf '%s\n%s' "$SQL_FIRE" "$SQL_CHECK" | LC_ALL=C grep -qP '[^\x00-\x7F]'; then need "the SQL blocks are not pure ASCII"; fi

say ""
say "Step 6: what healthy looks like"
say "  - the newest rows have an age of a few minutes, and the cell 23.8_78.7 (Sagar town) is among them"
say "  - the newest reply has status_code 200 and starts with {\"ok\":true,\"mode\":\"forecast\" ... \"pilot_failed\":[] ... \"deadline_hit\":false"
say "  - open https://kisansahyog.in/mausam : it says 'Updated today' with a time from the last 2 hours"
say "  - from then on the timer fires at minute 20 of every 2nd hour (UTC) and minute 40 of every 6th hour (season rainfall); no GitHub involved"
say ""
if [ "$DRY" = 1 ]; then loud "DRY RUN finished - nothing was changed."; else loud "Done. Now run SQL block 1, then block 2, wait 30 seconds, then block 3."; fi
