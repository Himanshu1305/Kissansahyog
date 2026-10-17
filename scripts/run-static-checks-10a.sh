#!/usr/bin/env bash
# Batch 10A — runs the static (no database write) check scripts and writes a summary table.
#   bash scripts/run-static-checks-10a.sh <out-dir>
# Needs a built dist/ (npm run build:full) for the scripts that read built pages.
set -u
OUT="${1:?out dir}"; mkdir -p "$OUT/logs"
S="$OUT/summary.tsv"; printf 'script\texit\tpass_lines\tfail_lines\tseconds\n' > "$S"
LIST="test/batch2_fasal test/batch2_layout test/batch3_style test/batch4_bazaar test/batch4_qa_facts test/batch4_ui_style test/batch4_voice test/p_0028_location_naming test/p_community test/p_mandi_labeling test/p_mela_dedup test/p_mela_digest test/p_mela_format test/p_mela_pipeline test/p_mela_rearch test/p_rain_alert test/phase8 test/v11_phase2 test/v11_phase6 test/v2_brand test/v2_citation_audit test/v2_phase14 test/v2_seo_audit verify-batch5a verify-batch6a verify-batch6b verify-batch6c verify-batch6d verify-batch6g verify-batch7a verify-batch7b verify-batch7c verify-batch7d verify-batch7l1 verify-batch7l2 check-equipment-specs"
for s in $LIST; do
  name="${s//\//_}"; t0=$(date +%s)
  timeout 300 node --env-file=.env "scripts/$s.mjs" > "$OUT/logs/$name.txt" 2>&1; ec=$?
  p=$(grep -Eci '^\s*(✓|✔|PASS|ok\b)' "$OUT/logs/$name.txt"); f=$(grep -Eci '^\s*(✗|✘|FAIL|not ok)' "$OUT/logs/$name.txt")
  printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$ec" "$p" "$f" "$(( $(date +%s) - t0 ))" >> "$S"
done
cat "$S"
