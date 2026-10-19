#!/usr/bin/env node
// Batch 11A — catalog test (STAGING): fails if any actor-based function is neither guarded nor allow-listed,
// and checks the privileges of everything migration 0066 added.
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch11a/catalog-test.mjs [out.md]
// Actor-based = schema public, first parameter p_actor_id uuid (SECURITY DEFINER or not, any language).
// Guarded = the FIRST statement is the guard line (plpgsql: right after the top-level BEGIN; SQL: first).
import { readFileSync, writeFileSync } from 'node:fs'
import { runSql } from '../lib/mgmt-sql.mjs'
import { bodyBegin, GUARD_PLPGSQL, GUARD_SQL, GATE_PLPGSQL, GATE_FUNCTIONS } from '../gen-require-actor-migration.mjs'

const out = process.argv[2]
const allowFile = JSON.parse(readFileSync(new URL('../require-actor-allowlist.json', import.meta.url), 'utf8')).allow
const lines = []
let pass = 0
let fail = 0
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; const s = `- ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`; lines.push(s); console.log(s) }

const fns = await runSql(`
  select p.proname name, p.oid::regprocedure::text sig, l.lanname lang, p.prosecdef secdef, p.prosrc src
    from pg_proc p join pg_language l on l.oid = p.prolang
   where p.pronamespace = 'public'::regnamespace and p.proargnames[1] = 'p_actor_id' and p.proargtypes[0] = 'uuid'::regtype
   order by 1`)
const firstIsGuard = (f) => {
  if (f.lang === 'sql') return f.src.startsWith(GUARD_SQL + '\n')
  if (f.lang === 'plpgsql') { const at = bodyBegin(f.src); return at > 0 && f.src.slice(at).startsWith('\n  ' + GUARD_PLPGSQL) }
  return false
}
const unguarded = fns.filter((f) => f.name !== 'require_actor' && !allowFile[f.name] && !(f.secdef && firstIsGuard(f)))
check(`every actor-based function is guarded or allow-listed (${fns.length} actor functions)`, unguarded.length === 0, unguarded.map((f) => f.sig).join(', '))
check('allow-listed functions are not guarded (they must answer, not raise)', fns.filter((f) => allowFile[f.name] && firstIsGuard(f)).length === 0)
const guarded = fns.filter((f) => firstIsGuard(f))
check('guarded count', guarded.length === fns.length - 1 - Object.keys(allowFile).length, `${guarded.length} guarded: ${guarded.filter((f) => f.lang === 'plpgsql').length} plpgsql + ${guarded.filter((f) => f.lang === 'sql').length} sql`)

const dbAllow = await runSql('select fn, reason from public.ks_require_actor_allow order by fn')
check('allow-list file == ks_require_actor_allow table', JSON.stringify(dbAllow.map((r) => [r.fn, r.reason])) === JSON.stringify(Object.entries(allowFile).sort()))

const gates = await runSql(`select proname name, prosrc src from pg_proc where pronamespace = 'public'::regnamespace and proname = any(array['${GATE_FUNCTIONS.join("','")}'])`)
check('otp_required gate is the first statement of app_login, app_register_phone, app_signup',
  gates.length === 3 && gates.every((g) => { const at = bodyBegin(g.src); return at > 0 && g.src.slice(at).startsWith('\n  ' + GATE_PLPGSQL) }))

const tables = ['otp_requests', 'otp_tickets', 'app_sessions', 'auth_private', 'ks_fn_backup_0066', 'ks_require_actor_allow']
const t = await runSql(`
  select c.relname, c.relrowsecurity rls,
         (select count(*) from pg_policy p where p.polrelid = c.oid) policies,
         has_table_privilege('anon', c.oid, 'select,insert,update,delete') anon_any,
         has_table_privilege('authenticated', c.oid, 'select,insert,update,delete') auth_any
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname = any(array['${tables.join("','")}'])`)
check('new tables exist', t.length === tables.length, t.map((r) => r.relname).join(', '))
check('new tables: RLS on, no policies, no anon/authenticated privileges', t.every((r) => r.rls && Number(r.policies) === 0 && !r.anon_any && !r.auth_any))

const g = await runSql(`
  select p.oid::regprocedure::text sig,
         has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') auth,
         has_function_privilege('service_role', p.oid, 'execute') svc, p.prosecdef secdef,
         coalesce(array_to_string(p.proconfig, ','), '') cfg
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any(array[
      'get_auth_flags','app_login_otp','app_register_phone_otp','app_issue_session','app_logout_session','app_session_valid',
      'require_actor','otp_rate_check','otp_record_send','otp_record_verify','otp_issue_ticket','auth_flag','ks_create_session',
      'ks_take_ticket','ks_peppered_hash','ks_token_hash','ks_new_token','ks_request_header','ks_presented_session_hash'])`)
const grant = Object.fromEntries(g.map((r) => [r.sig.replace(/\(.*$/, ''), r]))
const expect = {
  get_auth_flags: [true, true, true], app_login_otp: [true, true, null], app_register_phone_otp: [true, true, null],
  app_issue_session: [false, true, null], app_logout_session: [true, true, null], app_session_valid: [true, true, null],
  require_actor: [false, false, null], otp_rate_check: [false, false, true], otp_record_send: [false, false, true],
  otp_record_verify: [false, false, true], otp_issue_ticket: [false, false, true], auth_flag: [false, false, null],
  ks_create_session: [false, false, null], ks_take_ticket: [false, false, null], ks_peppered_hash: [false, false, null],
  ks_token_hash: [false, false, null], ks_new_token: [false, false, null], ks_request_header: [false, false, null],
  ks_presented_session_hash: [false, false, null],
}
const wrong = Object.entries(expect).filter(([n, [a, au, s]]) => !grant[n] || grant[n].anon !== a || grant[n].auth !== au || (s !== null && grant[n].svc !== s))
check('execute grants of the new functions (anon / authenticated / service_role)', wrong.length === 0, wrong.map(([n]) => n).join(', '))
const secdefNoPath = g.filter((r) => r.secdef && !/search_path=public, pg_temp|search_path=public,pg_temp/.test(r.cfg.replace(/"/g, '')))
check('every new SECURITY DEFINER function pins search_path = public, pg_temp', secdefNoPath.length === 0, secdefNoPath.map((r) => r.sig).join(', '))

const summary = `catalog test: ${pass} passed, ${fail} failed`
console.log(summary)
if (out) writeFileSync(out, `# Batch 11A — catalog test (staging)\n\n${summary}\n\n${lines.join('\n')}\n`)
process.exit(fail ? 1 : 0)
