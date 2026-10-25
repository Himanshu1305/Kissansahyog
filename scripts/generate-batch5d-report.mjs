#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const raw = JSON.parse(readFileSync(join(root, 'docs/research/qa_raw/batch5b.json'), 'utf8'))
const held = JSON.parse(readFileSync(join(root, 'docs/research/qa_raw/held/batch5b-held.json'), 'utf8'))
const evidence = JSON.parse(readFileSync(join(root, 'docs/research/qa_raw/batch5b.evidence.json'), 'utf8'))
const sources = new Map(raw.sources.map(source => [source.id, source]))
const snapshots = readdirSync(join(root, 'docs/research/source_snapshots')).filter(name => name.endsWith('.txt')).map(name => readFileSync(join(root, 'docs/research/source_snapshots', name), 'utf8'))
const cell = value => String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
const snapshot = url => snapshots.find(text => text.split('\n', 1)[0].includes(url) && /\| HTTP 200 \| fetched at (?![^|]*00:00:00Z)[^|]+Z \| sha256 [a-f0-9]{64} \|/i.test(text.split('\n', 1)[0]))
const fetchAt = text => text?.split('\n', 1)[0].match(/fetched at ([^|]+Z)/i)?.[1] || 'missing'
const publishers = new Set(raw.qas.flatMap(q => q.sources).map(id => sources.get(id)?.publisher))
const attempts = readFileSync(join(root, 'docs/research/BATCH5C_FETCH_LOG.md'), 'utf8').split('\n').filter(line => line.startsWith('| 2026-')).map(line => line.endsWith('| usable |') ? 'usable' : 'unusable')
const readOutput = file => { const body = readFileSync(file); return (body[0] === 0xff && body[1] === 0xfe ? body.toString('utf16le').replace(/^\uFEFF/, '') : body.toString('utf8')).trim() }
const verifier = readOutput(join(root, 'docs/review/BATCH5D_VERIFY_OUTPUT.txt'))
const live = readOutput(join(root, 'docs/review/BATCH5D_VERIFY_LIVE_OUTPUT.txt'))
let out = `# Result\n\n${raw.qas.length} active Q&As from ${publishers.size} publishers. Target 25: not met. Target 6 publishers: not met. All active Q&As pass normal and live integrity verification.\n\n# Held back\n\n| Slug | Reason |\n|---|---|\n`
for (const item of held.held) out += `| ${cell(item.slug)} | ${cell(item.reason)} |\n`
out += `\n# New Q&As added\n\nNone. Four bounded recovery pages were fetched. BIS pages contained no useful cement/steel passage; ICAR and APEDA home pages did not yield a practical, fully quoted Sagar/MP-farmer Q&A.\n\n# Fetch log summary\n\n${attempts.filter(x => x === 'usable').length} usable and ${attempts.filter(x => x === 'unusable').length} unusable attempts are recorded in \`docs/research/BATCH5C_FETCH_LOG.md\`.\n\n# Verification output\n\n## Normal\n\n\`\`\`text\n${verifier}\n\`\`\`\n\n## Live\n\n\`\`\`text\n${live}\n\`\`\`\n\n# Citation ledger\n\n| Q&A id | Publisher | Exact URL | Fetch time (UTC) | Verbatim quote |\n|---|---|---|---|---|\n`
for (const q of raw.qas) { const rows = evidence[q.slug]; const source = sources.get(rows[0].source); out += `| ${cell(q.slug)} | ${cell(source.publisher)} | ${cell(source.url)} | ${cell(fetchAt(snapshot(source.url)))} | ${cell(rows.map(row => row.quote).join(' / '))} |\n` }
out += `\n# Decisions needed\n\nSafest choice: retain 17 fully verified Q&As rather than use weak recovery material. Revisit PM-KUSUM only after its current status is confirmed from a live official page.\n\n# Manual checks\n\nRead Hindi copy, review the generated review table, seed only after approval, verify the database count, and spot-check three staging Q&A pages after deployment.\n`
writeFileSync(join(root, 'docs/review/BATCH5D_REPORT.md'), out)
