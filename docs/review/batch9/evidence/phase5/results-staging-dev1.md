**Verdict:** 1 tests — 1 RAN-PASSED / 0 RAN-FAILED / 0 NOT-RUN / 0 HUMAN-REVIEW

Source: `docs/review/batch9/evidence/phase5/results-staging-dev1.json` · run 2026-10-15T04:46:36.472Z → 2026-10-15T04:48:42.912Z · device emulator-5554 (API 36, WebView —)

| ID | Test | Status | Assertion | Evidence |
|---|---|---|---|---|
| S11 | Live staging: feedback, village lookup, mic | **RAN-PASSED** | Staging app against https://staging.kissansahyog.com: (a) a KSTEST feedback from /grievance shows the success state, its POST carries Origin https://localhost and the response has Access-Control-Allow-Origin https://localhost; (b) /post step 3: typing a village gives known-village suggestions, and the typed-village map lookup (LocationControl → live /geocode) returns a place, with the app CORS; (c) the mic on /search is shown if and only if the live /transcribe says configured:true (value recorded) | docs/review/batch9/evidence/phase5/staging-dev1/S11/ (6 files) |
