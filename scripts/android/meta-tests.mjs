#!/usr/bin/env node
// Batch 8A — T19 (negative control) and T20 (repeatability). These run the whole harness
// (scripts/test-android.sh) several times, so they cannot live inside it.
//
//   node scripts/android/meta-tests.mjs
//
//   1. full run #1                 → docs/review/batch8a/results-run1.json
//   2. full run #2 (back to back)  → docs/review/batch8a/results-run2.json
//   3. T20: every test has the same status in both runs
//   4. T19a: a deliberately false assertion ("ZZZ_NOT_PRESENT" on /) through the same script
//            → must be RAN-FAILED and the script must exit non-zero
//   5. T19b: the same script pointed at a serial that does not exist
//            → every device test must be NOT-RUN (nothing may pass)
//   6. docs/review/batch8a/results.json = run #2 + T19 + T20, then report.mjs builds the table.
// Exit code 1 if the final results contain a RAN-FAILED test.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, OUT_DIR, rel, makeEvidence } from './lib.mjs'

const ev = makeEvidence(path.join(OUT_DIR, 'evidence'))
const bash = (args, env = {}) => {
  const t = Date.now()
  const res = spawnSync('bash', ['scripts/test-android.sh', ...args], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env }, timeout: 3 * 60 * 60 * 1000 })
  return { status: res.status, ms: Date.now() - t }
}
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))
const RUN1 = 'docs/review/batch8a/results-run1.json'
const RUN2 = 'docs/review/batch8a/results-run2.json'

console.log('\n=== meta: full run #1 ===')
const r1 = bash(['--out', RUN1])
console.log('\n=== meta: full run #2 ===')
const r2 = bash(['--out', RUN2])

// T20
const a = load(RUN1), b = load(RUN2)
const ids = [...new Set([...a.tests, ...b.tests].map((t) => t.id))]
const rows = ids.map((id) => {
  const x = a.tests.find((t) => t.id === id), y = b.tests.find((t) => t.id === id)
  return { id, run1: x?.status || 'absent', run2: y?.status || 'absent', same: x?.status === y?.status, ms1: x?.durationMs, ms2: y?.durationMs }
})
const diffs = rows.filter((r) => !r.same)
const t20 = {
  id: 'T20', name: 'Repeatability',
  status: diffs.length === 0 && rows.length > 0 ? 'RAN-PASSED' : 'RAN-FAILED',
  assertion: 'scripts/test-android.sh run twice back to back gives the same status for every test (durations may differ)',
  evidenceFiles: [RUN1, RUN2, ev.text('T20', 'comparison.json', { run1: { file: RUN1, exit: r1.status, ms: r1.ms, apkSha256: a.run?.apk?.sha256 }, run2: { file: RUN2, exit: r2.status, ms: r2.ms, apkSha256: b.run?.apk?.sha256 }, rows })],
  durationMs: r1.ms + r2.ms,
  notes: diffs.length ? `status differs: ${diffs.map((d) => `${d.id} ${d.run1}→${d.run2}`).join(', ')}` : `${rows.length} tests, identical statuses; script exit ${r1.status} / ${r2.status}; only durations differ (timing noise)${a.run?.apk?.sha256 && a.run.apk.sha256 !== b.run?.apk?.sha256 ? '; the two clean builds produced different APK bytes (build timestamps), same content checks' : ''}`,
}

// T19a — false assertion
console.log('\n=== meta: T19a negative control (deliberately false assertion) ===')
const NEG_FALSE = 'docs/review/batch8a/evidence/T19/negative-false.json'
fs.mkdirSync(path.dirname(path.join(ROOT, NEG_FALSE)), { recursive: true })
const n1 = bash(['--skip-build', '--only', 'T4,NEG', '--out', NEG_FALSE, '--evidence', 'docs/review/batch8a/evidence/T19/false-assertion'], { KS_NEGATIVE_CONTROL: '1' })
const nf = load(NEG_FALSE)
const neg = nf.tests.find((t) => t.id === 'NEG')
// T19b — no such device
console.log('\n=== meta: T19b negative control (non-existent device serial) ===')
const NEG_DEV = 'docs/review/batch8a/evidence/T19/negative-no-device.json'
const n2 = bash(['--skip-build', '--only', 'T4,T5,T8,T15', '--out', NEG_DEV, '--evidence', 'docs/review/batch8a/evidence/T19/no-device'], { ANDROID_SERIAL: 'emulator-5598' })
const nd = load(NEG_DEV)
const okA = neg?.status === 'RAN-FAILED' && n1.status !== 0
const okB = nd.tests.length === 4 && nd.tests.every((t) => t.status === 'NOT-RUN' && /no device/.test(t.notes))
const t19 = {
  id: 'T19', name: 'Negative control',
  status: okA && okB ? 'RAN-PASSED' : 'RAN-FAILED',
  assertion: 'An injected false assertion is reported RAN-FAILED and the script exits non-zero; a non-existent device serial makes every device test NOT-RUN (nothing passes)',
  evidenceFiles: [NEG_FALSE, NEG_DEV, ev.text('T19', 'negative-control.json', { falseAssertion: { exit: n1.status, tests: nf.tests.map((t) => ({ id: t.id, status: t.status, notes: t.notes })) }, noDevice: { serial: 'emulator-5598', exit: n2.status, tests: nd.tests.map((t) => ({ id: t.id, status: t.status, notes: t.notes })) } })],
  durationMs: n1.ms + n2.ms,
  notes: `false assertion → ${neg?.status} (script exit ${n1.status}); bad serial → ${nd.tests.map((t) => `${t.id} ${t.status}`).join(', ')} (script exit ${n2.status}: NOT-RUN does not fail a run, by design)`,
}

// Final results.json = run #2 + T19 + T20.
const final = { run: { ...b.run, meta: { run1: RUN1, run2: RUN2, run1Exit: r1.status, run2Exit: r2.status } }, tests: [...b.tests, t19, t20] }
fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(final, null, 2) + '\n')
spawnSync(process.execPath, ['scripts/android/report.mjs'], { cwd: ROOT, stdio: 'inherit' })
console.log(`T19 ${t19.status} — ${t19.notes}\nT20 ${t20.status} — ${t20.notes}`)
process.exit(final.tests.some((t) => t.status === 'RAN-FAILED') || final.run.fatalExceptions ? 1 : 0)
