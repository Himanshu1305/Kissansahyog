# Batch 14A — SHIP (founder checklist, one step each, in this order)

Branch `release-14a` (from `release-13a` `ee03dd9`; safety tag `pre-14a-ship`). Ship tag `ship-14a` = the final head.
**14A contains 13A (Browse page) and every earlier unshipped batch.** Use `ship-prod-14a.sh` INSTEAD of the 13A script.
**This batch changes the database** (migration 0067, only NEW tables / functions / triggers; no existing function is replaced). Your two switches stay as they are: `otp_required` ON, `session_enforced` OFF. Nothing in this ship changes them; only the new admin page can, and only a super admin.

## 1. Database (PRODUCTION, once)
1. Open https://supabase.com/dashboard/project/eltmcznjcqiahqhjvpjg/sql/new — **check the address says `eltmcznjcqiahqhjvpjg`** (that is production; staging is `wzxtqbqlahyahsnoqqva`).
2. Open the file `docs/review/batch14a/PROD_MIGRATION_0067.sql` in an editor (VS Code), select all, copy, paste straight into the SQL editor (do not retype, do not paste through a chat or document: the file is plain English letters only, so nothing can get garbled), press **Run**. Running it twice is safe.
3. It must say "Success". Check: run `select public.get_active_announcements();` → `[]`.

## 2. Ship the website
1. `bash scripts/ship-prod-14a.sh --dry-run` → must end with `DRY RUN OK`. (If it stops with "migration 0067 is NOT applied", do step 1 first.)
2. `bash scripts/ship-prod-14a.sh 2>&1 | tee docs/review/batch14a/evidence/ship-real.log` → ends with `SHIP OK`. If any check fails it puts the old version back by itself and says so.

## 3. Sign out and sign in again on the admin page
Open https://kissansahyog.com/admin, log out, log in again with your OTP. (Old sessions may be refused by the new tools: this is expected. If you see "कृपया फिर से लॉग इन करें" just do it.)

## 4. Live check (6 lines, 5 minutes)
1. `/admin` shows six tabs (सारांश, सामग्री, मंडी और भाव, निगरानी, लोग, सुरक्षा और लॉग) and a red **PRODUCTION** badge.
2. Type `कार्ड` in the search box → "घोषणा कार्ड" → it opens the Content tab.
3. Create the card from `EXAMPLE_ANNOUNCEMENT.md` (set the dates), open https://kissansahyog.com/ in another browser: the card shows under the price ticker; close it with the × and it stays closed for the day.
4. **सुरक्षा और लॉग** tab: both switches show (OTP ON, session check OFF) — do NOT flip them now; the SMS balance shows.
5. **लोग** tab: the user list shows chips; do not block a real person to test.
6. **एडमिन एक्शन लॉग** lists the card you just created.

## 5. Undo
Website: `bash scripts/rollback-prod-14a.sh <previous deployment id>` (the ship prints it). No database step is needed: the old website ignores the new tables. `PROD_ROLLBACK_0067.sql` removes them again but also forgets blocks, roles, cards and the log — use it only if really needed.

## 6. Close
Paste `BATCH14A_CLOSE_PROMPT.md` (repo root) into Claude Code.

## Notes
- First admin roles: everyone who is an admin when the migration runs becomes `super`. Make a helper an editor from the **सुरक्षा और लॉग → एडमिन भूमिकाएँ** panel.
- Hindi wording of every new line: `HINDI_CAPTIONS.md`. What the block does and does not reach, and what the action log does and does not record: `BACKLOG.md`.
