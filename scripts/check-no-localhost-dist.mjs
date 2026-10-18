#!/usr/bin/env node
// Batch 10E (B17) build gate — read-only. Fails (exit 1) if "localhost" or "127.0.0.1" appears in
// any built file a visitor's browser receives as a page or site config: every *.html, sw.js,
// *.xml (sitemaps), _headers and _redirects under the dist directory.
//   node scripts/check-no-localhost-dist.mjs [distDir]      (default: dist)
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, basename, extname, resolve } from 'node:path'

const dist = resolve(process.argv[2] || 'dist')
if (!existsSync(dist) || !statSync(dist).isDirectory()) {
  console.error(`check-no-localhost-dist: FAIL — directory not found: ${dist}`)
  process.exit(1)
}

const NAMES = new Set(['sw.js', '_headers', '_redirects'])
const EXTS = new Set(['.html', '.xml'])
const BAD = /localhost|127\.0\.0\.1/gi

const files = []
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else if (EXTS.has(extname(name).toLowerCase()) || NAMES.has(basename(name))) files.push(p)
  }
})(dist)

const hits = []
for (const f of files) {
  const n = (readFileSync(f, 'utf8').match(BAD) || []).length
  if (n) hits.push({ file: relative(dist, f).replace(/\\/g, '/'), n })
}

if (hits.length) {
  console.error(`check-no-localhost-dist: FAIL — ${hits.length} of ${files.length} checked files contain localhost/127.0.0.1:`)
  for (const h of hits.slice(0, 50)) console.error(`  ${h.file} (${h.n})`)
  if (hits.length > 50) console.error(`  … and ${hits.length - 50} more`)
  process.exit(1)
}
console.log(`check-no-localhost-dist: OK — ${files.length} files checked (html, xml, sw.js, _headers, _redirects), no localhost/127.0.0.1.`)
