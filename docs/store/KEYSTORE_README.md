# Android release signing — the upload key

**No password or private key is in this file or anywhere in git.**

## What exists

| What | Where | In git? |
|---|---|---|
| Upload keystore (PKCS12, RSA 4096, valid 10000 days) | `C:\Users\usdvi\ks-release-keys\kisansahyog-upload.jks` | NO |
| Passwords, alias, fingerprints, creation date | `C:\Users\usdvi\ks-release-keys\KEYSTORE_INFO.txt` | NO |
| Gradle signing settings (points at the keystore, holds the passwords) | `android\keystore.properties` | NO (gitignored) |
| Helper that made the key (no secrets inside) | `scripts/android/make-release-keystore.sh` | yes |

- Alias: `kisansahyog`
- Owner / DN: `CN=USD Vision AI LLP, O=USD Vision AI LLP, L=Hyderabad, C=IN`
- Created: 2026-10-15 (overnight Batch 9 run)
- **SHA-256 certificate fingerprint (public, safe to share):**
  `55:D3:D1:28:15:13:13:ED:FE:F1:62:9A:45:52:48:07:B7:0E:A0:B2:D7:DF:0C:86:D7:53:AB:2D:50:B7:69:D2`
- The key password is the same as the store password (PKCS12 keystores work that way).

## This is the UPLOAD key, not the app-signing key

We will use **Play App Signing**: Google keeps the real app-signing key, and we sign each upload
with this upload key. Because of that, **if this upload key is ever lost or leaked, Google can reset
it** (Play Console → Test and release → App integrity → "Request upload key reset"). You would make
a new key with the helper script and send Google its certificate. It takes a few days; the app on
users' phones is not affected.

## DO THIS TODAY: back up the folder

**BACK UP the whole `C:\Users\usdvi\ks-release-keys\` folder in TWO places outside this PC TODAY**
— for example a USB stick kept at home and a private cloud folder (Google Drive / OneDrive, not
shared with anyone). Copy the whole folder (both files). Do not e-mail it and do not put it in the
repo, WhatsApp or a shared drive.

## How to build a signed release

```
npm run android:release            # prod  → android/ks-apks/ks-production-release.aab (+ .apk)
npm run android:release:staging    # staging (testing only)
```

The AAB of the **production** flavour is the file you upload to Play Console. Without
`android/keystore.properties` the same commands still work but produce an UNSIGNED build.
Check a build: `node scripts/android/release-audit.mjs` (signature, fingerprint, manifest,
permissions, secret scan; evidence in `docs/review/batch9/evidence/phase3/`).

## If something is lost

- **Lost `android/keystore.properties` only** (e.g. new PC): copy the backed-up folder back to
  `C:\Users\usdvi\ks-release-keys\`, then re-create `android/keystore.properties` with four lines:
  `storeFile=C:/Users/usdvi/ks-release-keys/kisansahyog-upload.jks`, `storePassword=…`,
  `keyAlias=kisansahyog`, `keyPassword=…` (values from `KEYSTORE_INFO.txt`).
- **Lost the keystore or its password before the first upload:** delete the folder, run
  `bash scripts/android/make-release-keystore.sh --props android/keystore.properties`, back up again.
- **Lost after the app is on Play:** request an upload key reset in Play Console (see above), make a
  new key with the script, follow Google's instructions to send the new certificate.
- **Leaked (someone else may have it):** same as lost after upload — request a reset at once.

The helper refuses to overwrite an existing keystore, so it cannot destroy the current key by accident.
