#!/usr/bin/env bash
# Batch 10F — run every e2e spec file on its own (--workers=1, teardown after each file), against an
# already-running site. Low-memory friendly (10E ran out of memory with one big run).
#   bash scripts/batch10f/e2e-loop.sh <baseURL> <outDir> [spec ...]
# Writes <outDir>/<spec>.txt per file and <outDir>/_summary.txt ("file passed failed").
set -u
BASE="$1"; OUT="$2"; shift 2
mkdir -p "$OUT"
SPECS=("$@")
if [ ${#SPECS[@]} -eq 0 ]; then SPECS=($(ls e2e/*.spec.js)); fi
: > "$OUT/_summary.txt"
for f in "${SPECS[@]}"; do
  name=$(basename "$f" .spec.js)
  KS_E2E_BASE="$BASE" node --env-file=.env node_modules/@playwright/test/cli.js test --config scripts/batch10f/playwright.base-url.config.mjs "$f" --workers=1 --reporter=list > "$OUT/$name.txt" 2>&1
  p=$(grep -Eo '[0-9]+ passed' "$OUT/$name.txt" | tail -1 | grep -Eo '[0-9]+' || echo 0)
  x=$(grep -Eo '[0-9]+ failed' "$OUT/$name.txt" | tail -1 | grep -Eo '[0-9]+' || echo 0)
  echo "$name ${p:-0} ${x:-0}" | tee -a "$OUT/_summary.txt"
done
