# Batch 10A — independent review (after Task F)

Input given to the reviewer: only `git diff pre-10a-start..HEAD` (code, docs excluded) and section 0 + tasks A–F
of the batch prompt. Result: **no must-fix findings.**

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | should-fix / HUMAN-REVIEW | Signup no longer shows `vis_explain` (rule 3: move, not remove consent text); the static check only read strings.js | **Fixed**: shown under the checkbox; check now requires it on the screen |
| 2 | should-fix (minor) | Untouched tags on an unmapped type save `equipment_tags: []` | **No change needed**: `initialDetails()` already had `equipment_tags: []` before 10A |
| 3 | note | `__tags_touched` form flag | Stripped in `cleanSpecDetails` on every equipment path; no leak |
| 4 | note | FieldRow uses subgrid; Field has ≤ 3 children | OK; 1 column < 400 px, 18 px inputs, `min-w-0` |
| 5 | note | Placeholders match the spec; checks read `details` only | OK |
| 6 | note | Register button reuses `accept_and_continue`; phone validated before email; Enter submits (still gated) | Accepted |
| 7 | note | Step-3 village re-fills if emptied and the poster comes back | Accepted (harmless) |
| 8 | note | Browse tag chips above location, sort and results | OK |
| 9 | note | Tests: `.first()` on duplicate-phone, personas no kisan at signup, Devanagari in a test script | Accepted |
| 10 | note | Task A block placement and behaviour | OK |
