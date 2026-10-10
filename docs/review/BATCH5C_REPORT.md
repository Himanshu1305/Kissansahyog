# Result

23 Q&As from 6 publishers are fully verified. The 25-Q&A goal was not met; 29 old Q&As were dropped and 23 new, independently sourced Q&As were added. Normal and live citation gates both passed 23/0.

# Triage table

All 6 `pmfby-*` and all 4 ICAR vegetable Q&As were dropped. All 5 `tamatar-*` Q&As were dropped because the NHB PDF extractor could not run. All 4 old BIS, all 6 old PM-KISAN, and all 3 old FAO Q&As were dropped and replaced by fresh claim-level Q&As.

# What could not be done and why

NHB PDFs failed because `pdftotext` could not spawn in this sandbox. PM-KISAN fetch failed. The PMFBY and Soil Health portal pages were JavaScript shells. No PDF facts were used.

# Fetch log summary

The full attempt log is `docs/research/BATCH5C_FETCH_LOG.md`: 18 usable and 14 unusable recorded attempts before final selection. Obsolete and uncited snapshots were deleted.

# Verification output

Normal gate: 23 passed, 0 failed, `exit=0`. Live gate: 23 passed, 0 failed, `exit=0`. Raw outputs are in `BATCH5C_VERIFY_OUTPUT.txt`, `BATCH5C_VERIFY_LIVE_OUTPUT.txt`, and `BATCH5C_CONTENT_TEST_OUTPUT.txt`. The existing Windows Node 24 citation-audit module-path failure remains pre-existing.

# Citation ledger

Every Q&A, answer item, publisher, URL, fetch time and verbatim quote is recorded claim-by-claim in `docs/research/qa_raw/batch5b.evidence.json`; the full fetched source text and timestamps are in `docs/research/source_snapshots/`.

# Decisions needed

Safest choice: ship 23 rather than pad to 25. Before publish, confirm current MP implementation details for PM-KUSUM and credit schemes.

# Manual checks for the owner

Read the Hindi; review `QA_BATCH5B_FOR_REVIEW.md`; seed; check the DB count; then spot-check three `/sawaal/` pages on staging after deploy.
