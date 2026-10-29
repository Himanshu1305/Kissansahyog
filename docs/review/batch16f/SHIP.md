# Batch 16F - ship steps (founder)

What changes: the homepage "Today's price" tile now shows the same price, mandi and date as the mandi strip above it. Website only. No database change.

1. **Push the branch** (Git Bash, repo folder):
   `git push -u origin release-16f`
2. **Dry run** (changes nothing):
   `bash scripts/ship-prod-16f.sh --dry-run`
   It lists what is still pending (the tag `ship-16f`). Create it on the pushed commit: `git tag ship-16f && git push origin ship-16f`, then run the dry run again until it says no pending items.
3. **Real run:**
   `bash scripts/ship-prod-16f.sh`
   It refuses to run unless production OTP is ON (`otp_required=true`, `session_enforced=false`), and rolls back by itself if a gate fails.
4. **Check the live site** (kissansahyog.com, in Hindi and English): the price tile shows the same crop price AND the same mandi name as the strip (for example Wheat Rs 2,700, Ajaigarh). When the prices are not from today, the tile caption says "Yesterday's price (dd/mm)" / "कल का भाव (dd/mm)". The weather and advice tiles are unchanged.
5. **Rollback** if anything looks wrong:
   `bash scripts/rollback-prod-16f.sh 6cf93531-4284-4ef3-ab23-f041cbebe7af`
   (that is the Batch 16B deployment currently live; the ship script prints the id it recorded).
