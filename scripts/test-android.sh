#!/usr/bin/env bash
# Batch 8A — build the debug APK and test it on the Android emulator, end to end (T1–T18).
#
#   bash scripts/test-android.sh                 # boot emulator, clean build, all tests, report
#   bash scripts/test-android.sh --skip-build    # reuse the APK already built
#   bash scripts/test-android.sh --only T4,T5    # a subset
#   ANDROID_SERIAL=<serial> bash scripts/test-android.sh   # use that device (e.g. a real phone);
#                                                          # the emulator is then not booted
#
# Writes docs/review/batch8a/results.json (or --out <file>) and the generated table
# (report.mjs). Exit code: non-zero if any test is RAN-FAILED or the app crashed (FATAL
# EXCEPTION in logcat). NOT-RUN and HUMAN-REVIEW do not fail the run; they are listed.
# T19 (negative control) and T20 (repeatability) run this script several times:
#   node scripts/android/meta-tests.mjs
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Batch 8B — --flavor prod (default, T1–T18) | staging (S1–S10, O1–O8) | staging-local (S9).
# Results: docs/review/batch8b/results-<flavor>.json unless --out is given.
FLAVOR=prod
ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --flavor) FLAVOR="$2"; shift 2 ;;
    --flavor=*) FLAVOR="${1#--flavor=}"; shift ;;
    *) ARGS+=("$1"); shift ;;
  esac
done
case "$FLAVOR" in prod|staging|staging-local) ;; *) echo "test-android: --flavor must be prod, staging or staging-local" >&2; exit 2 ;; esac
export KS_FLAVOR="$FLAVOR"
HAS_OUT=0; for a in "${ARGS[@]+"${ARGS[@]}"}"; do [ "$a" = "--out" ] && HAS_OUT=1; done
[ "$HAS_OUT" = 1 ] || ARGS+=(--out "docs/review/batch8b/results-$FLAVOR.json")
set -- "${ARGS[@]}"
echo "test-android: flavour $FLAVOR"

if [ -z "${ANDROID_SERIAL:-}" ]; then
  SETUP_LOG="$ROOT/docs/review/batch8b/logs/avd-setup.log"
  mkdir -p "$(dirname "$SETUP_LOG")"
  if bash scripts/android/avd-setup.sh > "$SETUP_LOG" 2>&1; then
    export ANDROID_SERIAL="$(tail -n 1 "$SETUP_LOG" | tr -d '\r')"
    echo "test-android: device $ANDROID_SERIAL ready"
  else
    RC=$?
    REASON="$(grep -m1 'avd-setup:.*\(NOT available\|did not finish\|not found\|failed\)' "$SETUP_LOG" | sed 's/^avd-setup: //')"
    export ANDROID_SERIAL="emulator-5554"
    export KS_NO_DEVICE_REASON="emulator could not be started (avd-setup exit $RC): ${REASON:-see docs/review/batch8b/logs/avd-setup.log}"
    echo "test-android: $KS_NO_DEVICE_REASON — device tests will be NOT-RUN"
  fi
else
  echo "test-android: using ANDROID_SERIAL=$ANDROID_SERIAL (emulator not booted)"
fi

node scripts/android/run-tests.mjs "$@"
RC=$?
node scripts/android/report.mjs "$@" > /dev/null 2>&1 || true
# Print only the verdict and the flagged list (the full table is in the .md file).
OUT_MD=""
for ((i = 1; i <= $#; i++)); do if [ "${!i}" = "--out" ]; then j=$((i + 1)); OUT_MD="${!j%.json}.md"; fi; done
echo
[ -f "$OUT_MD" ] && grep -E '^\*\*Verdict|^- \*\*' "$OUT_MD"
echo "test-android: table → $OUT_MD (exit $RC)"
exit $RC
