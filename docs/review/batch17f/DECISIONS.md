# Batch 17F - DECISIONS

Install the app properly: a one-row install strip, step-by-step install help per phone/browser, an "installed" message, an `/install` page and a QR code. PWA install from the website only (no APK).

## 0. Base branch
`git merge-base --is-ancestor c823ae9 origin/main` answered YES (origin/main = `dfafccb` "Merge release-17e"). So `release-17f` was created from `origin/main`, and it contains 17E (the 17E admin button is in the build; the ship script checks the string `morning-share-video`). `release-17e` and all other branches were not touched.

## 1. The architect's facts, confirmed against the real code
| Fact in the prompt | Result |
|---|---|
| Manifest valid, `display: standalone`, icons 192/512/maskable, `start_url`/`scope` `/` | Confirmed in `vite.config.js` (not changed). The generated `dist/manifest.webmanifest` is byte-identical to the one built from `origin/main`. |
| Strip visible to everyone outside standalone, button uses captured event else toggles ONE help line | Confirmed in the old `PwaInstallBanner.jsx` (`pwa_ios_help` / `pwa_install_help`). |
| After install nothing is shown (`appinstalled` only clears a variable) | Confirmed. |
| `PwaPrompts.jsx` has a second install bar with its own `beforeinstallprompt` listener, returning visitors, 14-day snooze | Confirmed. |
| Layout bug: `flex flex-wrap`, text and button on different rows | Confirmed in the code (`flex flex-wrap`). The live-site measurement (tops 65 and 115 at 317 px) was not re-measured by me; I have no live browser step in this batch. The new layout is measured (section 6). |
| Dismiss lasts one session | Confirmed (`sessionStorage`). |
| No in-app-browser handling | Confirmed. |
Nothing in the prompt turned out wrong. One addition I found: `qrcode` is already a RUNTIME dependency of the site (`WhatsAppQR.jsx`), so the QR script uses it and no new package is needed for generation.

## 2. One install module (`src/lib/install/`)
- `detectEnv.js`: pure `detectInstallEnv(userAgent, flags)` with the 10 classes of the prompt. Flags: `standalone`, `installed`, `canPrompt`, `touchPoints`, `swSupported`.
- `installStore.js`: the ONE place that listens to `beforeinstallprompt` and `appinstalled` (module load, one store per window, a test checks that no other file in `src/` adds that listener). It also holds standalone detection, the sheet state, `promptInstall()` (calls `prompt()` synchronously in the tap), the welcome flag and `whichInstallSurface()`.
- `sheetModel.js`, `link.js`, `faq.js`: pure data/helpers, tested in node. `isNative()` still comes from `native.js` (unchanged); the Android app shows none of this.
- Class meaning decisions:
  - `android-chrome-can-prompt` really means "the browser gave us the install event". If a Samsung Internet (or any Android browser) fires it, we use the real install box too (tested), because that is the best experience.
  - Edge on Android (`EdgA`) is put in `android-other-browser` (its menu steps are the same; whether it fires the event is unverified, and if it does it becomes can-prompt).
  - In-app: tokens in the user agent (Facebook `FBAN/FBAV/FB_IAB`, Instagram, Line, TikTok, WeChat, Snapchat, LinkedIn, Pinterest, Twitter) plus the Android System WebView marker `; wv)`, plus an iOS UA with no `Safari/` token. WhatsApp is NOT treated as in-app (no UA proof; its links normally open in the phone browser or a Chrome Custom Tab, which sends a plain Chrome UA - a test pins this).
  - iPadOS in "desktop site" mode says `Macintosh`; with touch points above 1 it is treated as iOS.
  - Bots and old IE are `unsupported`; `unsupported` also hides the strip (nothing to install there; the `/install` page and QR help them).

## 3. The two prompts, reconciled
`whichInstallSurface()` returns exactly one of `strip | bar | none`:
- the homepage strip shows on `/` only;
- the returning-visitor bar shows on OTHER pages only, and only when the browser really can open the install box (same rule as before) and the visitor has 2+ visits and is not in the 14-day snooze; it also waits while a sheet is open;
- `/install` shows neither (the page is the help); nothing shows in standalone, after `appinstalled` (same session), or in the Android app.
- The strip stays on screen while a sheet is open (hiding it would shift the page under the sheet).
- Why two different dismiss rules stay: the strip is on the front door and costs the visitor one cross-tap per visit, so it comes back next visit (session dismiss, as before). The bar is a fixed bar over page content on every other page, so it must stay away longer (14-day snooze, as before). Merging them would either nag on every page or hide the strip for two weeks. Both are unchanged in behaviour.

## 4. The success message wording
A website cannot place an icon on the home screen and cannot know whether it is there. `appinstalled` only says the browser finished installing. So the success sheet says: "ऐप इंस्टॉल हो गया. अपने फ़ोन की होम स्क्रीन या ऐप-लिस्ट में किसान सहयोग का निशान ढूँढें. अब वहीं से ऐप खोल सकते हैं." and the hint "अगर निशान सिर्फ़ ऐप-लिस्ट में है, होम स्क्रीन पर नहीं, तो उसे दबाकर रखें और 'होम स्क्रीन पर जोड़ें' चुनें." It never says "has been added to your home screen" (a test pins this, Hindi and English). On iPhone there is no `appinstalled`; the one-time welcome on the first standalone launch ("आप किसान सहयोग ऐप में हैं") covers it. Storage keys: `ks_installed_at` (time of `appinstalled`), `ks_welcomed_standalone`; all storage access is in try/catch.

## 5. QR choices
- URL: `https://kissansahyog.com/install?s=qr` (the `s=qr` only marks the source; the page's canonical is `/install`).
- Library: `qrcode` (already a runtime dependency of the site for `WhatsAppQR`) used only by the dev script `scripts/make-install-qr.mjs`, run ONCE. Decoder for the test: `jsqr` (new, devDependency only). Rendering SVG/PNG to pixels in the test uses `sharp` (already a devDependency).
- Settings: error correction H (up to 30% of the code can be damaged or dirty, good for printed cards and phone-to-screen scans), quiet zone of 4 modules, black on white, no logo inside. The committed SVG is compared in a test with a fresh build with exactly those settings.
- Files: `public/images/install-qr.svg` (2.4 KB, crisp at any size, precached by the service worker) and `docs/review/batch17f/install-qr-print.png` (1024 px, for printing).
- Decode proof: `tests/unit/install-qr-17f.test.mjs` decodes the SVG (rendered), the print PNG and the SVG shrunk to 168 px and asserts the exact URL. Output in `evidence/qr-decode.txt`.
- Where shown: the homepage block ("किसान सहयोग ऐप अपने फ़ोन में रखें") only from 768 px up (a phone cannot scan its own screen); phones get the Install button and a "share the install link" button (`navigator.share`, fallback: copy). The `/install` page shows the QR at every width (someone next to you can scan it) with Copy link and Share. The sheet shows it on desktop browsers.

## 6. Layout (point 4)
One row from 320 px: `flex-nowrap`, text `min-w-0 flex-1 leading-tight` (may wrap to two lines inside its own column), Install button `shrink-0`, close button 44 x 44. Measured by `scripts/batch17f/proof.mjs` at 320/360/390/412 px in Hindi and English: text centre and button centre differ by less than 8 px (all 8 cases), button fully visible, nothing overlapping, no horizontal scroll (`evidence/proof.json`, `strip-<lang>-<width>.png`). The old inline help line was replaced by the bottom sheet (Part 3), so there is no help row inside the strip any more.

## 7. Analytics (Part 6)
I searched the code (`trackEvent`, `logEvent`, analytics/gtag, event tables in migrations): the site has NO analytics-events mechanism (the `events` code is Kisan Mela). So, as the prompt says, **Part 6 is skipped and no table was added.** To learn how the install works the founder uses the phone tests in SHIP.md.

## 8. Search index
`public/search-index.json` is generated by `scripts/build-search-index.mjs` (every build runs it). I added the `/install` entry to that script (not to the JSON). I did NOT commit the JSON and did NOT run the generator, because the founder's working copy already has an unrelated local change to that file; the next production build regenerates it with `/install` in it. The ship script already allows that file to be dirty.

## 9. Old tests and files changed
- No existing test had to be changed (full suite: 667 tests, 0 fail, 2 skipped; baseline before the batch: 568 tests, 0 fail, 2 skipped).
- Existing code changed: `PwaInstallBanner.jsx` (rewritten), `PwaPrompts.jsx` (install bar now reads the shared store; the offline banner, update banner and native parts are untouched), `Homepage.jsx` (+ the QR block), `App.jsx` (+ route, + sheets), `Footer.jsx` (+ link), `strings.js` (2 banner strings changed, 2 unused help strings removed, install strings merged), `src/content/howToUse.js` (two install-step sentences now say "Install" and "a sheet opens", they described the old strip), `scripts/lib/prerender-routes.mjs` and `scripts/build-search-index.mjs` (+ `/install`).
- NOT changed: manifest content, icons, service worker config (`vite.config.js`), the morning post, the card, weather, auth/OTP (`otp_required`, `session_enforced` untouched), listing flows. No migration, no database access.
- `evidence/manifest-sw-diff.txt`: manifest byte-identical; precache list differs only by `images/install-qr.svg`, `Install.js`, `InstallQrBlock.js` (+ renamed hashed chunk files); caching/routing code identical.

## 10. User-agent table (tests/unit/helpers/install-user-agents.mjs)
Honest statement: **none of the 31 strings is a capture from a real phone made by me.** I have no phones in this batch. All are from public documentation / public user-agent lists (MDN and browser vendor docs for Chrome/Firefox/Safari/Edge/Opera/Samsung, the Facebook and Instagram in-app strings as widely published in public UA lists, Googlebot from Google's docs). The only strings that I saw from a real browser are Playwright's own Chromium (`HeadlessChrome/...`), used in the browser proof as a base and replaced by the strings above. So: **real captures: 0; from public documentation: 31.** The founder's phone tests (SHIP.md step 4) are what turns this into real captures; each phone test asks him for the phone model and browser name so the table can be extended.

## 11. Verified / unverified claims
| Claim | Status |
|---|---|
| `beforeinstallprompt` + `prompt()` + `userChoice` + `appinstalled` are Chromium (Android Chrome, desktop Chrome/Edge) features | Verified (MDN / web.dev documentation; the live manifest is installable per the architect's read-only check). |
| `prompt()` can be called once per event and needs a user gesture | Verified (MDN). Implemented: called in the tap, event dropped after use. |
| iPhone Safari has no install prompt (Share, then Add to Home Screen) | Verified (the prompt states it; Apple Safari docs). |
| Where the Share button is on iOS 26 Safari (bottom bar vs inside the ⋯ menu) | UNVERIFIED. The wording says "at the bottom of the screen, or inside the ⋯ menu". |
| Android Chrome adds the app to the home screen / app list by itself | Verified as general behaviour; the exact result varies by phone (the architect's note). |
| How Samsung Internet, Xiaomi/Oppo/Vivo launchers place the icon | UNVERIFIED (the success sheet and `/install` say "home screen or app list; press and hold to add"). |
| Samsung Internet / Firefox / Opera / Mi Browser menu wording ("Install app" / "Add to Home screen") and that the menu button can be ⋮ or ☰ | Partly verified from general knowledge, UNVERIFIED per brand: the text is generic on purpose. |
| Whether WhatsApp's in-app browser on Android allows install | UNVERIFIED (no UA proof it is a WebView; if it is a Chrome Custom Tab it behaves like Chrome). The phone test in SHIP.md step 4 settles it. |
| Facebook/Instagram in-app browsers cannot install | Verified as general behaviour (a WebView has no install); the sheet only says "install does not work from here, open in your browser". |
| Whether a Chrome Custom Tab fires `beforeinstallprompt` | UNVERIFIED. If it does, the user gets the native box; if not, the steps sheet. |
| The install FAQ answer "installing costs nothing" | True for the install itself (no store, no payment). It does not say "free for farmers" (founder rule); a test blocks "free"/"मुफ़्त" in all install strings. |
