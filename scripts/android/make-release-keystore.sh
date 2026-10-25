#!/usr/bin/env bash
# Batch 9 Phase 3 — create the Android UPLOAD keystore for Play App Signing.
#
#   bash scripts/android/make-release-keystore.sh [--dir DIR] [--props FILE] [--alias NAME] [--dname DN]
#
# Defaults: --dir  $HOME/ks-release-keys   (C:\Users\<you>\ks-release-keys on Windows)
#           --alias kisansahyog
#           --dname "CN=USD Vision AI LLP, O=USD Vision AI LLP, L=Hyderabad, C=IN"
#           --props (none) — when given, also writes a gradle keystore.properties there
#                  (use android/keystore.properties; it is gitignored).
#
# What it does:
#   * REFUSES to run if DIR/kisansahyog-upload.jks already exists (never overwrites a key).
#   * Generates a 32-character random password from a CSPRNG (openssl rand), never printed.
#   * keytool -genkeypair RSA 4096, validity 10000 days, PKCS12 keystore. For PKCS12 the key
#     password is the store password (keytool ignores a different -keypass), so both
#     storePassword and keyPassword in the files are the same value.
#   * Passwords reach keytool through environment variables (-storepass:env), not the command line.
#   * Writes the password ONLY to DIR/KEYSTORE_INFO.txt (and --props FILE if given).
#   * Prints the alias and the SHA-1 / SHA-256 certificate fingerprints (public information) only.
#
# No secret is inside this script. Do not run it with `bash -x`.
set -euo pipefail
umask 077

DIR="${HOME}/ks-release-keys"
PROPS=""
ALIAS="kisansahyog"
DNAME="CN=USD Vision AI LLP, O=USD Vision AI LLP, L=Hyderabad, C=IN"
STORE_NAME="kisansahyog-upload.jks"

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --props) PROPS="$2"; shift 2 ;;
    --alias) ALIAS="$2"; shift 2 ;;
    --dname) DNAME="$2"; shift 2 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

command -v keytool >/dev/null || { echo "keytool not found on PATH (it ships with every JDK)" >&2; exit 1; }
command -v openssl >/dev/null || { echo "openssl not found on PATH" >&2; exit 1; }

# keytool is a native Windows program under Git Bash: hand it Windows-style paths.
winpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }

STORE="${DIR}/${STORE_NAME}"
INFO="${DIR}/KEYSTORE_INFO.txt"
if [ -e "$STORE" ]; then
  echo "REFUSED: ${STORE} already exists — not overwriting an existing key. Reuse it." >&2
  exit 3
fi
if [ -n "$PROPS" ] && [ -e "$PROPS" ]; then
  echo "REFUSED: ${PROPS} already exists — remove it first if you really mean to replace it." >&2
  exit 3
fi
mkdir -p "$DIR"

gen_pw() { # 32 characters from [A-Za-z0-9], CSPRNG bytes, no shell-/properties-special characters
  local out=""
  while [ "${#out}" -lt 32 ]; do out="${out}$(openssl rand 512 | LC_ALL=C tr -dc 'A-Za-z0-9')"; done
  printf '%s' "${out:0:32}"
}
KS_STORE_PW="$(gen_pw)"
export KS_STORE_PW

keytool -genkeypair -storetype PKCS12 -keystore "$(winpath "$STORE")" -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 -dname "$DNAME" \
  -storepass:env KS_STORE_PW -keypass:env KS_STORE_PW >/dev/null 2>&1 \
  || { echo "keytool -genkeypair failed" >&2; rm -f "$STORE"; exit 1; }

LISTING="$(keytool -list -v -keystore "$(winpath "$STORE")" -alias "$ALIAS" -storepass:env KS_STORE_PW 2>/dev/null)"
SHA1="$(printf '%s\n' "$LISTING" | sed -n 's/^[[:space:]]*SHA1:[[:space:]]*//p' | tr -d '\r' | head -n1)"
SHA256="$(printf '%s\n' "$LISTING" | sed -n 's/^[[:space:]]*SHA256:[[:space:]]*//p' | tr -d '\r' | head -n1)"
[ -n "$SHA256" ] || { echo "could not read the certificate fingerprint" >&2; exit 1; }
CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

{
  echo "Kisan Sahyog — Android UPLOAD key (Play App Signing). KEEP PRIVATE. BACK UP THIS WHOLE FOLDER."
  echo "created_utc=${CREATED}"
  echo "keystore_file=$(winpath "$STORE")"
  echo "keystore_type=PKCS12"
  echo "alias=${ALIAS}"
  echo "dname=${DNAME}"
  echo "key=RSA 4096, validity 10000 days"
  echo "store_password=${KS_STORE_PW}"
  echo "key_password=${KS_STORE_PW}"
  echo "(PKCS12: the key password is the same as the store password)"
  echo "sha1=${SHA1}"
  echo "sha256=${SHA256}"
} > "$INFO"

if [ -n "$PROPS" ]; then
  {
    echo "# Gitignored. Release signing for android/app/build.gradle. See docs/store/KEYSTORE_README.md"
    echo "storeFile=$(winpath "$STORE")"
    echo "storePassword=${KS_STORE_PW}"
    echo "keyAlias=${ALIAS}"
    echo "keyPassword=${KS_STORE_PW}"
  } > "$PROPS"
fi
unset KS_STORE_PW

echo "OK — upload keystore created: $(winpath "$STORE")"
echo "alias:   ${ALIAS}"
echo "SHA-1:   ${SHA1}"
echo "SHA-256: ${SHA256}"
echo "Passwords were written to $(winpath "$INFO")${PROPS:+ and $(winpath "$PROPS")} only (not printed)."
echo "NEXT: back up the folder $(winpath "$DIR") in TWO places outside this PC today."
