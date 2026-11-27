#!/usr/bin/env bash
# Batch 27 - the morning post never quotes a deadline that has passed. No database change, no site deploy: the morning post reads these files from main.
# What it does: puts these files on a new branch release-27 cut from the newest origin/main, runs the whole unit-test suite (the only allowed failure is the
# old Batch 18 "every district word and name exists" test), commits ONLY the Batch 27 files, and pushes them to main. It stops at the first problem.
set -u
cd "$(dirname "$0")/.." || exit 1
FILES="scripts/morning/lib/freshness.js scripts/morning/lib/workRules.js scripts/morning/lib/content.js scripts/morning/lib/generate.js scripts/morning/run.mjs scripts/morning/strings.hi.js tests/unit/morning-27-fresh.test.mjs tests/unit/morning-21-calendar.test.mjs docs/review/batch27/DECISIONS.md scripts/ship-27.sh"
stop() { echo "STOPPED - $1"; exit 1; }
for f in $FILES; do [ -f "$f" ] || stop "missing file $f"; done
git fetch origin || stop "git fetch failed"
git checkout -B release-27 origin/main || stop "could not switch to a new branch from origin/main (a local change clashes - send Claude this output)"
for f in $FILES; do [ -f "$f" ] || stop "$f vanished after the switch"; done
echo "--- running the whole unit-test suite (a few minutes)"
node --test --test-reporter=tap tests/unit/*.test.mjs > /tmp/b27-tests.log 2>&1
PASS=$(grep -cE '^\s*ok ' /tmp/b27-tests.log); FAILS=$(grep -E '^\s*not ok ' /tmp/b27-tests.log | grep -v 'every district word and name exists')
echo "passed: $PASS"
[ -z "$FAILS" ] || { echo "$FAILS"; stop "tests failed (list above; full log /tmp/b27-tests.log)"; }
echo "tests OK (only the known Batch 18 test may fail)"
git add $FILES || stop "git add failed"
git commit -q -m "27: the morning post never quotes a passed deadline; a due irrigation stage always shows; approvals can expire; runway warning" || stop "commit failed"
git merge-base --is-ancestor origin/main HEAD || stop "origin/main moved; run this script again"
git push origin release-27:main || stop "push failed"
git fetch origin && echo "--- done. These two must be identical:" && git rev-parse HEAD origin/main
