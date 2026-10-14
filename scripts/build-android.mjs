#!/usr/bin/env node
// Batch 8A — native (Capacitor) build of the web app, against PRODUCTION.
//   node scripts/build-android.mjs              web build + cap sync          (npm run build:android)
//   node scripts/build-android.mjs --assemble   …then gradlew assembleDebug   (npm run android:debug)
//
// Steps, in order — any failure stops the build:
//   1. check-prod-env.mjs          refuses unless .env.production AND this process point at production
//   2. build-search-index.mjs      public/search-index.json (bundled in the app)
//   3. vite build --mode production, KS_NATIVE=1 (no service worker / web manifest)
//   4. check-prod-env.mjs --dist   scans dist/ for staging references
//   5. cap sync android            copies dist/ into android/app/src/main/assets/public
// No prerender and no sitemaps: the app is a single bundled shell, not 263 static pages.
// Written in Node (not an npm one-liner) because npm scripts run under cmd.exe on Windows.
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { findJdk21, findSdk } from './android/find-jdk.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = '--env-file=.env.production'
const NODE = process.execPath

function step(name, cmd, args, opts = {}) {
  console.log(`\n[build-android] ${name}`)
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts, env: { ...process.env, ...(opts.env || {}) } })
  if (res.error) { console.error(`[build-android] FAILED — ${name}: ${res.error.message}`); process.exit(1) }
  if (res.status !== 0) { console.error(`[build-android] FAILED — ${name} (exit ${res.status})`); process.exit(res.status || 1) }
}

if (!existsSync(join(ROOT, '.env.production'))) { console.error('[build-android] FAILED — .env.production not found'); process.exit(1) }

step('1/5 production guard', NODE, [ENV_FILE, 'scripts/check-prod-env.mjs'])
step('2/5 search index', NODE, [ENV_FILE, 'scripts/build-search-index.mjs'])
// A stale dist/ could carry prerendered pages or a service worker from a web build.
rmSync(join(ROOT, 'dist'), { recursive: true, force: true })
step('3/5 vite build (native, production)', NODE, [ENV_FILE, 'node_modules/vite/bin/vite.js', 'build', '--mode', 'production'], { env: { KS_NATIVE: '1' } })
step('4/5 production guard on dist/', NODE, [ENV_FILE, 'scripts/check-prod-env.mjs', '--dist'])
step('5/5 cap sync android', NODE, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'])

if (process.argv.includes('--assemble')) {
  const jdk = findJdk21()
  if (!jdk) { console.error('[build-android] FAILED — no JDK 21 found (set KS_JAVA_HOME). See docs/review/batch8a/README.md'); process.exit(1) }
  const sdk = findSdk()
  if (!sdk) { console.error('[build-android] FAILED — Android SDK not found (set ANDROID_HOME)'); process.exit(1) }
  const win = process.platform === 'win32'
  // cmd.exe needs the full, quoted path (it does not always search the working directory).
  step('gradlew assembleDebug (JDK 21)', win ? `"${join(ROOT, 'android', 'gradlew.bat')}" assembleDebug --console=plain` : './gradlew', win ? [] : ['assembleDebug', '--console=plain'], {
    cwd: join(ROOT, 'android'), shell: win, env: { JAVA_HOME: jdk, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk },
  })
  const apk = join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  if (!existsSync(apk)) { console.error('[build-android] FAILED — gradle finished but the APK is missing'); process.exit(1) }
  console.log(`\n[build-android] OK — ${apk}`)
} else {
  console.log('\n[build-android] OK — web assets synced into android/')
}
