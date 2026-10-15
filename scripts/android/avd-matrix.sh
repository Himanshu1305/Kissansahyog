#!/usr/bin/env bash
# Batch 9 Phase 5C.2 — old and different devices: create up to three extra AVDs, install the STAGING APK,
# run a smoke on each. ONE device at a time, on its own port (5556), never the main ks_test_api36.
# Written in Phase 5C (2026-10-15) but NOT run that night (low PC memory, no emulator) — morning command
# in docs/review/batch9/CONDITIONS.md.
#
#   bash scripts/android/avd-matrix.sh --device api24|api30|small|all   [--no-smoke] [--keep-running]
#   bash scripts/android/avd-matrix.sh --stop                     stop the matrix emulator (port 5556)
#   bash scripts/android/avd-matrix.sh --delete api24|api30|small delete that extra AVD (never ks_test_api36)
#
# Devices
#   api24 : ks5c_api24  — Android 7.0 (API 24, the app's minSdk), google_apis x86_64, Pixel 4 profile
#   api30 : ks5c_api30  — Android 11 (API 30), google_apis x86_64, Pixel 4 profile
#   small : ks5c_small  — newest image (API 36), 720x1280, density 280, 2 GB RAM, small heap
# Per device: boot (headless) → record Android + WebView version → install android/ks-apks/ks-staging.apk →
# cold start time (am start -W, 3 runs) → smoke = the existing staging harness tests
#   S10 (cold start + 15 routes + 404 + no SW + safe areas), S4 (KSTEST sign-up), S5 (log out / log in),
#   S6 (post with photo), S7 (contact reveal), O2 + O3 (cache fills online, then offline cold launch)
# → logcat scan (FATAL EXCEPTION / ANR in / has died / WebView crash). Evidence:
#   docs/review/batch9/evidence/phase5c/devices/<device>/
# Exit code: 0 all good, 1 a smoke test RAN-FAILED or a crash was found, 2 set-up problem (image/AVD), 3 no accel.
set -u

MAIN_AVD="ks_test_api36"
PORT="${KS_MATRIX_PORT:-5556}"
SERIAL="emulator-$PORT"
BOOT_TIMEOUT="${KS_BOOT_TIMEOUT:-1200}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_ROOT="$ROOT/docs/review/batch9/evidence/phase5c/devices"
APK="$ROOT/android/ks-apks/ks-staging.apk"
PKG="com.kissansahyog.app.staging"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] && [ -n "${LOCALAPPDATA:-}" ]; then SDK="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || echo "$LOCALAPPDATA")/Android/Sdk"; fi
SDK="$(cygpath -u "$SDK" 2>/dev/null || echo "$SDK")"
[ -d "$SDK/platform-tools" ] || { echo "avd-matrix: Android SDK not found (set ANDROID_HOME)" >&2; exit 2; }
EXE=""; BAT=""
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) EXE=".exe"; BAT=".bat";; esac
ADB="$SDK/platform-tools/adb$EXE"
EMULATOR="$SDK/emulator/emulator$EXE"
AVDMANAGER="$SDK/cmdline-tools/latest/bin/avdmanager$BAT"
SDKMANAGER="$SDK/cmdline-tools/latest/bin/sdkmanager$BAT"
JDK="$(node "$ROOT/scripts/android/find-jdk.mjs" 2>/dev/null || true)"

run_sdk_tool() { # same as avd-setup.sh: the .bat wrappers split on ';' under Git Bash → go through PowerShell
  local tool="$1"; shift
  if [ -n "$BAT" ]; then
    local ps="& '$(cygpath -w "$tool")'"; local a
    for a in "$@"; do ps="$ps '$a'"; done
    JAVA_HOME="$(cygpath -w "$JDK")" powershell.exe -NoProfile -NonInteractive -Command "$ps"
  else
    JAVA_HOME="$JDK" "$tool" "$@"
  fi
}

avd_of() { case "$1" in api24) echo ks5c_api24;; api30) echo ks5c_api30;; small) echo ks5c_small;; *) echo "";; esac; }
api_of() { case "$1" in api24) echo 24;; api30) echo 30;; small) echo 36;; esac; }
refuse_main() { [ "$1" != "$MAIN_AVD" ] || { echo "avd-matrix: refusing to touch $MAIN_AVD" >&2; exit 2; }; }

DEVICE=""; SMOKE=1; KEEP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --device) DEVICE="$2"; shift 2 ;;
    --no-smoke) SMOKE=0; shift ;;
    --keep-running) KEEP=1; shift ;;
    --stop) "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1 && echo "avd-matrix: $SERIAL stopped" || echo "avd-matrix: $SERIAL not running"; exit 0 ;;
    --delete)
      NAME="$(avd_of "${2:-}")"; [ -n "$NAME" ] || { echo "avd-matrix: --delete api24|api30|small" >&2; exit 2; }
      refuse_main "$NAME"
      echo no | run_sdk_tool "$AVDMANAGER" delete avd -n "$NAME"; exit $? ;;
    *) echo "avd-matrix: unknown argument $1" >&2; exit 2 ;;
  esac
done
case "$DEVICE" in api24|api30|small) LIST="$DEVICE";; all) LIST="api24 api30 small";; *) echo "avd-matrix: --device api24|api30|small|all" >&2; exit 2;; esac
[ -n "$JDK" ] || { echo "avd-matrix: no JDK 21 found (needed by sdkmanager/avdmanager)" >&2; exit 2; }
[ -f "$APK" ] || { echo "avd-matrix: $APK missing — build it first (npm run android:debug:staging)" >&2; exit 2; }
if "$ADB" -s "$SERIAL" get-state 2>/dev/null | grep -q device; then echo "avd-matrix: $SERIAL is already in use — stop it first (--stop)" >&2; exit 2; fi
if ! "$EMULATOR" -accel-check 2>&1 | grep -qiE 'is installed and usable|KVM .* is installed|Hypervisor.Framework'; then echo "avd-matrix: no hardware acceleration — refusing" >&2; exit 3; fi

OVERALL=0
for D in $LIST; do
  NAME="$(avd_of "$D")"; API="$(api_of "$D")"; refuse_main "$NAME"
  OUT="$OUT_ROOT/$D"; mkdir -p "$OUT"
  IMAGE="system-images;android-$API;google_apis;x86_64"
  IMAGE_DIR="$SDK/system-images/android-$API/google_apis/x86_64"
  echo "== avd-matrix: $D ($NAME, API $API)" | tee "$OUT/run.log"

  # 1. system image (record the exact error if it cannot be downloaded → NOT-RUN for this device)
  if [ ! -f "$IMAGE_DIR/system.img" ]; then
    echo "installing $IMAGE" | tee -a "$OUT/run.log"
    yes | run_sdk_tool "$SDKMANAGER" "$IMAGE" > "$OUT/sdkmanager.log" 2>&1
    if [ ! -f "$IMAGE_DIR/system.img" ]; then echo "NOT-RUN: system image $IMAGE could not be installed (see sdkmanager.log)" | tee -a "$OUT/run.log"; OVERALL=2; continue; fi
  fi
  # 2. AVD
  if ! "$EMULATOR" -list-avds 2>/dev/null | tr -d '\r' | grep -qx "$NAME"; then
    DEV_PROFILE="pixel_4"; [ "$D" = small ] && DEV_PROFILE="pixel"
    echo no | run_sdk_tool "$AVDMANAGER" create avd -n "$NAME" -k "$IMAGE" -d "$DEV_PROFILE" > "$OUT/avdmanager.log" 2>&1
    CFG="$HOME/.android/avd/$NAME.avd/config.ini"
    [ -f "$CFG" ] || { echo "NOT-RUN: AVD creation failed (see avdmanager.log)" | tee -a "$OUT/run.log"; OVERALL=2; continue; }
    if [ "$D" = small ]; then
      # small-screen low-RAM profile: 720x1280 @ 280 dpi, 2 GB RAM, 256 MB VM heap
      sed -i -e '/^hw.lcd.width/d' -e '/^hw.lcd.height/d' -e '/^hw.lcd.density/d' -e '/^hw.ramSize/d' -e '/^vm.heapSize/d' "$CFG"
      printf 'hw.lcd.width=720\nhw.lcd.height=1280\nhw.lcd.density=280\nhw.ramSize=2048\nvm.heapSize=256\n' >> "$CFG"
    fi
  fi
  # 3. boot (headless, own port, clean data the first time)
  ARGS=(-avd "$NAME" -port "$PORT" -no-window -no-audio -no-snapshot -no-boot-anim -gpu swiftshader_indirect)
  [ -f "$HOME/.android/avd/$NAME.avd/.ks_booted" ] || ARGS+=(-wipe-data)
  nohup "$EMULATOR" "${ARGS[@]}" > "$OUT/emulator.log" 2>&1 &
  START=$(date +%s); BOOTED=""
  while [ $(( $(date +%s) - START )) -lt "$BOOT_TIMEOUT" ]; do
    BOOTED="$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')"
    [ "$BOOTED" = 1 ] && break; sleep 5
  done
  if [ "$BOOTED" != 1 ]; then echo "NOT-RUN: $NAME did not boot within ${BOOT_TIMEOUT}s" | tee -a "$OUT/run.log"; "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1; OVERALL=2; continue; fi
  touch "$HOME/.android/avd/$NAME.avd/.ks_booted"
  for _ in $(seq 1 30); do "$ADB" -s "$SERIAL" shell pm path android >/dev/null 2>&1 && break; sleep 2; done
  for k in window_animation_scale transition_animation_scale animator_duration_scale; do "$ADB" -s "$SERIAL" shell settings put global "$k" 0 >/dev/null 2>&1; done
  "$ADB" -s "$SERIAL" shell svc power stayon true >/dev/null 2>&1
  "$ADB" -s "$SERIAL" shell wm dismiss-keyguard >/dev/null 2>&1
  "$ADB" -s "$SERIAL" shell settings put secure show_ime_with_hard_keyboard 1 >/dev/null 2>&1
  echo "booted in $(( $(date +%s) - START ))s" | tee -a "$OUT/run.log"

  # 4. versions FIRST (Capacitor shows its own error page below its minimum WebView)
  {
    echo "android: $("$ADB" -s "$SERIAL" shell getprop ro.build.version.release | tr -d '\r') (sdk $("$ADB" -s "$SERIAL" shell getprop ro.build.version.sdk | tr -d '\r'))"
    echo "size: $("$ADB" -s "$SERIAL" shell wm size | tr -d '\r')  density: $("$ADB" -s "$SERIAL" shell wm density | tr -d '\r')"
    echo "webview provider:"; "$ADB" -s "$SERIAL" shell dumpsys webviewupdate | tr -d '\r' | grep -iE 'Current WebView package|versionName|Minimum' | head -8
    for p in com.google.android.webview com.android.webview com.android.chrome; do
      v="$("$ADB" -s "$SERIAL" shell dumpsys package "$p" 2>/dev/null | tr -d '\r' | grep -m1 versionName)"; [ -n "$v" ] && echo "$p $v"
    done
    echo "memory: $("$ADB" -s "$SERIAL" shell cat /proc/meminfo | tr -d '\r' | head -1)"
  } | tee "$OUT/device.txt"

  # 5. install + cold start (3 runs, am start -W TotalTime)
  "$ADB" -s "$SERIAL" install -r "$APK" > "$OUT/install.log" 2>&1 || { echo "RAN-FAILED: install (see install.log)" | tee -a "$OUT/run.log"; OVERALL=1; }
  "$ADB" -s "$SERIAL" logcat -c
  for i in 1 2 3; do
    "$ADB" -s "$SERIAL" shell am force-stop "$PKG"; sleep 2
    "$ADB" -s "$SERIAL" shell am start -W -n "$PKG/com.kissansahyog.app.MainActivity" 2>&1 | tr -d '\r' | grep -E 'TotalTime|WaitTime|Status' | sed "s/^/run $i: /" | tee -a "$OUT/cold-start.txt"
    sleep 6
    "$ADB" -s "$SERIAL" exec-out screencap -p > "$OUT/cold-start-$i.png"
  done

  # 6. smoke = existing staging harness tests on this serial (they record their own evidence)
  if [ "$SMOKE" = 1 ]; then
    ( cd "$ROOT" && ANDROID_SERIAL="$SERIAL" KS_FLAVOR=staging timeout 3600 node scripts/android/run-tests.mjs --skip-build \
        --only S10,S4,S5,S6,S7,O2,O3 --out "docs/review/batch9/evidence/phase5c/devices/$D/results-smoke.json" \
        --evidence "docs/review/batch9/evidence/phase5c/devices/$D/smoke" ) > "$OUT/smoke.log" 2>&1
    SMOKE_RC=$?
    echo "smoke exit code: $SMOKE_RC" | tee -a "$OUT/run.log"
    [ "$SMOKE_RC" = 0 ] || OVERALL=1
  fi

  # 7. logcat scan
  "$ADB" -s "$SERIAL" logcat -d > "$OUT/logcat.txt" 2>/dev/null
  HITS="$(grep -cE 'FATAL EXCEPTION|ANR in|has died|WebView.*crash|chromium.*crash' "$OUT/logcat.txt" || true)"
  echo "logcat crash/ANR lines: $HITS" | tee -a "$OUT/run.log"
  [ "${HITS:-0}" = 0 ] || OVERALL=1

  [ "$KEEP" = 1 ] || { "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1; sleep 10; }
done
echo "avd-matrix: done (exit $OVERALL)"
exit "$OVERALL"
