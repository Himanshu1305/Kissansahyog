# V2 DECISIONS LOG

Conservative choices made where the prompt was ambiguous. One row per decision.

| # | Phase | Decision | Rationale |
|---|-------|----------|-----------|
| D1 | 0 | Bundle guard uses **total JS gzip** (306,764 B baseline, 15% cap = 352,778 B) as the primary metric, in addition to tracking the initial eager chunk set. | "Initial JS bundle" is ambiguous with per-route splitting; total gzip is the strictest, most reproducible guard. |
| D2 | 0 | `DATA_GOV_IN_API_KEY` absent → KCC API skipped in Phase 12 (per §0.8); listed as owner action. | Explicitly allowed by the prompt; not a hard stop. |
| D3 | 15 | Deploy a **preview** (`--branch v2-preview`), not production, per the run override. Production command goes in the final report. | Run-level override in the task instructions. |
