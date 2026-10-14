# Kisan Sahyog Android app — staging flavour, offline data, test suites (Batch 8B)

Batch 8A's README (`docs/review/batch8a/README.md`) still applies for the toolchain (Node 22+,
Android SDK, JDK 21 in `~/.jdks` or `KS_JAVA_HOME`) and for installing on a phone.

## Two apps from one project

| Flavour | Build | applicationId | Label | Data / server functions | APK |
|---|---|---|---|---|---|
| prod | `npm run android:debug` | `com.kissansahyog.app` | Kisan Sahyog | production Supabase (`.env.production`), https://kissansahyog.com | `android/ks-apks/ks-production.apk` |
| staging | `npm run android:debug:staging` | `com.kissansahyog.app.staging` | Kisan Sahyog (Staging) | staging Supabase (`.env`), https://staging.kissansahyog.com | `android/ks-apks/ks-staging.apk` |
| staging-local (tests only) | `npm run android:debug:staging-local` | same as staging | same as staging | staging Supabase, server functions on http://localhost:8788 (cleartext allowed in THIS build only) | `android/ks-apks/ks-staging-local.apk` |

Both real flavours can be installed on the same phone at the same time; each keeps its own data.
Guards: the prod build refuses a staging URL (`check-prod-env.mjs`), the staging build refuses a
prod URL (`check-staging-env.mjs`), before building and again on the built files.
`android/ks-apks/` is gitignored (Gradle empties its own output folder on every build, so the named
copies live outside it).

The Gradle switch is a property, so nothing is edited per build:
`./gradlew assembleDebug -PksFlavor=staging` (`-PksCleartext=true` only for the local-API build).
Always build through `scripts/build-android.mjs` — the web files inside the APK must match.

### Install the staging app on a real phone

USB debugging on (see the 8A README), then:

```bash
npm run android:debug:staging
adb install -r android/ks-apks/ks-staging.apk     # shows up as "Kisan Sahyog (Staging)"
```

Sign up with a name starting with **KSTEST**, a throwaway `@example.com` e-mail and a fake mobile;
everything you create lands in the staging database only.

## Offline data (app only)

Public data the app has shown once (mandi prices, MSP, weather, listings and the other public
tables in `src/lib/offline/policy.js`) is kept on the phone (IndexedDB, ≤ 5 MB) and shown when there
is no internet, with "📴 पिछली बार अपडेट: <time>" under it. Old data is not shown: weather > 24 h,
mandi prices > 7 days, listings > 3 days → a "saved information is too old" message. A section that
has nothing to show says so with a "फिर से कोशिश करें" button within 10 s — no endless spinner.
When the connection comes back, the page fetches again by itself (not on pages with a form).
Never stored: profiles, contact numbers, My Listings, login, anything written.

## Test suites

```bash
bash scripts/test-android.sh --flavor staging          # S1–S10 + O1–O8 (writes to STAGING only)
bash scripts/test-android.sh --flavor prod             # T1–T18, read-only against production
bash scripts/test-android.sh --flavor staging-local    # S9 only
node scripts/android/meta-tests.mjs --flavor staging   # suite twice + P2 + P3 → results-staging.json
node scripts/android/meta-tests.mjs --flavor prod      # suite twice + T19 + T20 + P1 → results-prod.json
node scripts/android/report.mjs --out docs/review/batch8b/results-staging.json   # table → .md
```

Options: `--skip-build`, `--only S4,O3`, `--out <file>`, `ANDROID_SERIAL=<serial>`.
Evidence: `docs/review/batch8b/evidence/<flavour>/<ID>/`, logs `docs/review/batch8b/logs/` (both
local only). Every account / listing / message the staging suite creates is appended to
`docs/review/batch8b/staging-test-data.json` for later cleanup.

S9 needs `npx wrangler` (downloaded on first use) and starts `wrangler pages dev dist --port 8788`
with a temporary, gitignored `.dev.vars` containing only the staging `SUPABASE_URL` (no keys); the
test removes `.dev.vars`, the adb reverse and the wrangler process when it ends.
