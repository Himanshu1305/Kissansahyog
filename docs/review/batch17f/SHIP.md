# Batch 17F - SHIP (founder steps, one at a time)

What this adds (website only, no database change, no migration):
- The green install strip on the homepage is ONE row on every phone ("किसान सहयोग ऐप इंस्टॉल करें" + button "इंस्टॉल").
- Tapping Install: on Android Chrome the phone's own install box opens at once; on other phones/browsers a sheet shows 3 simple steps with pictures; inside Facebook/Instagram (and iPhone Chrome) it says "open this page in your browser/Safari" with a Copy-link button.
- After the install the phone shows a green tick sheet "ऐप इंस्टॉल हो गया" (it tells the person to look for the icon on the home screen or in the app list; it does not promise the home screen).
- First time the app is opened from its icon: a small welcome "आप किसान सहयोग ऐप में हैं".
- New page `/install` (steps for every phone, QR, FAQ) and a QR block on the homepage (QR on screens 768 px and wider; phones get Install + "share the install link").
- The QR card for printing: `docs/review/batch17f/install-qr-print.png` (points to `https://kissansahyog.com/install?s=qr`).

Do each step, then tell the architect the result before the next one. The branch `release-17f` was made from `origin/main`, which already holds Batch 17E, so the 17E admin button stays live.

## 1. Push the branch and tag the ship point
```
cd ~/projects/Kissansahyog
git checkout release-17f
git status --short | grep -v '^??'
```
(Expected: only ` M public/search-index.json`, your own earlier change. Anything else: stop and tell the architect.)
```
git push -u origin release-17f
git tag ship-17f
git push origin ship-17f
```

## 2. Dry run (changes nothing)
```
bash scripts/ship-prod-17f.sh --dry-run
```
Expected last lines: `DRY RUN OK`. It reads the live deployment from Cloudflare; it must say the live one is `3c06615d-2a69-41b3-b481-4b931de14a7c` (Batch 17E). If it says another id, stop: someone shipped something else. Copy the output to the architect.

## 3. The real ship
```
bash scripts/ship-prod-17f.sh
```
It builds the production site, checks that the strip is one row (`flex-nowrap`), that `/install` and the QR file are in the build, and that the 17E admin button string is still in the build, deploys, then checks the live site. Expected end: `All read-only prod gates passed`. If any gate fails it rolls back by itself and tells you. Copy the end of the output to the architect.

## 4. Phone tests (after the ship). Tell the architect, for each, exactly what you see
Close the browser tab fully and open `https://kissansahyog.com` fresh each time. Please also tell the phone model and the browser name.

**A. Android Chrome (your own phone)**
1. Is the green strip ONE line, with the white "इंस्टॉल" button on the right of the text (not below it)?
2. Tap "इंस्टॉल". Does the phone's own install box open straight away? Accept it.
3. Do you see the green tick sheet "ऐप इंस्टॉल हो गया"? Tap "ठीक है".
4. Look for the Kissan Sahyog icon. Tell us: **is it on the home screen, or only in the app list (the drawer)?** (If only in the app list: press and hold it and choose "Add to Home screen" as the sheet said, and tell us if that worked.)
5. Open the app from the icon. Do you see the small welcome "आप किसान सहयोग ऐप में हैं" ONCE? Close and open again: it must not come again. Is the green strip gone inside the app?

**B. The SAME phone again (retest)**
Remove the app (press and hold the icon, Uninstall/Remove). In Chrome open the site again, repeat A.1 to A.3. Tell us if anything looks different the second time.
If the Install button does nothing or the phone's box does not open: tell us what the sheet shows instead.

**C. iPhone Safari (if you or someone has one)**
1. Strip on one line? Tap "इंस्टॉल": the sheet must show 3 steps (Share, Add to Home Screen, Add) and the note "this works only in Safari". Do those steps match what the iPhone really shows? (Tell us if the Share button is at the bottom or inside a ⋯ menu.)
2. Do them. Open the app from the icon: the welcome "आप किसान सहयोग ऐप में हैं" must show once.
3. If it is iPhone Chrome instead: the sheet must say "open this page in Safari" with a "लिंक कॉपी करें" button.

**D. A link opened from WhatsApp**
Send the link `https://kissansahyog.com/install` to yourself in WhatsApp and tap it. Does it open inside WhatsApp or in Chrome? Does the `/install` page show the "install now" button (Chrome can install) or the steps? Tell us which.

**E. A link opened inside Facebook or Instagram**
Put the link in a Facebook or Instagram message/post, open it from there. The strip's Install button must open a sheet "पहले यह पेज अपने ब्राउज़र में खोलें" with a Copy-link button. Use the three dots, "Open in browser", then tap Install there. Tell us if it worked.

**F. Desktop browser + a phone scanning the QR**
1. On a computer open `https://kissansahyog.com`. Scroll below the first screen: a green block with a QR. (On a narrow window under 768 px the QR must be hidden.)
2. Scan the QR with your phone camera. It must open `https://kissansahyog.com/install?s=qr` and show the steps for your phone. Install from there. Tell us what happened.

## 5. Merge into `main` (only after the phone tests are fine)
Use the worktree method, so your own folder is not disturbed:
```
cd ~/projects/Kissansahyog
git fetch origin
git worktree add ../Kissansahyog-main origin/main --detach
cd ../Kissansahyog-main
git checkout -b merge-17f
git merge --no-ff release-17f -m "Merge Batch 17F: install the app - one-row strip, install sheets, installed message, /install page, QR"
git push origin merge-17f:main
cd ../Kissansahyog
git worktree remove ../Kissansahyog-main
```

## 6. Rollback (if something is wrong on the live site)
The site goes back to Batch 17E (deployment `3c06615d-2a69-41b3-b481-4b931de14a7c`). No database change is involved, so nothing else needs undoing.
```
bash scripts/rollback-prod-17f.sh --dry-run 3c06615d-2a69-41b3-b481-4b931de14a7c
bash scripts/rollback-prod-17f.sh 3c06615d-2a69-41b3-b481-4b931de14a7c
```
(The ship script also prints the exact rollback line for the deployment it replaced.)
