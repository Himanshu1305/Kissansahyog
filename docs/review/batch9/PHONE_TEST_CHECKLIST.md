# Real-phone test checklist (your own Android phone)

For: Himanshu. About 1 hour. Do the emulator guide (`MORNING_EMULATOR_GUIDE.md`) first if you can;
this checklist repeats it on a real phone and adds what only a real phone can show (camera, GPS,
microphone, your phone's own keyboard and browser engine, real mobile network).

You install the **STAGING** app ("Kisan Sahyog (Staging)"). It uses only the test site and the test
database — nothing reaches real farmers. Logins: `C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md`
(on the PC; do not send that file to anyone, and do not copy it to the phone — read it from the PC screen).

The file to install is: `C:\Users\usdvi\projects\Kissansahyog\android\ks-apks\ks-staging.apk` (about 12 MB).

---------------------------------------------------------------------

## 1. Copy the app file to the phone — choose ONE way

### Way A: USB cable (no internet needed)
1. Connect the phone to the PC with its USB cable. Unlock the phone.
2. On the phone, tap the "USB charging" notification and choose **File transfer**.
3. On the PC, open File Explorer → This PC → your phone → Internal storage → **Download**.
4. Copy `ks-staging.apk` from `C:\Users\usdvi\projects\Kissansahyog\android\ks-apks\` into that Download folder.
5. On the phone, open the **Files** app (or "My Files") → Downloads → you see `ks-staging.apk`.

### Way B: Google Drive
1. On the PC, open drive.google.com (your own account) and upload `ks-staging.apk` into **My Drive** (not a shared folder).
2. On the phone, open the **Drive** app, find `ks-staging.apk`, tap it, tap the ⋮ menu → **Download**
   (or just tap it — Drive may offer "Install").
3. Delete the file from Drive afterwards (it is a test build).

## 2. Allow the install (only for this one app, and switch it off afterwards)

1. Tap `ks-staging.apk` (in Files or Drive).
2. Android says "For your security, your phone is not allowed to install unknown apps from this source".
   Tap **Settings**.
3. Turn on **Allow from this source** for that app (Files or Drive). Press Back.
4. Tap **Install**. If Play Protect warns "app not checked / unknown developer", tap **More details → Install anyway**.
   (It is unknown to Google because it is not on the Play Store yet.)
5. Tap **Open** when it finishes.
6. **Afterwards — switch it off again:** Settings → Apps → Special app access → **Install unknown apps**
   → Files (or Drive) → turn **Allow from this source** OFF. (The menu name differs a little between
   phone brands; search Settings for "unknown apps".)

## 3. What to test

Use the same personas as in the emulator guide (P1 seller, P2 buyer, P3 hidden, P5 vendor, P8 far away).
Fill in the table in section 5 as you go. Take a screenshot (Power + Volume-down) of anything
that looks wrong.

**Everything from the emulator guide** (Parts B to H): icon and name "Kisan Sahyog (Staging)", Home
prices, हिं/EN switch, Mausam, Browse, logins by e-mail+password and by mobile only (P1, P2, P3, P5, P8),
your own new "KSTEST …" account with a fake mobile starting 00000557, one OFFER and one REQUIREMENT
listing in two categories with a photo, My listings, finding them as P2, reveal contact (shown vs hidden),
P8 does not see Sagar listings, log out/in, offline, feedback form, keyboard.

**Plus, only possible on a real phone:**

| # | Test | What should happen |
|---|---|---|
| R1 | Post → photo → **Camera** → take a real photo | The camera opens, the photo appears in the form, and after posting the listing shows it |
| R2 | Post → photo → **Gallery** → pick an existing photo | The gallery opens, the picked photo appears; picking more than the limit (3, or 5 for land/warehouse/greenhouse) is refused |
| R3 | Post step 3 → "use my current location" → **Allow** | Android asks for location; after Allow it finds your place in a few seconds (it may take up to 20 s) |
| R4 | Uninstall/reinstall not needed: in phone Settings → Apps → Kisan Sahyog (Staging) → Permissions → Location → **Don't allow**, then try R3 again | No crash; a message asks you to type the village, and the village box is shown |
| R5 | Search (🔍 at the top) → microphone button → speak "gehu" | Android asks for microphone permission; after Allow your words appear as the search. If no mic button: note it (the voice service may be off) |
| R6 | Refuse the microphone permission once | No crash; a message, you can still type |
| R7 | Your phone's own keyboard on the **lowest** box of Sign-up, Post step 2 and step 3, Feedback | The box you type in is never hidden under the keyboard |
| R8 | Phone **Back** button / back gesture on several pages | Goes back one page; on the first page it leaves the app (no blank page) |
| R9 | **Rotate** the phone sideways on Home, Browse, Post | Nothing breaks; text you typed in Post is still there after rotating back |
| R10 | Switch Hindi ↔ English several times on different pages | Every page switches; nothing half in the old language except crop names in the price strip (known) |
| R11 | **Kill the app** (recent apps → swipe it away) and open it again | Still logged in; you land on the first page |
| R12 | Turn **mobile data and Wi-Fi off**, open Home, Mausam, Browse | Saved data is shown with "आप ऑफ़लाइन हैं — आख़िरी बार अपडेट: …"; no white screen |
| R13 | Poor network: walk to a weak-signal spot (or turn on "2G only"/battery saver) and open Browse, post a small listing | It is slow but finishes; **check My listings: the listing must be there only ONCE** (a known bug can create two) |
| R14 | Look at the top and bottom edges on Home and Browse | Nothing hidden under the clock/battery bar or under the phone's navigation bar |
| R15 | Phone Settings → Display → **Font size** to the largest, open Browse | Note whether card text is cut off (known at large sizes on the web: "WhatsA…"). Set the font size back afterwards |
| R16 | Open a link to kissansahyog.com from WhatsApp | Note whether it opens in the app or the browser (either is acceptable for now; just note it) |
| R17 | Read the Hindi on Home, Post and the offline line | Does it read naturally to a farmer? Note any odd word |

## 4. What to screenshot

- Any error message, white screen, or "app has stopped".
- The contact sheet for a SHOWN poster (P1 or your own account) and for the HIDDEN poster (P3).
- The offline line on Home (R12).
- My listings after the poor-network post (R13).
- Browse at the largest font size (R15).
- Any place where the keyboard covers the box you are typing in (R7).

Put them in one folder with the step number in the file name, for example `R7-keyboard-post.png`.

## 5. Fill in as you go

| Step | Worked? (yes / no / partly) | Notes |
|---|---|---|
| Install (section 1–2) | | |
| Icon + name "Kisan Sahyog (Staging)" | | |
| Home prices | | |
| हिं / EN switch | | |
| Mausam | | |
| Browse | | |
| P1 login e-mail / mobile | | |
| P2 login e-mail / mobile | | |
| P3 login e-mail / mobile | | |
| P5 login e-mail / mobile | | |
| P8 login e-mail / mobile | | |
| New KSTEST account sign-up | | |
| Offer listing with photo | | |
| Requirement listing | | |
| My listings shows both | | |
| P2 finds them in Browse | | |
| Contact SHOWN vs HIDDEN (P3) | | |
| P8 does not see Sagar listings | | |
| Log out / log in | | |
| Feedback form sent | | |
| R1 camera | | |
| R2 gallery | | |
| R3 GPS allow | | |
| R4 GPS refused | | |
| R5 voice search | | |
| R6 mic refused | | |
| R7 keyboard (lowest boxes) | | |
| R8 back button | | |
| R9 rotate | | |
| R10 Hindi / English | | |
| R11 kill and reopen | | |
| R12 offline (data off) | | |
| R13 poor network, no duplicate | | |
| R14 edges (top / bottom bars) | | |
| R15 largest font | | |
| R16 link from WhatsApp | | |
| R17 Hindi reads naturally | | |

Phone brand and model: ________  Android version (Settings → About phone): ________

## 6. Remove the staging app when you are done

So it never mixes with the final app from the Play Store:

1. Press and hold the **Kisan Sahyog (Staging)** icon → **Uninstall** (or Settings → Apps →
   Kisan Sahyog (Staging) → Uninstall).
2. Delete `ks-staging.apk` from the phone's Download folder (Files app) and from Google Drive if you used it.
3. Check that "Install unknown apps" is OFF again for Files / Drive (section 2, step 6).

The staging app has its own name and package (`com.kissansahyog.app.staging`), so even if you forget,
it will not replace or block the real "Kisan Sahyog" app from the Play Store — but uninstall it anyway
to avoid confusing the two.
