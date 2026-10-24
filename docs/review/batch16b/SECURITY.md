# Security of the morning post (Batch 16B)

## What a holder of the public anon key can and cannot do
The anon key is public: it is inside the website. With it, anyone can call the database functions that are granted to the anon role. For the morning post that means:

- **Cannot read the posts.** The tables `morning_posts` and `morning_post_secret` have row-level security switched on, no policies, and all privileges revoked. A direct read through the API returns nothing or an error.
- **Cannot read the secret or its hash.** Same lock on `morning_post_secret`. The helper `morning_post_secret_ok` is not granted to anyone.
- **Cannot write a post without the secret.** `morning_post_upsert` and `morning_post_context` compare the SHA-256 of the presented secret with the stored hash. A wrong secret, no secret, or a database where no secret was set all give the same answer: `{"ok":false,"error":"forbidden"}`.
- **Can only guess the secret.** It is 48 random bytes (64 characters of base64url, about 384 bits). Guessing is not realistic.
- **Cannot use the admin functions.** `morning_post_get`, `morning_post_history`, `morning_post_mark_posted` and `morning_post_set_poll_result` call the same guard as the 14A admin console (`require_admin_session`): the caller must be an admin profile with a live session. Anyone else gets `{"ok":false,"error":"forbidden"}`.
- **No service-role key anywhere.** The GitHub job uses only the anon key plus the secret. The service-role key is not in the repo, the workflow, or these docs.

## Limits (abuse and size)
- A post may be written only for dates from yesterday to tomorrow (India time): `bad_date` otherwise.
- Message at most 4,000 characters, card image at most 900,000 base64 characters (about 650 KB), poll text 2,000, report 20,000: `too_large` otherwise. This bounds the storage one holder of the secret can use per day to under 1 MB, and there is one row per date.
- A post marked as posted is never overwritten by the job (`already_posted`).
- The secret and the anon key are never printed by the generator, and a wrong-secret answer never echoes either.

## If the secret leaks
1. On your laptop run `node scripts/morning/make-secret.mjs` again. It prints a NEW secret and the new SQL.
2. Run the new SQL in the production SQL editor (it replaces the stored hash; the old secret stops working at once).
3. Replace the GitHub secret `MORNING_POST_SECRET` with the new secret.
4. Nothing else changes. A leaked secret only ever allowed writing or replacing the text and card of an un-posted day (and reading yesterday's poll result); it never allowed reading anything else.

## Other notes
- The admin page `/admin/morning` is `noindex`, disallowed in robots.txt (`Disallow: /admin`), absent from the sitemaps, not prerendered and not in the search index.
- Reading is a plain text compare of hashes inside the database; there is no per-request rate limit beyond what Supabase applies to every API call. If someone hammered the endpoint, the cost is wasted calls, not a leak.
