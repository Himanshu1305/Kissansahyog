#!/usr/bin/env node
// Generates src/content/sources.js from docs/research/SOURCES.md so the human-
// readable register and the site-side registry can never drift. Run:
//   node scripts/gen-sources.mjs
// The citation audit (scripts/test/v2_citation_audit.mjs) re-runs this in a
// temp buffer and fails if the committed file is stale.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const SRC = join(ROOT, 'docs/research/SOURCES.md')
const OUT = join(ROOT, 'src/content/sources.js')

export function parseSources(md) {
  const rows = []
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(S-[A-Z]+-\d+)\s*\|(.*)\|\s*$/)
    if (!m) continue
    // split the remaining cells on unescaped pipes
    const cells = m[2].split(/\s*(?<!\\)\|\s*/).map((c) => c.trim().replace(/\\\|/g, '|'))
    // cells: title, publisher, url, pub_date, accessed, type, quote
    const [title, publisher, url, date, accessed, type, quote] = cells
    rows.push({ id: m[1], title, publisher, url, date, accessed, type, quote })
  }
  return rows
}

export function buildFile(rows) {
  const byId = {}
  for (const r of rows) {
    byId[r.id] = {
      title: r.title,
      publisher: r.publisher,
      url: r.url,
      date: r.date,
      type: r.type,
    }
  }
  const body = JSON.stringify(byId, null, 2)
  return `// AUTO-GENERATED from docs/research/SOURCES.md by scripts/gen-sources.mjs.
// Do not edit by hand: edit SOURCES.md and re-run \`node scripts/gen-sources.mjs\`.
// Single site-side citation registry: id -> { title, publisher, url, date, type }.
export const sources = ${body}

export function getSource(id) {
  return sources[id] || null
}
`
}

function main() {
  const md = readFileSync(SRC, 'utf8')
  const rows = parseSources(md)
  if (rows.length < 100) {
    console.error(`Refusing to write: only ${rows.length} rows parsed from SOURCES.md`)
    process.exit(1)
  }
  writeFileSync(OUT, buildFile(rows))
  console.log(`Wrote ${OUT} with ${rows.length} sources.`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
