# Batch 11A — decisions (what, why, alternatives)

Rule followed throughout: when a choice was needed, the SAFEST option was taken and written here.

## Phase 0
1. **Spike result → header design (Part B delivered).** The browser on staging could send `x-ks-session` to
   Supabase REST (preflight answers `Access-Control-Allow-Origin: *` and echoes the requested headers, also for
   `https://localhost` and `capacitor://localhost`) and SQL read it from `request.headers` (`evidence/spike/`).
   Alternative (token as an RPC parameter on 100 functions, or a proxy) not needed.
2. **Baseline E2E ran on the frozen Phase 0 build** (`vite preview` of a copy of `dist`). Migration 0066 was
   applied to staging while the baseline run was in its second half, with both flags OFF. The files that ran
   afterwards were unchanged (202/203 overall, same single known `phase19` failure as 10G) — an early proof that
   0066 with flags off changes nothing. Recorded so the baseline is not over-claimed as "before any DB change".
3. **Main-chunk size is measured with gzip -9** by `scripts/batch11a/chunk-sizes.mjs` (27,800 B at Phase 0). 10G
   reported 27,623 B with another tool; budgets in 11A compare 11A numbers with 11A numbers only.
4. **Pre-existing preview servers** on ports 4173/4183/4301/4302 (started before this run, some from other
   projects) were left alone; 11A used its own ports.
5. The first baseline build failed once with a Windows file lock on `public/search-index.json` (the spike's
   Playwright config had started a second build at the same time). Re-run alone: 268/268. Later Playwright runs use
   `scripts/batch10f/playwright.base-url.config.mjs` (no build of its own).

## Phase 1 — database
6. **The guard is generated inside the database the migration runs on** (0066 section 7, catalog-driven) instead
   of pasting staging's function bodies into the migration. Why: production's bodies may differ from staging's
   (it may lag a batch, or have its own fixes); pasting staging bodies could silently overwrite production code.
   The original definition of every changed function is saved in `ks_fn_backup_0066` on that same database, and
   the rollback re-runs exactly those. `scripts/gen-require-actor-migration.mjs` is the prompt's generator: an
   independent JavaScript implementation (own tokenizer) that produces the same statements from the live staging
   catalog (`evidence/require-actor-generated.sql`) and, with `--check`, proved all 103 changed functions on staging
   are byte-for-byte its transform of the saved originals (`evidence/byte-for-byte-check.md`). Staging originals
   also kept as `evidence/fn-originals-staging.sql`.
7. **SQL-language functions (4) are guarded, not skipped:** `select public.require_actor(p_actor_id);` is added
   as the first statement of the SQL body (a SQL function returns the result of its LAST statement, so the
   result is unchanged). No conversion to plpgsql needed, so nothing went to BACKLOG as HUMAN-REVIEW.
8. **Allow-list:** only `app_session_valid` (the start-up token check must answer true/false, never raise; acts on
   nothing). `require_actor` is excluded by name. `require_admin(p_actor_id)` IS guarded (harmless double check
   inside admin functions; stops anyone probing who is an admin by id when enforcement is on).
9. **Enforcement needs BOTH flags** (`session_enforced` AND `otp_required`). Why: with OTP off, phone users sign in
   through the old `app_login`, which cannot return a token (its return type must not change), so enforcement
   alone would lock every phone user out. Turning OTP off is therefore always a safe undo.
10. **The old `app_signup` (pincode sign-up, still granted) is gated too**, like `app_register_phone`: it is the
    same "register any number without proof" hole. Signature and return type unchanged.
11. **Pepper:** a random 64-hex value created once by 0066 in `auth_private` (RLS on, no grants) on each database —
    production gets its own. The Pages Function passes the raw phone and IP to `otp_rate_check`, which hashes them
    with the pepper; the function never knows the pepper. Phone and IP are not stored, only the hashes.
12. **Tokens:** 64 hex characters from two `gen_random_uuid()` (strong random, 244 bits) with a prefix (`kss1_`
    session, `kst1_` ticket); only `sha256` hashes are stored; lookups are by hash (index), so no timing compare of
    secrets happens in SQL. No extension needed (built-in `sha256`, `gen_random_uuid`), so the same file works
    whatever schema pgcrypto lives in.
13. **otp_requests has one extra column, `send_state`** (`pending`/`sent`/`failed`/`decoy`): needed to (a) stop a
    failed provider call from counting against the 30 s cooldown and the 10-minute limit (it still counts per day
    and per IP, which stops retry storms), (b) mark "decoy" requests.
14. **Login for a number that may not sign in by phone (unknown, or an admin):** the send endpoint answers the same
    `200 {ok, challenge, resendAfter}` after a similar random wait (400–1000 ms), sends no SMS and stores a decoy
    request that counts against the same limits and can never verify ("wrong code"). Register answers
    `phone_exists` plainly, as the existing sign-up already does.
15. **The verify call also carries the phone** (`{challenge, code, phone}`): only a peppered hash of the number is
    kept with the OTP request, so the server needs the number to bind the ticket to it (it checks the hash).
16. **`last_seen_at` is best effort on read-only requests.** PostgREST runs STABLE functions (5 actor functions)
    in a read-only transaction even over POST; `require_actor` catches `read_only_sql_transaction` around its
    once-a-minute update, so those calls still work (proved over GET and POST).
17. **Sessions:** 30 days; at most 20 live sessions per user (older ones revoked); dead rows cleaned after 7 days;
    device = first 120 characters of the user agent. OTP rows deleted after 2 days, tickets after 1 day.
18. **DB-test numbers use the 91111xxxxx range** (KSTEST names), not the e2e 90000 range, because the e2e
    teardown may delete 90000 profiles while another run is going. The test deletes everything it creates.
19. Advisors: only expected findings for 0066 objects (`evidence/advisors-security-11a.txt`).
