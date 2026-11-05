// Batch 17F - the ship script's prerender rule (scripts/lib/prerender-rule.sh): N from "Prerendering N routes", floor MIN_ROUTES.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'prr-'))
function run(text, floor = 270) {
  const f = join(dir, `l${Math.random().toString(36).slice(2)}.log`).split('\\').join('/')
  writeFileSync(f, text)
  const r = spawnSync('bash', ['-c', `. scripts/lib/prerender-rule.sh; prerender_check "${f}" ${floor}`], { encoding: 'utf8' })
  return { code: r.status, out: r.stdout.trim() }
}
test('270/270, 1 fallback, Failed: 0 passes', () => {
  assert.equal(run('Prerendering 270 routes…\nPrerendered 270/270 (1 via fallback). Failed: 0\n').code, 0)
})
test('269/269 fails: below the floor, message names N and the floor', () => {
  const r = run('Prerendering 269 routes…\nPrerendered 269/269 (1 via fallback). Failed: 0\n')
  assert.equal(r.code, 1); assert.match(r.out, /N=269 floor=270.*below the floor/)
})
test('270/270 with Failed: 1 fails', () => {
  const r = run('Prerendering 270 routes…\nPrerendered 270/270 (1 via fallback). Failed: 1\n')
  assert.equal(r.code, 1); assert.match(r.out, /Failed: 0/)
})
test('larger N passes; two fallbacks fail; partial fails', () => {
  assert.equal(run('Prerendering 275 routes…\nPrerendered 275/275 (1 via fallback). Failed: 0\n').code, 0)
  assert.equal(run('Prerendering 270 routes…\nPrerendered 270/270 (2 via fallback). Failed: 0\n').code, 1)
  assert.equal(run('Prerendering 270 routes…\nPrerendered 269/270 (1 via fallback). Failed: 1\n').code, 1)
})
