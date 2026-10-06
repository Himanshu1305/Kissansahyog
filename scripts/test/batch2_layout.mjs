// Batch 2 item A — one layout everywhere (static guard).
// Fails if any file in src/screens/ sets a PAGE-LEVEL width clamp (`max-w-*` or
// inline `maxWidth`). Legitimately-inner clamps (modals, cards, chips, centred
// notices, hero overlays, readable prose columns) are allowed when marked with a
// `ks-allow-width` comment on, or within the 6 lines immediately above, the
// occurrence. Every screen should render inside PageShell (wide) + the layout
// primitives, so no screen needs a page-level max-w / maxWidth of its own.
// Run: node scripts/test/batch2_layout.mjs
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCREENS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'screens')
const WIDTH_RE = /max-w-|maxWidth/
const MARKER = 'ks-allow-width'
const LOOKBACK = 6 // marker may sit a few lines above the element's className line

let pass = 0, fail = 0
const violations = []

for (const file of readdirSync(SCREENS).filter((f) => f.endsWith('.jsx')).sort()) {
  const lines = readFileSync(join(SCREENS, file), 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (!WIDTH_RE.test(line)) return
    // Allowed if a ks-allow-width marker appears on this line or within LOOKBACK lines above.
    const window = lines.slice(Math.max(0, i - LOOKBACK), i + 1).join('\n')
    if (window.includes(MARKER)) return
    violations.push(`${file}:${i + 1}  ${line.trim()}`)
  })
}

if (violations.length === 0) {
  pass++
  console.log('PASS  no page-level max-w / maxWidth in src/screens (all clamps PageShell-based or ks-allow-width marked)')
} else {
  fail++
  console.log('FAIL  page-level width clamp(s) found in src/screens — convert to PageShell or mark inner clamps with a ks-allow-width comment:')
  for (const v of violations) console.log('      ' + v)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
