#!/usr/bin/env bash
# Batch 11A — put the OTP secrets on a Cloudflare Pages project. RUN BY THE FOUNDER (not by Claude).
#   bash scripts/set-otp-secrets.sh staging     → Pages project kissansahyog       (staging.kissansahyog.com)
#   bash scripts/set-otp-secrets.sh prod        → Pages project kissansahyog-prod  (kissansahyog.com)
# Asks for each value with HIDDEN input (nothing is shown, stored in a file, or put on a command line) and
# pipes it straight to `npx wrangler pages secret put`. Prints only the NAMES it set and success / failure.
#   TWOFACTOR_API_KEY          the 2Factor.in API key
#   SUPABASE_SERVICE_ROLE_KEY  the service-role key of the SAME environment's Supabase project
#                              (Supabase dashboard → Project Settings → API). Staging and production differ.
#   SUPABASE_URL               set to that project's address (not a secret; set so the functions find the database)
# Press Enter on an empty prompt to skip that secret (keeps the value already set).
# A new secret is used by the NEXT deployment; the ship script deploys after this.
set -u
TARGET="${1:-}"
case "$TARGET" in
  staging) PROJECT="kissansahyog";      REF="wzxtqbqlahyahsnoqqva" ;;
  prod)    PROJECT="kissansahyog-prod"; REF="eltmcznjcqiahqhjvpjg" ;;
  *) echo "usage: bash scripts/set-otp-secrets.sh <staging|prod>"; exit 2 ;;
esac
echo "Setting OTP secrets on Cloudflare Pages project '$PROJECT' ($TARGET). Input is hidden."

put() { # name, value (value arrives on stdin of wrangler, never as an argument)
  local name="$1" value="$2"
  if printf '%s' "$value" | npx wrangler pages secret put "$name" --project-name "$PROJECT" > /dev/null 2>&1; then
    echo "  OK      $name"
  else
    echo "  FAILED  $name  (run: npx wrangler login, then try again)"; FAILED=1
  fi
}
FAILED=0

read -r -s -p "2Factor API key (TWOFACTOR_API_KEY), Enter to skip: " TF; echo
if [ -n "$TF" ]; then
  if ! printf '%s' "$TF" | grep -Eq '^[A-Za-z0-9-]{20,80}$'; then echo "  REFUSED TWOFACTOR_API_KEY — that does not look like a 2Factor key (letters, digits, dashes)"; FAILED=1
  else put TWOFACTOR_API_KEY "$TF"; fi
else echo "  skipped TWOFACTOR_API_KEY"; fi
unset TF

read -r -s -p "Supabase service-role key for $TARGET (SUPABASE_SERVICE_ROLE_KEY), Enter to skip: " SK; echo
if [ -n "$SK" ]; then
  # Refuse a key of the other environment (JWT keys carry the project ref; nothing is printed).
  PAYLOAD=$(printf '%s' "$SK" | cut -d. -f2 | tr '_-' '/+')
  while [ $(( ${#PAYLOAD} % 4 )) -ne 0 ]; do PAYLOAD="$PAYLOAD="; done
  DECODED=$(printf '%s' "$PAYLOAD" | base64 -d 2>/dev/null || true)
  if printf '%s' "$SK" | grep -q '^eyJ' && ! printf '%s' "$DECODED" | grep -q "\"ref\":\"$REF\""; then
    echo "  REFUSED SUPABASE_SERVICE_ROLE_KEY — this key is not for the $TARGET project"; FAILED=1
  elif printf '%s' "$SK" | grep -q '^eyJ' && ! printf '%s' "$DECODED" | grep -q '"role":"service_role"'; then
    echo "  REFUSED SUPABASE_SERVICE_ROLE_KEY — this is not a service-role key (the anon key?)"; FAILED=1
  else
    put SUPABASE_SERVICE_ROLE_KEY "$SK"
  fi
  unset PAYLOAD DECODED
else echo "  skipped SUPABASE_SERVICE_ROLE_KEY"; fi
unset SK

put SUPABASE_URL "https://$REF.supabase.co"

echo "Secret names now on $PROJECT:"
npx wrangler pages secret list --project-name "$PROJECT" 2>/dev/null | grep -E '^\s+- ' | sed -E 's/:.*$//'
if [ "$FAILED" -ne 0 ]; then echo "RESULT: FAILED (see above)"; exit 1; fi
echo "RESULT: OK — the next deployment of $PROJECT uses these secrets."
