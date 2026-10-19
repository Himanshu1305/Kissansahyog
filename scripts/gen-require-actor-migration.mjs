#!/usr/bin/env node
// Batch 11A — the require_actor() guard, generated from a LIVE catalog (staging only).
//
// Migration 0066 adds the guard INSIDE the database it runs on (section 7: a catalog-driven block), so
// production keeps its own function bodies. This script is the independent second implementation (its own
// tokenizer, in JavaScript) used to review and prove that block:
//
//   node --env-file=.env scripts/gen-require-actor-migration.mjs --out <generated.sql> --originals <originals.sql>
//       BEFORE 0066: writes the CREATE OR REPLACE statements the guard/gate produces from the live catalog
//       (<generated.sql>) and every original definition (<originals.sql>, the evidence copy for rollback).
//   node --env-file=.env scripts/gen-require-actor-migration.mjs --check [--report <file.md>]
//       AFTER 0066: for every definition 0066 saved in ks_fn_backup_0066, the live definition must be EXACTLY
//       this script's transform of the saved original (byte-for-byte apart from the one added line).
//
// Which functions: SECURITY DEFINER, schema public, first parameter p_actor_id uuid, not require_actor, not on
// scripts/require-actor-allowlist.json  →  plpgsql: `perform public.require_actor(p_actor_id);` as the first
// statement after the top-level BEGIN; SQL: `select public.require_actor(p_actor_id);` as the first statement.
// The gate (app_login, app_register_phone, app_signup): `if public.auth_flag('otp_required') then raise
// exception 'otp_required'; end if;` as the first statement.
import { readFileSync, writeFileSync } from 'node:fs'
import { runSql } from './lib/mgmt-sql.mjs'

export const GUARD_PLPGSQL = 'perform public.require_actor(p_actor_id);'
export const GUARD_SQL = 'select public.require_actor(p_actor_id);'
export const GATE_PLPGSQL = "if public.auth_flag('otp_required') then raise exception 'otp_required'; end if;"
export const GATE_FUNCTIONS = ['app_login', 'app_register_phone', 'app_signup']
const ALLOW = Object.keys(JSON.parse(readFileSync(new URL('./require-actor-allowlist.json', import.meta.url), 'utf8')).allow)

// Index just after the top-level BEGIN of a plpgsql body (skips comments, strings, "identifiers", $tag$…$tag$).
export function bodyBegin(src) {
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    if (c === '-' && src[i + 1] === '-') { const j = src.indexOf('\n', i); if (j < 0) return -1; i = j + 1 }
    else if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); if (j < 0) return -1; i = j + 2 }
    else if (c === "'") {
      i++
      for (;;) {
        if (i >= n) return -1
        if (src[i] === "'") { if (src[i + 1] === "'") i += 2; else { i++; break } } else i++
      }
    } else if (c === '"') { const j = src.indexOf('"', i + 1); if (j < 0) return -1; i = j + 1 }
    else if (c === '$' && /^\$[A-Za-z_]*\$/.test(src.slice(i))) {
      const tag = src.slice(i).match(/^\$[A-Za-z_]*\$/)[0]
      const j = src.indexOf(tag, i + tag.length); if (j < 0) return -1; i = j + tag.length
    } else if (/[A-Za-z_]/.test(c)) {
      const w = src.slice(i).match(/^[A-Za-z_][A-Za-z0-9_$]*/)[0]
      if (w.toLowerCase() === 'begin') return i + w.length
      i += w.length
    } else i++
  }
  return -1
}

// The new body for one function.
export function transformSrc(lang, src, plpgsqlLine, sqlLine) {
  if (lang === 'plpgsql') {
    const at = bodyBegin(src)
    if (at < 0) throw new Error('no top-level BEGIN')
    return src.slice(0, at) + '\n  ' + plpgsqlLine + src.slice(at)
  }
  if (lang === 'sql' && src) return sqlLine + '\n' + src
  throw new Error(`cannot change language ${lang}`)
}

// The new CREATE OR REPLACE statement from the original pg_get_functiondef text.
export function transformDef(def, lang, plpgsqlLine, sqlLine) {
  const open = def.indexOf('$function$')
  const close = def.lastIndexOf('$function$')
  if (open < 0 || close <= open) throw new Error('body is not $function$-quoted')
  const src = def.slice(open + 10, close)
  return def.slice(0, open + 10) + transformSrc(lang, src, plpgsqlLine, sqlLine) + def.slice(close)
}

const CATALOG = `
  select p.oid::regprocedure::text as sig, p.proname as name, l.lanname as lang, p.prosecdef as secdef,
         pg_get_functiondef(p.oid) as def,
         (p.proargnames[1] = 'p_actor_id' and p.proargtypes[0] = 'uuid'::regtype) as actor
    from pg_proc p join pg_language l on l.oid = p.prolang
   where p.pronamespace = 'public'::regnamespace
     and ((p.proargnames[1] = 'p_actor_id' and p.proargtypes[0] = 'uuid'::regtype)
          or p.proname in ('app_login', 'app_register_phone', 'app_signup'))
   order by 1`

function plan(rows) {
  const out = []
  for (const r of rows) {
    if (GATE_FUNCTIONS.includes(r.name)) out.push({ ...r, kind: 'gate', lines: [GATE_PLPGSQL, null] })
    else if (r.actor && r.secdef && r.name !== 'require_actor' && !ALLOW.includes(r.name)) out.push({ ...r, kind: 'guard', lines: [GUARD_PLPGSQL, GUARD_SQL] })
  }
  return out
}

async function generate(outFile, originalsFile) {
  const rows = await runSql(CATALOG)
  if (rows.some((r) => r.def.includes('require_actor(p_actor_id)') || r.def.includes("auth_flag('otp_required')"))) {
    throw new Error('the catalog already has the 0066 changes — run --check instead')
  }
  const todo = plan(rows)
  const header = (t) => `-- ${t}\n-- generated ${new Date().toISOString()} from the live STAGING catalog by scripts/gen-require-actor-migration.mjs\n\n`
  writeFileSync(originalsFile, header('Batch 11A — ORIGINAL definitions before 0066 (evidence copy; the rollback restores them from ks_fn_backup_0066)')
    + todo.map((r) => `-- ${r.kind}: ${r.sig}\n${r.def};\n`).join('\n'))
  writeFileSync(outFile, header('Batch 11A — what 0066 section 7 produces on this catalog')
    + todo.map((r) => `-- ${r.kind}: ${r.sig}\n${transformDef(r.def, r.lang, ...r.lines)};\n`).join('\n'))
  const by = (k) => todo.filter((r) => r.kind === k)
  console.log(`gate ${by('gate').length}, guard ${by('guard').length} (plpgsql ${by('guard').filter((r) => r.lang === 'plpgsql').length}, sql ${by('guard').filter((r) => r.lang === 'sql').length}), allow-listed ${rows.filter((r) => ALLOW.includes(r.name)).length}`)
}

async function check(reportFile) {
  const saved = await runSql('select fn, kind, definition from public.ks_fn_backup_0066 order by fn')
  const live = await runSql(CATALOG)
  const byId = new Map(live.map((r) => [r.sig, r]))
  const lines = []
  let ok = 0
  let bad = 0
  for (const s of saved) {
    const r = byId.get(s.fn)
    const lines2 = s.kind === 'gate' ? [GATE_PLPGSQL, null] : [GUARD_PLPGSQL, GUARD_SQL]
    let expected
    try { expected = transformDef(s.definition, r?.lang, ...lines2) } catch (e) { expected = `ERROR ${e.message}` }
    const same = r && r.def === expected
    same ? ok++ : bad++
    if (!same) lines.push(`- MISMATCH ${s.fn}`)
  }
  const missing = plan(live).filter((r) => !saved.some((s) => s.fn === r.sig))
  for (const m of missing) { bad++; lines.push(`- NOT CHANGED ${m.sig}`) }
  const summary = `byte-for-byte check: ${ok} identical to the JS transform of the saved original, ${bad} problem(s)`
  console.log(summary)
  lines.forEach((l) => console.log(l))
  if (reportFile) writeFileSync(reportFile, `# 0066 section 7 — byte-for-byte check (staging)\n\n${summary}\n\n${lines.join('\n')}\n`)
  if (bad) process.exit(1)
}

const args = process.argv.slice(2)
const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null }
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  if (args.includes('--check')) await check(val('--report'))
  else if (val('--out') && val('--originals')) await generate(val('--out'), val('--originals'))
  else { console.error('usage: --out <generated.sql> --originals <originals.sql> | --check [--report <md>]'); process.exit(2) }
}
