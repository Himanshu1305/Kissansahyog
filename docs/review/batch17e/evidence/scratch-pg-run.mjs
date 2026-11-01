// Rehearsal runner for migration 0074 in a SCRATCH local Postgres (never staging, never production).
// Usage: PGMOD=<path to a folder that has node_modules/pg> PGPORT=54329 node scratch-pg-run.mjs <good|break-grant|break-card|break-voice|break-message>
// It makes a fresh throw-away database, stubs the two things the real project has elsewhere (roles anon/authenticated and
// require_admin_session), applies 0070, 0073, 0074 (0074 twice, to prove it is idempotent), then runs the 0073 test and the 0074 test.
// "break-*" variants damage 0074 on purpose; the test MUST then fail.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(path.join(process.env.PGMOD, 'x.js'));
const { Client } = require('pg');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const mode = process.argv[2] || 'good';
const port = Number(process.env.PGPORT || 54329);
const dbName = 'scratch_17e';

const STUBS = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
-- stand-in for the real require_admin_session: nobody is an admin in the scratch database
create or replace function public.require_admin_session(p_actor uuid, p_x boolean) returns void language plpgsql as $f$
begin raise exception 'not admin' using errcode = 'P0001'; end $f$;
`;

let mig74 = read('supabase/migrations/0074_morning_video.sql');
if (mode === 'break-grant') mig74 += '\ngrant select on public.morning_posts to anon;\n';
if (mode === 'break-card') mig74 = mig74.replace('or m.card_png_b64 is distinct from excluded.card_png_b64', 'or false').replace('or m.card_png_b64 is distinct from excluded.card_png_b64', 'or false');
if (mode === 'break-message') mig74 = mig74.replace(/video_mp4_b64 = case when m\.message_text is distinct from excluded\.message_text\s+or /, 'video_mp4_b64 = case when ');
if (mode === 'break-voice') mig74 = mig74.replace('video_mp4_b64 = case when voice_mp3_b64 is distinct from p_mp3_b64 then null else video_mp4_b64 end', 'video_mp4_b64 = video_mp4_b64');
const changed = mig74 !== read('supabase/migrations/0074_morning_video.sql');
if (mode !== 'good' && !changed) throw new Error('break variant did not change the migration: ' + mode);

const admin = new Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres' });
await admin.connect();
await admin.query(`drop database if exists ${dbName} with (force)`);
await admin.query(`create database ${dbName}`);
await admin.end();

const c = new Client({ host: '127.0.0.1', port, user: 'postgres', database: dbName });
await c.connect();
const step = async (label, sql) => { await c.query(sql); console.log('ok   ' + label); };
const fail = (label, e) => { c.query('rollback').catch(() => {}); console.log('FAIL ' + label + ': ' + e.message); process.exitCode = 1; };

await step('stubs (roles, require_admin_session)', STUBS);
await step('apply 0070', read('supabase/migrations/0070_morning_posts.sql'));
await step('apply 0073', read('supabase/migrations/0073_morning_voice.sql'));
let t73 = false;
try { await c.query(read('docs/review/batch17a/TEST_0073_STAGING.sql')); console.log('ok   0073 test passes on 0073 alone'); t73 = true; } catch (e) { fail('0073 test on 0073 alone', e); }
await step('apply 0074 (1st time) [' + mode + ']', mig74);
await step('apply 0074 (2nd time, idempotent)', mig74);
try { await c.query(read('docs/review/batch17a/TEST_0073_STAGING.sql')); console.log('ok   0073 test still passes after 0074'); } catch (e) { fail('0073 test after 0074', e); await c.query('rollback').catch(() => {}); }
try {
  const res = await c.query(read('docs/review/batch17e/TEST_0074_STAGING.sql'));
  const out = res.flat().find((x) => x.rows && x.rows[0] && x.rows[0].result);
  console.log('ok   0074 test: ' + (out ? out.rows[0].result : '(no result row)'));
} catch (e) { fail('0074 test', e); await c.query('rollback').catch(() => {}); }
// the rollback file must also run cleanly, twice, and leave the 0073 test green
try {
  await c.query(read('supabase/migrations/rollback/0074_morning_video_rollback.sql'));
  await c.query(read('supabase/migrations/rollback/0074_morning_video_rollback.sql'));
  await c.query(read('docs/review/batch17a/TEST_0073_STAGING.sql'));
  console.log('ok   rollback runs twice and the 0073 test passes on the rolled-back database');
  await c.query(mig74);
  console.log('ok   0074 can be applied again after a rollback');
} catch (e) { fail('rollback', e); }
await c.end();
console.log(process.exitCode ? 'RESULT: FAILED' : 'RESULT: ALL STEPS PASSED');
