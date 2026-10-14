# Kisan Sahyog Android app (Batch 8A) — how to build, test and install

The app is the normal website bundled inside a Capacitor 8 Android shell
(`com.kissansahyog.app`, "Kisan Sahyog", versionName 0.1.0). The web files ship **inside** the
APK (`webDir: dist`, no `server.url`); data comes live from the production Supabase project and
the public APIs. This is a **debug** build only — no release keystore, no Play listing yet.

## What you need

- Node 22+ (`node -v`)
- Android SDK (Android Studio installs it) with `ANDROID_HOME` set
- **JDK 21.** Capacitor 8 compiles with Java 21. Android Studio's bundled JBR on this machine is
  Java 25, so a portable Temurin 21 was unpacked to `~/.jdks/`. `scripts/android/find-jdk.mjs`
  looks in `KS_JAVA_HOME`, `JAVA_HOME`, `~/.jdks/*` and Android Studio's JBR and uses the first
  Java 21 it finds — only for the build, nothing system-wide changes. On another machine either
  put a JDK 21 in `~/.jdks/` or set `KS_JAVA_HOME`.
- `.env.production` (the production Supabase URL + anon key). The build refuses to run without
  it, or if it — or the shell environment — points at staging.

## Build the debug APK

```bash
npm run android:debug
```

That runs `scripts/build-android.mjs --assemble`:

1. production guard (`check-prod-env.mjs`)
2. `build-search-index.mjs`
3. `vite build --mode production` with `KS_NATIVE=1` (no service worker, no web manifest)
4. production guard on `dist/`
5. `npx cap sync android`
6. `gradlew assembleDebug` with JDK 21

No prerender and no sitemaps — the app does not need them. `npm run build:android` stops after
step 5 (useful before opening Android Studio).

**The APK:** `android/app/build/outputs/apk/debug/app-debug.apk` (about 11–12 MB; never committed).

## Run the tests

```bash
bash scripts/test-android.sh                 # boots the emulator, clean build, T1–T18, report
bash scripts/test-android.sh --skip-build    # reuse the APK that is already built
bash scripts/test-android.sh --only T5,T9    # a subset
node scripts/android/meta-tests.mjs          # the full suite twice + T19 + T20 → results.json
```

- The emulator is the AVD `ks_test_api36` (Pixel 7 profile, 1080×2400, API 36, google_apis
  x86_64). `scripts/android/avd-setup.sh` creates it if missing (installing the system image
  through sdkmanager), boots it headless and turns animations off. It refuses to start without
  hardware acceleration. `bash scripts/android/avd-setup.sh --stop` shuts it down.
- The first boot of a fresh AVD takes about 7 minutes on this machine; later boots ~1 minute.
- Results: `docs/review/batch8a/results.json`; the table is generated from it by
  `node scripts/android/report.mjs` into `docs/review/batch8a/RESULTS.md`.
- Evidence (JPEG screenshots, JSON) goes to `docs/review/batch8a/evidence/<TEST_ID>/` and logs
  to `docs/review/batch8a/logs/` — both are kept out of git through `.git/info/exclude`.
- Exit code is non-zero when any test is RAN-FAILED or the app crashed (FATAL EXCEPTION in
  logcat). NOT-RUN and HUMAN-REVIEW are listed but do not fail the run.
- The tests are **read-only against production**: they never sign up, log in, post, upload or
  send feedback, and they search only for a word known to have results (a search with no
  results would write a `log_search_miss` row). Opening /mausam with a saved place makes the
  page upsert its weather-grid request, exactly as it does for any visitor.

## Install on a real phone

1. On the phone: Settings → About phone → tap **Build number** 7 times → back to Settings →
   System → **Developer options** → turn on **USB debugging**.
2. Connect it with a USB cable and accept the "Allow USB debugging?" prompt on the phone.
3. On the computer:
   ```bash
   adb devices                     # the phone must show as "device", not "unauthorized"
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. The app appears as **Kisan Sahyog** in the app list.

To run the automated tests on that phone instead of the emulator:
`ANDROID_SERIAL=<serial from adb devices> bash scripts/test-android.sh --skip-build`.
(Some tests change device state: airplane mode on/off, location permission grant/revoke, an
`adb emu geo fix` that only exists on emulators — T13's position step needs an emulator.)

Without a cable: copy the APK to the phone and open it; Android asks to allow installs from that
source once.

## Open in Android Studio

```bash
npm run build:android          # web build + cap sync, so android/ has the current web files
npx cap open android           # or: Android Studio → Open → the android/ folder
```

In Android Studio set **Settings → Build, Execution, Deployment → Build Tools → Gradle →
Gradle JDK** to the JDK 21 (e.g. `~/.jdks/jdk-21.0.12.1+1`), let Gradle sync, then Run ▶ on the
emulator or phone. Web inspection: `chrome://inspect` in desktop Chrome while the debug app runs.

## Before the app can use the site's server functions

The feedback form, typed-village lookup (`/geocode`) and voice transcription (`/transcribe`)
call `https://kissansahyog.com` from the app's origin `https://localhost`. They work only after
`functions/_middleware.js` (CORS for the app's two origins) and `public/_routes.json` are
deployed through the normal ship flow. This batch did not deploy.
