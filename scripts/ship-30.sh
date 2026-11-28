#!/usr/bin/env bash
# Batch 30 - register with e-mail; admins sign in with e-mail only; "Make admin" in the People tab. Run AFTER the SQL in docs/review/batch30/SHIP.md step 1.
# The database part (migration 0080) is pasted by you in the production SQL editor first; this script only pushes the code (pushing to main does not change the website).
# It puts the files on a new branch release-30 cut from the newest origin/main, runs the whole unit-test suite (the only allowed failure is the old Batch 18
# "every district word and name exists" test), commits ONLY these files, and pushes them to main. It stops at the first problem.
set -u
cd "$(dirname "$0")/.." || exit 1
FILES="supabase/migrations/0080_admin_by_email.sql supabase/migrations/rollback/0080_admin_by_email_rollback.sql src/App.jsx src/lib/admin/adminApi.js src/lib/auth/AuthProvider.jsx src/lib/auth/authService.js src/lib/errors.js src/lib/i18n/adminStrings.js src/screens/Login.jsx src/screens/Signup.jsx src/screens/SignupEmail.jsx src/screens/admin/common.jsx src/screens/admin/tabs/UserStatusPanel.jsx tests/unit/admin-email-30.test.mjs tests/unit/mitra-20-sql.test.mjs docs/review/batch30/DECISIONS.md docs/review/batch30/SHIP.md docs/review/batch30/sql-test.mjs PROJECT_CONTEXT.md scripts/ship-30.sh"
stop() { echo "STOPPED - $1"; exit 1; }
for f in $FILES; do [ -f "$f" ] || stop "missing file $f"; done
git fetch origin || stop "git fetch failed"
git checkout -B release-30 origin/main || stop "could not switch to a new branch from origin/main (a local change clashes - send Claude this output)"
for f in $FILES; do [ -f "$f" ] || stop "$f vanished after the switch"; done
echo "--- running the whole unit-test suite (a few minutes)"
node --test --test-reporter=tap tests/unit/*.test.mjs > /tmp/b30-tests.log 2>&1
PASS=$(grep -cE '^\s*ok ' /tmp/b30-tests.log); FAILS=$(grep -E '^\s*not ok ' /tmp/b30-tests.log | grep -v 'every district word and name exists')
echo "passed: $PASS"
[ -z "$FAILS" ] || { echo "$FAILS"; stop "tests failed (list above; full log /tmp/b30-tests.log)"; }
echo "tests OK (only the known Batch 18 test may fail)"
git add $FILES || stop "git add failed"
git commit -q -m "30: register with e-mail; admins sign in with e-mail only; admins can make other e-mail users admins" || stop "commit failed"
git merge-base --is-ancestor origin/main HEAD || stop "origin/main moved; run this script again"
git push origin release-30:main || stop "push failed"
git fetch origin && echo "--- done. These two must be identical:" && git rev-parse HEAD origin/main
