// Batch 17A Part C - static checks of migration 0073 (the SQL itself is exercised by docs/review/batch17a/TEST_0073_STAGING.sql on staging).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const FILES = ['supabase/migrations/0073_morning_voice.sql', 'supabase/migrations/rollback/0073_morning_voice_rollback.sql', 'docs/review/batch17a/PROD_MIGRATION_0073.sql', 'docs/review/batch17a/TEST_0073_STAGING.sql']
const M = read(FILES[0]).replace(/\r\n/g, '\n')

test('0073 files are pure ASCII', () => { for (const f of FILES) assert.ok(/^[\x00-\x7F]*$/.test(read(f)), f) })
test('the PROD copy equals the migration', () => assert.equal(read(FILES[2]).replace(/\r\n/g, '\n'), M))

test('0073 is additive and idempotent: if not exists / create or replace only, no drops, no auth switches', () => {
  assert.equal((M.match(/add column if not exists/g) || []).length, 3)
  assert.ok(!/\bdrop\b/i.test(M.replace(/^--.*$/gm, '')))
  assert.ok(!/otp_required|session_enforced/.test(M.replace(/^--.*$/gm, '')))
  for (const m of M.matchAll(/^create (or replace )?function/gm)) assert.ok(m[1], 'every function is create or replace')
})

test('0073 keeps the 0070 signatures and grants, and adds the new function', () => {
  const sigs = ['morning_post_voice_upsert(text, date, text, text, jsonb)', 'morning_post_upsert(text, date, text, text, text, text, text)', 'morning_post_context(text, date)', 'morning_post_get(uuid, date)', 'morning_post_history(uuid, int)']
  for (const s of sigs) { assert.ok(M.includes(`revoke all on function public.${s} from public;`), s); assert.ok(M.includes(`grant execute on function public.${s} to anon, authenticated;`), s) }
})

test('0073: voice_upsert answers every documented error; the secret check comes first', () => {
  const body = M.slice(M.indexOf('function public.morning_post_voice_upsert'), M.indexOf('function public.morning_post_upsert'))
  for (const e of ['forbidden', 'bad_date', 'bad_input', 'not_found', 'already_posted', 'too_large']) assert.ok(body.includes(`'${e}'`), e)
  assert.ok(body.indexOf('morning_post_secret_ok') < body.indexOf("'bad_date'"))
  assert.ok(body.includes('> 2000') && body.includes('> 1400000'))
})

test('0073: a changed message clears the voice (is distinct from), an unchanged one keeps it', () => {
  const up = M.slice(M.indexOf('function public.morning_post_upsert'), M.indexOf('function public.morning_post_context'))
  for (const c of ['voice_script', 'voice_mp3_b64', 'voice_meta']) assert.ok(new RegExp(`${c} = case when m\\.message_text is distinct from excluded\\.message_text then null else m\\.${c} end`).test(up), c)
  assert.ok(up.indexOf('voice_script =') < up.indexOf('message_text = excluded.message_text'), 'voice is decided against the OLD message')
})

test('0073: context has the old keys plus today.voice_sha256; history never returns the audio; get does', () => {
  const ctx = M.slice(M.indexOf('function public.morning_post_context'), M.indexOf('function public.morning_post_get'))
  assert.ok(ctx.includes("'yesterday'") && ctx.includes("'today'") && ctx.includes('voice_sha256') && ctx.includes("sha256(convert_to(m.voice_script, 'utf8'))"))
  const hist = M.slice(M.indexOf('function public.morning_post_history'), M.indexOf('-- 6. grants'))
  assert.ok(hist.includes('voice_script') && !hist.includes('voice_mp3_b64') && hist.includes('require_admin_session'))
  const get = M.slice(M.indexOf('function public.morning_post_get'), M.indexOf('function public.morning_post_history'))
  assert.ok(get.includes('voice_mp3_b64') && get.includes('voice_meta') && get.includes('require_admin_session'))
})

test('rollback restores the four 0070 functions and drops the columns', () => {
  const R = read(FILES[1])
  for (const f of ['morning_post_upsert', 'morning_post_context', 'morning_post_get', 'morning_post_history']) assert.ok(R.includes(`create or replace function public.${f}(`), f)
  assert.ok(R.includes('drop function if exists public.morning_post_voice_upsert') && (R.match(/drop column if exists/g) || []).length === 3)
  assert.ok(!R.includes('voice_script') || !/'voice_script'/.test(R), 'restored bodies are the 0070 ones')
})
