#!/usr/bin/env node
// One-off generator: builds scripts/ship-prod-15b.sh and scripts/rollback-prod-15b.sh from the 15A scripts.
//   node scripts/batch15b/make-ship-scripts.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const rd = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const wr = (p, s) => writeFileSync(new URL(`../../${p}`, import.meta.url), s, { encoding: 'utf8' })
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error('anchor missing: ' + a.slice(0, 90)); return s.replace(a, () => b) }
const RENAMES = [['ship-prod-15a.sh', 'ship-prod-15b.sh'], ['rollback-prod-15a.sh', 'rollback-prod-15b.sh'], ['release-15a', 'release-15b'],
  ['batch15a', 'batch15b'], ['ship-15a', 'ship-15b'], ['pre-15a', 'pre-15b'], ['prod-before-15a', 'prod-before-15b']]
const LIVE_15A = '3b8ce6d9-f29c-4741-8783-e6fe36ad9f16'

// ------------------------------------------------------------------ ship
let s = rd('scripts/ship-prod-15a.sh')
// keep the 15A deployment id wording before the blanket rename
for (const [a, b] of RENAMES) s = s.split(a).join(b)

const i = s.indexOf('# Ship branch release-15b to PRODUCTION')
if (i < 0) throw new Error('header anchor')
s = `#!/usr/bin/env bash
# Batch 15B - the page /fasal-salah/kam-pani ("कम पानी में कौन-सी फसल"): static, sourced content plus today's Sagar-mandi price, the
# 5-year harvest-time average (Batch 15A table) and the MSP of 2027-28. Copy of scripts/ship-prod-15a.sh.
# release-15b = release-15a + 15B; the rollback target is whatever is live (Batch 15A, deployment ${LIVE_15A},
# unless KS_EXPECT_LIVE_ID says otherwise).
# NO DATABASE STEP in this batch (no migration, no write). The only database contact of a REAL run is one read-only anonymous
# probe that mandi_monthly_history answers; if it does not, the script only PRINTS A WARNING (the page then hides its 5-year
# parts by itself) and carries on. In --dry-run the probe is NOT sent: the builder never reads the production database.
# The auth switches (otp_required=true, session_enforced=false) are read before and after and must be identical; the script
# never sets a switch.
#
` + s.slice(i)

s = rep(s, 'GATE_TAG="prod-14a"   # Batch 14A close tag; must be on origin (14A is live)', 'GATE_TAG="ship-15a"   # Batch 15A ship tag; must be on origin (15A is live)')
s = rep(s, 'say "== G. first gate: Batch 14A shipped and closed (tag $GATE_TAG on origin, $SITE/guide -> 200)"', 'say "== G. first gate: Batch 15A shipped (tag $GATE_TAG on origin, $SITE/guide -> 200)"')
s = rep(s, '  say "  = satisfied: Batch 14A is shipped and closed"', '  say "  = satisfied: Batch 15A is shipped"')
s = rep(s, '  pending "Batch 14A must be shipped and closed first (tag $GATE_TAG on origin, $SITE/guide must answer 200)"', '  pending "Batch 15A must be shipped first (tag $GATE_TAG on origin, $SITE/guide must answer 200)"')

// expected live deployment = the one 15A's ship recorded
s = rep(s, '# 15A: the deployment this ship replaces is the Batch 14A one (source 6702137).\nID_11A="3c5b9bbf-ec87-4766-9c65-9136affcbd79"; SRC_11A="Batch 14A production deployment (source 6702137)"\nsay "  expected live deployment (Batch 14A): $ID_11A"',
  `# 15B: the deployment this ship replaces is the Batch 15A one (recorded when 15A shipped: source ad391e0).\nID_11A="${LIVE_15A}"; SRC_11A="Batch 15A production deployment (source ad391e0)"\nsay "  expected live deployment (Batch 15A): $ID_11A"`)
s = s.split('it is not the Batch 14A deployment').join('it is not the Batch 15A deployment')
s = s.split('someone deployed or rolled back since Batch 15A was prepared').join('someone deployed or rolled back since Batch 15B was prepared')
s = s.split('is not the expected 14A one').join('is not the expected 15A one')
s = s.split('Batch 14A (from ').join('Batch 15A (from ')

// section P: a warning only (no migration in 15B)
const p0 = s.indexOf('# ---------------------------------------------------------------- P. migration 0069')
const p1 = s.indexOf('say "+ timeout 120 npx wrangler pages deployment list')
if (p0 < 0 || p1 < 0) throw new Error('P anchors')
s = s.slice(0, p0) + `# ---------------------------------------------------------------- P. does the 15A history table answer? (read-only probe, WARNING ONLY)
# An anonymous select of ONE row (limit 1) from mandi_monthly_history. Anything but HTTP 200 only prints a warning: the page then
# hides its 5-year parts and still works. Nothing is written. In --dry-run this request is NOT sent.
say "== P. read-only: does mandi_monthly_history answer on production? (warning only; the key is not printed)"
PROD_URL="https://\${PROD_REF}.supabase.co"
PROD_ANON="$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env.production | head -1 | cut -d= -f2- | tr -d '\\r\\"[:space:]')"
[ -n "$PROD_ANON" ] || stop ".env.production has no VITE_SUPABASE_ANON_KEY (nothing changed)"
say "+ GET $PROD_URL/rest/v1/mandi_monthly_history?select=commodity_en&limit=1   (apikey: <not shown>)"
if [ "$DRY" = 1 ]; then
  say "  (dry run: NOT sent. A real run sends it and only WARNS if it does not answer 200)"
  PENDING+=("not sent in a dry run: probe that mandi_monthly_history answers on production (warning only)")
else
  P_BODY="$(timeout 60 curl -s -w '\\n%{http_code}' -H "apikey: $PROD_ANON" -H "Authorization: Bearer $PROD_ANON" "$PROD_URL/rest/v1/mandi_monthly_history?select=commodity_en&limit=1")"
  P_CODE="\${P_BODY##*$'\\n'}"
  say "  answer: HTTP $P_CODE"
  if [ "$P_CODE" = "200" ] && [ "$(printf '%s' "\${P_BODY%$'\\n'*}" | tr -d '[:space:]')" != "[]" ]; then say "  = the history table answers and has data"
  else say "  WARNING: the history table did not answer with data (HTTP $P_CODE). The page will hide its 5-year parts. Continuing."; fi
fi

` + s.slice(p1)

s = s.split('268/268').join('269/269')

// markers (literal strings verified against the built files: the chunk KamPani-*.js and dist/fasal-salah/kam-pani/index.html)
s = rep(s, "ANN_MARKER='get_active_announcements'", "KP_TESTID='kp-farm-pond-link'            # 15B: the farm-pond link (KamPani chunk)\nKP_TEXT='सुरक्षित फसलें और कमाई की तुलना'  # 15B: a section title (KamPani chunk, Hindi)\nKP_H1='कम पानी में कौन-सी फसल बोएँ'        # 15B: the H1, must be in the prerendered HTML\nKP_PATH='/fasal-salah/kam-pani'\nANN_MARKER='get_active_announcements'")
s = rep(s, 'HIST_CHUNKS=(); AVG_CHUNKS=();', 'KP_CHUNKS=(); HIST_CHUNKS=(); AVG_CHUNKS=();')
s = rep(s, '  while IFS= read -r a; do [ -n "$a" ] && HIST_CHUNKS+=', '  while IFS= read -r a; do [ -n "$a" ] && KP_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$KP_TESTID" dist/assets/*.js 2>/dev/null | head -3)\n  while IFS= read -r a; do [ -n "$a" ] && HIST_CHUNKS+=')
s = rep(s, '  [ ${#HIST_CHUNKS[@]} -ge 1 ] || {', `  [ \${#KP_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $KP_TESTID (the 15B page chunk)"; miss=1; }
  for a in "\${KP_CHUNKS[@]}"; do grep -q -- "$KP_TEXT" "dist$a" || { say "  MISSING: '$KP_TEXT' in dist$a"; miss=1; }; done
  grep -q -- "$KP_H1" dist/fasal-salah/kam-pani/index.html 2>/dev/null && say "  dist/fasal-salah/kam-pani/index.html has the Hindi H1" || { say "  MISSING: the Hindi H1 in dist/fasal-salah/kam-pani/index.html"; miss=1; }
  grep -q -- "$KP_PATH" dist/sitemap-pages.xml 2>/dev/null && say "  dist/sitemap-pages.xml lists $KP_PATH" || { say "  MISSING: $KP_PATH in dist/sitemap-pages.xml"; miss=1; }
  [ \${#HIST_CHUNKS[@]} -ge 1 ] || {`)

// post-deploy checks (read-only GETs)
s = rep(s, '  # 15A: the live chunks hold the history read', `  # 15B: the new page answers 200 with the Hindi H1 in the prerendered HTML, and the sitemap lists it; its chunk holds the markers.
  body="$(timeout 60 curl -sL --max-redirs 5 -w '\\n%{http_code}' "$SITE$KP_PATH?ks_ship=$STAMP-kp")"; code="\${body##*$'\\n'}"
  if [ "$code" = "200" ] && grep -q -- "$KP_H1" <<<"$body"; then say "PASS  [15b_page] GET $KP_PATH -> 200, the Hindi H1 is in the prerendered HTML"; else say "FAIL  [15b_page] GET $KP_PATH -> $code (Hindi H1 present: $(grep -q -- "$KP_H1" <<<"$body" && echo yes || echo no))"; ok=1; fi
  body="$(timeout 60 curl -s -w '\\n%{http_code}' "$SITE/sitemap-pages.xml?ks_ship=$STAMP-kp")"; code="\${body##*$'\\n'}"
  if [ "$code" = "200" ] && grep -q -- "$KP_PATH" <<<"$body"; then say "PASS  [15b_sitemap] sitemap-pages.xml lists $KP_PATH"; else say "FAIL  [15b_sitemap] sitemap-pages.xml -> $code, lists $KP_PATH: $(grep -q -- "$KP_PATH" <<<"$body" && echo yes || echo no)"; ok=1; fi
  for a in "\${KP_CHUNKS[@]}"; do
    body="$(timeout 60 curl -s -w '\\n%{http_code}' "$SITE$a")"; code="\${body##*$'\\n'}"
    if [ "$code" = "200" ] && grep -q -- "$KP_TESTID" <<<"$body" && grep -q -- "$KP_TEXT" <<<"$body"; then say "PASS  [15b_chunks] GET $a -> 200, holds the page markers"; else say "FAIL  [15b_chunks] GET $a -> $code (markers)"; ok=1; fi
  done
  # 15A: the live chunks hold the history read`)

s = rep(s, 'NEXT: open /msp/chana on the phone and check the two new sections (past years chart, 5-year average vs today), then run the Batch 15A close (verify, tag prod-15a, notes).',
  'NEXT: open /fasal-salah/kam-pani on the phone, tap each of the five chips and the four water buttons, then run the Batch 15B close (verify, tag prod-15b, notes).')
s = rep(s, '#   3   npm run build:prod (+ prerender 269/269, guards)', '#   3   npm run build:prod (+ prerender 269/269, guards; 15B: the page chunk, the Hindi H1 in dist/fasal-salah/kam-pani/index.html and the sitemap line)')
wr('scripts/ship-prod-15b.sh', s)

// ------------------------------------------------------------------ rollback
let r = rd('scripts/rollback-prod-15a.sh')
for (const [a, b] of RENAMES) r = r.split(a).join(b)
r = rep(r, '# Batch 15A — roll kissansahyog.com', '# Batch 15B — roll kissansahyog.com')
r = rep(r, "# Batch 15A adds migration 0069 (additive: ONE new table, mandi_monthly_history): the website rollback needs no database step (the previous website never reads the table; supabase/migrations/rollback/0069_mandi_monthly_history_rollback.sql is optional and is NOT run by this script), and the two",
  '# Batch 15B has NO database change: the website rollback needs no database step, and the two')
r = rep(r, "  say \"  (no database step: Batch 15A's migration 0069 is additive and no switch was changed; the previous website never reads the new table)\"", '  say "  (no database step: Batch 15B has no migration and no switch was changed)"')
wr('scripts/rollback-prod-15b.sh', r)
console.log('written ship-prod-15b.sh, rollback-prod-15b.sh')
