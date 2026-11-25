// Batch 25 - the backup starter for the Morning post (migration 0078). Static checks of the SQL text; the behaviour was proven on a real Postgres
// (see docs/review/batch25/DECISIONS.md). No database is needed here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const up = readFileSync('supabase/migrations/0078_morning_post_backup.sql', 'utf8').replace(/\r\n/g, '\n')
const down = readFileSync('supabase/migrations/rollback/0078_morning_post_backup_rollback.sql', 'utf8').replace(/\r\n/g, '\n')

test('no secret value in the file; the token is read from Vault by name only', () => {
  assert.ok(!/ghp_|github_pat_/.test(up))
  assert.ok(/vault\.decrypted_secrets d where d\.name = 'github_dispatch_token'/.test(up))
})
test('the guard stops before anything is changed when the Vault secret is missing', () => {
  const guard = up.indexOf('Batch 25 stopped: the Vault secret github_dispatch_token is missing')
  assert.ok(guard > 0 && guard < up.indexOf('create or replace function'))
  assert.ok(guard < up.indexOf("cron.schedule('morning-post-backup-1'"))
})
test('three tries at 04:35, 05:35, 06:35 IST (cron is UTC: 23:05, 00:05, 01:05)', () => {
  assert.match(up, /cron\.schedule\('morning-post-backup-1', '5 23 \* \* \*'/)
  assert.match(up, /cron\.schedule\('morning-post-backup-2', '5 0 \* \* \*'/)
  assert.match(up, /cron\.schedule\('morning-post-backup-3', '5 1 \* \* \*'/)
})
test('complete means voice AND video for the IST date; the dispatch targets main with check_first true; errors never raise', () => {
  assert.match(up, /now\(\) at time zone 'Asia\/Kolkata'/)
  assert.match(up, /m\.voice_script is not null and m\.video_mp4_b64 is not null/)
  assert.match(up, /actions\/workflows\/morning-post\.yml\/dispatches/)
  assert.match(up, /"ref":"main","inputs":\{"check_first":"true"\}/)
  assert.match(up, /exception when others then\s+return 'error:'/)
})
test('the function is closed to the public; the rollback removes the three jobs and the function', () => {
  assert.match(up, /revoke all on function public\.morning_post_backup_kick\(boolean\) from public, anon, authenticated/)
  for (const n of [1, 2, 3]) assert.ok(down.includes(`morning-post-backup-${n}`))
  assert.match(down, /drop function if exists public\.morning_post_backup_kick\(boolean\)/)
})
test('it touches nothing else: no table change, no OTP switch', () => {
  assert.ok(!/alter table|create table|drop table|otp/i.test(up.replace(/--.*$/gm, '')))
})
