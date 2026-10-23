#!/usr/bin/env node
// One-off generator: builds scripts/ship-prod-15a.sh and scripts/rollback-prod-15a.sh from the 14A scripts.
//   node scripts/batch15a/make-ship-scripts.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const rd = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const wr = (p, s) => writeFileSync(new URL(`../../${p}`, import.meta.url), s, { encoding: 'utf8' })
const must = (s, a) => { if (!s.includes(a)) throw new Error('anchor missing: ' + a.slice(0, 90)); return a }
const rep = (s, a, b) => s.replace(must(s, a), () => b)

let s = rd('scripts/ship-prod-14a.sh')
for (const [a, b] of [['ship-prod-14a.sh', 'ship-prod-15a.sh'], ['rollback-prod-14a.sh', 'rollback-prod-15a.sh'], ['release-14a', 'release-15a'],
  ['batch14a', 'batch15a'], ['ship-14a', 'ship-15a'], ['pre-14a', 'pre-15a'], ['prod-before-14a', 'prod-before-15a']]) s = s.split(a).join(b)

// ---- header
const head = `#!/usr/bin/env bash
# Batch 15A - TEN YEARS OF MANDI PRICE HISTORY: the /msp "past years" chart (5-year average Modal price by month) and the
# "5-year average vs today" block, read from the new table public.mandi_monthly_history (migration 0069). Copy of
# scripts/ship-prod-14a.sh. release-15a = release-14a + 15A; the rollback target is whatever is live (Batch 14A,
# deployment 3c5b9bbf-ec87-4766-9c65-9136affcbd79, unless KS_EXPECT_LIVE_ID says otherwise).
# THIS BATCH NEEDS A DATABASE STEP FIRST (migration 0069, additive: one new table). The founder pastes
# docs/review/batch15a/PROD_MIGRATION_0069.sql and then the history parts (docs/review/batch15a/history-prod/part-NN.sql)
# into the PRODUCTION Supabase SQL editor BEFORE this script (see docs/review/batch15a/SHIP.md). The script never writes to
# any database: a REAL run only PROBES (read-only, public HTTP, anon key, one row) that the table answers 200. 404 / PGRST205
# = migration 0069 is not applied -> STOP, nothing changed. An EMPTY answer is fine (data not loaded yet: the page hides the
# two new sections by itself). In --dry-run the probe is NOT sent: the builder never reads the production database.
# The auth switches (otp_required=true, session_enforced=false) are read before and after and must be identical; the script
# never sets a switch.
#
`
const i = s.indexOf('# Ship branch release-15a to PRODUCTION')
if (i < 0) throw new Error('header anchor')
s = head + s.slice(i)

// ---- gate: Batch 14A shipped and closed
s = rep(s, 'GATE_TAG="ship-12b"   # Batch 12B ship tag; must be on origin (12B is live)', 'GATE_TAG="prod-14a"   # Batch 14A close tag; must be on origin (14A is live)')
s = rep(s, 'say "== G. first gate: Batch 12B shipped (tag $GATE_TAG on origin, $SITE/guide -> 200)"', 'say "== G. first gate: Batch 14A shipped and closed (tag $GATE_TAG on origin, $SITE/guide -> 200)"')
s = rep(s, '  say "  = satisfied: Batch 12B is shipped"', '  say "  = satisfied: Batch 14A is shipped and closed"')
s = rep(s, '  pending "Batch 12B must be shipped first (tag $GATE_TAG on origin, $SITE/guide must answer 200)"', '  pending "Batch 14A must be shipped and closed first (tag $GATE_TAG on origin, $SITE/guide must answer 200)"')

// ---- expected live deployment: Batch 14A
s = rep(s, '# 14A: the deployment this ship replaces is the Batch 13A one (source ee03dd9).\nID_11A="871f224c-af45-4ed9-a2e4-219aec7f71cc"; SRC_11A="Batch 13A production deployment (source ee03dd9)"\nsay "  expected live deployment (Batch 13A): $ID_11A"',
  '# 15A: the deployment this ship replaces is the Batch 14A one (source 6702137).\nID_11A="3c5b9bbf-ec87-4766-9c65-9136affcbd79"; SRC_11A="Batch 14A production deployment (source 6702137)"\nsay "  expected live deployment (Batch 14A): $ID_11A"')
s = rep(s, 'LIVE_IS="Batch 13A (from $SRC_11A; read from Cloudflare just now)"', 'LIVE_IS="Batch 14A (from $SRC_11A; read from Cloudflare just now)"')
s = rep(s, 'it is not the Batch 13A deployment ($ID_11A) — someone deployed or rolled back since Batch 14A was prepared.', 'it is not the Batch 14A deployment ($ID_11A) — someone deployed or rolled back since Batch 15A was prepared.')
s = rep(s, 'is not the expected 13A one (or KS_EXPECT_LIVE_ID)', 'is not the expected 14A one (or KS_EXPECT_LIVE_ID)')
s = rep(s, 'someone changed a switch since Batch 13A was prepared', 'someone changed a switch since Batch 15A was prepared')
s = rep(s, 'the switches are not what Batch 13A expects', 'the switches are not what Batch 15A expects')

// ---- 15A markers (verified against the built chunks; see docs/review/batch15a/evidence/markers.txt)
s = rep(s, "ANN_MARKER='get_active_announcements'", "HIST_MARKER='mandi_monthly_history'   # 15A: the history read (Msp chunk)\nAVG_TESTID='msp-avg5-body'               # 15A: the 5-year-average block (Msp chunk)\nNOTE_MARKER='अनुमान नहीं'                 # 15A: the \"not a forecast\" sentence (strings chunk, Hindi)\nANN_MARKER='get_active_announcements'")
s = rep(s, 'BROWSE_CHUNKS=(); STR_CHUNKS=();', 'HIST_CHUNKS=(); AVG_CHUNKS=(); NOTE_CHUNKS=(); BROWSE_CHUNKS=(); STR_CHUNKS=();')
s = rep(s, `  while IFS= read -r a; do [ -n "$a" ] && ANN_CHUNKS+=("/\${a#dist/}"); done`, `  while IFS= read -r a; do [ -n "$a" ] && HIST_CHUNKS+=("/\${a#dist/}"); done < <(grep -l "$HIST_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && AVG_CHUNKS+=("/\${a#dist/}"); done < <(grep -l -- "$AVG_TESTID" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && NOTE_CHUNKS+=("/\${a#dist/}"); done < <(grep -l -- "$NOTE_MARKER" dist/assets/*.js 2>/dev/null | head -3)
  while IFS= read -r a; do [ -n "$a" ] && ANN_CHUNKS+=("/\${a#dist/}"); done`)
s = rep(s, `  [ \${#ANN_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $ANN_MARKER (the 14A home announcement cards)"; miss=1; }`,
  `  [ \${#HIST_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js reads $HIST_MARKER (the 15A history read)"; miss=1; }
  [ \${#AVG_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $AVG_TESTID (the 15A 5-year-average block)"; miss=1; }
  [ \${#NOTE_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds '$NOTE_MARKER' (the 15A not-a-forecast sentence)"; miss=1; }
  [ \${#ANN_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js calls $ANN_MARKER (the 14A home announcement cards)"; miss=1; }`)

// ---- probe P: table mandi_monthly_history (read-only; NOT sent in --dry-run)
const a = s.indexOf('# ---------------------------------------------------------------- P. migration 0067 applied on production?')
const b = s.indexOf('say "+ timeout 120 npx wrangler pages deployment list')
if (a < 0 || b < 0) throw new Error('probe anchors')
const probe = `# ---------------------------------------------------------------- P. migration 0069 applied on production? (read-only probe)
# An anonymous select of ONE row (limit 1) from mandi_monthly_history through PostgREST. HTTP 200 = migration 0069 is applied
# (an empty list is fine: the history data is not loaded yet and the page hides the two new sections). 404 / PGRST205 =
# the table does not exist -> STOP. Nothing is written. In --dry-run this request is NOT sent (the builder never reads the
# production database); a real run sends it.
say "== P. read-only: is migration 0069 applied on production? (anon select of one row from mandi_monthly_history; the key is not printed)"
PROD_URL="https://\${PROD_REF}.supabase.co"
PROD_ANON="$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env.production | head -1 | cut -d= -f2- | tr -d '\\r\\"[:space:]')"
[ -n "$PROD_ANON" ] || stop ".env.production has no VITE_SUPABASE_ANON_KEY (cannot probe; nothing changed)"
say "+ GET $PROD_URL/rest/v1/mandi_monthly_history?select=commodity_en&limit=1   (apikey: <not shown>)"
if [ "$DRY" = 1 ]; then
  say "  (dry run: NOT sent. A real run sends it and STOPS on 404 / PGRST205 with 'apply PROD_MIGRATION_0069.sql first')"
  PENDING+=("not checked in a dry run: migration 0069 on production (PROD_MIGRATION_0069.sql must be pasted first; a real run probes it)")
else
  P_BODY="$(timeout 60 curl -s -w '\\n%{http_code}' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" "$PROD_URL/rest/v1/mandi_monthly_history?select=commodity_en&limit=1")"
  P_CODE="\${P_BODY##*$'\\n'}"
  say "  answer: HTTP $P_CODE"
  if [ "$P_CODE" = "200" ]; then
    if [ "$(printf '%s' "\${P_BODY%$'\\n'*}" | tr -d '[:space:]')" = "[]" ]; then say "  = migration 0069 is applied; the table is EMPTY (history not loaded yet: the page hides the new sections until it is)"
    else say "  = migration 0069 is applied and the table has data"; fi
  else
    stop "migration 0069 is NOT applied on production yet (mandi_monthly_history answered HTTP $P_CODE). Apply docs/review/batch15a/PROD_MIGRATION_0069.sql in the PRODUCTION Supabase SQL editor first. Nothing was changed."
  fi
fi

`
s = s.slice(0, a) + probe + s.slice(b)

// ---- post-deploy checks (real run only)
s = rep(s, '  # 13A: live Browse chunk and footer string carry the new code.', `  # 15A: the live chunks hold the history read, the 5-year-average block and the not-a-forecast sentence; the table answers 200.
  for pair in "HIST:$HIST_MARKER" "AVG:$AVG_TESTID" "NOTE:$NOTE_MARKER"; do
    var="\${pair%%:*}_CHUNKS[@]"; mk="\${pair#*:}"; found=0
    for a in "\${!var}"; do
      found=1
      body="$(timeout 60 curl -s -w '\\n%{http_code}' "$SITE$a")"; code="\${body##*$'\\n'}"
      if [ "$code" = "200" ] && grep -q -- "$mk" <<<"$body"; then say "PASS  [15a_chunks] GET $a -> 200, holds $mk"; else say "FAIL  [15a_chunks] GET $a -> $code (marker $mk)"; ok=1; fi
    done
    [ "$found" = 1 ] || { say "FAIL  [15a_chunks] no chunk holding $mk found in dist"; ok=1; }
  done
  code="$(timeout 60 curl -s -o /dev/null -w '%{http_code}' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" "$PROD_URL/rest/v1/mandi_monthly_history?select=commodity_en&limit=1")"
  if [ "$code" = "200" ]; then say "PASS  [15a_db] mandi_monthly_history answers 200 on production (anonymous select, one row)"; else say "FAIL  [15a_db] mandi_monthly_history -> $code"; ok=1; fi
  # 13A: live Browse chunk and footer string carry the new code.`)
s = rep(s, 'a Batch 10F/10G/11A/14A route, marker, OTP function, admin function or CSP check failed', 'a Batch 10F/10G/11A/14A/15A route, marker, OTP function, admin function, history table or CSP check failed')
s = rep(s, 'the new build is missing a Batch 10C/10E/10F/10G/11A/12A marker', 'the new build is missing a Batch 10C/10E/10F/10G/11A/12A/14A/15A marker')
s = rep(s, 'NEXT: sign out and in again on the admin page, then run BATCH14A_CLOSE_PROMPT.md (verify, tag prod-14a, notes).', 'NEXT: open /msp/chana on the phone and check the two new sections (past years chart, 5-year average vs today), then run the Batch 15A close (verify, tag prod-15a, notes).')
wr('scripts/ship-prod-15a.sh', s)

let r = rd('scripts/rollback-prod-14a.sh')
for (const [x, y] of [['ship-prod-14a.sh', 'ship-prod-15a.sh'], ['rollback-prod-14a.sh', 'rollback-prod-15a.sh'], ['release-14a', 'release-15a'],
  ['batch14a', 'batch15a'], ['ship-14a', 'ship-15a'], ['pre-14a', 'pre-15a']]) r = r.split(x).join(y)
r = rep(r, '# Batch 13A — roll kissansahyog.com', '# Batch 15A — roll kissansahyog.com')
r = rep(r, '# Batch 14A adds migration 0067 (additive: new tables and functions only, no existing object changed): the website rollback needs no database step (the previous website simply ignores the new objects; PROD_ROLLBACK_0067.sql is optional and is NOT run by this script), and the two', '# Batch 15A adds migration 0069 (additive: ONE new table, mandi_monthly_history): the website rollback needs no database step (the previous website never reads the table; supabase/migrations/rollback/0069_mandi_monthly_history_rollback.sql is optional and is NOT run by this script), and the two')
r = rep(r, "(no database step: Batch 14A's migration 0067 is additive and no switch was changed; the previous website ignores the new objects)", "(no database step: Batch 15A's migration 0069 is additive and no switch was changed; the previous website never reads the new table)")
wr('scripts/rollback-prod-15a.sh', r)
console.log('ok')
