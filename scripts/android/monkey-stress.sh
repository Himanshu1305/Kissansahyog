#!/usr/bin/env bash
# Batch 9 Phase 5C.6 — random-tap stress on the STAGING app only.
# Written in Phase 5C (2026-10-15) but NOT run that night (low PC memory, no emulator).
#
#   bash scripts/android/monkey-stress.sh                  # 3 fixed seeds, 15 000 events each
#   bash scripts/android/monkey-stress.sh --seed 5150      # re-run ONE seed (reproduce a crash)
#   ANDROID_SERIAL=emulator-5554 bash scripts/android/monkey-stress.sh
#
# Before running: the emulator is booted (bash scripts/android/avd-setup.sh), the staging APK is installed,
# and the staging app is LOGGED IN as a THROW-AWAY KSTEST account (not a KSTEST-KEEP persona: monkey may
# post junk listings and edit the profile of whoever is logged in; junk on staging is fine, on KEEP it is not).
#
# Monkey settings (5C.6): -p com.kissansahyog.app.staging only, fixed seed, 15000 events, --throttle 100,
#   --pct-syskeys 0 --pct-appswitch 0 --pct-nav 5 (cannot press Home / switch apps), NO --ignore-crashes,
#   NO --ignore-timeouts, NO --ignore-security-exceptions (so crashes, ANRs and permission errors stop the run
#   and show). Pass = monkey finishes all events, no crash/ANR in its output, logcat has no FATAL/ANR for the
#   package, and the app still answers afterwards (comes to the front and draws).
# Evidence: docs/review/batch9/evidence/phase5c/monkey/seed-<n>/ (monkey.txt, logcat.txt, after.png, verdict.txt)
set -u
PKG="com.kissansahyog.app.staging"
ACTIVITY="$PKG/com.kissansahyog.app.MainActivity"
SEEDS=(5150 20261015 777)
EVENTS=15000
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_ROOT="$ROOT/docs/review/batch9/evidence/phase5c/monkey"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] && [ -n "${LOCALAPPDATA:-}" ]; then SDK="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || echo "$LOCALAPPDATA")/Android/Sdk"; fi
SDK="$(cygpath -u "$SDK" 2>/dev/null || echo "$SDK")"
EXE=""; case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) EXE=".exe";; esac
ADB="$SDK/platform-tools/adb$EXE"
[ -x "$ADB" ] || { echo "monkey-stress: adb not found (set ANDROID_HOME)" >&2; exit 2; }
SERIAL="${ANDROID_SERIAL:-emulator-5554}"
A() { "$ADB" -s "$SERIAL" "$@"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --seed) SEEDS=("$2"); shift 2 ;;
    --events) EVENTS="$2"; shift 2 ;;
    *) echo "monkey-stress: unknown argument $1" >&2; exit 2 ;;
  esac
done

A get-state 2>/dev/null | grep -q device || { echo "monkey-stress: no device $SERIAL" >&2; exit 2; }
A shell pm path "$PKG" >/dev/null 2>&1 || { echo "monkey-stress: $PKG is not installed — staging app only, refusing" >&2; exit 2; }

OVERALL=0
for SEED in "${SEEDS[@]}"; do
  OUT="$OUT_ROOT/seed-$SEED"; mkdir -p "$OUT"
  echo "== seed $SEED ($EVENTS events)"
  A logcat -c
  A shell am start -n "$ACTIVITY" >/dev/null 2>&1; sleep 8
  START=$(date +%s)
  # foreground, bounded: 15 000 events x 100 ms ≈ 25 min plus the app's own work
  timeout 3600 "$ADB" -s "$SERIAL" shell monkey -p "$PKG" -s "$SEED" --throttle 100 \
      --pct-syskeys 0 --pct-appswitch 0 --pct-nav 5 -v -v "$EVENTS" > "$OUT/monkey.txt" 2>&1
  RC=$?
  echo "monkey exit $RC after $(( $(date +%s) - START ))s" | tee "$OUT/verdict.txt"
  A logcat -d > "$OUT/logcat.txt" 2>/dev/null
  CRASH_MONKEY="$(grep -cE '// CRASH|// NOT RESPONDING|Monkey aborted' "$OUT/monkey.txt" || true)"
  FINISHED="$(grep -c 'Monkey finished' "$OUT/monkey.txt" || true)"
  FATAL="$(grep -E 'FATAL EXCEPTION|ANR in|has died' "$OUT/logcat.txt" | grep -c "$PKG\|FATAL EXCEPTION" || true)"
  # still responsive: bring to front, the activity must be resumed and the screen must draw
  A shell am start -n "$ACTIVITY" >/dev/null 2>&1; sleep 5
  RESUMED="$(A shell dumpsys activity activities 2>/dev/null | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | grep -c "$PKG" || true)"
  A exec-out screencap -p > "$OUT/after.png"
  {
    echo "seed=$SEED events=$EVENTS monkeyExit=$RC finished=$FINISHED monkeyCrashLines=$CRASH_MONKEY logcatFatalAnr=$FATAL resumedAfter=$RESUMED"
    if [ "$FINISHED" -ge 1 ] && [ "$CRASH_MONKEY" = 0 ] && [ "$FATAL" = 0 ] && [ "$RESUMED" -ge 1 ]; then echo "RAN-PASSED"; else echo "RAN-FAILED"; fi
  } | tee -a "$OUT/verdict.txt"
  if ! tail -1 "$OUT/verdict.txt" | grep -q RAN-PASSED; then
    OVERALL=1
    # first stack for the report (reproduce with: bash scripts/android/monkey-stress.sh --seed $SEED)
    grep -A25 -m1 'FATAL EXCEPTION' "$OUT/logcat.txt" > "$OUT/first-crash.txt" 2>/dev/null || true
  fi
done
echo "monkey-stress: done (exit $OVERALL)"
exit "$OVERALL"
