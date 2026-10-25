# Morning guide — test the app in the emulator (about 45 minutes)

For: Himanshu. No technical knowledge needed. Do the steps in order. Each step is ONE action,
followed by what you should see. **If you see something different, take a screenshot of THAT
screen** (click the small camera icon on the strip to the right of the emulator window; the picture
is saved on your Desktop) and write the step number next to it. Then carry on with the next step.

**Important to know before you start**

- Everything here uses the **STAGING** app ("Kisan Sahyog (Staging)"). It talks only to the test
  site staging.kissansahyog.com and the test database. Nothing you do here reaches real farmers.
- The ready test accounts ("personas") were made last night through the **staging WEBSITE's** sign-up
  form (the same form the app shows), because the emulator could not run (the PC was low on memory).
  They were checked on the website: all 9 log in with e-mail + password AND with mobile only.
  **Logging in to them inside the APP has NOT been tested yet — this guide is that test.**
- The e-mails, mobile numbers and the shared password are ONLY in
  `C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md` (on this PC, not on GitHub).
  Open that file in Notepad and keep it open next to the emulator.
- Tonight's automatic tests on the app itself were cut short (low memory). So you may find a problem
  the automation did not. That is the point of this guide — note it and carry on.

## Which persona to use for what

| Persona | Name in the app | Use it for |
|---|---|---|
| P1 | KSTEST-KEEP P1 किसान विक्रेता | **Seller** (farmer, details SHOWN, Makronia) |
| P2 | KSTEST-KEEP P2 किसान खरीदार | **Buyer** (farmer, details SHOWN, Sagar) — the "other person" who looks at listings |
| P3 | KSTEST-KEEP P3 Hidden Seller | **Details hidden** seller (Makronia) — buyers must NOT see the number |
| P4 | KSTEST-KEEP P4 Hidden Buyer Damoh | Hidden buyer, English, 70 km away (Damoh) |
| P5 | KSTEST-KEEP P5 Vendor Seller | **Vendor** / shop seller, English, Sagar |
| P6 | KSTEST-KEEP P6 व्यापारी खरीदार | Vendor buyer, details hidden (Garhakota) |
| P7 | KSTEST-KEEP P7 सेवा प्रदाता | Machine / warehouse / greenhouse provider (Sagar) |
| P8 | KSTEST-KEEP P8 Far Away Orchha | **Far-away** user (Orchha, more than 100 km away) — should NOT see Sagar listings |
| P9 | KSTEST-KEEP P9 रामप्रसाद … Long Name … | Very long name, mixed-case e-mail |

Do **not** change the password of any persona and do not delete them — you will need them on the phone too.

---------------------------------------------------------------------

## Part A — start

0. Close Firefox, ChatGPT, Chrome and any other big program.
   → Expected: the PC feels quicker. (The emulator needs about 4 GB of free memory; last night it was
   killed because there was less than 1 GB.)
1. Open **Git Bash**.
   → Expected: a black window with a `$` sign.
2. Type `cd ~/projects/Kissansahyog` and press Enter.
   → Expected: no error.
3. Type `bash scripts/android/morning.sh` and press Enter.
   → Expected: it prints the free memory, then "Starting the emulator…". A phone window opens. After
   2–10 minutes it prints "staging app installed", "production app installed" and "READY. What to do next".
   If it prints a WARNING about memory, close more programs. If it prints "STOPPED", screenshot the Git Bash window.
4. Look at the phone window.
   → Expected: the staging app is open (green and brown "किसान सहयोग" screen).

## Part B — first look (logged out)

5. Press the round Home button at the bottom of the phone (or drag up from the bottom edge) to go to the phone's home screen, then drag up to see all apps.
   → Expected: TWO icons — "Kisan Sahyog (Staging)" and "Kisan Sahyog". Same logo.
6. Tap **"Kisan Sahyog (Staging)"**.
   → Expected: the app opens on its first page with a mandi price strip ("ticker") with ₹ prices.
7. Scroll the first page down slowly.
   → Expected: prices, weather card, articles. Nothing cut off at the right side, nothing hidden behind the bottom bar.
8. Tap **EN** at the top.
   → Expected: the app switches to English. (Known: some crop names in the price strip stay in Hindi.)
9. Tap **हिं** at the top.
   → Expected: back to Hindi.
10. Open the menu (☰ at the top) and tap **मौसम** (Weather).
    → Expected: either the weather for a place, or a card asking you to share your location / pick a place. Pick "Sagar" if asked → temperature and a 7-day forecast.
11. Tap **🔍 Browse** in the bottom bar.
    → Expected: "आस-पास खोजें" with categories and listing cards.

## Part C — log in with ready personas (the in-app login test)

12. Tap **🔑 Login** in the bottom bar.
    → Expected: a login page with two parts: "ईमेल और पासवर्ड से" and "मोबाइल नंबर से".
13. Type **P1's e-mail and the password** from `TEST_ACCOUNTS.md`, tap "ईमेल से लॉग इन करें".
    → Expected: you are logged in; the bottom bar now shows Post / My listings / Profile.
14. Tap **👤 Profile**.
    → Expected: the name "KSTEST-KEEP P1 किसान विक्रेता" and town Makronia. (Known: the mobile number is not shown on Profile.)
15. Go to the home page (🏠) and tap **लॉग आउट** (Log out).
    → Expected: logged out; bottom bar shows Login again.
16. Tap Login, type **only P1's mobile number** in "मोबाइल नंबर से", tap "मोबाइल नंबर से लॉग इन करें".
    → Expected: logged in as P1 again (same name on Profile). No OTP is asked (OTP is not built yet).
17. Log out. Log in as **P2 by e-mail**, then log out and log in as **P2 by mobile**.
    → Expected: both work; Profile shows "KSTEST-KEEP P2 किसान खरीदार", Sagar.
18. Repeat step 17 for **P3, P5 and P8** (e-mail, log out, mobile, log out). If you have time, also P4, P6, P7, P9.
    → Expected: every one logs in both ways. Write down any that fails.

## Part D — make your own brand-new account

19. Log out. Tap Login, then "नया खाता बनाएं" (Create account).
    → Expected: the sign-up form.
20. Fill it in: name **"KSTEST Himanshu morning"**, any e-mail ending in **@example.com** (for example kstest-himanshu-1@example.com), a password of at least 8 letters you will remember, a **fake mobile starting with 00000557** plus two more digits (for example 0000055701 — it can never belong to a real person), village/town: type "Sagar" and **pick it from the list**, keep "Show my details" selected.
    → Expected: no red error messages.
21. Tap the button at the bottom of the form, tick the disclaimer box, tap "Accept and continue".
    → Expected: you land on the home page, logged in.
22. While typing in steps 20–21, look at the lowest box you typed in.
    → Expected: the on-screen keyboard never covers the box you are typing in.

## Part E — post two listings (seller and buyer)

23. Tap **＋ Post** (centre of the bottom bar).
    → Expected: "नई लिस्टिंग डालें · 1/3".
24. Choose category **भूसा / पराली (Bhusa)** and tap **"देना / बेचना है"** (offering / selling = seller). Next.
    → Expected: step 2/3 with the bhusa fields.
25. Fill every field (any numbers). Tap the photo box and add a photo — in the emulator the camera shows a pretend room; take a picture and accept it.
    → Expected: the photo appears as a small picture; the counter shows "1/3".
26. Tap Next.
    → Expected: step 3/3 with the village box and "use my current location".
27. Type a village (for example "Sagar KSTEST"), tick the four checklist boxes, tap Post.
    → Expected: a success message; the listing is posted.
28. Tap **＋ Post** again. Choose **कृषि सहयोगी (Labor)** and tap **"चाहिए"** (looking for = buyer). Fill it in, Next, village, tick boxes, Post.
    → Expected: success.
29. Tap **📋 My listings**.
    → Expected: BOTH new listings are there, the bhusa one with its photo. (Known bug: the village you typed is not shown on the card — only a distance.)

## Part F — look at them as someone else, and reveal contacts

30. Go to home, log out. Log in as **P2** (mobile only).
    → Expected: logged in as P2.
31. Tap 🔍 Browse, choose the **bhusa** category.
    → Expected: your "KSTEST Himanshu" bhusa offer is in the list (you are both in Sagar).
32. Open it and tap the **Call / WhatsApp** button, then accept the note.
    → Expected: it shows "KSTEST Himanshu morning · <your fake number>" because you chose "Show my details". (Do not actually call.)
33. Go back to Browse, open the **भूमि / रकबा (Land)** category and open the listing of **P3 (Hidden Seller)**. Tap Call.
    → Expected: the message "इस व्यक्ति ने अपनी जानकारी छिपाकर रखी है, इसलिए संपर्क नंबर नहीं दिखाया जा सकता।" and **no number anywhere**.
34. Log out and log in as **P8 (Far Away Orchha)**. Open Browse → bhusa.
    → Expected: your Sagar listing is **not** in the list (Orchha is more than 100 km away).
35. Log out, then log in again as P2 (e-mail this time).
    → Expected: works; nothing of P8 is left on screen (name, listings).

## Part G — offline (airplane mode)

36. While on the home page, drag down from the very top of the phone screen twice (with the mouse) to open the quick settings.
    → Expected: a panel with tiles (Internet, Bluetooth, Airplane mode…).
37. Tap **Airplane mode** so it turns on, then drag the panel back up.
    → Expected: a small plane icon at the top of the phone.
38. In the app, open Home, then Mausam, then Browse.
    → Expected: the pages still show the data you saw before, with a line like "आप ऑफ़लाइन हैं — आख़िरी बार अपडेट: <time>" (you are offline — last updated). **Only one** "last updated" line on Home.
39. Try to post a listing while offline (step 23 onwards, do not need to finish).
    → Expected: a message instead of a crash. (Known: it says "कुछ गड़बड़ हुई" — "something went wrong" — not "no internet".)
40. Open the quick settings again and turn **Airplane mode off**.
    → Expected: the plane icon is gone; within a few seconds the offline line disappears and fresh data loads.

## Part H — feedback form and keyboard

41. Open the menu (☰) and tap **सुझाव और शिकायत** (Feedback & Grievance).
    → Expected: the feedback form.
42. Fill it in with your test e-mail and the message **"KSTEST morning feedback from emulator"** and send it.
    → Expected: a thank-you message (green). If it says something went wrong, screenshot it.
43. While typing in the lowest box of that form, look at the screen.
    → Expected: the keyboard never covers the box you are typing in; the page moves up.
44. Close the app (swipe it away from the recent-apps list) and open it again.
    → Expected: you are still logged in.

## When you are done

45. Close the emulator window.
    → Expected: it closes. (Or in Git Bash: `bash scripts/android/avd-setup.sh --stop`.)
46. Put your screenshots and notes in one folder and tell Claude Code which step numbers looked different.

Everything you created (the "KSTEST Himanshu" account and listings) stays on STAGING only. It can be
cleaned up later together with the other KSTEST data (backlog B13).

## Known problems you may see (already found last night — no need to report again)

- The village you type on a listing is not shown to buyers (only the distance).
- Warehouse / land / greenhouse photo help text says "max 3" while the counter allows 5.
- Profile does not show your own mobile number, and "Save changes" on the basic profile asks for a pincode.
- A mobile number typed with a space in it cannot be entered (the box stops at 10 characters including the space).
- Offline / network errors show the general "कुछ गड़बड़ हुई" message.
- At large font sizes the Browse cards cut off text (for example "WhatsA…").
- If an answer from the server is lost while posting and you tap Post again, the listing can be posted twice.
