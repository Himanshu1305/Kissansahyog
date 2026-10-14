#!/usr/bin/env node
// Native (Capacitor) build of the web app — Batch 8A (production), 8B (staging flavour).
//   node scripts/build-android.mjs [--target production|staging] [--local-api] [--assemble]
//
//   npm run build:android            production web build + cap sync
//   npm run android:debug            …then gradlew assembleDebug  → ks-production.apk
//   npm run android:debug:staging    staging flavour               → ks-staging.apk
//   npm run android:debug:staging-local   staging + API on http://localhost:8788 (tests only)
//
// production (default, unchanged): .env.production, check-prod-env.mjs, API origin
//   https://kissansahyog.com, applicationId com.kissansahyog.app, label "Kisan Sahyog".
// staging: .env (the staging project), check-staging-env.mjs, API origin
//   https://staging.kissansahyog.com, applicationId com.kissansahyog.app.staging,
//   label "Kisan Sahyog (Staging)" — both apps can be installed side by side.
// --local-api (staging only, for the feedback/CORS test against `wrangler pages dev`): API
//   origin http://localhost:8788 and cleartext allowed — through a Gradle property and the
//   GENERATED android/app/src/main/assets/capacitor.config.json, never the committed config.
//
// Steps — any failure stops the build:
//   1. env guard (refuses unless the env file AND this process point at the target project)
//   2. build-search-index.mjs (bundled in the app)
//   3. vite build, KS_NATIVE=1 (no service worker / web manifest), VITE_API_ORIGIN set
//   4. env guard on dist/ (no reference to the other project)
//   5. cap sync android
//   6. (--assemble) gradlew assembleDebug -PksFlavor=… with JDK 21; the APK is copied to
//      android/ks-apks/ks-<flavour>.apk (gitignored)
//      (--release, Batch 9 Phase 3) gradlew bundleRelease assembleRelease instead; copies
//      ks-<flavour>-release.aab / .apk. Signed with the upload key when android/keystore.properties
//      exists (see docs/store/KEYSTORE_README.md), otherwise unsigned. Not for --local-api.
// No prerender and no sitemaps: the app is a single bundled shell.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { findJdk21, findSdk } from './android/find-jdk.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const NODE = process.execPath
const argv = process.argv.slice(2)
const argVal = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const TARGET = argVal('--target') || 'production'
const LOCAL_API = argv.includes('--local-api')

const TARGETS = {
  production: { envFile: '.env.production', guard: 'scripts/check-prod-env.mjs', mode: 'production', apiOrigin: 'https://kissansahyog.com' },
  staging: { envFile: '.env', guard: 'scripts/check-staging-env.mjs', mode: 'staging', apiOrigin: 'https://staging.kissansahyog.com' },
}
const cfg = TARGETS[TARGET]
if (!cfg) { console.error(`[build-android] FAILED — unknown --target ${TARGET} (production | staging)`); process.exit(1) }
const RELEASE = argv.includes('--release')
if (RELEASE && LOCAL_API) { console.error('[build-android] FAILED — --release is not allowed with --local-api'); process.exit(1) }
if (LOCAL_API && TARGET !== 'staging') { console.error('[build-android] FAILED — --local-api is only for --target staging'); process.exit(1) }
const FLAVOUR = TARGET === 'staging' ? (LOCAL_API ? 'staging-local' : 'staging') : 'production'
const API_ORIGIN = LOCAL_API ? 'http://localhost:8788' : cfg.apiOrigin
const ENV_FILE = `--env-file=${cfg.envFile}`

function step(name, cmd, args, opts = {}) {
  console.log(`\n[build-android] ${name}`)
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts, env: { ...process.env, ...(opts.env || {}) } })
  if (res.error) { console.error(`[build-android] FAILED — ${name}: ${res.error.message}`); process.exit(1) }
  if (res.status !== 0) { console.error(`[build-android] FAILED — ${name} (exit ${res.status})`); process.exit(res.status || 1) }
}

if (!existsSync(join(ROOT, cfg.envFile))) { console.error(`[build-android] FAILED — ${cfg.envFile} not found`); process.exit(1) }
console.log(`[build-android] target ${TARGET}${LOCAL_API ? ' (local API)' : ''} — flavour ${FLAVOUR}, API origin ${API_ORIGIN}`)

step(`1/5 ${TARGET} guard`, NODE, [ENV_FILE, cfg.guard])
step('2/5 search index', NODE, [ENV_FILE, 'scripts/build-search-index.mjs'])
// A stale dist/ could carry prerendered pages, a service worker or the other project's build.
rmSync(join(ROOT, 'dist'), { recursive: true, force: true })
step(`3/5 vite build (native, ${cfg.mode})`, NODE, [ENV_FILE, 'node_modules/vite/bin/vite.js', 'build', '--mode', cfg.mode], { env: { KS_NATIVE: '1', VITE_API_ORIGIN: API_ORIGIN } })
step(`4/5 ${TARGET} guard on dist/`, NODE, [ENV_FILE, cfg.guard, '--dist'])
step('5/5 cap sync android', NODE, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'])

// The packaged copy of capacitor.config.json is generated by cap sync (gitignored). Only the
// local-API test build lets the https://localhost page call http://localhost:8788.
const packagedCfg = join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json')
if (LOCAL_API) {
  const c = JSON.parse(readFileSync(packagedCfg, 'utf8'))
  c.android = { ...(c.android || {}), allowMixedContent: true }
  writeFileSync(packagedCfg, JSON.stringify(c, null, 2))
  console.log('[build-android] local API: allowMixedContent set in the generated packaged config only')
}

if (argv.includes('--assemble') || RELEASE) {
  const jdk = findJdk21()
  if (!jdk) { console.error('[build-android] FAILED — no JDK 21 found (set KS_JAVA_HOME). See docs/review/batch8a/README.md'); process.exit(1) }
  const sdk = findSdk()
  if (!sdk) { console.error('[build-android] FAILED — Android SDK not found (set ANDROID_HOME)'); process.exit(1) }
  const win = process.platform === 'win32'
  const tasks = RELEASE ? ['bundleRelease', 'assembleRelease'] : ['assembleDebug']
  // A release output left from an earlier (e.g. unsigned or other-flavour) build must never be copied.
  if (RELEASE) for (const d of [['apk', 'release'], ['bundle', 'release']]) rmSync(join(ROOT, 'android', 'app', 'build', 'outputs', ...d), { recursive: true, force: true })
  const gradleArgs = [...tasks, '--console=plain', `-PksFlavor=${TARGET}`, `-PksCleartext=${LOCAL_API ? 'true' : 'false'}`]
  // cmd.exe needs the full, quoted path (it does not always search the working directory).
  step(`gradlew ${tasks.join(' ')} (${FLAVOUR}, JDK 21)`, win ? `"${join(ROOT, 'android', 'gradlew.bat')}" ${gradleArgs.join(' ')}` : './gradlew', win ? [] : gradleArgs, {
    cwd: join(ROOT, 'android'), shell: win, env: { JAVA_HOME: jdk, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk },
  })
  const keep = join(ROOT, 'android', 'ks-apks')
  mkdirSync(keep, { recursive: true })
  if (RELEASE) {
    const outs = join(ROOT, 'android', 'app', 'build', 'outputs')
    const apkDir = join(outs, 'apk', 'release')
    const relApk = [join(apkDir, 'app-release.apk'), join(apkDir, 'app-release-unsigned.apk')].find(existsSync)
    const relAab = join(outs, 'bundle', 'release', 'app-release.aab')
    if (!relApk || !existsSync(relAab)) { console.error('[build-android] FAILED — gradle finished but the release APK/AAB is missing'); process.exit(1) }
    copyFileSync(relAab, join(keep, `ks-${FLAVOUR}-release.aab`))
    copyFileSync(relApk, join(keep, `ks-${FLAVOUR}-release.apk`))
    console.log(`\n[build-android] OK — ${join(keep, `ks-${FLAVOUR}-release.aab`)} and .apk (${relApk.endsWith('unsigned.apk') ? 'UNSIGNED' : 'signed'})`)
    process.exit(0)
  }
  const out = join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug')
  const apk = join(out, 'app-debug.apk')
  if (!existsSync(apk)) { console.error('[build-android] FAILED — gradle finished but the APK is missing'); process.exit(1) }
  // Gradle empties its own output folder on the next build, so the named copies live outside it.
  const named = join(keep, `ks-${FLAVOUR}.apk`)
  copyFileSync(apk, named)
  console.log(`\n[build-android] OK — ${named}`)
} else {
  console.log('\n[build-android] OK — web assets synced into android/')
}
