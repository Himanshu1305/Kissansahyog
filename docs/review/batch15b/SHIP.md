# Batch 15B - SHIP (founder checklist, one step each, in this order)

Branch `release-15b` (from `release-15a`). Ship tag `ship-15b` = the final head.
**What it adds:** a new page `/fasal-salah/kam-pani` ("कम पानी में कौन-सी फसल"), a card for it at the top of `/fasal-salah`, and one line "पानी कम हो तो कौन-सी फसल: देखें" under the price block on the gram, lentil, mustard and wheat pages of `/msp`.
**No database step in this batch.** Nothing is created, changed or loaded. Your two switches stay as they are: `otp_required` ON, `session_enforced` OFF. Nothing here changes them.
The page reads the 15A history table on production (it was loaded when 15A shipped). If that table ever fails to answer, the page just hides its 5-year numbers and still works.

## 1. Push and tag (once)
The builder committed the work on `release-15b` but has NOT pushed or tagged it. The ship script refuses to run for real until both are done. Run (or ask the architect to run):
1. `git push origin release-15b`
2. `git tag ship-15b`
3. `git push origin ship-15b`

## 2. Dry run
`bash scripts/ship-prod-15b.sh --dry-run` - must end with `DRY RUN OK`. (A dry run builds nothing and sends nothing to the database.)

## 3. Ship the website
`bash scripts/ship-prod-15b.sh 2>&1 | tee docs/review/batch15b/evidence/ship-real.log` - ends with `SHIP OK`. If any check fails it puts the old version back by itself and says so. If the 15A history table does not answer it only prints a WARNING.

## 4. Live check (3 minutes, on the phone)
1. Open https://kissansahyog.com/fasal-salah/kam-pani . The title is "कम पानी में कौन-सी फसल बोएँ, और कितना मिलेगा".
2. Tap each of the five chips under the title: each one scrolls to its section.
3. Tap the four water buttons ("सिंचाई नहीं", "1 सिंचाई", "2 सिंचाई", "3 या ज़्यादा"): the list of crops to sow and avoid changes each time.
4. Look at the gram card: MSP, Sagar mandi today, 5-year average, and the sale per hectare marked "लागत से पहले".
5. Open the "पानी बचाने के तरीके" section and tap "खेत तालाब पर सब्सिडी ... देखें": it jumps up to the farm pond card and opens it.
6. At the bottom check the KVK Sagar phone number **07582-288228** is still right (it is the number already used on the resources page).
7. Open `/fasal-salah` (new green card on top) and `/msp/chana` (the new link line).
8. Read the Hindi wording; every card marked "समीक्षाधीन" is waiting for KVK Sagar or Shri A.K. Dixit to confirm it.

## 5. After 15 November 2026
The red banner "अभी बुवाई का समय है" disappears by itself on 15 Nov 2026 and the rain banner on 31 Dec 2026. Nothing to do. To refresh the dated claims see `PROJECT_CONTEXT.md` (Batch 15B).

## If something looks wrong
`bash scripts/rollback-prod-15b.sh 3b8ce6d9-f29c-4741-8783-e6fe36ad9f16` (the Batch 15A deployment; the ship also prints it). No database step is needed.
