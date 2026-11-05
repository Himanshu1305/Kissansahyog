# Batch 19 - SHIP (founder steps, one at a time)

Nothing here was run for you: no push, no tag, no merge, no production ship.

1. **Earlier batches in `main`.** origin/main already holds `c823ae9` (17E) and `ship-17f`. `release-18` does not exist. Check: `git fetch origin && git merge-base --is-ancestor ship-17f origin/main && echo OK`
2. **Review the text first.** Send `docs/review/batch19/CONTENT_FOR_REVIEW.md` to the retired forest officer. Fix anything by editing `src/content/pashupalan/*.js`, then `node scripts/batch19/make-review-doc.mjs` and `node scripts/batch19/make-hindi-table.mjs`.
3. **Push and tag:** `git push origin release-19` then `git tag ship-19 && git push origin ship-19`
4. **Dry run:** `bash scripts/ship-prod-19.sh --dry-run` (must end `DRY RUN OK`; the two "pending" lines disappear after step 3).
5. **Real ship:** `bash scripts/ship-prod-19.sh`
6. **Phone check:** open `/pashupalan` and each of the six pages on your phone (Hindi and English); try the "मेरे लिए कौन सी योजना?" buttons. Then run Google's Rich Results Test on `https://kissansahyog.com/pashupalan/desi-gay-anudan` (FAQ markup) and on one other page.
7. **Merge to main** with the worktree method you used for 17F (so your working copy is not disturbed).
8. **CHECK AGAIN AFTER 15 NOVEMBER 2026 (dated reminder).** The desi cow assistance is only planned to launch on 15 Nov 2026. Come back after that date, look for a government order or launch report, and update `src/content/pashupalan/desi-gay-anudan.js` (`status`, `asOf`, the "known / not announced" items, FAQs, sources), the matching row in `hub.js` (`status`, `asOf`, news block), the FACTS.md rows, then regenerate the two review files and ship again. Also re-check: Kamdhenu portal (eligibility page, documents), gaushala rate, KCC limit, Gokul Mission after 2025-26, and the Gopal Protsahan prize.
9. **Rollback (if needed):** `bash scripts/rollback-prod-19.sh` (target: the 17F deployment `8df469ad-2535-44a8-81e9-003dcde97938`). Preview first: `bash scripts/rollback-prod-19.sh --dry-run`.
