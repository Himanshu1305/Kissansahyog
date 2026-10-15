#!/usr/bin/env bash
# Batch 9 Phase 5 — stall watchdog for one background job: polls its log every 60 s, writes a
# heartbeat every 10 min, and if the log has not grown for 10 min kills the test processes and
# records the stall in evidence/phase5/STALLS.md. Exits when the log contains DONE_MARK.
#   bash watchdog.sh <log> <label> <done-mark>
cd "$(dirname "$0")/../../../../.."
LOG="$1"; LABEL="$2"; MARK="$3"
HB=docs/review/batch9/HEARTBEAT.log; ST=docs/review/batch9/evidence/phase5/STALLS.md
last=-1; still=0; n=0
while true; do
  sleep 60; n=$((n+1))
  grep -q "$MARK" "$LOG" 2>/dev/null && { echo "watchdog: $LABEL done"; exit 0; }
  size=$(stat -c %s "$LOG" 2>/dev/null || echo 0)
  if [ "$size" = "$last" ]; then still=$((still+1)); else still=0; last=$size; fi
  [ $((n % 10)) = 0 ] && echo "$(date '+%Y-%m-%d %H:%M') | phase5 | waiting on $LABEL ($(tail -n 1 "$LOG" | tr -d '\r' | cut -c1-80))" >> "$HB"
  if [ "$still" -ge 10 ]; then
    echo "$(date '+%Y-%m-%d %H:%M') | phase5 | STALL: $LABEL log silent 10 min — killing test processes" >> "$HB"
    [ -f "$ST" ] || printf '# Batch 9 Phase 5 — stalls\n\n' > "$ST"
    echo "- $(date '+%Y-%m-%d %H:%M') **$LABEL**: log \`$LOG\` had no new output for 10 minutes; last line: \`$(tail -n 1 "$LOG" | tr -d '\r' | cut -c1-160)\`. Test processes killed by the watchdog." >> "$ST"
    powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -match 'run-tests.mjs|test-android.sh|meta-tests.mjs|suite.sh' -and \$_.CommandLine -notmatch 'watchdog' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }"
    echo "STALLED-KILLED $LABEL" >> "$LOG"
    exit 3
  fi
done
