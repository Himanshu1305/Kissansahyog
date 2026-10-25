#!/usr/bin/env bash
# Batch 9 Phase 8.1 — the ONE morning command.
#
#   bash scripts/android/morning.sh
#
# What it does (nothing else, never asks a question):
#   0. warns if the PC has less than 4 GB of free memory (then carries on);
#   1. starts the emulator "ks_test_api36" WITH A WINDOW if it is not already running,
#      and waits until Android has finished starting (max 15 minutes);
#   2. installs the staging app and the production app from android/ks-apks/;
#   3. opens the staging app ("Kisan Sahyog (Staging)");
#   4. prints, in plain English, what to do next and where the APK files are.
#
# It never deletes an app, never wipes the emulator and never touches the database.
# Options (all optional):  KS_BOOT_TIMEOUT=900 (seconds to wait for Android to start)
set -u

AVD_NAME="${KS_AVD_NAME:-ks_test_api36}"
PORT="${KS_AVD_PORT:-5554}"
SERIAL="emulator-$PORT"
BOOT_TIMEOUT="${KS_BOOT_TIMEOUT:-900}"
STAGING_PKG="com.kissansahyog.app.staging"
PROD_PKG="com.kissansahyog.app"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APK_DIR="$ROOT/android/ks-apks"
STAGING_APK="$APK_DIR/ks-staging.apk"
PROD_APK="$APK_DIR/ks-production.apk"
LOG="$ROOT/android/ks-apks/morning-emulator.log"   # android/ks-apks is gitignored

say()  { printf '%s\n' "$*"; }
line() { say "------------------------------------------------------------------"; }
fail() { line; say "STOPPED: $*"; line; exit 1; }

line
say "Kisan Sahyog — morning start ($(date '+%Y-%m-%d %H:%M'))"
line

# ---------------------------------------------------------------- 0. free memory
FREE_MB=""
if command -v powershell.exe >/dev/null 2>&1; then
  FREE_MB="$(timeout 30 powershell.exe -NoProfile -NonInteractive -Command \
    "[math]::Floor((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1024)" 2>/dev/null | tr -dc '0-9')"
fi
if [ -z "$FREE_MB" ] && command -v wmic >/dev/null 2>&1; then
  KB="$(timeout 30 wmic OS get FreePhysicalMemory /value 2>/dev/null | tr -dc '0-9')"
  [ -n "$KB" ] && FREE_MB=$(( KB / 1024 ))
fi
if [ -z "$FREE_MB" ] && [ -r /proc/meminfo ]; then
  FREE_MB=$(( $(awk '/MemAvailable/ {print $2}' /proc/meminfo) / 1024 ))
fi
if [ -n "$FREE_MB" ]; then
  say "Free memory on this PC: about $(( FREE_MB / 1024 )).$(( (FREE_MB % 1024) * 10 / 1024 )) GB"
  if [ "$FREE_MB" -lt 4096 ]; then
    line
    say "WARNING: less than 4 GB of memory is free. The emulator needs about 4 GB."
    say "Please close Firefox, ChatGPT, Chrome and other big programs now."
    say "(Continuing anyway in 10 seconds — if the PC becomes very slow, close them and run this again.)"
    line
    sleep 10
  fi
else
  say "(Could not read the free memory — make sure Firefox / ChatGPT are closed.)"
fi

# ---------------------------------------------------------------- Android tools
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] && [ -n "${LOCALAPPDATA:-}" ]; then SDK="$(cygpath -u "$LOCALAPPDATA" 2>/dev/null || echo "$LOCALAPPDATA")/Android/Sdk"; fi
SDK="$(cygpath -u "$SDK" 2>/dev/null || echo "$SDK")"
EXE=""
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) EXE=".exe";; esac
ADB="$SDK/platform-tools/adb$EXE"
EMULATOR="$SDK/emulator/emulator$EXE"
[ -x "$ADB" ] || fail "the Android tools were not found ($ADB). Is Android Studio's SDK installed?"
[ -x "$EMULATOR" ] || fail "the Android emulator was not found ($EMULATOR)."

[ -f "$STAGING_APK" ] || fail "the staging app file is missing: $STAGING_APK"
[ -f "$PROD_APK" ] || say "Note: the production app file is missing ($PROD_APK) — only the staging app will be installed."

adbs() { "$ADB" -s "$SERIAL" "$@"; }

# ---------------------------------------------------------------- 1. emulator
timeout 30 "$ADB" start-server >/dev/null 2>&1 || true
if timeout 15 "$ADB" -s "$SERIAL" get-state 2>/dev/null | grep -q device; then
  say "1. The emulator is already running ($SERIAL)."
else
  "$EMULATOR" -list-avds 2>/dev/null | tr -d '\r' | grep -qx "$AVD_NAME" \
    || fail "the emulator \"$AVD_NAME\" does not exist. Run: bash scripts/android/avd-setup.sh"
  say "1. Starting the emulator \"$AVD_NAME\" (a phone window will open; this can take 2–10 minutes)..."
  # With a window (no -no-window) so you can use it; no wipe, keeps the apps and logins from last time.
  nohup "$EMULATOR" -avd "$AVD_NAME" -port "$PORT" -no-snapshot -no-boot-anim -no-audio \
    -gpu swiftshader_indirect > "$LOG" 2>&1 &
  disown 2>/dev/null || true
fi

say "   Waiting for Android to finish starting (at most $(( BOOT_TIMEOUT / 60 )) minutes)..."
START=$(date +%s)
while :; do
  BOOTED="$(timeout 10 "$ADB" -s "$SERIAL" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n')"
  [ "$BOOTED" = "1" ] && break
  if [ $(( $(date +%s) - START )) -ge "$BOOT_TIMEOUT" ]; then
    fail "the emulator did not finish starting within $(( BOOT_TIMEOUT / 60 )) minutes. Close other programs, then run this command again. (Details: $LOG)"
  fi
  sleep 5
done
# The package manager can lag a little behind "boot completed".
for _ in $(seq 1 30); do timeout 10 "$ADB" -s "$SERIAL" shell pm path android >/dev/null 2>&1 && break; sleep 2; done
say "   Android is ready (after $(( $(date +%s) - START )) s)."

# Friendly state for a person: screen on and unlocked, internet on, on-screen keyboard always shown.
timeout 10 "$ADB" -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
timeout 10 "$ADB" -s "$SERIAL" shell wm dismiss-keyguard >/dev/null 2>&1 || true
timeout 10 "$ADB" -s "$SERIAL" shell cmd connectivity airplane-mode disable >/dev/null 2>&1 || true
timeout 10 "$ADB" -s "$SERIAL" shell settings put secure show_ime_with_hard_keyboard 1 >/dev/null 2>&1 || true

# ---------------------------------------------------------------- 2. install
install_apk() { # <label> <apk> <package>
  local label="$1" apk="$2" pkg="$3" out
  [ -f "$apk" ] || return 0
  say "2. Installing the $label app..."
  out="$(timeout 300 "$ADB" -s "$SERIAL" install -r "$apk" 2>&1 | tr -d '\r')"
  if printf '%s' "$out" | grep -q "Success"; then
    say "   $label app installed."
  elif printf '%s' "$out" | grep -q "INSTALL_FAILED_UPDATE_INCOMPATIBLE"; then
    say "   The $label app could NOT be installed: a different build of it is already on the emulator."
    say "   To replace it (this removes that app's test data on the emulator only), run:"
    say "     \"$ADB\" -s $SERIAL uninstall $pkg"
    say "   and then run this morning command again."
  else
    say "   The $label app could NOT be installed. Message: $(printf '%s' "$out" | tail -1)"
  fi
}
install_apk "staging" "$STAGING_APK" "$STAGING_PKG"
install_apk "production" "$PROD_APK" "$PROD_PKG"

# ---------------------------------------------------------------- 3. launch staging
say "3. Opening \"Kisan Sahyog (Staging)\"..."
if timeout 60 "$ADB" -s "$SERIAL" shell am start -W -n "$STAGING_PKG/com.kissansahyog.app.MainActivity" 2>&1 | tr -d '\r' | grep -q "Status: ok\|Complete"; then
  say "   The staging app is open in the emulator window."
else
  say "   Could not open it automatically — tap the \"Kisan Sahyog (Staging)\" icon in the emulator yourself."
fi

# ---------------------------------------------------------------- 4. next steps
to_win() { cygpath -w "$1" 2>/dev/null || echo "$1"; }
line
say "READY. What to do next:"
say ""
say "  a) Look at the emulator window. The staging app should be open."
say "  b) Follow the guide step by step (open it in Notepad or on GitHub):"
say "       $(to_win "$ROOT/docs/review/batch9/MORNING_EMULATOR_GUIDE.md")"
say "  c) The test logins (STAGING only) are in:"
say "       C:\\Users\\usdvi\\ks-test-accounts\\TEST_ACCOUNTS.md"
say "  d) Later, for your real phone:"
say "       $(to_win "$ROOT/docs/review/batch9/PHONE_TEST_CHECKLIST.md")"
say ""
say "The app files (APKs) are here:"
say "  Staging (for testing, the one to copy to your phone):"
say "       $(to_win "$STAGING_APK")"
[ -f "$PROD_APK" ] && say "  Production (talks to the REAL site — look only, do not post):" && say "       $(to_win "$PROD_APK")"
say ""
say "When you are finished, close the emulator window (or run: bash scripts/android/avd-setup.sh --stop)."
line
