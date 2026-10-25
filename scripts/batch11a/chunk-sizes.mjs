#!/usr/bin/env node
// Batch 11A — raw / gzip (-9) size of the JS/CSS assets in <dist>/assets (main chunk first).
//   node scripts/batch11a/chunk-sizes.mjs <distDir>
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = process.argv[2] || 'dist'
const dir = join(dist, 'assets')
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const main = (html.match(/assets\/(index-[^"']+\.js)/) || [])[1]
const rows = readdirSync(dir)
  .filter((n) => /\.(js|css)$/.test(n))
  .map((n) => { const buf = readFileSync(join(dir, n)); return { n, raw: buf.length, gz: gzipSync(buf, { level: 9 }).length } })
rows.sort((x, y) => (x.n === main ? -1 : y.n === main ? 1 : y.gz - x.gz))
console.log(`MAIN ${main}`)
for (const r of rows.slice(0, 25)) console.log(`${r.n} raw ${r.raw} gz ${r.gz}`)
