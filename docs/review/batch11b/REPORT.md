# Batch 11B report — staging only

Login with an unknown or admin number returns HTTP 409 `phone_not_registered` immediately, without contacting the SMS provider. The existing rate-limit reservation remains, and repeated attempts receive cooldown errors. The client stays on the number form with the requested Hindi/English red alert and a minimum 48 px Create account link. It preserves the return destination and does not prefill the number. Register/resend behavior, verification safety net, runtime switch rules, and database schema are unchanged.

| Verification | Result |
| --- | --- |
| Unit suite, including Hindi/English parity | 101/101 (`evidence/unit.txt`) |
| Staging database catalog/security checks | 9/9 (`evidence/catalog-test.md`) |
| Local HTTP, real Functions + staging DB + mock SMS | 31/31 (`evidence/http.md`); unknown/admin provider calls zero |
| Final full staging build | 268/268 prerendered, zero failures; root used the existing fallback path (`evidence/build.txt`) |
| Main JavaScript gzip (-9) | 27,843 B (11A) → 27,850 B: **+7 B** (`evidence/chunk-size.txt`) |
| OTP browser file (final build, one run) | 16/16 (`evidence/browser.txt`); 320 px Hindi screenshot inspected: message fits, button 48 px, no overflow (`evidence/screens/`) |
| Secret scan | 0 findings in 18 sources (`evidence/secret-scan.txt`) |
| Staging upload | deployment `a21bd909`, live check passed: unknown test number -> 409, no SMS (`evidence/live-check.txt`) |
| Ship dry run | see `evidence/ship-dryrun.txt` |

The whole Playwright suite was deliberately not rerun: 11A established the 202/203 baseline and this change affects only OTP login. The initial focused browser attempt found a test-only header/CORS setup issue; one complete final OTP-file run follows that fix. The initial HTTP pass exposed a host/database clock difference in cleanup; the corrected focused run passed all checks. No real SMS was used in testing.

Cleanup scope: only this run's generated phones, request/ticket creation timestamps from the database, `KSTEST 11B fn` / `KSTEST 11B admin` HTTP profiles, `KSTEST 11A` browser profiles/listings/sessions created during this run, and its exact generated email-auth user. One live staging smoke request will be removed by its phone hash and database start time. Earlier batches' KSTEST data is preserved. No full test numbers, credentials or provider URLs are recorded here.

Production remains Batch 10C; it has not been deployed or modified. This fix joins the same unshipped 11A production package. Hindi wording is in `HINDI_CAPTIONS.md`.
