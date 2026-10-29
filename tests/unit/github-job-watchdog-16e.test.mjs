// Batch 16E patch: the GitHub job refreshes weather and (production) checks price freshness. It makes no mandi calls.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { runWatchdogJob, freshnessCheck } from '../../scripts/lib/mandi-daily.mjs'
import { daysBetween, redact } from '../../scripts/lib/mandi-feed.mjs'

const TODAY = '2026-10-29'
const KEY = 'SECRETSERVICEKEY1234567890'
const run = (target, newest, extra = {}) => {
  const order = [], logs = []
  return runWatchdogJob({
    target, log: (m) => logs.push(m),
    weather: async () => { order.push('weather') },
    freshness: async () => { order.push('freshness'); return freshnessCheck(newest, TODAY, daysBetween) },
    ...extra,
  }).then((j) => ({ j, order, logs }))
}

test('production, fresh price: weather then freshness, green, summary line printed', async () => {
  const { j, order } = await run('production', '2026-10-28')
  assert.deepEqual(order, ['weather', 'freshness']); assert.deepEqual(j.order, order)
  assert.equal(j.code, 0)
  assert.equal(j.freshness.text, 'newest stored price: 2026-10-28 (1 days old)')
})

test('production: exactly 3 days old is green, 4 days old is red', async () => {
  assert.equal((await run('production', '2026-10-26')).j.code, 0)
  const stale = await run('production', '2026-10-25')
  assert.equal(stale.j.code, 1)
  assert.match(stale.j.freshness.text, /^newest stored price: 2026-10-25 \(4 days old\)/)
})

test('production, empty table: red, summary still starts with "newest stored price"', async () => {
  const { j } = await run('production', null)
  assert.equal(j.code, 1); assert.match(j.freshness.text, /^newest stored price: none/)
})

test('production, freshness query failing: red and says so', async () => {
  const { j } = await run('production', '2026-10-28', { freshness: async () => { throw new Error('db down') } })
  assert.equal(j.code, 1); assert.match(j.freshness.text, /^newest stored price: unknown/)
})

test('staging: weather only, freshness never called, green even when prices are stale', async () => {
  const { j, order } = await run('staging', '2026-01-01')
  assert.deepEqual(order, ['weather']); assert.equal(j.code, 0); assert.equal(j.freshness, null)
})

test('weather crash is red on both targets and production still reports freshness', async () => {
  for (const target of ['production', 'staging']) {
    const { j } = await run(target, '2026-10-28', { weather: async () => { throw new Error('boom') } })
    assert.equal(j.code, 1, target)
  }
  const p = await run('production', '2026-10-28', { weather: async () => { throw new Error('boom') } })
  assert.deepEqual(p.j.order, ['weather', 'freshness'])
})

test('dry run: nothing is called, exit 0', async () => {
  const called = []
  const j = await runWatchdogJob({ target: 'production', dryRun: true, weather: async () => called.push('w'), freshness: async () => called.push('f') })
  assert.deepEqual(called, []); assert.equal(j.code, 0)
})

test('no secret in the logs', async () => {
  const { logs } = await run('production', '2026-10-28', { weather: async () => { throw new Error(`failed with ${KEY}`) } })
  const text = logs.join('\n')
  assert.equal(redact(text, [KEY]).includes(KEY), false)
})

test('script: no mandi fetch/write code, no data.gov.in, no mandi calls made', () => {
  const src = readFileSync('scripts/refresh-data.mjs', 'utf8')
  assert.doesNotMatch(src, /data\.gov\.in\/resource|api\.data\.gov\.in|mandi-api\.onrender|DATA_GOV_IN_API_KEY|upsertPrices|from\('mandi_prices'\)\.(upsert|insert)/)
  assert.match(src, /from\('mandi_prices'\)\.select\('price_date'\)/)   // the only mandi_prices access is the read-only freshness query
  assert.equal((src.match(/mandi_prices/g) || []).length, 1)
})

test('script --dry-run runs offline, exits 0, never reads a secret', () => {
  for (const target of ['production', 'staging']) {
    const r = spawnSync(process.execPath, ['scripts/refresh-data.mjs', '--dry-run', '--target', target], { env: { PATH: process.env.PATH }, encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /dry run/)
  }
  const bad = spawnSync(process.execPath, ['scripts/refresh-data.mjs', '--dry-run', '--target', 'prod'], { env: { PATH: process.env.PATH }, encoding: 'utf8' })
  assert.equal(bad.status, 1)
})

test('workflow: no data.gov.in step or secret, passes --target per matrix entry', () => {
  const y = readFileSync('.github/workflows/refresh-mandi-prices.yml', 'utf8').split('
').filter((l) => !l.trim().startsWith('#')).join('
')
  assert.doesNotMatch(y, /data\.gov\.in|DATA_GOV_IN_API_KEY|MANDI_DAYS/)
  assert.match(y, /--target \$\{\{ matrix\.target \}\}/)
})
