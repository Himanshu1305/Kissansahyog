#!/usr/bin/env bash
# Batch 16E - put the mandi price fetcher (Supabase Edge Function "mandi-refresh", runs in Mumbai) on PRODUCTION.
# The founder runs this AFTER release-16e is merged to main. It does not build or deploy the website.
#
#   bash scripts/ship-prod-16e.sh --dry-run   # prints every step, changes nothing, asks nothing
#   bash scripts/ship-prod-16e.sh             # the real thing
#
# What a real run does:
#   1. checks you are on main with the function files committed and the Supabase CLI logged in
#   2. shows the production project ref and makes you type it to confirm
#   3. asks for your data.gov.in API key (typed silently, never saved)
#   4. makes a random CRON_SECRET in memory (never saved to a file)
#   5. sets the three function secrets on production and deploys the function (no JWT check; the secret header is the lock)
#   6. prints ONE SQL block to paste in the production SQL editor (Vault secrets + the 3-hourly schedule, migration 0071)
#   7. prints the test commands that fill the first 14 days, then tells you to run docs/review/batch16c/verify-prod.sql
# Rollback: bash scripts/rollback-prod-16e.sh
set -uo pipefail

PROD_REF="eltmcznjcqiahqhjvpjg"
STAGING_REF="wzxtqbqlahyahsnoqqva"
FN="mandi-refresh"
MIGRATION="supabase/migrations/0071_mandi_refresh_schedule.sql"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -h|--help) sed -n 2,19p "$0"; exit 0 ;;
    *) echo "unknown option: $a"; exit 2 ;;
  esac
done

say()  { printf '%s\n' "$*"; }
loud() { printf '\n==================================================================\n%s\n==================================================================\n' "$*"; }
die()  { loud "STOPPED: $*"; exit 1; }
# Dry run: a problem is a warning ("pending"); a real run stops.
need() { if [ "$DRY" = 1 ]; then say "  [pending] $*"; else die "$*"; fi; }

[ "$PROD_REF" != "$STAGING_REF" ] || die "internal error: refs are equal"
if [ "$DRY" = 1 ]; then loud "DRY RUN - nothing is changed, no key is asked, no command touches Supabase"; else loud "Batch 16E - PRODUCTION ship of the mandi fetcher"; fi

say "Step 1: preconditions"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
if [ "$BRANCH" = "main" ]; then say "  on main: ok"; else need "you are on '$BRANCH'; merge release-16e into main first and run this on main"; fi
DIRTY="$(git status --porcelain -- supabase/functions "$MIGRATION" scripts/ship-prod-16e.sh scripts/rollback-prod-16e.sh 2>/dev/null)"
if [ -z "$DIRTY" ]; then say "  function + migration files committed: ok"; else need "uncommitted changes in the files this script needs"; fi
for f in supabase/functions/mandi-refresh/index.ts supabase/functions/_shared/mandi-core.js "$MIGRATION" docs/review/batch16c/verify-prod.sql; do
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
say "Step 3: data.gov.in API key"
if [ "$DRY" = 1 ]; then
  say "  [dry-run] would ask for DATA_GOV_IN_API_KEY (typed silently, kept only in memory)"
  DGI="DRY-RUN"
else
  read -rsp "  data.gov.in API key (typed silently): " DGI; echo
  [ -n "$DGI" ] || die "no key entered"
fi

say ""
say "Step 4: random cron secret (kept in memory only)"
if [ "$DRY" = 1 ]; then
  CRON_SECRET="<64 hex characters, made at run time>"
  say "  [dry-run] would generate a 32-byte secret"
else
  CRON_SECRET="$( (openssl rand -hex 32 2>/dev/null) || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" )"
  [ "${#CRON_SECRET}" -ge 64 ] || die "could not generate a secret"
  say "  generated (not saved)"
fi

say ""
say "Step 5: function secrets + deploy on production"
if [ "$DRY" = 1 ]; then
  say "  [dry-run] would run: supabase secrets set --project-ref $PROD_REF DATA_GOV_IN_API_KEY=*** CRON_SECRET=*** EXPECT_PROJECT_REF=$PROD_REF"
  say "  [dry-run] would run: supabase functions deploy $FN --project-ref $PROD_REF --no-verify-jwt"
else
  supabase secrets set --project-ref "$PROD_REF" "DATA_GOV_IN_API_KEY=$DGI" "CRON_SECRET=$CRON_SECRET" "EXPECT_PROJECT_REF=$PROD_REF" >/dev/null || die "setting the function secrets failed (nothing else was done)"
  unset DGI
  say "  secrets set (values not shown)"
  supabase functions deploy "$FN" --project-ref "$PROD_REF" --no-verify-jwt --use-api || die "deploy failed"
fi

say ""
say "Step 6: the SQL block for the PRODUCTION SQL editor"
say "  Open https://supabase.com/dashboard/project/$PROD_REF/sql/new , paste everything between the lines, press Run."
say "  The secret below is shown once and is not saved anywhere. If you lose it, run this script again."
SQL_VAULT="-- Batch 16E: Vault secrets for the schedule, then the schedule itself (migration 0071)
delete from vault.secrets where name in ('project_url', 'mandi_cron_secret');
select vault.create_secret('https://$PROD_REF.supabase.co', 'project_url');
select vault.create_secret('$CRON_SECRET', 'mandi_cron_secret');
"
SQL_ALL="$SQL_VAULT$(cat "$MIGRATION")"
say "------------------------------------------------------------------"
printf '%s\n' "$SQL_ALL"
say "------------------------------------------------------------------"
if printf '%s' "$SQL_ALL" | LC_ALL=C grep -qP '[^\x00-\x7F]'; then need "the SQL block is not pure ASCII"; fi

say ""
say "Step 7: fill the first 14 days now (run in Git Bash; two calls because of the time limit, about 20 seconds each)"
URL="https://$PROD_REF.supabase.co/functions/v1/$FN"
say "  curl -sS -m 150 -X POST '$URL' -H 'x-region: ap-south-1' -H 'x-cron-secret: $CRON_SECRET' -H 'content-type: application/json' -d '{\"crops\":[\"Wheat\",\"Soyabean\",\"Gram\",\"Lentil\",\"Moong\"],\"days\":14}'"
say "  curl -sS -m 150 -X POST '$URL' -H 'x-region: ap-south-1' -H 'x-cron-secret: $CRON_SECRET' -H 'content-type: application/json' -d '{\"crops\":[\"Urad\",\"Paddy(Dhan)(Common)\",\"Maize\",\"Mustard\",\"Garlic\"],\"days\":14}'"
say "  Each should answer {\"ok\":true, ... \"newest_price_date\":\"<yesterday or today>\" ...}. {\"ok\":false,\"error\":\"forbidden\"} means a wrong secret."
say ""
say "Step 8: check it"
say "  Paste docs/review/batch16c/verify-prod.sql in the production SQL editor. The newest Sagar-division price date should be within 1-2 days of today."
say "  The schedule then runs by itself every 3 hours (minute 5 and minute 12). The GitHub job is now only a watchdog: it goes red if the newest stored price is older than 3 days."
say ""
if [ "$DRY" = 1 ]; then loud "DRY RUN finished - nothing was changed."; else loud "Done. Now run Step 6 (SQL), Step 7 (the two curl calls) and Step 8 (verify)."; fi
