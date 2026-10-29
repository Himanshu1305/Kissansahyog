#!/usr/bin/env bash
# Batch 16E Phase 2 - STAGING ONLY probe: can a Supabase Edge Function in Mumbai reach data.gov.in?
# Deploys supabase/functions/mandi-probe to staging, sets its secrets (the data.gov.in key is typed silently, never stored),
# calls it three times and writes docs/review/batch16e/PROBE_RESULTS.txt (no secrets in it).
set -uo pipefail
STAGING_REF="wzxtqbqlahyahsnoqqva"
PROD_REF="eltmcznjcqiahqhjvpjg"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
[ "$STAGING_REF" != "$PROD_REF" ] || { echo "refusing: ref is production"; exit 1; }
URL="https://${STAGING_REF}.supabase.co/functions/v1/mandi-probe"
case "$URL" in *"$PROD_REF"*) echo "refusing: URL contains the production ref"; exit 1;; esac
read -rsp "data.gov.in API key (typed silently): " DGI; echo
[ -n "$DGI" ] || { echo "no key entered"; exit 1; }
CRON_SECRET="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
supabase secrets set --project-ref "$STAGING_REF" "DATA_GOV_IN_API_KEY=$DGI" "CRON_SECRET=$CRON_SECRET" >/dev/null || { echo "setting secrets failed"; unset DGI; exit 1; }
unset DGI
supabase functions deploy mandi-probe --project-ref "$STAGING_REF" --no-verify-jwt --use-api || { echo "deploy failed"; exit 1; }
OUT="docs/review/batch16e/PROBE_RESULTS.txt"
: > "$OUT"
call() { # label, region-header-or-empty
  local label="$1" region="$2" hdrs; hdrs="$(mktemp)"
  local args=(-sS -m 40 -D "$hdrs" -H "x-cron-secret: $CRON_SECRET")
  [ -n "$region" ] && args+=(-H "x-region: $region")
  local body; body="$(curl "${args[@]}" "$URL" 2>&1)"
  local edge; edge="$(grep -i '^x-sb-edge-region\|^sb-request-id' "$hdrs" | tr -d '\r' | tr '\n' ' ')"
  echo "[$label] region_header=${region:-none} | $edge| $body" | tee -a "$OUT"
  rm -f "$hdrs"
}
call "a" "ap-south-1"
echo "waiting 60 s for call b ..."; sleep 60
call "b" "ap-south-1"
call "c" ""
echo "Done. Results saved in $OUT (no secrets inside). Tell Claude: probe done."
