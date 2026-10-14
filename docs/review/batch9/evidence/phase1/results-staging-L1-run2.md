**Verdict:** 2 tests — 2 RAN-PASSED / 0 RAN-FAILED / 0 NOT-RUN / 0 HUMAN-REVIEW

Source: `docs/review/batch9/evidence/phase1/results-staging-L1-run2.json` · run 2026-10-14T21:34:03.991Z → 2026-10-14T21:36:18.286Z · device emulator-5554 (API 36, WebView —)

| ID | Test | Status | Assertion | Evidence |
|---|---|---|---|---|
| S4 | Signup | **RAN-PASSED** | A brand-new KSTEST user signs up through the real signup UI of the staging app; lands logged in; the session survives force-stop + relaunch | docs/review/batch9/evidence/phase1/staging-L1-run2/S4/ (4 files) |
| L1 | Post page location fallback | **RAN-PASSED** | Logged in, /post step 3, "use my current location": GPS on → coordinates near the emulator position (which step: cached ≤ 10 min / fresh ≤ 20 s recorded); GPS off → within ~25 s the clear fallback message (on screen, not covered) with the village field in view, no crash | docs/review/batch9/evidence/phase1/staging-L1-run2/L1/ (4 files) |
