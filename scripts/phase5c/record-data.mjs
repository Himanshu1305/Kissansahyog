// Batch 9 Phase 5C — merge what 5C wrote on STAGING into docs/review/batch9/staging-test-data.json
// (ids, markers, times only; keep:false = KSTEST noise that cleanup may remove). Idempotent.
import { readFileSync, writeFileSync } from 'node:fs'
import * as C from './lib5c.mjs'
const FILE = 'docs/review/batch9/staging-test-data.json'
const data = JSON.parse(readFileSync(FILE, 'utf8'))
data.rows = (data.rows || []).filter((r) => r.phase !== 'Phase 5C')
const site = 'https://staging.kissansahyog.com (website, Playwright phone viewport)'
for (const r of C.loadResults('network-created').results) if (r.kind !== 'listing count check') data.rows.push(r)
data.rows.push({ phase: 'Phase 5C', keep: false, site, kind: 'join click log (join_clicks, src=ks5c-route-sweep)', table: 'join_clicks', marker: 'src=ks5c-route-sweep', time: '2026-10-15', note: 'written by visiting /join during the 5C.1 route sweep (Join.jsx logs every visit)' })
data.rows.push({ phase: 'Phase 5C', keep: true, site, kind: 'contact-click counter +1..2 and view counter on KEEP listing 76e13f41-f2eb-4565-998a-5244640329b7', listing_id: '76e13f41-f2eb-4565-998a-5244640329b7', note: 'counter side effect of the 5C.4 contact-reveal drop test (viewer = throw-away 5C-S1) and of the 5C.1/5C.3 visits; nothing to clean' })
const text = JSON.stringify(data, null, 2)
for (const v of C.L5.secretValues()) if (text.includes(v)) throw new Error('secret value would be written — aborting')
writeFileSync(FILE, text + '\n')
C.log(`staging-test-data.json: ${data.rows.filter((r) => r.phase === 'Phase 5C').length} Phase 5C rows`)
