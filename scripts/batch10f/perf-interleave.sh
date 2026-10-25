#!/usr/bin/env bash
# Batch 10F — homepage perf, the 10D slow-phone method (scripts/batch10d/perf.mjs), interleaved:
# one run of the baseline, one run of the new build, N times, so both see the same machine load.
#   bash scripts/batch10f/perf-interleave.sh <baseURL> <baseDist> <newURL> <newDist> <outDir> [N=5]
# Prints the median LCP / CLS / TBT / FCP of both.
set -eu
BASE_URL="$1"; BASE_DIST="$2"; NEW_URL="$3"; NEW_DIST="$4"; OUT="$5"; N="${6:-5}"
mkdir -p "$OUT"
for i in $(seq 1 "$N"); do
  node scripts/batch10d/perf.mjs "$BASE_URL" "$OUT/base-$i.json" --runs 1 --label "base-$i" --dist "$BASE_DIST" > /dev/null
  node scripts/batch10d/perf.mjs "$NEW_URL" "$OUT/new-$i.json" --runs 1 --label "new-$i" --dist "$NEW_DIST" > /dev/null
done
node -e '
const fs = require("fs"); const out = process.argv[1]; const n = Number(process.argv[2])
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
for (const k of ["base", "new"]) {
  const runs = Array.from({ length: n }, (_, i) => JSON.parse(fs.readFileSync(`${out}/${k}-${i + 1}.json`, "utf8")).median)
  const m = (f) => med(runs.map((r) => r[f]))
  console.log(`${k.padEnd(4)} LCP ${m("lcpMs")} ms  CLS ${m("cls")}  TBT ${m("tbtMs")} ms  FCP ${m("fcpMs")} ms  JS gz ${m("jsChunksGzip9Total")}  (runs: LCP ${runs.map((r) => r.lcpMs).join(", ")})`)
}' "$OUT" "$N"
