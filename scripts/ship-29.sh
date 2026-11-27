#!/usr/bin/env bash
# Batch 29 - the admin KVK questions tab. Run AFTER the SQL in docs/review/batch29/SHIP.md step 1.
# The database part (migration 0079) is pasted by you in the production SQL editor first; this script only pushes the code (safe even before it: no answers = no change).
# It puts the files on a new branch release-29 cut from the newest origin/main, runs the whole unit-test suite (the only allowed failure is the old Batch 18
# "every district word and name exists" test), commits ONLY these files, and pushes them to main. It stops at the first problem.
set -u
cd "$(dirname "$0")/.." || exit 1
FILES="supabase/migrations/0079_kvk_questions.sql supabase/migrations/rollback/0079_kvk_questions_rollback.sql src/lib/kvk/kvkRules.js scripts/morning/lib/kvk.js scripts/morning/lib/generate.js scripts/morning/strings.hi.js src/lib/i18n/adminStrings.js src/lib/errors.js src/screens/admin/registry.js src/screens/Admin.jsx src/lib/admin/adminApi.js src/screens/admin/tabs/KvkTab.jsx src/screens/admin/tabs/KvkPanel.jsx tests/unit/morning-29-kvk.test.mjs tests/unit/admin-kvk-29.test.mjs tests/unit/admin-console-14a.test.mjs tests/unit/mitra-20-sql.test.mjs docs/review/batch29/DECISIONS.md docs/review/batch29/SHIP.md PROJECT_CONTEXT.md scripts/ship-29.sh"
stop() { echo "STOPPED - $1"; exit 1; }
for f in $FILES; do [ -f "$f" ] || stop "missing file $f"; done
git fetch origin || stop "git fetch failed"
git checkout -B release-29 origin/main || stop "could not switch to a new branch from origin/main (a local change clashes - send Claude this output)"
for f in $FILES; do [ -f "$f" ] || stop "$f vanished after the switch"; done
echo "--- running the whole unit-test suite (a few minutes)"
node --test --test-reporter=tap tests/unit/*.test.mjs > /tmp/b29-tests.log 2>&1
PASS=$(grep -cE '^\s*ok ' /tmp/b29-tests.log); FAILS=$(grep -E '^\s*not ok ' /tmp/b29-tests.log | grep -v 'every district word and name exists')
echo "passed: $PASS"
[ -z "$FAILS" ] || { echo "$FAILS"; stop "tests failed (list above; full log /tmp/b29-tests.log)"; }
echo "tests OK (only the known Batch 18 test may fail)"
git add $FILES || stop "git add failed"
git commit -q -m "29: admin KVK questions tab; answers entered there are used by the morning post automatically" || stop "commit failed"
git merge-base --is-ancestor origin/main HEAD || stop "origin/main moved; run this script again"
git push origin release-29:main || stop "push failed"
git fetch origin && echo "--- done. These two must be identical:" && git rev-parse HEAD origin/main
