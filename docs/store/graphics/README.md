# Play Store graphics: Batch 9 Phase 6.6

Made on 2026-10-15, overnight. Nothing here has been uploaded. All files were opened and checked by eye after they were made.

## Files

| File | Pixels | Format | Bytes | Status |
|---|---|---|---|---|
| `icon-512.png` | 512 × 512 | 32-bit PNG (RGBA, fully opaque) | 395,949 | Ready (Play limit: 1 MB) |
| `feature-graphic-hi.png` | 1024 × 500 | 24-bit PNG (RGB, no alpha) | 443,891 | Ready |
| `feature-graphic-en.png` | 1024 × 500 | 24-bit PNG (RGB, no alpha) | 448,579 | Ready (optional, for an English listing) |
| `screens/hi/01-home.png` … `08-about.png` | 1080 × 2400 each | PNG (RGB) | 174,630 – 1,047,466 | **Web stand-in**, see below |
| `screens/en/01-home.png` … `08-about.png` | 1080 × 2400 each | PNG (RGB) | 184,678 – 1,054,687 | **Web stand-in**, see below |
| `screens/screens-report.json` | — | JSON | — | One record per shot: URL, checks run, size, any write requests that were blocked |

Each language has these 8 screens: `01-home` (Home with the mandi price ticker), `02-msp` (mandi price vs MSP), `03-mausam` (weather for Sagar), `04-browse` (marketplace), `05-yojana` (government schemes), `06-sawaal` (farmer Q&A), `07-cold-storage` and `08-about`.

Every file is under 2 MB, so all of them are committed. No file had to be left out.

## How each one was made

- **Icon**: `node scripts/store/gen-store-icon.mjs`. It is built from the original logo artwork, `design/kissansahyog-logo-source.jpg` (1280×1189), which is the same source behind the launcher icon. It uses the launcher's adaptive-icon geometry from `scripts/android/gen-android-icons.mjs`: the brown tile `#421F03` as background, with the logo filling 88.8% of the visible square. That is the same share a phone launcher shows, so the store icon matches the icon on the home screen. The square is full-bleed because Google Play adds its own rounded corners.
- **Feature graphic**: `node scripts/store/gen-feature-graphic.mjs`. Headless Chromium renders it with the site's own font, Noto Sans Devanagari from `public/fonts/`, so the Hindi is shaped correctly. Colours: logo brown `#421F03`, title yellow `#FFCB2E`, chips in `--ks-green #24733F`, and a bottom bar in saffron, yellow and green.
  - Hindi tagline (the one asked for): "खेती का भाव, मौसम और सहयोग — एक ही जगह", split over two lines.
  - English: "Mandi prices, weather and help — in one place".
  - The script measures every text line and fails if anything overflows or gets clipped. The final run passed.
  - Checked by eye: the matras (ी, ौ, ो, े), the anusvara in "मंडी" and the candrabindu in "योजनाएँ" all render correctly, and nothing is cut off. The text on the graphic has no conjunct letters, so there were none to check.
- **Phone screenshots**: `node scripts/store/web-standin-screens.mjs all`.

## IMPORTANT: the phone screenshots are WEB STAND-INS, not the app

The phase asked for screenshots of the **production app running in the emulator**. That was not possible tonight: the PC was very low on memory and the emulator had been shut down with the instruction not to restart it (see `docs/review/batch9/DECISIONS.md`, "Orchestrator (resume session) — low memory").

These pictures were taken instead from the **public production website** https://kissansahyog.com:

- **Browser:** headless Chromium at 432×960 CSS px × device scale 2.5, which gives exactly 1080×2400 px. Mobile and touch mode on.
- **Visitor state:** logged out, no cookies. The browser was given Sagar as its location, so the weather page shows weather, just as it would for a visitor who once allowed location.
- **Language:** set through the site's own language setting (`ks_lang_v1`).
- **Read-only:** every request that was not GET or HEAD was blocked, so nothing was written to production. The blocked requests are listed in `screens-report.json`. They were 2× `weather_grid_requests` upserts and 2× read-only RPCs: `recent_crop_reports` on Home and `get_public_feedback` on About. Because of those blocks, the Home crop-reports box and the About feedback box may look slightly emptier than they do for a real visitor.

The app loads the same pages inside its own window, and neither version shows a browser address bar. The main differences:

- the app has an Android status bar at the top and a navigation bar at the bottom;
- the app never shows the website's install banner (it was dismissed here, the same way a visitor would dismiss it);
- the production website may run a slightly older build than the release APK. It runs 7L-2 because prod was not deployed tonight.

**Before final submission, replace these with real emulator or phone screenshots if the app looks different.**

### Checks on every shot

The script rejects a shot automatically if the visible screen contains any of these:

- the text "KSTEST";
- anything that looks like a 10-digit mobile number;
- offline, install or cookie text;
- a spinner or loading skeleton that is still showing;
- content that never finished loading.

All 16 kept shots were then opened and checked by eye: real content, correct language, no personal data and no overlays.

Rejected shots:

- **`en/05-yojana`, first attempt.** It was rejected automatically because the word "installments" on the PM-Kisan card matched the "install" check. That was a false positive. The check was narrowed to the whole word, the screen was shot again, and the new image was checked by eye: OK.
- No other shot was rejected.
- `04-browse` shows one public listing card (a "looking for a thresher" requirement, 47 km away). It shows no name and no number; the Call and WhatsApp buttons are shown but no number is visible, so the shot was kept.

What was seen in the pictures (findings only, nothing was changed):

1. In English mode the Home price ticker still shows crop names in Hindi ("गेहूं ₹2,560/qtl").
2. On every page `<html lang>` stays `hi` even when English is selected (recorded in `screens-report.json`, field `htmlLang`).
3. The site header always shows "किसान सहयोग" in Devanagari. That looks intentional.

## Morning: replace with real app screenshots

Run these once the PC has enough free memory (the emulator needs several GB):

```bash
cd ~/projects/Kissansahyog
bash scripts/android/avd-setup.sh                     # boots ks_test_api36 (Pixel 7, 1080x2400); prints emulator-5554
adb -s emulator-5554 install -r android/ks-apks/ks-production.apk   # PROD flavour, com.kissansahyog.app
# clean status bar (demo mode)
adb -s emulator-5554 shell settings put global sysui_demo_allowed 1
adb -s emulator-5554 shell am broadcast -a com.android.systemui.demo -e command enter
adb -s emulator-5554 shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1000
adb -s emulator-5554 shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb -s emulator-5554 shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 -e mobile show -e datatype 4g -e level 4
adb -s emulator-5554 shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# Sagar location for Mausam
adb -s emulator-5554 emu geo fix 78.7378 23.8388
adb -s emulator-5554 shell monkey -p com.kissansahyog.app -c android.intent.category.LAUNCHER 1
# open each screen in the app (logged out), wait for real content, then for each one:
adb -s emulator-5554 exec-out screencap -p > docs/store/graphics/screens/hi/01-home.png
#   ... 02-msp, 03-mausam, 04-browse, 05-yojana, 06-sawaal, 07-cold-storage, 08-about
#   switch to EN with the header toggle and repeat into screens/en/
# turn demo mode off again
adb -s emulator-5554 shell am broadcast -a com.android.systemui.demo -e command exit
adb -s emulator-5554 shell settings put global sysui_demo_allowed 0
bash scripts/android/avd-setup.sh --stop
```

Then open every PNG and look for any KSTEST text, phone numbers, the offline banner or a spinner. Keep each file under 2 MB, which a 1080×2400 screencap normally is.
