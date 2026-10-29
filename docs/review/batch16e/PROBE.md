# Batch 16E probe: can a Supabase Edge Function in Mumbai reach data.gov.in?

**VERDICT: Mumbai function reaches data.gov.in: YES**

Staging only (ref wzxtqbqlahyahsnoqqva). One request per call to resource 35985678 (Sagar, Wheat, newest first, limit 1). The probe function and its script have been removed (function undeployed from staging, folder deleted from the repo). Raw lines: `PROBE_RESULTS.txt` (no secrets inside).

| Call | Header sent | Region that ran it (`x-sb-edge-region`) | HTTP status | Newest date | ms |
|---|---|---|---|---|---|
| a | `x-region: ap-south-1` | ap-south-1 | 200 | 28/10/2026 | 421 |
| b (a minute later) | `x-region: ap-south-1` | ap-south-1 | 200 | 28/10/2026 | 572 |
| c | none | ap-south-1 | 200 | 28/10/2026 | 388 |

Notes: even with no region header the function ran in Mumbai from this location, but the schedule still sends `x-region: ap-south-1` so it cannot drift to a foreign region. Compare run #166 on GitHub: every request to the same server was refused or timed out.
