#!/usr/bin/env bash
# Batch 8A — make sure the test emulator exists and is booted (headless).
#   bash scripts/android/avd-setup.sh           ensure AVD + boot + wait + disable animations
#   bash scripts/android/avd-setup.sh --stop    shut the test emulator down
# Prints the device serial on the last line (emulator-5554).
#
# AVD: ks_test_api36 — Pixel 7 profile (1080x2400, 420dpi), google_apis x86_64, API 36.
# Needs hardware acceleration (WHPX / HAXM / KVM); refuses to boot a software-emulated device.
set -u

AVD_NAME="${KS_AVD_NAME:-ks_test_api36}"
API="${KS_AVD_API:-36}"
PORT="${KS_AVD_PORT:-5554}"
SERIAL="emulator-$PORT"
BOOT_TIMEOUT="${KS_BOOT_TIMEOUT:-900}"   # a first boot with -wipe-data took ~440 s on this machine
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$ROOT/docs/review/batch8a/logs"
mkdir -p "$LOG_DIR"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] && [ -n "${LOCALAPPDATA:-}" ]; then SDK="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || echo "$LOCALAPPDATA")/Android/Sdk"; fi
SDK="$(cygpath -u "$SDK" 2>/dev/null || echo "$SDK")"
[ -d "$SDK/platform-tools" ] || { echo "avd-setup: Android SDK not found (set ANDROID_HOME)" >&2; exit 2; }
EXE=""; BAT=""
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) EXE=".exe"; BAT=".bat";; esac
ADB="$SDK/platform-tools/adb$EXE"
EMULATOR="$SDK/emulator/emulator$EXE"
AVDMANAGER="$SDK/cmdline-tools/latest/bin/avdmanager$BAT"
SDKMANAGER="$SDK/cmdline-tools/latest/bin/sdkmanager$BAT"
IMAGE="system-images;android-$API;google_apis;x86_64"
IMAGE_DIR="$SDK/system-images/android-$API/google_apis/x86_64"
JDK="$(node "$ROOT/scripts/android/find-jdk.mjs" 2>/dev/null || true)"

if [ "${1:-}" = "--stop" ]; then
  "$ADB" -s "$SERIAL" emu kill >/dev/null 2>&1 && echo "avd-setup: $SERIAL stopped" || echo "avd-setup: $SERIAL was not running"
  exit 0
fi

# The SDK's .bat wrappers split arguments on ';' when called from Git Bash, so on Windows the
# package name is passed through PowerShell.
run_sdk_tool() { # <tool path> <args...>
  local tool="$1"; shift
  if [ -n "$BAT" ]; then
    local ps="& '$(cygpath -w "$tool")'"; local a
    for a in "$@"; do ps="$ps '$a'"; done
    JAVA_HOME="$(cygpath -w "$JDK")" powershell.exe -NoProfile -NonInteractive -Command "$ps"
  else
    JAVA_HOME="$JDK" "$tool" "$@"
  fi
}

# 1. Hardware acceleration.
if ! "$EMULATOR" -accel-check 2>&1 | tee "$LOG_DIR/accel-check.log" | grep -qiE 'is installed and usable|KVM .* is installed|Hypervisor.Framework'; then
  echo "avd-setup: hardware acceleration is NOT available — refusing to boot a software-emulated device" >&2
  exit 3
fi

# 2. System image + AVD.
FRESH=0
if ! "$EMULATOR" -list-avds 2>/dev/null | tr -d '\r' | grep -qx "$AVD_NAME"; then
  [ -n "$JDK" ] || { echo "avd-setup: no JDK 21 found (needed by sdkmanager/avdmanager)" >&2; exit 2; }
  if [ ! -f "$IMAGE_DIR/system.img" ]; then
    echo "avd-setup: installing $IMAGE"
    yes | run_sdk_tool "$SDKMANAGER" "$IMAGE" > "$LOG_DIR/sdkmanager.log" 2>&1
    if [ ! -f "$IMAGE_DIR/system.img" ] && [ -x "$SDK/cmdline-tools/latest/bin/android$EXE" ]; then
      # Newer command-line tools replace sdkmanager with `android sdk` and '/' package names.
      JAVA_HOME="$JDK" "$SDK/cmdline-tools/latest/bin/android$EXE" sdk install "system-images/android-$API/google_apis/x86_64" >> "$LOG_DIR/sdkmanager.log" 2>&1
    fi
    [ -f "$IMAGE_DIR/system.img" ] || { echo "avd-setup: could not install $IMAGE (see $LOG_DIR/sdkmanager.log)" >&2; exit 2; }
  fi
  echo "avd-setup: creating AVD $AVD_NAME"
  echo no | run_sdk_tool "$AVDMANAGER" create avd -n "$AVD_NAME" -k "$IMAGE" -d pixel_7 --force > "$LOG_DIR/avdmanager.log" 2>&1
  "$EMULATOR" -list-avds 2>/dev/null | tr -d '\r' | grep -qx "$AVD_NAME" || { echo "avd-setup: AVD creation failed (see $LOG_DIR/avdmanager.log)" >&2; exit 2; }
  FRESH=1
fi

# 3. Boot (unless it is already running).
if "$ADB" -s "$SERIAL" get-state 2>/dev/null | grep -q device; then
  echo "avd-setup: $SERIAL already running"
else
  ARGS=(-avd "$AVD_NAME" -port "$PORT" -no-window -no-audio -no-snapshot -no-boot-anim -gpu swiftshader_indirect)
  # First boot of a new AVD (or a never-booted one) starts from clean data.
  if [ "$FRESH" = 1 ] || [ ! -f "$HOME/.android/avd/$AVD_NAME.avd/.ks_booted" ]; then ARGS+=(-wipe-data); fi
  echo "avd-setup: booting ${ARGS[*]}"
  nohup "$EMULATOR" "${ARGS[@]}" > "$LOG_DIR/emulator.log" 2>&1 &
  disown || true
fi

# 4. Wait for boot.
START=$(date +%s)
"$ADB" -s "$SERIAL" wait-for-device >/dev/null 2>&1 &
while :; do
  BOOTED="$("$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')"
  [ "$BOOTED" = "1" ] && break
  if [ $(( $(date +%s) - START )) -ge "$BOOT_TIMEOUT" ]; then
    echo "avd-setup: emulator did not finish booting within ${BOOT_TIMEOUT}s (see $LOG_DIR/emulator.log)" >&2
    exit 4
  fi
  sleep 3
done
touch "$HOME/.android/avd/$AVD_NAME.avd/.ks_booted" 2>/dev/null || true
# Package manager can lag a little behind boot_completed.
for _ in $(seq 1 30); do "$ADB" -s "$SERIAL" shell pm path android >/dev/null 2>&1 && break; sleep 2; done

# 5. Stable test conditions: no animations, screen on and unlocked, portrait.
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  "$ADB" -s "$SERIAL" shell settings put global "$k" 0 >/dev/null 2>&1
done
"$ADB" -s "$SERIAL" shell settings put system accelerometer_rotation 0 >/dev/null 2>&1
"$ADB" -s "$SERIAL" shell settings put system user_rotation 0 >/dev/null 2>&1
"$ADB" -s "$SERIAL" shell svc power stayon true >/dev/null 2>&1
"$ADB" -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1
"$ADB" -s "$SERIAL" shell wm dismiss-keyguard >/dev/null 2>&1
"$ADB" -s "$SERIAL" shell cmd connectivity airplane-mode disable >/dev/null 2>&1
# Batch 9 (1A): always draw the on-screen keyboard. Without this the emulator treats adb input as a
# hardware keyboard and never shows the soft keyboard, so a keyboard test proves nothing.
"$ADB" -s "$SERIAL" shell settings put secure show_ime_with_hard_keyboard 1 >/dev/null 2>&1

# 6. Internet inside the emulator (Batch 8B): right after a boot the emulator's DNS is sometimes
#    not up yet; a run that starts then fails at the first request. Wait up to 3 minutes.
NET_OK=0
for _ in $(seq 1 60); do
  if "$ADB" -s "$SERIAL" shell ping -c 1 -W 2 dns.google 2>/dev/null | grep -q "1 received\|1 packets received"; then NET_OK=1; break; fi
  sleep 3
done
[ "$NET_OK" = 1 ] && echo "avd-setup: emulator internet OK (DNS + reachability)" || echo "avd-setup: WARNING — the emulator has no working internet after 3 minutes; online tests will fail"

echo "avd-setup: ready (booted in $(( $(date +%s) - START ))s, API $("$ADB" -s "$SERIAL" shell getprop ro.build.version.sdk | tr -d '\r\n'))"
echo "$SERIAL"
