# Batch 9B — report (two fixes: duplicate-post protection, vendor-contact consent)

Date 2026-10-15 · branch `release-9` · **staging only** (database `wzxtqbqlahyahsnoqqva` and
staging.kissansahyog.com). **Production was not touched**: no SQL, no migration, no deploy.
Decisions: `DECISIONS_FIX9B.md` · progress: `PROGRESS_FIX9B.md` · new backlog lines: end of `BACKLOG.md`.

## What changed (plain language)

**Fix B — tapping Post twice, or Post again after the network lost the reply.**
- Every Post form now carries a hidden random number. The database keeps at most ONE listing per
  person per number, so a second tap, a retry, or two taps at the same instant all end in the same
  single listing (migration `0061`).
- The Post button locks on the first tap and shows a spinner. After 20 seconds without an answer it
  says **"नेटवर्क धीमा है, जाँच रहे हैं…"** and checks whether the listing already arrived.
- Before any second try, the app first asks "did my listing already arrive?". If yes, the farmer goes
  straight to that listing with the note "आपकी लिस्टिंग पहले ही जुड़ चुकी थी — दोबारा नहीं जोड़ी गई।".
- Photos re-use the same file names on a retry, so no duplicate or orphan photos.
- The older app and old cached websites post exactly as before (they simply do not get the protection).

**Fix A — vendor contact consent.**
- On a **vendor (व्यापारी) listing**, and on an **offer** in machines, warehouse, greenhouse or jugaad, the
  Post screen shows a clear box: **"इस विज्ञापन पर आपका मोबाइल नंबर सबको दिखेगा, ताकि ग्राहक सीधे आपसे संपर्क
  कर सकें।" — "मैं सहमत हूँ"** (English when the app is in English). Post stays disabled until it is ticked.
  Everyone sees the box, including people who already show their number.
- A "keep hidden" person who ticks the box on that listing: their number is shown on THAT listing only.
- Farmer listings are unchanged. Hidden stays hidden.
- Old vendor listings (no tick) keep following the owner's setting.
- The rule is enforced in the database (`get_listing_contact`, migration `0062`), not only on screen.
- **F1 fixed for new posts:** a hidden person posting Seeds & fertiliser as "Shop / Vendor" no longer
  puts their mobile into the public listing data (server side, so it also covers the older app).

## Who sees whose number (2A)

Checked by reading the code and on staging through the real API with the public key, which is what the
app sends for both logged-out and logged-in visitors (126 live listings, `evidence/fix9b/audit-2a-*.json`).
"Shown" = the Call / WhatsApp buttons reveal the number. Listing cards and the detail page use the same
buttons, and a logged-out visitor's screen is sent to the login page first.

**Before 9B** (same for all 11 categories):

| Owner setting | Farmer listing | Vendor listing |
|---|---|---|
| Show | shown | shown |
| Keep hidden | NOT shown | NOT shown — except Seeds & fertiliser "Shop/Vendor": the number sat in the public data (**F1**, network only, never on screen) |

**After 9B**:

| Owner setting | Farmer listing | Vendor listing / provider offer |
|---|---|---|
| Show | shown (unchanged) | shown, after ticking "I agree" (everyone ticks) |
| Keep hidden | NOT shown (unchanged) | shown ONLY if ticked on that listing; old listings: NOT shown |

**F1** (hidden number present in the API response) **existed** before this batch, for Seeds & fertiliser
"Shop / Vendor" posts, and that includes farmer-source posts. It is **closed for new posts**. **One old
staging listing still carries it** (`2286327f…`, created before the fix). Old rows are a founder decision:
count them on prod with part 2 of `PROD_AFFECTED_LISTINGS.sql` (BACKLOG "F1 old rows"). The contact
lookup itself never handed out a hidden number, before or after.

## Tests (all staging; headless browser, one at a time; screenshots in `evidence/fix9b/`, numbers painted over)

| Where | Result |
|---|---|
| Local: new build on this PC + staging database | B1–B5 **5/5 RAN-PASSED**, A1–A6 **6/6 RAN-PASSED** |
| Local: one listing in each of the 11 categories | **11/11 RAN-PASSED** on run 2. Run 1 **RAN-FAILED** 11/11: the test looked at the listing page before it had loaded (all 11 had posted fine); test wait fixed |
| Deployed staging (OLD build, before deploying) | B4UI old website posts against the new database: **RAN-PASSED** |
| Deployed staging (new build `b0b16f72`) | B2, A1, A2 **RAN-PASSED**; B1 attempt 1 **RAN-FAILED** (page click timed out while filling the form, nothing was posted), attempt 2 **RAN-PASSED** |

Case meanings: B1 double tap → 1 listing · B2 reply lost after the server saved → retry lands on the same
single listing (no second create call) · B3 six parallel calls with one id → 1 listing · B4 old-style call
without the id works · B5 failed photo upload then retry → exactly 2 files, both used · A1 hidden farmer as
shop in Seeds & fertiliser: box, Post blocked until ticked, then another user sees the number · A2 same
person as farmer (bhusa, and Seeds & fertiliser shop sub-type with farmer source): no box, number hidden on
screen, in the network data, for another user and logged out · A3 show-number farmer unchanged, and gets
the box on a vendor post · A4 machines / warehouse / greenhouse / jugaad offers by a hidden owner: box
required in each · A5 3 old vendor listings of a hidden owner: number not shown (the 1 F1 old row still has
it in the public data, see above) · A6 Hindi and English text, 360 px wide, normal and 130 % text: checkbox
28–36 px, whole box tappable, no sideways scroll.

**Migrations:** applied to staging, rolled back, and applied again. After the rollback the functions were
byte-identical to the originals, so both rollback files work.
**Advisors (staging):** no NEW warning. The two changed functions appear in the existing "callable with
the public key" warnings (124 functions, same permissions as before; BACKLOG). Performance: nothing
about the new column or index.
**Clean-up:** all 42 test listings ("KSTEST 9B …"), their 5 photos and 42 test place names deleted. The 24
KSTEST-KEEP listings are untouched (`evidence/fix9b/cleanup.json`).

## Skipped / not run

- **Emulator smoke test: skipped, low memory** (1.08 GB free at the start, 1.77 GB later; the rule needs 4 GB).
  Nothing was checked inside the Android app. `ks-staging.apk` was not rebuilt.
- B3, B4, B5, A3–A6 and the 11-category check ran only against the local build (same staging database),
  not again on the deployed site. The prompt asked for B1, B2, A1, A2 there.
- The prompt's "listing edit screen" does not exist in the app, so there was nothing to change (BACKLOG).

## Production — prepared, NOT done

- `scripts/ship-prod-9.sh` now has step **0b**. Before a real ship, migrations `0061` and `0062` must be
  applied by hand on production, after 0054–0060. A real run checks this read-only and stops if they are
  missing. `scripts/rollback-prod-9.sh` lists the two database rollback files. A site rollback does not
  need them, because the old site works with the new database (B4UI).
- `docs/review/batch9/PROD_AFFECTED_LISTINGS.sql`: read-only counts for production. Not run.

## What you run next (in order)

1. Try it on staging.kissansahyog.com. Log in as a "keep hidden" test account (logins in
   `C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md`) and post a व्यापारी listing: the box must appear
   and Post must stay grey until you tick it.
2. On production, Supabase dashboard → SQL editor (production project), first run
   `docs/review/batch9/PROD_AFFECTED_LISTINGS.sql` (read-only) to see how many listings are affected.
   Then, when you decide to ship, run `supabase/migrations/0061_listing_client_request_id.sql`, then
   `supabase/migrations/0062_listing_contact_consent.sql` (after 0054–0060 if those are still pending).
3. Then `bash scripts/ship-prod-9.sh --dry-run`, and if it is clean, `bash scripts/ship-prod-9.sh`.
