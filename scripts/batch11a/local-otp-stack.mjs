#!/usr/bin/env node
// Batch 11A — local test stack: the built site + Pages Functions (`wrangler pages dev dist`) talking to the
// STAGING database, with the mock 2Factor server instead of the real provider.
//   node --env-file=.env scripts/batch11a/local-otp-stack.mjs [sitePort=8788] [mockPort=8799]
// Writes .dev.vars (git-ignored) for wrangler from the values already in .env — nothing is printed — with
// ENVIRONMENT=test, TWOFACTOR_BASE_URL=http://127.0.0.1:<mockPort>/API/V1 and a fake TWOFACTOR_API_KEY. Runs until
// stopped (Ctrl+C, SIGTERM or the file .ks-otp-stack.stop appearing); then stops both servers and deletes
// .dev.vars. Refuses unless .env points at staging.
import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync, rmSync, existsSync } from 'node:fs'

const SITE = Number(process.argv[2] || 8788)
const MOCK = Number(process.argv[3] || 8799)
const url = process.env.VITE_SUPABASE_URL || ''
if (!url.includes('wzxtqbqlahyahsnoqqva') || url.includes('eltmcznjcqiahqhjvpjg')) { console.error('local-otp-stack: not staging — refusing'); process.exit(2) }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('local-otp-stack: SUPABASE_SERVICE_ROLE_KEY missing in .env'); process.exit(2) }
const STOP = '.ks-otp-stack.stop'
rmSync(STOP, { force: true })

writeFileSync('.dev.vars', [
  'ENVIRONMENT=test',
  `TWOFACTOR_BASE_URL=http://127.0.0.1:${MOCK}/API/V1`,
  'TWOFACTOR_API_KEY=KSTEST-MOCK-2FACTOR-KEY',
  `SUPABASE_URL=${url}`,
  `SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  '',
].join('\n'))

const kids = []
const mock = spawn(process.execPath, ['scripts/batch11a/mock-2factor.mjs', String(MOCK)], { stdio: 'inherit' })
kids.push(mock)
const wr = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['wrangler', 'pages', 'dev', 'dist', '--port', String(SITE), '--ip', '127.0.0.1', '--log-level', 'warn'], { stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32' })
kids.push(wr)

let done = false
function stop(code = 0) {
  if (done) return
  done = true
  rmSync('.dev.vars', { force: true })
  rmSync(STOP, { force: true })
  for (const k of kids) {
    try {
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(k.pid), '/T', '/F'], { stdio: 'ignore' })
      else k.kill('SIGTERM')
    } catch { /* already gone */ }
  }
  console.log('local-otp-stack: stopped, .dev.vars removed')
  process.exit(code)
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
wr.on('exit', () => stop(1))
setInterval(() => { if (existsSync(STOP)) stop(0) }, 1000)
console.log(`local-otp-stack: site http://127.0.0.1:${SITE} (functions, staging DB), mock 2Factor http://127.0.0.1:${MOCK}`)
