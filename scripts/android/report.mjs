#!/usr/bin/env node
// Batch 8A — the results table, generated ONLY from a results file (never typed by hand).
//   node scripts/android/report.mjs [--out <results.json>] [--md <file.md>]
// Prints the verdict line + table, lists NOT-RUN / HUMAN-REVIEW prominently, and writes the
// same text to docs/review/batch8a/RESULTS.md (or --md).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const argv = process.argv.slice(2)
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const IN = path.resolve(ROOT, arg('--out') || 'docs/review/batch8a/results.json')
const MD = path.resolve(ROOT, arg('--md') || (arg('--out') ? IN.replace(/\.json$/, '.md') : 'docs/review/batch8a/RESULTS.md'))

if (!fs.existsSync(IN)) { console.error(`report: ${path.relative(ROOT, IN)} not found`); process.exit(2) }
const data = JSON.parse(fs.readFileSync(IN, 'utf8'))
const tests = data.tests || []
const STATUSES = ['RAN-PASSED', 'RAN-FAILED', 'NOT-RUN', 'HUMAN-REVIEW']
const count = Object.fromEntries(STATUSES.map((s) => [s, tests.filter((t) => t.status === s).length]))
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
const evidencePath = (t) => {
  const files = t.evidenceFiles || []
  if (!files.length) return '—'
  const dirs = [...new Set(files.map((f) => path.posix.dirname(f)))]
  return dirs.length === 1 ? `${dirs[0]}/ (${files.length} file${files.length > 1 ? 's' : ''})` : files.join(', ')
}

const lines = []
lines.push(`**Verdict:** ${tests.length} tests — ${count['RAN-PASSED']} RAN-PASSED / ${count['RAN-FAILED']} RAN-FAILED / ${count['NOT-RUN']} NOT-RUN / ${count['HUMAN-REVIEW']} HUMAN-REVIEW` +
  (data.run?.fatalExceptions ? ` — plus ${data.run.fatalExceptions} FATAL EXCEPTION(s) in logcat` : '') + (data.run?.appAnr?.length ? ` — plus ${data.run.appAnr.length} "app isn't responding" dialog(s)` : ''))
lines.push('')
lines.push(`Source: \`${path.relative(ROOT, IN).replaceAll('\\', '/')}\` · run ${data.run?.startedAt || '?'} → ${data.run?.finishedAt || '?'} · device ${data.run?.device?.serial || '—'} (API ${data.run?.device?.sdk || '—'}, WebView ${data.run?.device?.webview || '—'})${data.run?.apk ? ` · APK sha256 ${data.run.apk.sha256.slice(0, 16)}…` : ''}${data.run?.systemAnrDismissed?.length ? ` · emulator "System UI isn't responding" dialogs answered "Wait": ${data.run.systemAnrDismissed.length}` : ''}${data.run?.cdpReconnects ? ` · WebView re-attaches: ${data.run.cdpReconnects}` : ''}`)
lines.push('')
lines.push('| ID | Test | Status | Assertion | Evidence |')
lines.push('|---|---|---|---|---|')
for (const t of tests) lines.push(`| ${cell(t.id)} | ${cell(t.name)} | **${cell(t.status)}** | ${cell(t.assertion)} | ${cell(evidencePath(t))} |`)
const flagged = tests.filter((t) => t.status !== 'RAN-PASSED')
if (flagged.length) {
  lines.push('')
  lines.push('**Not a plain pass — read these:**')
  lines.push('')
  for (const t of flagged) lines.push(`- **${t.id} ${t.status}** — ${cell(t.notes) || '(no notes)'}`)
}
const text = lines.join('\n') + '\n'
fs.writeFileSync(MD, text)
console.log(text)
console.log(`(written to ${path.relative(ROOT, MD).replaceAll('\\', '/')})`)
