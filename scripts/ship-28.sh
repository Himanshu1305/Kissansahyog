#!/usr/bin/env bash
# Batch 27 + 28 in ONE push - run this instead of ship-27.sh.
# 27: the morning post never quotes a passed deadline. 28: the PM Fasal Bima rabi last date (31 Dec 2026, approved by the founder) and a how-to that never shows after its own last date.
# No database change, no site deploy: the morning post reads these files from main.
# It puts the files on a new branch release-28 cut from the newest origin/main, runs the whole unit-test suite (the only allowed failure is the old Batch 18
# "every district word and name exists" test), commits ONLY these files, and pushes them to main. It stops at the first problem.
set -u
cd "$(dirname "$0")/.." || exit 1
FILES="scripts/morning/lib/freshness.js scripts/morning/lib/workRules.js scripts/morning/lib/content.js scripts/morning/lib/generate.js scripts/morning/run.mjs scripts/morning/strings.hi.js data/morning/scheme-calendar.json tests/unit/morning-27-fresh.test.mjs tests/unit/morning-21-calendar.test.mjs tests/unit/morning-21-approved.test.mjs tests/unit/morning-21-content.test.mjs tests/unit/morning-21-data.test.mjs docs/review/batch27/DECISIONS.md scripts/ship-27.sh scripts/ship-28.sh"
stop() { echo "STOPPED - $1"; exit 1; }
for f in $FILES; do [ -f "$f" ] || stop "missing file $f"; done
git fetch origin || stop "git fetch failed"
git checkout -B release-28 origin/main || stop "could not switch to a new branch from origin/main (a local change clashes - send Claude this output)"
for f in $FILES; do [ -f "$f" ] || stop "$f vanished after the switch"; done
echo "--- running the whole unit-test suite (a few minutes)"
node --test --test-reporter=tap tests/unit/*.test.mjs > /tmp/b28-tests.log 2>&1
PASS=$(grep -cE '^\s*ok ' /tmp/b28-tests.log); FAILS=$(grep -E '^\s*not ok ' /tmp/b28-tests.log | grep -v 'every district word and name exists')
echo "passed: $PASS"
[ -z "$FAILS" ] || { echo "$FAILS"; stop "tests failed (list above; full log /tmp/b28-tests.log)"; }
echo "tests OK (only the known Batch 18 test may fail)"
git add $FILES || stop "git add failed"
git commit -q -m "27+28: no passed deadline in the morning post; a due irrigation stage always shows; PM Fasal Bima rabi last date 31 Dec (approved); how-to never after its last date" || stop "commit failed"
git merge-base --is-ancestor origin/main HEAD || stop "origin/main moved; run this script again"
git push origin release-28:main || stop "push failed"
git fetch origin && echo "--- done. These two must be identical:" && git rev-parse HEAD origin/main
