// Batch 30 - register with e-mail, admins sign in with e-mail only, an admin can make another e-mail user an admin.
// The SQL itself was run against PGlite (docs/review/batch30/sql-test.mjs); these tests read the migration text and check the app code.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { rolldown } from 'rolldown'
import { adminStrings } from '../../src/lib/i18n/adminStrings.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { toAppError } from '../../src/lib/errors.js'

const src = (f) => readFileSync(f, 'utf8')
const MIG = 'supabase/migrations/0080_admin_by_email.sql'
const ROLL = 'supabase/migrations/rollback/0080_admin_by_email_rollback.sql'
const sql = src(MIG)
const code = sql.replace(/--.*$/gm, '')
const migrations = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql'))

test('migration 0080 is the next number, ASCII only, and has a rollback', () => {
  assert.equal(migrations.filter((f) => f.startsWith('0080')).length, 1)
  assert.ok(!migrations.some((f) => /^0081/.test(f)))
  for (const f of [MIG, ROLL]) assert.ok(!/[^\x00-\x7F]/.test(readFileSync(f, 'latin1')), `non-ASCII byte in ${f}`)
  for (const fn of ['app_register_email', 'admin_grant_admin', 'ks_admin_needs_email']) assert.match(src(ROLL), new RegExp(`drop function if exists public\\.${fn}`), fn)
  assert.match(src(ROLL), /alter table public\.app_sessions drop column if exists via/)
})

test('the admin guards need an e-mail session; a mobile session of an admin is refused', () => {
  assert.match(code, /create or replace function public\.require_admin_session/)
  assert.match(code, /v_via is distinct from 'email'/)
  assert.match(code, /raise exception 'admin_email_required'/)
  assert.match(code, /create or replace function public\.require_admin\(p_actor_id uuid\)[\s\S]*?perform public\.require_admin_session\(p_actor_id, false\)/)
  assert.match(code, /s\.via = 'email' and p\.auth_uid is not null/) // the Pages Function check
  assert.match(code, /update public\.app_sessions set via = 'email'/)
})

test('an admin must have an e-mail login: trigger, and the migration stops instead of locking an admin out', () => {
  assert.match(code, /new\.is_admin and new\.auth_uid is null/)
  assert.match(code, /before insert or update of is_admin, auth_uid on public\.profiles/)
  assert.match(sql, /STOP: these admins have no e-mail login/)
  assert.ok(sql.indexOf('STOP: these admins') < sql.indexOf('alter table public.app_sessions add column'), 'the check comes before any change')
})

test('granting: any admin makes an editor, only a super makes a super; self, blocked, already-admin and mobile-only people are refused', () => {
  const g = code.slice(code.indexOf('function public.admin_grant_admin'))
  assert.match(g, /require_admin_session\(p_actor, p_role = 'super'\)/)
  for (const e of ['cannot_change_self', 'already_admin', 'grant_blocked', 'admin_needs_email', 'not_found', 'invalid_input']) assert.match(g, new RegExp(`raise exception '${e}'`), e)
  assert.match(g, /log_admin_action\(p_actor, 'admin_grant'/)
  assert.match(code, /revoke all on function public\.admin_grant_admin\(uuid, uuid, text\) from public/)
})

test('e-mail registration: no mobile number, e-mail from the verified login, idempotent, disclaimer required', () => {
  const r = code.slice(code.indexOf('function public.app_register_email'), code.indexOf('function public.admin_grant_admin'))
  assert.match(r, /trim\(p_full_name\), null, v_email, v_uid, 'email'/)
  assert.match(r, /select \* into v_profile from public\.profiles where auth_uid = v_uid/)
  for (const e of ['name_required', 'disclaimer_not_accepted', 'invalid_email', 'email_exists', 'not_authorized']) assert.match(r, new RegExp(`raise exception '${e}'`), e)
})

test('People list: the e-mail comes back only for e-mail accounts; the old function is dropped first (a new column changes the return type)', () => {
  assert.match(code, /drop function if exists public\.admin_list_user_status\(uuid, text, text, int, int\)/)
  assert.match(code, /case when p\.auth_uid is null then null else p\.email end/)
})

test('app: e-mail registration page, route, links from sign-up and login, service and provider', () => {
  assert.match(src('src/App.jsx'), /path="\/signup-email"/)
  assert.match(src('src/screens/Signup.jsx'), /\/signup-email/)
  assert.match(src('src/screens/Login.jsx'), /signupEmailHref/)
  assert.match(src('src/lib/auth/AuthProvider.jsx'), /registerEmail/)
  const a = src('src/lib/auth/authService.js'); const fn = a.slice(a.indexOf('export async function registerEmail'), a.indexOf('function checkRegisterPhone'))
  assert.match(fn, /rpc\('app_register_email'/); assert.ok(!/phone/i.test(fn.replace(/\/\/.*$/gm, '')), 'no mobile number in the e-mail registration')
  assert.match(fn, /MIN_PASSWORD/); assert.match(fn, /isValidEmail/)
  assert.match(src('src/screens/SignupEmail.jsx'), /registerEmail\(/)
})

test('the people list offers "Make admin" only for accounts with an e-mail; the farmer sign-up is still name + mobile', () => {
  const p = src('src/screens/admin/tabs/UserStatusPanel.jsx')
  assert.match(p, /adminGrantAdmin\(actorId, grant\.user\.id, grant\.role\)/)
  assert.match(p, /!u\.admin_role && !u\.is_blocked && \(u\.email/)
  assert.match(p, /\{isSuper && <option value="super">super<\/option>\}/)
  assert.match(src('src/lib/admin/adminApi.js'), /rpc\('admin_grant_admin'/)
  assert.ok(!/EmailPasswordFields/.test(src('src/screens/Signup.jsx').replace(/\/\/.*$/gm, '')), 'Signup.jsx still has no e-mail/password block')
})

test('strings: every new key exists in Hindi (Devanagari) and English; the new database errors map to messages; admin_email_required offers a sign-in button', () => {
  const keys = ['signup_email_title', 'signup_email_help', 'signup_with_email', 'signup_with_mobile', 'adm_make_admin', 'adm_make_admin_title', 'adm_make_admin_help', 'adm_make_admin_done', 'adm_role_editor_help', 'adm_role_super_help', 'adm_us_no_email', 'err_admin_email', 'err_admin_needs_email', 'err_admin_already', 'err_admin_grant_blocked']
  for (const k of keys) { assert.ok(adminStrings[k]?.hi && adminStrings[k]?.en, k); assert.ok(strings[k], `merged: ${k}`); assert.match(adminStrings[k].hi, /[ऀ-ॿ]/, k) }
  for (const [c, k] of [['admin_email_required', 'err_admin_email'], ['admin_needs_email', 'err_admin_needs_email'], ['already_admin', 'err_admin_already'], ['grant_blocked', 'err_admin_grant_blocked']]) assert.equal(toAppError(new Error(c)).i18nKey, k, c)
  assert.match(src('src/screens/admin/common.jsx'), /code === 'admin_email_required'/)
})

test('the new screens and panels compile and resolve their imports', async () => {
  const dir = join(process.cwd(), 'node_modules', '.cache', 'email-30'); mkdirSync(dir, { recursive: true })
  for (const [input, out] of [['src/screens/SignupEmail.jsx', 'a.mjs'], ['src/screens/admin/tabs/UserStatusPanel.jsx', 'b.mjs'], ['src/screens/Login.jsx', 'c.mjs'], ['src/screens/Signup.jsx', 'd.mjs']]) {
    const b = await rolldown({ input, external: ['react', 'react/jsx-runtime', /^react-dom/, /^react-router/, /\.css$/], transform: { jsx: { runtime: 'automatic' }, define: { 'import.meta.env.MODE': '"test"', 'import.meta.env.DEV': 'false', 'import.meta.env': '{}' } }, logLevel: 'silent' })
    await b.write({ dir, format: 'esm', entryFileNames: out })
  }
})
