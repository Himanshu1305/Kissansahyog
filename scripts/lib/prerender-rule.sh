# Prerender check shared by the ship scripts (sourced, no side effects).
# prerender_check LOGFILE MIN_ROUTES -> 0 if OK; otherwise prints the failing condition on stdout and returns 1.
# Rule: N = the number in "Prerendering N routes"; require "Prerendered N/N" (same N), "Failed: 0", fallback count <= 1, N >= MIN_ROUTES.
prerender_check() {
  local log="$1" floor="$2" n line fb
  n="$(grep -oE 'Prerendering [0-9]+ routes' "$log" | tail -1 | grep -oE '[0-9]+')"
  [ -n "$n" ] || { echo "N=? floor=$floor: no 'Prerendering N routes' line in the log"; return 1; }
  line="$(grep -E "Prerendered ${n}/${n}( |\$)" "$log" | tail -1)"
  [ -n "$line" ] || { echo "N=$n floor=$floor: no 'Prerendered $n/$n' line (not every route was prerendered)"; return 1; }
  printf '%s' "$line" | grep -qE 'Failed: 0([^0-9]|$)' || { echo "N=$n floor=$floor: 'Failed: 0' missing (line: $line)"; return 1; }
  fb="$(printf '%s' "$line" | grep -oE '\(([0-9]+) via fallback\)' | grep -oE '[0-9]+' | head -1)"
  [ "${fb:-0}" -le 1 ] || { echo "N=$n floor=$floor: fallback count $fb is higher than 1"; return 1; }
  [ "$n" -ge "$floor" ] || { echo "N=$n floor=$floor: N is below the floor MIN_ROUTES"; return 1; }
  return 0
}
