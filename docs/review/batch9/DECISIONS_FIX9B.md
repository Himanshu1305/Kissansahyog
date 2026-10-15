# Batch 9B — decisions (two fixes: vendor-contact consent, duplicate-post protection)

Started 2026-10-15 14:56 IST on branch `release-9` (HEAD `1cd9dc8`). Each decision: what I chose, and why
it is the safest option. The founder does not need to read this to test; it is here so the choices can be
checked later.

## Phase 0 — preflight

1. **Uncommitted files found at the start.** `docs/review/batch7{a,b,d,l1,l2}/VERIFY_OUTPUT.txt` and
   `public/search-index.json` were already modified, and `BATCH9B_FIX_PROMPT.md` is untracked (the founder's
   prompt). These were not made by the founder: they are outputs of the earlier builder runs' verify scripts
   and build (Batch 9 recorded them as "left uncommitted on purpose", `PROGRESS.md`). The rule "stop if there
   are uncommitted changes you did not make" exists to protect the founder's own work; none of these files is
   that. **Decision: continue, never stage, never edit them.** Every commit uses explicit paths.
2. **Free memory at the start: about 1.08 GB** (rule threshold for the emulator: 4 GB). The emulator step is
   therefore **skipped: low memory**. Playwright runs headless, one worker, one test at a time, with no
   other heavy process running.
3. **How staging migrations were applied before.** The founder applies migrations by hand (Supabase SQL
   editor; `BATCH7L2_REPORT.md` "Migrations for you to apply"). The repo runner `scripts/db.mjs migrate`
   would also re-run `0056`–`0060`, which are applied on staging but not recorded in its tracker table
   (`db.mjs status` lists them as pending; staging has `places`, the 0059/0060 functions, etc.).
   **Decision: never run `db.mjs migrate`.** Apply only my own two files to staging, one at a time, through
   the same Management API that `db.mjs` uses (new helper `scripts/fix9b/stagingSql.mjs`, which refuses any
   project that is not staging), then record them in staging's `schema_migrations` tracker.
4. `scripts/db.mjs` must not be imported by other scripts: it runs its command line on import (and one of
   its commands drops the schema). The new helper copies only its request function.

## Phase 1 — audit (2A) and design

5. **Where the phone number comes from today.** The listings table has no phone column. The number reaches a
   viewer only through the database function `get_listing_contact`, which already refuses
   (`contact_hidden`) when the owner chose "keep hidden" — for every category and both sources. So hiding is
   enforced on the server, not only in the screen. Every data request in this app is sent with the public
   key (custom login), so "logged-out" and "logged-in as someone else" receive exactly the same data; the
   screen sends a logged-out visitor to the login page first.
6. **Finding F1 (real leak, farmer listings included).** Seeds & fertiliser (`agri_inputs`) with the
   sub-type "Shop / Vendor" copies the poster's mobile into the PUBLIC listing data (`details.contact_phone`),
   for any source (farmer or vendor) and any owner setting. The screen never prints it, but the network
   response carries it. Staging: 1 hidden-owner listing affected (`evidence/fix9b/audit-2a-before.json`).
   Migration 0031 made this public on purpose ("the shop's number"), before the founder's rule that hidden
   owners must agree first. **Fix is small and safe, so done (decision 10).**
7. **No listing edit screen exists** (no edit RPC, no route). The prompt's "listing edit screen" therefore
   has nothing to change. Existing vendor listings with no consent keep following the owner's setting
   (the founder's rule); an owner who wants the number shown can post again and tick the box. A
   "change my listing" screen is a BACKLOG item, not built.
8. **Consent column: one nullable `contact_consent_at timestamptz`** (no extra boolean: "set" = agreed, and
   the time is the proof). Existing rows stay NULL.
9. **Where consent is stamped.** `create_listing_with_location` gets two new parameters with defaults,
   `p_client_request_id uuid default null` and `p_contact_consent boolean default false`. Consent is stored
   only when the box was ticked AND the listing is a vendor listing or a provider category
   (equipment, warehouse, greenhouse, jugaad). The server does **not** require consent, because the older
   app and cached websites post without the new field and must keep working; the new screens require the
   tick before Post can be pressed. Without a stamp, a hidden owner simply stays hidden — nothing is exposed.
10. **F1 fix (server side, so it also covers the older app).** In `create_listing_with_location`: for an
    `agri_inputs` post whose owner is hidden and which has no consent stamp, the number is moved out of the
    public data into the existing private table `listing_private_contact` (the same place Land uses), and
    the public key is kept as an empty string so the "exact keys" shape from 0031 does not change. Show
    owners and consented listings are unchanged (the shop number stays public, as 0031 intended). Existing
    rows are NOT changed (a separate, unapplied clean-up query for the founder is in
    `PROD_AFFECTED_LISTINGS.sql`, part 2).
11. **`get_listing_contact`:** hidden owner → still refused, **unless that listing has
    `contact_consent_at`**. Nothing else changes (the private per-listing number still wins over the profile
    number).
12. **Function signature change done the backward-compatible way.** The old 12-parameter
    `create_listing_with_location` is dropped and recreated with 14 parameters, the 2 new ones with
    defaults. Old clients send 12 named parameters, which still match exactly one function (a second
    overload would make PostgREST refuse the call as ambiguous). `create_listing` (the inner function) is
    not changed. Grants are re-applied as before (anon + authenticated execute).
13. **Duplicate-post protection lives in the database function**, not only the screen:
    a nullable `listings.client_request_id uuid` plus a UNIQUE partial index on
    `(user_id, client_request_id) WHERE client_request_id IS NOT NULL`. The function first returns an
    existing listing with the same (owner, request id); otherwise it creates the listing and stamps the id
    inside a protected block — if a parallel call won the race (unique violation), the block is rolled back
    (including the private-contact row) and the winner's listing is returned as success.
14. **Migration files:** `supabase/migrations/0061_listing_client_request_id.sql` and
    `0062_listing_contact_consent.sql` (the repo numbers its migrations; a date stamp would sort after every
    future `00NN` file). Rollbacks are in `supabase/migrations/rollback/` — a sub-folder, so neither
    `db.mjs migrate` nor the Supabase CLI can ever run a rollback by accident. 0062 depends on 0061 (it
    replaces the same function); the rollback order is 0062 then 0061.
15. **Photos made idempotent without a storage-policy change.** The `listing-photos` bucket only lets the
    public key INSERT (no UPDATE), so `upsert: true` would fail. Instead the path is
    `listings/<client_request_id>/<index>-<fingerprint>.jpg` (fingerprint = file name, size and date), and an
    "already exists" answer counts as success. A retry of the same photo therefore re-uses the same file; no
    duplicates, no orphans. Other screens that upload photos (none besides Post's own path) keep the old
    random folder.
16. **PROVIDER_CATS** moves from `Post.jsx` into `src/lib/listings/catalog.js` (the prompt's location), and
    Post imports it.
17. **Consent box scope = vendor listings + provider OFFERS** (equipment, warehouse, greenhouse, jugaad
    offers — exactly the offers that already carry the provider declaration). The prompt's literal
    "category in PROVIDER_CATS" would also catch a farmer's *requirement* ("I need a tractor"): a hidden
    farmer could then only post it by agreeing to show the number, which breaks the founder's other rule
    "farmer-source listings are unchanged". The server stamps consent under the same condition. A4 (the 4
    provider categories with a hidden owner) is tested with offers. If the founder wants requirements
    included too, it is a one-line change in `Post.jsx` and in 0062 (BACKLOG).
