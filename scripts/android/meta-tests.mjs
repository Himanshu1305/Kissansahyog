#!/usr/bin/env node
// Tests that run the whole harness (scripts/test-android.sh) several times, so they cannot live
// inside it. Batch 8A: T19/T20 (prod). Batch 8B: P1 (prod regression), P2/P3 (staging).
//
//   node scripts/android/meta-tests.mjs --flavor prod      → results-prod.json    (T1–T20 + P1)
//   node scripts/android/meta-tests.mjs --flavor staging   → results-staging.json (S/O + P2 + P3)
//
// For each flavour:
//   1. full run #1 → results-<flavor>-run1.json;  2. full run #2 → …-run2.json
//   3. repeatability (T20 / P3): every test has the same status in both runs
//   4. negative control (T19 / P2): a deliberately false assertion through the same script must be
//      RAN-FAILED and make the script exit non-zero; a non-existent serial must make every device
//      test NOT-RUN; (staging) a prod VITE_SUPABASE_URL given to the staging build must be refused
//   5. results-<flavor>.json = run #2 + these records; report.mjs builds the table.
// Exit code 1 if the final results contain a RAN-FAILED test.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, OUT_DIR, ADB, makeEvidence } from './lib.mjs'

const argv = process.argv.slice(2)
const FLAVOR = (() => { const i = argv.indexOf('--flavor'); return i >= 0 ? argv[i + 1] : 'prod' })()
if (!['prod', 'staging'].includes(FLAVOR)) { console.error('meta-tests: --flavor prod | staging'); process.exit(2) }
const PROD = FLAVOR === 'prod'
const ev = makeEvidence(path.join(OUT_DIR, 'evidence', FLAVOR))
const R = (f) => path.relative(ROOT, path.join(OUT_DIR, f)).split(path.sep).join('/') // Batch 9: follows KS_REVIEW_DIR (default batch8b)
// A fresh emulator boot before each full run: over hours of tests the emulator slows down and once
// stopped answering (load average ~10), so every run starts from the same state. A real phone or
// another device (ANDROID_SERIAL set to something else) is left alone.
const restartEmulator = () => {
  if (process.env.ANDROID_SERIAL && process.env.ANDROID_SERIAL !== 'emulator-5554') return
  spawnSync('bash', ['scripts/android/avd-setup.sh', '--stop'], { cwd: ROOT, stdio: 'inherit' })
  for (let i = 0; i < 30 && spawnSync(ADB, ['-s', 'emulator-5554', 'get-state'], { timeout: 10000 }).status === 0; i++) spawnSync(process.execPath, ['-e', 'setTimeout(() => {}, 2000)'])
  spawnSync('bash', ['scripts/android/avd-setup.sh'], { cwd: ROOT, stdio: 'inherit', timeout: 20 * 60 * 1000 })
}
const bash = (args, env = {}) => {
  const t = Date.now()
  const res = spawnSync('bash', ['scripts/test-android.sh', '--flavor', FLAVOR, ...args], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env }, timeout: 4 * 60 * 60 * 1000 })
  return { status: res.status, ms: Date.now() - t }
}
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))
const RUN1 = R(`results-${FLAVOR}-run1.json`), RUN2 = R(`results-${FLAVOR}-run2.json`)
const ID = PROD ? { neg: 'T19', rep: 'T20' } : { neg: 'P2', rep: 'P3' }

// Batch 9: --skip-full reuses run #1 / run #2 that were already run separately (each one under its
// own stall timeout, with its own evidence folder); their exit codes are passed as --exit1 / --exit2.
const SKIP_FULL = argv.includes('--skip-full')
const argNum = (n) => { const i = argv.indexOf(n); return i >= 0 ? Number(argv[i + 1]) : null }
let r1, r2
if (SKIP_FULL) {
  if (![RUN1, RUN2].every((f) => fs.existsSync(path.join(ROOT, f)))) { console.error(`meta-tests: --skip-full needs ${RUN1} and ${RUN2}`); process.exit(2) }
  r1 = { status: argNum('--exit1'), ms: 0 }; r2 = { status: argNum('--exit2'), ms: 0 }
  console.log(`\n=== meta (${FLAVOR}): reusing ${RUN1} and ${RUN2} (run separately) ===`)
} else {
  console.log(`\n=== meta (${FLAVOR}): full run #1 ===`)
  restartEmulator()
  r1 = bash(['--out', RUN1])
  console.log(`\n=== meta (${FLAVOR}): full run #2 ===`)
  restartEmulator()
  r2 = bash(['--out', RUN2])
}

// Repeatability
const a = load(RUN1), b = load(RUN2)
const ids = [...new Set([...a.tests, ...b.tests].map((t) => t.id))]
const rows = ids.map((id) => {
  const x = a.tests.find((t) => t.id === id), y = b.tests.find((t) => t.id === id)
  return { id, run1: x?.status || 'absent', run2: y?.status || 'absent', same: x?.status === y?.status, ms1: x?.durationMs, ms2: y?.durationMs }
})
const diffs = rows.filter((r) => !r.same)
const rep = {
  id: ID.rep, name: 'Repeatability',
  status: diffs.length === 0 && rows.length > 0 ? 'RAN-PASSED' : 'RAN-FAILED',
  assertion: `scripts/test-android.sh --flavor ${FLAVOR} run twice back to back gives the same status for every test (durations may differ)`,
  evidenceFiles: [RUN1, RUN2, ev.text(ID.rep, 'comparison.json', { run1: { exit: r1.status, ms: r1.ms }, run2: { exit: r2.status, ms: r2.ms }, rows })],
  durationMs: r1.ms + r2.ms,
  notes: diffs.length ? `status differs: ${diffs.map((d) => `${d.id} ${d.run1}→${d.run2}`).join(', ')}` : `${rows.length} tests, identical statuses; script exit ${r1.status} / ${r2.status}; only durations differ (timing noise)`,
}

// Negative control
console.log(`\n=== meta (${FLAVOR}): negative control — deliberately false assertion ===`)
const NEG_FALSE = R(`evidence/${FLAVOR}/${ID.neg}/negative-false.json`)
fs.mkdirSync(path.dirname(path.join(ROOT, NEG_FALSE)), { recursive: true })
const negId = PROD ? 'NEG' : 'NEG-S'
const n1 = bash(['--skip-build', '--only', PROD ? 'T4,NEG' : 'NEG-S', '--out', NEG_FALSE, '--evidence', R(`evidence/${FLAVOR}/${ID.neg}/false-assertion`)], { KS_NEGATIVE_CONTROL: '1' })
const neg = load(NEG_FALSE).tests.find((t) => t.id === negId)
console.log(`\n=== meta (${FLAVOR}): negative control — non-existent device serial ===`)
const NEG_DEV = R(`evidence/${FLAVOR}/${ID.neg}/negative-no-device.json`)
const devIds = PROD ? 'T4,T5,T8,T15' : 'S3,S4,O2,O3'
const n2 = bash(['--skip-build', '--only', devIds, '--out', NEG_DEV, '--evidence', R(`evidence/${FLAVOR}/${ID.neg}/no-device`)], { ANDROID_SERIAL: 'emulator-5598' })
const nd = load(NEG_DEV)
const okA = neg?.status === 'RAN-FAILED' && n1.status !== 0
const okB = nd.tests.length === devIds.split(',').length && nd.tests.every((t) => t.status === 'NOT-RUN' && /no device/.test(t.notes))
let okC = true, refusal = null
if (!PROD) {
  const g = spawnSync(process.execPath, ['scripts/build-android.mjs', '--target', 'staging'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: 'https://eltmcznjcqiahqhjvpjg.supabase.co' }, timeout: 120000 })
  refusal = ((g.stdout || '') + (g.stderr || '')).split(/\r?\n/).filter((l) => /GUARD|FAILED/.test(l)).join('\n')
  okC = g.status !== 0 && /STAGING GUARD: REFUSED/.test(refusal)
}
const negRec = {
  id: ID.neg, name: 'Negative control',
  status: okA && okB && okC ? 'RAN-PASSED' : 'RAN-FAILED',
  assertion: PROD
    ? 'An injected false assertion is reported RAN-FAILED and the script exits non-zero; a non-existent device serial makes every device test NOT-RUN (nothing passes)'
    : '(a) a false assertion in the staging suite is RAN-FAILED and the script exits non-zero; (b) a non-existent serial makes every device test NOT-RUN; (c) a prod VITE_SUPABASE_URL passed into the staging build is refused',
  evidenceFiles: [NEG_FALSE, NEG_DEV, ev.text(ID.neg, 'negative-control.json', { falseAssertion: { exit: n1.status, test: neg }, noDevice: { exit: n2.status, tests: nd.tests.map((t) => ({ id: t.id, status: t.status, notes: t.notes })) }, prodUrlIntoStaging: PROD ? null : { refused: okC, refusal } })],
  durationMs: n1.ms + n2.ms,
  notes: `false assertion → ${neg?.status} (exit ${n1.status}); bad serial → ${nd.tests.map((t) => `${t.id} ${t.status}`).join(', ')} (exit ${n2.status}, NOT-RUN does not fail a run)${PROD ? '' : `; prod URL into staging build → ${okC ? 'REFUSED' : 'NOT refused'}`}`,
}

const extra = [negRec, rep]
if (PROD) {
  // P1: the prod regression as a whole, and which assertions Batch 8B changed.
  const failed = b.tests.filter((t) => t.status === 'RAN-FAILED')
  extra.push({
    id: 'P1', name: 'Prod-flavour regression',
    status: failed.length || !b.tests.length ? 'RAN-FAILED' : 'RAN-PASSED',
    assertion: 'The prod APK is rebuilt and T1–T20 run again read-only: no RAN-FAILED test',
    evidenceFiles: [RUN2, ev.text('P1', 'assertion-changes.json', {
      T7: '/browse display part becomes NOT-RUN when production returns 0 listings near Sagar (the network part is still checked); covered by S6 on staging',
      T9: 'forced offline banner: added "banner does not cover the NavBar"; simulated edge-to-edge: the header is expected directly BELOW the banner (inset + banner height), not at the inset under it (Part D1)',
    })],
    durationMs: 0,
    notes: failed.length ? `RAN-FAILED: ${failed.map((t) => t.id).join(', ')}` : `T1–T18 run #2: ${b.tests.map((t) => `${t.id} ${t.status}`).filter((x) => !x.endsWith('RAN-PASSED')).join(', ') || 'all RAN-PASSED except as listed'}; assertions changed by 8B: T7 (/browse honesty), T9 (banner/header D1)`,
  })
}
const final = { run: { ...b.run, meta: { flavor: FLAVOR, run1: RUN1, run2: RUN2, run1Exit: r1.status, run2Exit: r2.status } }, tests: [...b.tests, ...extra] }
const OUT = R(`results-${FLAVOR}.json`)
fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(final, null, 2) + '\n')
spawnSync(process.execPath, ['scripts/android/report.mjs', '--out', OUT], { cwd: ROOT, stdio: 'inherit' })
console.log(extra.map((t) => `${t.id} ${t.status} — ${t.notes}`).join('\n'))
process.exit(final.tests.some((t) => t.status === 'RAN-FAILED') || final.run.fatalExceptions ? 1 : 0)
