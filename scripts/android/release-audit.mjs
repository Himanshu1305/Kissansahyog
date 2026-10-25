#!/usr/bin/env node
// Batch 9 Phase 3 — release sanity audit of the signed release builds in android/ks-apks/.
//   node scripts/android/release-audit.mjs [--out DIR] [--expect SHA256]
// Default --out docs/review/batch9/evidence/phase3; --expect defaults to the sha256= line of
// C:\Users\<you>\ks-release-keys\KEYSTORE_INFO.txt (ONLY that line is read; passwords are never read).
// For each artifact (ks-<flavour>-release.aab / .apk, flavours production and staging):
//   signature   jarsigner -verify -verbose -certs (AAB = JAR signing), apksigner verify (APK: v2/v3),
//               signer certificate SHA-256 compared with the upload key
//   manifest    package, versionCode/Name, min/target SDK, debuggable, usesCleartextTraffic,
//               allowBackup, permissions (each with its code reference)
//   web assets  the T3 bundle-safety scan (no service_role / GEMINI_API_KEY / sb_secret_<key>,
//               right project ref only), packaged capacitor.config has no webContentsDebuggingEnabled
//   resources   launcher icons (all densities + adaptive) and splash drawables present
//   bundletool  validate + dump manifest for the AABs (bundletool from the Gradle cache)
// Writes one JSON per artifact plus summary.json. Exit code 1 if any check fails.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findJdk21, findSdk } from './find-jdk.mjs'
import { PERMISSIONS, PROD_REF, STAGING_REF, FORBIDDEN } from './expected.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const argVal = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const OUT = path.resolve(ROOT, argVal('--out') || 'docs/review/batch9/evidence/phase3')
const WIN = process.platform === 'win32'
const JDK = findJdk21()
const SDK = findSdk()
if (!JDK || !SDK) { console.error('JDK 21 or Android SDK not found'); process.exit(1) }
const bin = (n) => path.join(JDK, 'bin', WIN ? `${n}.exe` : n)
const BT = fs.readdirSync(path.join(SDK, 'build-tools')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop()
const BTDIR = path.join(SDK, 'build-tools', BT)
const AAPT2 = path.join(BTDIR, WIN ? 'aapt2.exe' : 'aapt2')
const APKSIGNER_JAR = path.join(BTDIR, 'lib', 'apksigner.jar')

function findBundletool() {
  const base = path.join(os.homedir(), '.gradle', 'caches', 'modules-2', 'files-2.1', 'com.android.tools.build', 'bundletool')
  if (!fs.existsSync(base)) return null
  for (const v of fs.readdirSync(base).sort().reverse()) for (const h of fs.readdirSync(path.join(base, v))) {
    const j = fs.readdirSync(path.join(base, v, h)).find((f) => /^bundletool-[\d.]+\.jar$/.test(f))
    if (j) return path.join(base, v, h, j)
  }
  return null
}
const BUNDLETOOL = findBundletool()
// The Gradle-cache bundletool jar is the library (no Main-Class, no dependencies): run its main
// class with its runtime dependencies from the same cache.
function bundletoolClasspath() {
  if (!BUNDLETOOL) return null
  const cache = path.join(os.homedir(), '.gradle', 'caches', 'modules-2', 'files-2.1')
  const deps = [['com.android.tools.build', 'aapt2-proto'], ['com.google.guava', 'guava'], ['com.google.guava', 'failureaccess'], ['com.google.protobuf', 'protobuf-java'], ['com.google.protobuf', 'protobuf-java-util'], ['com.google.dagger', 'dagger'], ['javax.inject', 'javax.inject'], ['jakarta.inject', 'jakarta.inject-api'], ['org.bitbucket.b_c', 'jose4j'], ['org.slf4j', 'slf4j-api'], ['com.google.code.gson', 'gson'], ['com.google.auto.value', 'auto-value-annotations'], ['com.google.errorprone', 'error_prone_annotations']]
  const jars = [BUNDLETOOL]
  for (const [g, a] of deps) {
    const d = path.join(cache, g, a)
    if (!fs.existsSync(d)) continue
    const v = fs.readdirSync(d).sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).pop()
    for (const h of fs.readdirSync(path.join(d, v))) { const j = fs.readdirSync(path.join(d, v, h)).find((f) => f.endsWith('.jar') && !/sources|javadoc/.test(f)); if (j) { jars.push(path.join(d, v, h, j)); break } }
  }
  return jars.join(path.delimiter)
}
const BT_CP = bundletoolClasspath()
const bundletool = (...args) => run(bin('java'), ['-cp', BT_CP, 'com.android.tools.build.bundletool.BundleToolMain', ...args])

let expect = argVal('--expect')
if (!expect) {
  const info = path.join(os.homedir(), 'ks-release-keys', 'KEYSTORE_INFO.txt')
  const line = fs.existsSync(info) ? fs.readFileSync(info, 'utf8').split(/\r?\n/).find((l) => l.startsWith('sha256=')) : null
  expect = line ? line.slice('sha256='.length).trim() : null
}
const norm = (fp) => (fp || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase()

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts })
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}`, error: r.error?.message }
}

// Code references for every permission (Phase 3.4: "each justified by a code reference").
const PERMISSION_CODE_REFS = {
  'android.permission.INTERNET': ['src/lib/supabase.js (Supabase client)', 'every fetch to the API origin'],
  'android.permission.ACCESS_NETWORK_STATE': ['src/components/PwaPrompts.jsx:76 import(@capacitor/network)', 'src/components/NativeShell.jsx:60', 'src/lib/offline/cachedFetch.js:64'],
  'android.permission.ACCESS_COARSE_LOCATION': ['src/lib/location/postPosition.js:31,36 (enableHighAccuracy:false)', 'src/screens/Post.jsx:161'],
  'android.permission.ACCESS_FINE_LOCATION': ['src/lib/location/userLocation.js:95-98 (enableHighAccuracy:true, "Share my location")'],
  'android.permission.RECORD_AUDIO': ['src/components/VoiceSearchButton.jsx:95 getUserMedia({audio:true})', 'src/lib/voice/voiceSearch.js:58'],
  'android.permission.MODIFY_AUDIO_SETTINGS': ['node_modules/@capacitor/android BridgeWebChromeClient.onPermissionRequest asks for it with RECORD_AUDIO', 'src/components/VoiceSearchButton.jsx:95'],
}
// The six user-facing permissions + androidx.core's app-private signature permission (named after the package).
const BASE_PERMS = Object.keys(PERMISSIONS).filter((p) => p.startsWith('android.permission.'))
const expectedPerms = (pkg) => [...BASE_PERMS, `${pkg}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`]
const permWhy = (p) => PERMISSIONS[p] || (p.endsWith('.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION') ? 'added automatically by androidx.core (signature-level, app-private); not a user-facing permission' : null)

class Checks {
  constructor() { this.list = [] }
  check(name, ok, detail) { this.list.push({ name, ok: !!ok, ...(detail === undefined ? {} : { detail }) }); return ok }
  get ok() { return this.list.every((c) => c.ok) }
}

function scanWebAssets(dir, flavour, c) {
  const pub = path.join(dir, 'public')
  const files = []
  const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : files.push(p) } }
  if (fs.existsSync(pub)) walk(pub)
  const TEXT = new Set(['.js', '.mjs', '.html', '.css', '.json', '.xml', '.txt', '.webmanifest', '.map', ''])
  const counts = { filesTotal: files.length, textFilesScanned: 0, prodRef: 0, stagingRef: 0 }
  for (const x of FORBIDDEN) counts[x.label] = 0
  for (const f of files) {
    if (!TEXT.has(path.extname(f))) continue
    counts.textFilesScanned++
    const t = fs.readFileSync(f, 'utf8')
    counts.prodRef += t.split(PROD_REF).length - 1
    counts.stagingRef += t.split(STAGING_REF).length - 1
    for (const x of FORBIDDEN) counts[x.label] += (t.match(x.re) || []).length
  }
  c.check('web assets packaged (index.html)', fs.existsSync(path.join(pub, 'index.html')), files.length)
  for (const x of FORBIDDEN) c.check(`secret scan: ${x.label} occurs 0 times`, counts[x.label] === 0, counts[x.label])
  if (flavour === 'production') {
    c.check('production project ref present', counts.prodRef > 0, counts.prodRef)
    c.check('staging project ref absent', counts.stagingRef === 0, counts.stagingRef)
  } else {
    c.check('staging project ref present', counts.stagingRef > 0, counts.stagingRef)
    c.check('production project ref absent', counts.prodRef === 0, counts.prodRef)
  }
  const cfgFile = path.join(dir, 'capacitor.config.json')
  const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : null
  c.check('packaged capacitor.config has no server.url', !!cfg && !(cfg.server && 'url' in cfg.server))
  c.check('packaged capacitor.config does not force webContentsDebuggingEnabled', !!cfg && !(cfg.android && 'webContentsDebuggingEnabled' in cfg.android), cfg?.android ?? null)
  c.check('packaged capacitor.config has no allowMixedContent', !!cfg && !(cfg.android && cfg.android.allowMixedContent))
  return counts
}

function manifestChecks(m, flavour, c) {
  c.check('package is the flavour\'s applicationId', m.package === (flavour === 'production' ? 'com.kissansahyog.app' : 'com.kissansahyog.app.staging'), m.package)
  c.check('versionCode 1', m.versionCode === '1', m.versionCode)
  c.check('versionName 0.1.0', m.versionName === '0.1.0', m.versionName)
  c.check('minSdk 24', m.minSdk === '24', m.minSdk)
  c.check('targetSdk 36', m.targetSdk === '36', m.targetSdk)
  c.check('debuggable is not true', m.debuggable !== 'true', m.debuggable ?? '(absent = false)')
  c.check('usesCleartextTraffic false', m.usesCleartextTraffic === 'false', m.usesCleartextTraffic)
  c.check('allowBackup false', m.allowBackup === 'false', m.allowBackup)
  const want = expectedPerms(flavour === 'production' ? 'com.kissansahyog.app' : 'com.kissansahyog.app.staging')
  const extra = m.permissions.filter((p) => !want.includes(p))
  const missing = want.filter((p) => !m.permissions.includes(p))
  c.check('no permission beyond the decided six (+ androidx.core app-private one)', extra.length === 0, extra)
  c.check('no decided permission missing', missing.length === 0, missing)
}

// aapt2 xmltree text → the values we need
function parseXmltree(t) {
  const attr = (name) => { const r = new RegExp(`A: (?:http://schemas.android.com/apk/res/android:)?${name}\\(0x[0-9a-f]+\\)=(?:\\(type 0x[0-9a-f]+\\))?"?([^"\\s)]+)"?`, 'm'); const x = t.match(r); return x ? x[1] : undefined }
  // aapt2 prints integers as decimal (=24) or typed hex ((type 0x10)0x18) depending on version
  const num = (name) => { const x = t.match(new RegExp(`${name}\\(0x[0-9a-f]+\\)=(?:\\(type 0x10\\)0x([0-9a-f]+)|(\\d+))`)); return x ? String(x[1] ? parseInt(x[1], 16) : Number(x[2])) : undefined }
  const bool = (v) => (v === undefined ? undefined : v === '0xffffffff' || v === 'true' ? 'true' : v === '0x0' || v === 'false' ? 'false' : v)
  const pkg = (t.match(/A: package="([^"]+)"/) || [])[1]
  const perms = [...t.matchAll(/E: uses-permission[\s\S]*?A: (?:http:\/\/schemas.android.com\/apk\/res\/android:)?name\(0x[0-9a-f]+\)="([^"]+)"/g)].map((x) => x[1])
  return {
    package: pkg, versionCode: num('versionCode'), versionName: (t.match(/versionName\(0x[0-9a-f]+\)="([^"]+)"/) || [])[1],
    minSdk: num('minSdkVersion'), targetSdk: num('targetSdkVersion'),
    debuggable: bool(attr('debuggable')), usesCleartextTraffic: bool(attr('usesCleartextTraffic')), allowBackup: bool(attr('allowBackup')),
    permissions: [...new Set(perms)],
  }
}

// bundletool dump manifest (plain XML) → the same shape
function parseXml(x) {
  const a = (n) => (x.match(new RegExp(`android:${n}="([^"]+)"`)) || [])[1]
  return {
    package: (x.match(/package="([^"]+)"/) || [])[1], versionCode: a('versionCode'), versionName: a('versionName'),
    minSdk: a('minSdkVersion'), targetSdk: a('targetSdkVersion'), debuggable: a('debuggable'),
    usesCleartextTraffic: a('usesCleartextTraffic'), allowBackup: a('allowBackup'),
    permissions: [...new Set([...x.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]))],
  }
}

function jarsignerCheck(file, c, label) {
  const r = run(bin('jarsigner'), ['-verify', '-verbose', '-certs', file])
  const verified = /jar verified\./.test(r.out)
  const unsigned = /jar is unsigned/.test(r.out)
  const signedEntries = (r.out.match(/^\s*sm\s/gm) || []).length
  const summary = r.out.split(/\r?\n/).filter((l) => /jar verified|jar is unsigned|Signed by|Digest algorithm|Signature algorithm|Warning|certificate|CN=/.test(l)).slice(0, 12)
  if (label === 'aab') c.check('jarsigner: jar verified', verified, summary)
  return { verified, unsigned, signedEntries, summary }
}

function certSha256(file) {
  const r = run(bin('keytool'), ['-printcert', '-jarfile', file])
  return { sha256: (r.out.match(/SHA256:\s*([0-9A-F:]+)/) || [])[1] || null, sha1: (r.out.match(/SHA1:\s*([0-9A-F:]+)/) || [])[1] || null, owner: (r.out.match(/Owner:\s*(.+)/) || [])[1]?.trim() || null }
}

function auditApk(file, flavour) {
  const c = new Checks()
  const res = { artifact: path.relative(ROOT, file).replace(/\\/g, '/'), flavour, sizeBytes: fs.statSync(file).size }
  res.jarsigner = jarsignerCheck(file, c, 'apk')
  res.jarsignerNote = 'AGP signs APKs with minSdk >= 24 using APK Signature Scheme v2/v3 only (no v1 JAR signature), so jarsigner reports "jar is unsigned" for the APK by design; apksigner is the authoritative check.'
  const as = run(bin('java'), ['-jar', APKSIGNER_JAR, 'verify', '--verbose', '--print-certs', file])
  res.apksigner = as.out.split(/\r?\n/).filter((l) => /Verifies|Verified using|certificate (DN|SHA-256|SHA-1)|Number of signers|WARNING|ERROR/.test(l))
  c.check('apksigner: Verifies', /^Verifies/m.test(as.out), res.apksigner.slice(0, 6))
  const apkSha = (as.out.match(/certificate SHA-256 digest:\s*([0-9a-f]+)/) || [])[1]
  res.signerSha256 = apkSha
  c.check('signer certificate SHA-256 == upload key', !!expect && norm(apkSha) === norm(expect), { signer: apkSha, expected: expect })
  const xt = run(AAPT2, ['dump', 'xmltree', '--file', 'AndroidManifest.xml', file])
  res.manifest = parseXmltree(xt.out)
  const badging = run(AAPT2, ['dump', 'badging', file]).out
  res.badgingDebuggable = /application-debuggable/.test(badging)
  c.check('aapt2 badging has no application-debuggable', !res.badgingDebuggable)
  manifestChecks(res.manifest, flavour, c)
  res.permissionJustification = Object.fromEntries(res.manifest.permissions.map((p) => [p, { why: permWhy(p), codeRefs: PERMISSION_CODE_REFS[p] || null }]))
  // resources + assets
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-rel-'))
  try {
    // Release APKs have shortened resource paths (res/9w.png), so read the resource table instead.
    const table = run(AAPT2, ['dump', 'resources', file]).out.split(/\r?\n/)
    const entries = (name) => {
      const i = table.findIndex((l) => l.includes('resource 0x') && l.trim().endsWith(` ${name}`))
      const out = []
      if (i >= 0) for (let k = i + 1; k < table.length && /^\s+\(/.test(table[k]); k++) out.push(table[k].trim())
      return out
    }
    res.icons = Object.fromEntries(['mipmap/ic_launcher', 'mipmap/ic_launcher_round', 'mipmap/ic_launcher_foreground'].map((k) => [k, entries(k)]))
    res.splash = entries('drawable/splash')
    const dens = ['(mdpi)', '(hdpi)', '(xhdpi)', '(xxhdpi)', '(xxxhdpi)', '(anydpi-v26)']
    c.check('launcher icon: 5 densities + adaptive for ic_launcher and ic_launcher_round', ['mipmap/ic_launcher', 'mipmap/ic_launcher_round'].every((k) => dens.every((d) => res.icons[k].some((e) => e.startsWith(d)))), Object.fromEntries(Object.entries(res.icons).map(([k, v]) => [k, v.length])))
    res.badgingApplication = (badging.match(/application: label='[^']*' icon='[^']+'/) || [])[0] || null
    c.check('aapt2 badging: application label + icon set', !!res.badgingApplication, res.badgingApplication)
    c.check('splash drawables present', res.splash.length >= 1, res.splash.length)
    run(bin('jar'), ['xf', file, 'assets'], { cwd: tmp })
    res.webAssets = scanWebAssets(path.join(tmp, 'assets'), flavour, c)
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
  res.checks = c.list; res.status = c.ok ? 'RAN-PASSED' : 'RAN-FAILED'
  return res
}

function auditAab(file, flavour) {
  const c = new Checks()
  const res = { artifact: path.relative(ROOT, file).replace(/\\/g, '/'), flavour, sizeBytes: fs.statSync(file).size }
  res.jarsigner = jarsignerCheck(file, c, 'aab')
  const cert = certSha256(file)
  res.signerCert = cert
  c.check('signer certificate SHA-256 == upload key', !!expect && norm(cert.sha256) === norm(expect), { signer: cert.sha256, expected: expect })
  c.check('signer DN is the upload key DN', /USD Vision AI LLP/.test(cert.owner || ''), cert.owner)
  if (BUNDLETOOL) {
    const v = bundletool('validate', `--bundle=${file}`)
    res.bundletool = { jar: path.basename(BUNDLETOOL), validateExit: v.status, validateOutputHead: v.out.split(/\r?\n/).slice(0, 15) }
    c.check('bundletool validate exits 0', v.status === 0, v.status)
    const d = bundletool('dump', 'manifest', `--bundle=${file}`)
    res.manifest = parseXml(d.out)
    manifestChecks(res.manifest, flavour, c)
  } else {
    res.bundletool = 'NOT-RUN — bundletool jar not found in the Gradle cache'
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-aab-'))
  try {
    const list = run(bin('jar'), ['tf', file]).out.split(/\r?\n/)
    res.icons = list.filter((l) => /^base\/res\/mipmap[^/]*\/ic_launcher/.test(l))
    res.splash = list.filter((l) => /^base\/res\/drawable[^/]*\/splash/.test(l))
    c.check('launcher icons present', res.icons.length >= 10, res.icons.length)
    c.check('splash drawables present', res.splash.length >= 1, res.splash.length)
    run(bin('jar'), ['xf', file, 'base/assets'], { cwd: tmp })
    res.webAssets = scanWebAssets(path.join(tmp, 'base', 'assets'), flavour, c)
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
  res.checks = c.list; res.status = c.ok ? 'RAN-PASSED' : 'RAN-FAILED'
  return res
}

fs.mkdirSync(OUT, { recursive: true })
const summary = { generated: new Date().toISOString(), expectedUploadKeySha256: expect, buildTools: BT, bundletool: BUNDLETOOL ? path.basename(BUNDLETOOL) : null, artifacts: [] }
for (const flavour of ['production', 'staging']) {
  for (const ext of ['aab', 'apk']) {
    const f = path.join(ROOT, 'android', 'ks-apks', `ks-${flavour}-release.${ext}`)
    if (!fs.existsSync(f)) { summary.artifacts.push({ artifact: path.basename(f), status: 'NOT-RUN', reason: 'file missing' }); continue }
    const r = ext === 'aab' ? auditAab(f, flavour) : auditApk(f, flavour)
    fs.writeFileSync(path.join(OUT, `audit-${flavour}-release-${ext}.json`), JSON.stringify(r, null, 2))
    summary.artifacts.push({ artifact: r.artifact, status: r.status, sizeBytes: r.sizeBytes, versionCode: r.manifest?.versionCode, versionName: r.manifest?.versionName, failed: r.checks.filter((x) => !x.ok).map((x) => x.name) })
    console.log(`${r.status}  ${r.artifact}  ${r.sizeBytes} bytes  failed: ${r.checks.filter((x) => !x.ok).map((x) => x.name).join('; ') || 'none'}`)
  }
}
fs.writeFileSync(path.join(OUT, 'audit-summary.json'), JSON.stringify(summary, null, 2))
process.exit(summary.artifacts.every((a) => a.status === 'RAN-PASSED') ? 0 : 1)
