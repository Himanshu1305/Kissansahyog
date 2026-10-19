# Batch 10G — Report: seller delete / disable + admin disable / delete of listings

Branch `release-10g` (from `release-10f` `c44c418`; safety tag `pre-10g-ship`). **STAGING only. Production not touched** (no deploy, no production database access; the ship dry run only read the live site and the Cloudflare project, with the database probes skipped by rule).
Details: `PROGRESS.md`, `DECISIONS.md` (1–35), `SHIP.md`, `BACKLOG.md`, `HINDI_CAPTIONS.md`, `evidence/`.

## Requirements walk-through (self-review)

| Requirement | Status | Evidence / key fact |
|---|---|---|
| Seller can delete own listing — permanent (row, child rows, photos) | RAN-PASSED | `delete_my_listing`; DB test: row and rows in all 3 child tables gone, report link nulled; e2e O2 (hi 412, en 1280) on local build AND deployed staging: row gone, photo file gone, uncached URL 400, old link shows "यह लिस्टिंग नहीं मिली।" |
| Delete asks first, "नहीं" focused, no optimistic removal, toast, plain errors | RAN-PASSED | e2e O2, O5 (keyboard: Enter opens, Escape closes, focus returns) |
| Seller can disable / enable own listing; disabled hidden from everyone else, still shown to the seller greyed | RAN-PASSED | DB tests (public read + `search_listings` hide it); e2e O1, O4 (own detail page) |
| Enable does not extend / bypass expiry | RAN-PASSED | DB test: expired listing stays expired and hidden after enable |
| Admin-disabled listing: badge + reason, no enable button, delete still allowed; seller RPC refuses (`disabled_by_admin`) | RAN-PASSED | DB test; e2e O3 |
| Admin can disable (reason required, 1–300) / enable any listing | RAN-PASSED | DB tests; e2e A1 (panel), A3 (detail page) |
| Admin can delete permanently (category repeated, reason + "DELETE") | RAN-PASSED | e2e A1 (panel), A2 (reports list; report resolved as removed) |
| Non-owner / non-admin refused, and non-admins never see the controls | RAN-PASSED | DB tests (`not_owner`, `not_admin`, also an admin cannot use the seller delete on someone else's listing); e2e O6, A4 |
| Child data gone; complaint kept without the link | RAN-PASSED | DB tests |
| Audit log kept (exactly one row per admin action, no listing content / personal data; not readable via the API) | RAN-PASSED | DB tests; e2e A1 (disable, enable, delete rows) |
| Photo files really removed | RAN-PASSED (option 2) — HUMAN-REVIEW for the CDN window | Option 1 refused by Supabase's guard (proven); option 2 = queue-gated storage DELETE policy + Storage API remove (`evidence/photo-proof.md`, re-run on the deployed staging site 16/16). A recently viewed photo can stay at the CDN edge ≤ 1 h (measured: gone after 41 min) |
| No other copies of a deleted listing | RAN-PASSED with notes | Not in sitemaps / search index; `/listing/:id` not prerendered; prerendered homepage / `/jugaad` cards keep it until the next deploy; offline caches only offline (DECISIONS 21, 29) |
| Migration additive, numbered 0065, rollback + production copy | RAN-PASSED | `supabase/migrations/0065_…sql`, `rollback/0065_…_rollback.sql`, `PROD_MIGRATION_0065.sql`, `PROD_ROLLBACK_0065.sql` |
| No change to auth, OTP, consents, other tables' RLS, CSP, Android | RAN-PASSED | `git diff --stat release-10f..release-10g`: only listing screens/API, strings, offline never-store list, migration, tests, scripts, docs |
| Hindi + English strings via strings.js | RAN-PASSED; wording HUMAN-REVIEW | `HINDI_CAPTIONS.md` |
| Mobile first, ≥ 44 px targets, no horizontal scroll, reduced motion | RAN-PASSED | e2e button sizes; 24 width/language combinations of /my, own listing, /admin: no horizontal page scroll; no animation added |
| Budgets: main chunk ≤ +1.5 KB, LCP ≤ +0.2 s, CLS ≤ +0.02 | RAN-PASSED | main 27,538 → **27,623 B gz (+85 B)**; LCP median over 14 interleaved runs each 2,710 → **2,714 ms (+4)**; CLS 0.01059 → 0.01059 (+0) |
| SEO: prerendered public text unchanged except intended | RAN-PASSED | 268 routes: no intended change (the new screens are not public pages); `/safalta` and `/videos` differ only by load timing (checked live) |
| Ship machinery | RAN-PASSED (dry run) | `ship-prod-10g.sh` / `rollback-prod-10g.sh` (all 10F gates + 0065 probes + 10G marker; 10C/10D/10E/10F accepted as previous); `DRY RUN OK` on the pushed head |

## Numbers
- Main chunk **27,538 → 27,623 B gzip (+85 B)**; admin code in its own 4.3 KB chunk; Admin 14.7 KB; ListingDetail 4.2 KB; MyListings 1.9 KB (all lazy).
- Homepage (10D slow-phone method, interleaved with the frozen Phase 0 build): **LCP +4 ms** (14 runs each), **CLS ±0**.
- Tests: unit 81/81; DB 37/37; photo proof 15/15 (+ 16/16 against the deployed staging site); E2E full suite on the final build **202/203** (only the known phase19 environment failure, also at Phase 0: 190/191); new specs on staging: owner 8/8, admin 4/4.

## Staging
- Deployment **`31c03979-fc96-4b58-b426-7690f1a99fa2`** (commit `e0001e0`), https://staging.kissansahyog.com; migration 0065 applied on the STAGING database.

## HUMAN-REVIEW
1. Hindi wording (`HINDI_CAPTIONS.md`), incl. keeping the existing "चालू / मिल गया" badges instead of the brief's "सक्रिय / बंद" (DECISIONS 23).
2. The CDN window: a deleted photo that someone viewed shortly before can still load from the CDN for up to 1 hour (DECISIONS 20).
3. The old soft "हटाएं" next to "हमेशा के लिए हटाएं" in the admin panel (DECISIONS 32).
4. Admins cannot open a hidden listing's detail page; use the admin panel (DECISIONS 33).
5. The `p_actor_id` trust model (anyone who knows a user's id can act as them; existing design) — BACKLOG 2.
6. A deleted listing stays in the prerendered homepage / `/jugaad` cards until the next deploy (DECISIONS 21).
