#!/usr/bin/env node
// ONE-TIME cleanup (Phase 4a/4c): fold every existing active kisan_mela row (including rows from the
// original pre-re-architecture pipeline) through the SAME shared matcher + merge path used ongoing.
// Also removes obvious test-pollution rows found live in Phase 0 (not real events). Reports every
// merge and a before/after active count with a safety check.
//   node --env-file=.env scripts/mela/dedup-cleanup.mjs           # dry run (report only)
//   node --env-file=.env scripts/mela/dedup-cleanup.mjs --apply   # actually merge + delete
import { createClient } from '@supabase/supabase-js'
import { normalizeState } from '../../src/content/states.js'
import { clusterByEvent, pickSurvivor, mergeIntoSurvivor, pairKey } from './dedup.mjs'

const APPLY = process.argv.includes('--apply')
const asOf = new Date().toISOString().slice(0, 10)

// Test-pollution rows identified in Phase 0 (not real melas): the "Test Lead" seed and the orphaned
// publish-anyway backend-test rows. Matched by these name markers, only among active rows.
const TEST_MARKERS = [/^test lead$/i, /BACKENDTEST/i, /^REJECTED CANDIDATE/i, /\(डेमो\)/]

async function main() {
  const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: before } = await db.from('kisan_mela').select('*').eq('is_active', true).eq('submitted_by_user', false)
  const beforeCount = (before || []).length
  console.log(`active non-user melas before: ${beforeCount}`)

  // 1) Remove test-pollution rows.
  const testRows = (before || []).filter((r) => TEST_MARKERS.some((re) => re.test(r.name_en || '') || re.test(r.name_hi || '')))
  console.log(`\ntest-pollution rows to remove: ${testRows.length}`)
  for (const r of testRows) console.log(`  - ${(r.name_en || r.name_hi)} [${r.state}] ${r.id}`)
  if (APPLY) for (const r of testRows) await db.from('kisan_mela').delete().eq('id', r.id)

  // 2) Dedup the remaining real active rows via the shared matcher + merge path.
  const real = (before || []).filter((r) => !testRows.includes(r))
  const { data: exRows } = await db.from('mela_merge_exclusions').select('pair_key')
  const exclusions = new Set((exRows || []).map((x) => x.pair_key))

  const clusters = clusterByEvent(real, { exclusions }).filter((c) => c.length > 1)
  console.log(`\nduplicate clusters found: ${clusters.length}`)
  let mergedAway = 0
  for (const cluster of clusters) {
    const survivor = pickSurvivor(cluster)
    const dups = cluster.filter((r) => r.id !== survivor.id)
    console.log(`\n  SURVIVOR: ${(survivor.name_en || survivor.name_hi)} [${survivor.state}] (${survivor.id.slice(0, 8)})`)
    for (const d of dups) console.log(`    merges: ${(d.name_en || d.name_hi)} [${d.state}] (${d.id.slice(0, 8)})`)
    if (APPLY) {
      const rec = await mergeIntoSurvivor({ db, survivor, dups, reason: 'one-time cleanup: ' + (require_reason(survivor, dups)), asOf, log: console.log })
      mergedAway += rec.merged.length
    } else {
      mergedAway += dups.length
    }
  }

  // 3) Safety check (4c).
  if (APPLY) {
    const { data: after } = await db.from('kisan_mela').select('id').eq('is_active', true).eq('submitted_by_user', false)
    const afterCount = (after || []).length
    const expected = beforeCount - testRows.length - mergedAway
    console.log(`\nactive non-user melas after: ${afterCount} (expected ${expected})`)
    console.log(afterCount === expected ? '✓ safety check passed: count dropped only by test-removals + merges' : '✗ SAFETY CHECK FAILED — investigate')
    // confirm no row vanished without a merged_into survivor
    const { data: orphans } = await db.from('kisan_mela').select('id,name_en,name_hi').eq('is_active', false).is('merged_into', null).eq('submitted_by_user', false)
    const unexpected = (orphans || []).filter((o) => !testRows.find((t) => t.id === o.id))
    console.log(`inactive non-user rows with no merged_into (excluding deleted test rows): ${unexpected.length} (lifecycle-expired rows are expected here)`)
  } else {
    console.log(`\nDRY RUN — would remove ${testRows.length} test rows and merge ${mergedAway} duplicate(s) into ${clusters.length} survivor(s). Re-run with --apply.`)
  }
}

function require_reason(survivor, dups) { return `same event as ${dups.length} other row(s)` }

main().catch((e) => { console.error('cleanup ERROR:', e?.message || e); process.exit(1) })
