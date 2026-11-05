#!/usr/bin/env node
// Batch 17F - one-off generator: copies the 17E ship script and changes only what must change
// (batch name, tag, evidence folder, gate list, expected live deployment, no database probe).
// Kept in the repo so the diff between scripts/ship-prod-17e.sh and scripts/ship-prod-17f.sh is reproducible.
import fs from 'node:fs'

let s = fs.readFileSync('scripts/ship-prod-17e.sh', 'utf8').replace(/\r\n/g, '\n')
const NL = '$\'\\n\''
for (const [a, b] of [['ship-prod-17e', 'ship-prod-17f'], ['rollback-prod-17e', 'rollback-prod-17f'], ['release-17e', 'release-17f'], ['ship-17e', 'ship-17f'], ['batch17e', 'batch17f'], ['prod-before-17e', 'prod-before-17f']]) s = s.split(a).join(b)

const hEnd = s.indexOf('set -uo pipefail')
const header = [
  '#!/usr/bin/env bash',
  '# Batch 17F - install the app properly: one-row install strip, step-by-step install sheets, an "installed" message, an /install page and a QR code',
  '# (docs/review/batch17f/SHIP.md). SITE ONLY: there is NO database migration, so this script has no database probe and never touches a database.',
  '# release-17f = origin/main (which already holds 17E, tag ship-17e) + 17F. Live now: Batch 17E (tag ship-17e, deployment',
  '# 3c06615d-2a69-41b3-b481-4b931de14a7c); that id is also the rollback target, and this script reads the live deployment from Cloudflare at run time and',
  '# STOPS before deploying if it is not that one. Gates added in 17F: the strip renders on one row (flex-nowrap in the build), /install is prerendered,',
  '# the QR file is in dist, and the 17E admin button string (morning-share-video) is STILL in the built bundle (a branch without 17E would remove it).',
  '# The auth switches (otp_required=true, session_enforced=false) are read before and after and must be identical; this script never sets one.',
  '#',
  '#   bash scripts/ship-prod-17f.sh --dry-run   # validate preconditions + print every command; changes nothing',
  '#   bash scripts/ship-prod-17f.sh             # the real ship (founder runs this)',
  '#',
  '# Ship tag: "$TAG" (default ship-17f) must be on the pushed HEAD of release-17f.',
  '# Never touches git history, never pushes, never writes to any database.',
  '',
].join('\n')
s = header + s.slice(hEnd)

function rep(a, b) { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b) }
rep('GATE_TAG="ship-17d"   # the live Batch 17D tag; must be on origin', 'GATE_TAG="ship-17e"   # the live Batch 17E tag; must be on origin')
rep('ID_11A="3d3ed43a-3b6b-4cfa-9128-38b86045143e"; SRC_11A="Batch 17D production deployment (tag ship-17d)"', 'ID_11A="3c06615d-2a69-41b3-b481-4b931de14a7c"; SRC_11A="Batch 17E production deployment (tag ship-17e)"')
s = s.split('Batch 17D ship').join('Batch 17E ship').split('Batch 17D (ship-17d)').join('Batch 17E (ship-17e)').split('Batch 17D deployment').join('Batch 17E deployment').split('(Batch 17D, ship-17d)').join('(Batch 17E, ship-17e)').split('ship-17d').join('ship-17e')

// the database probe goes away (there is no migration in 17F)
const p0 = s.indexOf('# ---------------------------------------------------------------- P. is migration 0074')
const p1 = s.indexOf('say "+ timeout 120 npx wrangler pages deployment list')
if (p0 < 0 || p1 < 0 || p1 < p0) throw new Error('P block not found')
s = s.slice(0, p0) + '# 17F: no migration, so no database probe here (17E had one for migration 0074).\n\n' + s.slice(p1)

// the old database gate becomes the 17F gates
const g0 = s.indexOf('  if morning_probe; then say "PASS  [17e_db]')
if (g0 < 0) throw new Error('17e_db gate not found')
const g1 = s.indexOf('\n', g0)
const gates = [
  '  # 17F: the install page, the QR file, the sitemap entry and the one-row strip are live; the 17E admin button string is still live.',
  `  body="$(timeout 60 curl -sL --max-redirs 5 -w '\\n%{http_code}' "$SITE/install?ks_ship=$STAMP-17f")"; code="\${body##*${NL}}"`,
  '  if [ "$code" = "200" ] && grep -q \'FAQPage\' <<<"$body" && grep -q \'इंस्टॉल\' <<<"$body"; then say "PASS  [17f_install_page] GET /install -> 200, has the FAQ JSON-LD and the Hindi title"; else say "FAIL  [17f_install_page] GET /install -> $code (no FAQPage / Hindi text in the HTML)"; ok=1; fi',
  `  code="$(timeout 60 curl -s -o /dev/null -w '%{http_code}|%{content_type}' "$SITE/images/install-qr.svg?ks_ship=$STAMP-17f")"`,
  '  if [ "${code%%|*}" = "200" ] && [[ "${code#*|}" == *svg* ]]; then say "PASS  [17f_qr_file] GET /images/install-qr.svg -> 200 (${code#*|})"; else say "FAIL  [17f_qr_file] GET /images/install-qr.svg -> $code (expected 200 + svg)"; ok=1; fi',
  `  body="$(timeout 60 curl -s -w '\\n%{http_code}' "$SITE/sitemap-pages.xml?ks_ship=$STAMP-17f")"; code="\${body##*${NL}}"`,
  '  if [ "$code" = "200" ] && grep -q \'/install<\' <<<"$body"; then say "PASS  [17f_sitemap] GET /sitemap-pages.xml -> 200, lists /install"; else say "FAIL  [17f_sitemap] /sitemap-pages.xml -> $code or it does not list /install"; ok=1; fi',
  '  [ ${#STRIP_CHUNKS[@]} -gt 0 ] || { say "FAIL  [17f_strip] no chunk holding $STRIP_MARKER found in dist"; ok=1; }',
  '  for a in "${STRIP_CHUNKS[@]}"; do',
  `    body="$(timeout 60 curl -s -w '\\n%{http_code}' "$SITE$a")"; code="\${body##*${NL}}"`,
  '    if [ "$code" = "200" ] && grep -q -- "$STRIP_MARKER" <<<"$body" && grep -q -- \'flex-nowrap\' <<<"$body"; then say "PASS  [17f_strip] GET $a -> 200, the install strip is a no-wrap (one row) layout"; else say "FAIL  [17f_strip] GET $a -> $code (marker or flex-nowrap missing)"; ok=1; fi',
  '  done',
  '  for a in "${VOICE_CHUNKS[@]}"; do',
  `    body="$(timeout 60 curl -s -w '\\n%{http_code}' "$SITE$a")"; code="\${body##*${NL}}"`,
  '    if [ "$code" = "200" ] && grep -q -- "$VOICE_MARKER" <<<"$body"; then say "PASS  [17f_17e_button] GET $a -> 200, still holds the 17E admin button ($VOICE_MARKER)"; else say "FAIL  [17f_17e_button] GET $a -> $code (the 17E admin button string is missing: a build without 17E?)"; ok=1; fi',
  '  done',
].join('\n')
s = s.slice(0, g0) + gates + s.slice(g1)

rep("OLDSHARE_MARKER='morning-share-all'", "STRIP_MARKER='pwa-install-strip'      # 17F: the homepage install strip (Homepage chunk)\nINSTALL_ROUTE='/install'              # 17F: the new page (prerendered, in the sitemap)\nQR_FILE='dist/images/install-qr.svg'  # 17F: the QR\nOLDSHARE_MARKER='morning-share-all'")
rep('  while IFS= read -r a; do [ -n "$a" ] && OLDSHARE_CHUNKS+=', '  while IFS= read -r a; do [ -n "$a" ] && STRIP_CHUNKS+=("/${a#dist/}"); done < <(grep -l -- "$STRIP_MARKER" dist/assets/*.js 2>/dev/null | head -3)\n  while IFS= read -r a; do [ -n "$a" ] && OLDSHARE_CHUNKS+=')

const m0 = s.indexOf('  return $miss\n}')
if (m0 < 0) throw new Error('return $miss not found')
const dm = [
  '  # 17F: the strip is one row, /install is prerendered and in the sitemap, the QR file is in dist, the 17E admin button is still in the bundle.',
  '  [ ${#STRIP_CHUNKS[@]} -ge 1 ] || { say "  MISSING: no dist/assets/*.js holds $STRIP_MARKER (the 17F install strip)"; miss=1; }',
  '  for a in "${STRIP_CHUNKS[@]}"; do grep -q \'flex-nowrap\' "dist$a" || { say "  MISSING: flex-nowrap in dist$a (the strip must be one row)"; miss=1; }; done',
  '  [ -s "dist${INSTALL_ROUTE}/index.html" ] || { say "  MISSING: dist${INSTALL_ROUTE}/index.html (the /install page is not prerendered)"; miss=1; }',
  '  grep -q \'FAQPage\' "dist${INSTALL_ROUTE}/index.html" 2>/dev/null || { say "  MISSING: FAQPage JSON-LD in dist${INSTALL_ROUTE}/index.html"; miss=1; }',
  '  [ -s "$QR_FILE" ] || { say "  MISSING: $QR_FILE (the install QR)"; miss=1; }',
  '  grep -lq -- "${INSTALL_ROUTE}<" dist/sitemap*.xml 2>/dev/null || { say "  MISSING: ${INSTALL_ROUTE} in dist/sitemap*.xml"; miss=1; }',
  '  grep -lq -- "$VOICE_MARKER" dist/assets/*.js 2>/dev/null || { say "  MISSING: $VOICE_MARKER (the 17E admin button) in the bundle: this branch lacks 17E"; miss=1; }',
  '',
].join('\n')
s = s.slice(0, m0) + dm + s.slice(m0)
s = s.replace(/Batch 10C\/10E\/10F\/10G\/11A\/12A\/14A\/15A\/16B\/17B\/17D\/17E marker/, 'Batch 10C/.../17E/17F marker')
fs.writeFileSync('scripts/ship-prod-17f.sh', s)

// rollback script
let r = fs.readFileSync('scripts/rollback-prod-17e.sh', 'utf8').replace(/\r\n/g, '\n')
for (const [a, b] of [['rollback-prod-17e', 'rollback-prod-17f'], ['ship-prod-17e', 'ship-prod-17f'], ['batch17e', 'batch17f']]) r = r.split(a).join(b)
r = r.split('3d3ed43a-3b6b-4cfa-9128-38b86045143e').join('3c06615d-2a69-41b3-b481-4b931de14a7c')
r = r.replace(/Batch 17E - roll/, 'Batch 17F - roll').replace('Copy of the Batch 17D rollback script. The rollback target after the 17E ship is the Batch 17D deployment', 'Copy of the Batch 17E rollback script. The rollback target after the 17F ship is the Batch 17E deployment')
r = r.split('(tag ship-17d)').join('(tag ship-17e)').split('Batch 17D deployment').join('Batch 17E deployment').split('before the 17E ship').join('before the 17F ship')
fs.writeFileSync('scripts/rollback-prod-17f.sh', r)
console.log('written')
