# Batch 10A — progress

| Time | Task | Status | Note |
|---|---|---|---|
| 2026-10-17 13:52 | 0.1–0.2 | DONE | origin/release-9 = ee3ecfd; tag pre-10a-start + branch release-10a pushed |
| 2026-10-17 13:56 | 0.3–0.4 | DONE | baseline: build OK, lint known-fail, 26/37 static pass (11 known), staging guard refuses prod; e2e running |
| 2026-10-17 13:58 | A | DONE | who-is-posting block moved to the top of step 1 (same state/testids, 56px buttons); build OK, lint known-broken |
| 2026-10-17 14:02 | B | DONE | FieldRow added; equipment Brand/Model, Year/HP, Output/Unit, Rate basis/amount + building Quantity/Unit paired; spec gate 805/805 (= baseline), build OK, 412px rows / 360px stacked / no overflow at 320px |
| 2026-10-17 14:04 | C | DONE | placeholders via SPEC_FIELDS.ph + specPlaceholder(); empty fields still fail required; spec gate 805/805, build OK |
| 2026-10-17 14:07 | D | DONE | tags under the type, EQUIPMENT_TYPE_DEFAULT_TAGS pre-tick (form-only touched flag, stripped before save), Browse tag chips under category chips (44px, All first, re-tap clears); spec gate 805/805, build OK |
