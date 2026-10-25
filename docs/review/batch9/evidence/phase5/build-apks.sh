#!/usr/bin/env bash
# Batch 9 Phase 5.1 — rebuild the three debug APKs with the existing npm scripts (sequential).
cd "$(dirname "$0")/../../../../.."
L=docs/review/batch9/evidence/phase5/logs
for s in android:debug android:debug:staging android:debug:staging-local; do
  echo "=== $(date '+%F %T') npm run $s ==="
  timeout 1500 npm run "$s" > "$L/build-${s//:/-}.log" 2>&1 < /dev/null
  echo "exit $? ($s) $(date '+%F %T')"
done
echo BUILD-ALL-DONE
