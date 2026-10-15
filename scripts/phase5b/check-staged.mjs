// Refuses (exit 1) if the staged diff contains the test password, any persona/noise e-mail or mobile,
// the persona e-mail local-part prefix, or a staged file over 2 MB.
import { execSync } from 'node:child_process'
import * as L from './lib.mjs'
const diff = execSync('git diff --cached', { maxBuffer: 1 << 30 }).toString('utf8')
const bad = []
for (const v of L.secretValues()) if (diff.includes(v)) bad.push('secret value (redacted)')
const PFX = ["ks", "keep"].join("")
if (new RegExp(PFX, "i").test(diff)) bad.push("persona e-mail local-part prefix")
// account mobiles are 00000555NN / 00000556NN with NN < 90; 0000055690-99 are never-registered probe numbers
if (/0000055[56][0-8]\d/.test(diff)) bad.push('test mobile pattern')
const sizes = execSync('git diff --cached --name-only').toString().trim().split('\n').filter(Boolean)
for (const f of sizes) { try { const n = Number(execSync(`git cat-file -s :"${f}"`).toString()); if (n > 2 * 1024 * 1024) bad.push(`over 2 MB: ${f}`) } catch { /* deleted */ } }
if (bad.length) { console.log('STAGED CHECK FAILED:', [...new Set(bad)].join('; ')); process.exit(1) }
console.log(`staged check OK (${sizes.length} files)`)
