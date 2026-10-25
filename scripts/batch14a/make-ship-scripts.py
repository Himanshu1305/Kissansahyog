# One-off generator: builds scripts/ship-prod-14a.sh and scripts/rollback-prod-14a.sh from the 13A scripts.
import re

s = open('scripts/ship-prod-13a.sh', encoding='utf8').read()
for a, b in [('ship-prod-13a.sh', 'ship-prod-14a.sh'), ('rollback-prod-13a.sh', 'rollback-prod-14a.sh'), ('release-13a', 'release-14a'),
             ('batch13a', 'batch14a'), ('ship-13a', 'ship-14a'), ('pre-13a', 'pre-14a'), ('--label prod-before-13a', '--label prod-before-14a')]:
    s = s.replace(a, b)

head = """#!/usr/bin/env bash
# Batch 14A - ADMIN CONSOLE (tabs + panel search, announcement cards, security switches + SMS usage, block users + roles,
# admin action log). Copy of scripts/ship-prod-13a.sh. release-14a = release-13a + 14A, so this ship also carries Batch 13A
# (Browse page, footer) and every earlier unshipped batch; the rollback target is whatever is live (12B unless
# KS_EXPECT_LIVE_ID says otherwise).
# THIS BATCH CHANGES THE DATABASE (migration 0067, additive). The founder pastes docs/review/batch14a/PROD_MIGRATION_0067.sql
# into the PRODUCTION Supabase SQL editor BEFORE this script. The script never writes to any database: it only PROBES
# (read-only, public HTTP, anon key) that get_active_announcements() answers 200 = migration applied; any other answer
# STOPS with "apply PROD_MIGRATION_0067.sql first" and changes nothing (also in --dry-run).
# The auth switches (otp_required=true, session_enforced=false) are read before and after and must be identical.
#
"""
i = s.index('# Ship branch release-14a to PRODUCTION')
s = head + s[i:]

s = re.sub(r"FEST_MARKER=.*\nFEST_ID=.*\nFEST_IMG=.*\n", """ANN_MARKER='get_active_announcements'   # 14A: the home announcement cards (Homepage chunk)
ANN_TESTID='announcement-card'           # 14A: the card component
ADMIN_MARKER='admin_get_security_status' # 14A: the security panel (Security tab chunk)
SHELL_MARKER='panel-search'              # 14A: the admin shell (panel search box)
LOGAPI_MARKER='admin_log_console_action' # 14A: the console action log wrapper (adminApi)
""", s)
s = s.replace("FEST_CHUNKS=(); ", "ANN_CHUNKS=(); ADMIN_CHUNKS=(); SHELL_CHUNKS=(); LOGAPI_CHUNKS=(); ")
old = """  while IFS= read -r a; do [ -n "$a" ] && FEST_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$FEST_MARKER" dist/assets/*.js 2>/dev/null | head -3)
"""
new = """  while IFS= read -r a; do [ -n "$a" ] && ANN_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$ANN_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && ADMIN_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$ADMIN_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && SHELL_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$SHELL_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && LOGAPI_CHUNKS+=("/${a#dist/}"); done < <(grep -l "$LOGAPI_MARKER" dist/assets/*.js 2>/dev/null | head -3)
"""
assert old in s
s = s.replace(old, new)

old = """  [ ${#FEST_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds '$FEST_MARKER' (the 12B greeting text)"; miss=1; }
  grep -lq -- "$FEST_ID" dist/assets/*.js 2>/dev/null || { say "  MISSING: $FEST_ID in dist/assets/*.js (the 12B date gate)"; miss=1; }
  [ -s "dist$FEST_IMG" ] || { say "  MISSING: dist$FEST_IMG (the 12B picture)"; miss=1; }
  if grep -q 'data-testid="festival-card"' dist/index.html 2>/dev/null; then say "  STILL THERE: festival-card in dist/index.html (the card must never be prerendered)"; miss=1; fi
"""
new = """  [ ${#ANN_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $ANN_MARKER (the 14A home announcement cards)"; miss=1; }
  grep -lq -- "$ANN_TESTID" dist/assets/*.js 2>/dev/null || { say "  MISSING: $ANN_TESTID in dist/assets/*.js (the 14A card component)"; miss=1; }
  [ ${#ADMIN_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $ADMIN_MARKER (the 14A security panel / admin chunk)"; miss=1; }
  [ ${#SHELL_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $SHELL_MARKER (the 14A admin shell)"; miss=1; }
  [ ${#LOGAPI_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $LOGAPI_MARKER (the 14A action-log wrapper)"; miss=1; }
  [ -s "dist/festival/neelkanth.webp" ] || { say "  MISSING: dist/festival/neelkanth.webp (kept for announcements)"; miss=1; }
  if grep -q 'data-testid="festival-card"\\|data-testid="announcement-card"\\|data-testid="announcements"' dist/index.html 2>/dev/null; then say "  STILL THERE: a festival / announcement card in dist/index.html (it must never be prerendered)"; miss=1; fi
  { [ -f functions/api/admin/sms-balance.js ] && [ -f functions/lib/admin-auth.js ]; } || { say "  MISSING: the admin Pages Functions (functions/api/admin/sms-balance.js, functions/lib/admin-auth.js)"; miss=1; }
"""
assert old in s
s = s.replace(old, new)

old = "  # 13A: live Browse chunk and footer string carry the new code."
new = """  # 14A: live chunks hold the announcement cards and the admin console; the admin function answers 401 without a session.
  for pair in "ANN:$ANN_MARKER" "ADMIN:$ADMIN_MARKER" "SHELL:$SHELL_MARKER" "LOGAPI:$LOGAPI_MARKER"; do
    var="${pair%%:*}_CHUNKS[@]"; mk="${pair#*:}"; found=0
    for a in "${!var}"; do
      found=1
      body="$(timeout 60 curl -s -w '\\n%{http_code}' "$SITE$a")"; code="${body##*$'\\n'}"
      if [ "$code" = "200" ] && grep -q -- "$mk" <<<"$body"; then say "PASS  [14a_chunks] GET $a -> 200, holds $mk"; else say "FAIL  [14a_chunks] GET $a -> $code (marker $mk)"; ok=1; fi
    done
    [ "$found" = 1 ] || { say "FAIL  [14a_chunks] no chunk holding $mk found in dist"; ok=1; }
  done
  code="$(timeout 60 curl -s -o /dev/null -w '%{http_code}' "$SITE/api/admin/sms-balance?ks_ship=$STAMP")"
  if [ "$code" = "401" ]; then say "PASS  [14a_admin_fn] GET /api/admin/sms-balance without a session -> 401"; else say "FAIL  [14a_admin_fn] GET /api/admin/sms-balance without a session -> $code (expected 401)"; ok=1; fi
  code="$(timeout 60 curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" -d '{}' "$PROD_URL/rest/v1/rpc/get_active_announcements")"
  if [ "$code" = "200" ]; then say "PASS  [14a_db] get_active_announcements() answers 200 on production"; else say "FAIL  [14a_db] get_active_announcements() -> $code"; ok=1; fi
  # 13A: live Browse chunk and footer string carry the new code."""
assert old in s
s = s.replace(old, new, 1)

probe = """
# ---------------------------------------------------------------- P. migration 0067 applied on production? (read-only probe)
# get_active_announcements() is a STABLE function callable by anon: HTTP 200 = migration 0067 is applied. Nothing is written.
say "== P. read-only: is migration 0067 applied on production? (anon RPC get_active_announcements; the key is not printed)"
PROD_URL="https://${PROD_REF}.supabase.co"
PROD_ANON="$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env.production | head -1 | cut -d= -f2- | tr -d '\\r\\"[:space:]')"
[ -n "$PROD_ANON" ] || stop ".env.production has no VITE_SUPABASE_ANON_KEY (cannot probe; nothing changed)"
say "+ POST $PROD_URL/rest/v1/rpc/get_active_announcements   (apikey: <not shown>)"
P_CODE="$(timeout 60 curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" -d '{}' "$PROD_URL/rest/v1/rpc/get_active_announcements")"
say "  answer: HTTP $P_CODE"
if [ "$P_CODE" = "200" ]; then
  say "  = migration 0067 is applied on production"
else
  stop "migration 0067 is NOT applied on production yet (get_active_announcements answered HTTP $P_CODE). Apply docs/review/batch14a/PROD_MIGRATION_0067.sql in the PRODUCTION Supabase SQL editor first. Nothing was changed."
fi
"""
marker = '\nsay "+ timeout 120 npx wrangler pages deployment list --project-name $PROJECT   (read-only)"'
assert marker in s
s = s.replace(marker, probe + marker, 1)
s = s.replace("NEXT: run BATCH12B_CLOSE_PROMPT.md (verify, tag prod-12b, notes). No database step.",
              "NEXT: sign out and in again on the admin page, then run BATCH14A_CLOSE_PROMPT.md (verify, tag prod-14a, notes).")
s = s.replace("a Batch 10F/10G/11A route, marker, OTP function or CSP check failed", "a Batch 10F/10G/11A/14A route, marker, OTP function, admin function or CSP check failed")
open('scripts/ship-prod-14a.sh', 'w', encoding='utf8', newline='\n').write(s)

r = open('scripts/rollback-prod-13a.sh', encoding='utf8').read()
for a, b in [('ship-prod-13a.sh', 'ship-prod-14a.sh'), ('rollback-prod-13a.sh', 'rollback-prod-14a.sh'), ('release-13a', 'release-14a'),
             ('batch13a', 'batch14a'), ('ship-13a', 'ship-14a'), ('pre-13a', 'pre-14a')]:
    r = r.replace(a, b)
open('scripts/rollback-prod-14a.sh', 'w', encoding='utf8', newline='\n').write(r)
print('ok')
