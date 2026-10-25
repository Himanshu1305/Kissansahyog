# Batch 10G — photo removal proof on STAGING (2026-10-19T09:51:06.324Z)

## Option 1 — delete the storage row inside the database
- PASS — before: the photo URL answers 200 ({"plain":200,"busted":200,"cache":"MISS"})
- PASS — a plain SQL delete of the storage row is REFUSED (Supabase guard storage.protect_delete) (HTTP 400: {"message":"Failed to run sql query: ERROR: 42501: Direct deletion from storage tables is not allowed. Use the Storage API instead.\nHINT: This prevents acciden)
- PASS — after the refused SQL delete the photo still answers 200 and its row is there → option 1 does NOT count ({"plain":200,"busted":200,"cache":"HIT"})
- note — the guard can be switched off for one transaction (`storage.allow_delete_query`), but that removes only the database row: Supabase keeps the file bytes as an orphan. Not "removed from the system" → not used.

## Option 2 — seller delete + Storage API remove (anon, queue-gated policy)
- PASS — BEFORE any delete RPC, anon cannot remove a photo of an existing listing (policy refuses; file stays) (api: [] )
- PASS — delete_my_listing returns both paths (["listings/kstest-10g-1792403466324/a.jpg","listings/kstest-10g-1792403466324/b.jpg"])
- PASS — get_my_pending_photo_deletions lists them for the owner (["listings/kstest-10g-1792403466324/b.jpg","listings/kstest-10g-1792403466324/a.jpg"])
- PASS — anon Storage API remove of the returned paths succeeds (2 removed )
- PASS — storage rows of both photos are gone
- PASS — the files are gone at the storage origin: every uncached request answers 404/400 ({"plain":200,"busted":400,"cache":"HIT"} {"plain":400,"busted":400,"cache":"BYPASS"})
- PASS — a photo nobody viewed before also answers 404/400 at its plain URL ({"plain":400,"busted":400,"cache":"BYPASS"})
- note — CDN: photo a had been viewed in option 1 (cached); its plain URL answered 200 (HIT). Photos are uploaded with cache-control 3600, so a copy viewed shortly before the delete can stay at the CDN edge for up to 1 hour (HUMAN-REVIEW; re-check of this URL later: evidence/photo-cdn-recheck.txt). URL: https://wzxtqbqlahyahsnoqqva.supabase.co/storage/v1/object/public/listing-photos/listings/kstest-10g-1792403466324/a.jpg
- PASS — nothing left pending for the owner ([])

## Option 2 — admin delete
- PASS — admin delete + remove: row and file gone, URL 404/400 ({"plain":400,"busted":400,"cache":"BYPASS"})

## Negatives — nothing else can be deleted through the API
- PASS — anon cannot delete an unrelated (never queued) photo (api: [] )
- PASS — a queued photo still used by another listing is NOT deleted
- PASS — the queue table is not readable through the API (permission denied for table listing_photo_deletions)

cleanup: KSTEST profiles deleted (2), test files left in storage: 0

**15 passed, 0 failed**
