#!/usr/bin/env bash
# Batch 9 Phase 5 — one suite run: reboot the emulator (existing helper), then
# scripts/test-android.sh under a stall timeout. Results/evidence/logs under evidence/phase5.
#   bash docs/review/batch9/evidence/phase5/suite.sh <flavor> <label> [timeout-s] [extra test-android args...]
cd "$(dirname "$0")/../../../../.."
FLAVOR="$1"; LABEL="$2"; TMO="${3:-3600}"; shift 3 || shift $#
P=docs/review/batch9/evidence/phase5
export KS_REVIEW_DIR=batch9/evidence/phase5
echo "=== $(date '+%F %T') reboot emulator ==="
timeout 300 bash scripts/android/avd-setup.sh --stop < /dev/null
for i in $(seq 1 30); do timeout 10 adb -s emulator-5554 get-state >/dev/null 2>&1 || break; sleep 2; done
timeout 1500 bash scripts/android/avd-setup.sh < /dev/null | tail -n 5
echo "=== $(date '+%F %T') test-android --flavor $FLAVOR ($LABEL) ==="
timeout "$TMO" bash scripts/test-android.sh --flavor "$FLAVOR" --out "$P/results-$LABEL.json" --evidence "$P/$LABEL" "$@" < /dev/null
RC=$?
echo "=== $(date '+%F %T') exit $RC ($LABEL) ==="
LC="$P/logs/logcat-results-$LABEL.txt"
if [ -f "$LC" ]; then
  echo "logcat scan ($LC):"
  for pat in "FATAL EXCEPTION" "ANR in" "has died" "StrictMode" "WebView crash"; do
    echo "  $pat: $(grep -c "$pat" "$LC")"
  done
fi
echo "SUITE-DONE $LABEL rc=$RC"
