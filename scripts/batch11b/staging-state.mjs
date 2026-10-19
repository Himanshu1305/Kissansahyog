// Staging-only verification and flag restoration for Batch 11B. Never prints credentials or phones.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { runSql, stagingRef } from '../lib/mgmt-sql.mjs'
stagingRef()
const mode = process.argv[2]
if (mode === 'prod-readonly') {
  const file=join(process.env.APPDATA,'xdg.config/.wrangler/config/default.toml')
  const token=process.env.CLOUDFLARE_API_TOKEN || readFileSync(file,'utf8').match(/^oauth_token = "([^"]+)"/m)?.[1]
  if(!token) throw Error('No Cloudflare credentials')
  const r=await fetch('https://api.cloudflare.com/client/v4/accounts/9ad1ef464c60a7db797b4bb097d545e5/pages/projects/kissansahyog-prod',{headers:{Authorization:'Bearer '+token}})
  const j=await r.json()
  if(!j.success) throw Error('Cloudflare project read failed')
  const d=j.result.canonical_deployment
  const s=JSON.stringify({deployment_id:d.id,commit:d.deployment_trigger.metadata.commit_hash,is_batch10c:d.id==='7f5dc56a-9d1c-4bd2-8bde-a4512a96be20'},null,2)+'\n'
  writeFileSync('docs/review/batch11b/evidence/prod-readonly.json',s);console.log(s)
} else if (mode === 'cleanup-first-http') {
  // Exact profile owned by the first HTTP run; host clock was ahead of the DB clock.
  await runSql(`delete from public.otp_requests where phone_hash in (select public.ks_peppered_hash('phone:' || phone) from public.profiles where id='eefe1c59-d54d-4cc0-bf2e-aafdd3def10d' and full_name='KSTEST 11B fn') and created_at >= '2026-10-19T18:38:37Z';
    delete from public.otp_tickets where phone in (select phone from public.profiles where id='eefe1c59-d54d-4cc0-bf2e-aafdd3def10d' and full_name='KSTEST 11B fn') and created_at >= '2026-10-19T18:38:37Z';
    delete from public.profiles where id='eefe1c59-d54d-4cc0-bf2e-aafdd3def10d' and full_name='KSTEST 11B fn';`)
  console.log('First HTTP run leftover cleaned by exact owned profile ID')
} else if (mode === 'inspect') {
  console.log(JSON.stringify(await runSql(`select now() db_now,
    (select json_agg(json_build_object('id',id,'created_at',created_at)) from public.profiles where full_name in ('KSTEST 11B fn','KSTEST 11B admin')) profiles`)))
} else if (mode === 'baseline' || mode === 'check') {
  const rows = await runSql(`select id from public.profiles where full_name like 'KSTEST%' and full_name not in ('KSTEST 11B fn','KSTEST 11B admin') order by id`)
  const file = '.wrangler/batch11b-earlier-profiles.json'
  if (mode === 'baseline') { mkdirSync('.wrangler', {recursive:true}); writeFileSync(file, JSON.stringify(rows)); console.log(`Earlier KSTEST profiles recorded: ${rows.length}`) }
  else {
    const ids = new Set(rows.map(r => r.id))
    const before = JSON.parse(readFileSync(file, 'utf8'))
    const missing = before.filter(r => !ids.has(r.id))
    console.log(`Earlier KSTEST profiles preserved: ${before.length-missing.length}/${before.length}`)
    if (missing.length) process.exitCode=1
  }
} else if (mode === 'final-flags') {
  await runSql(`update public.site_settings set value = 'true'::jsonb, updated_at=now() where key='otp_required'; update public.site_settings set value = 'false'::jsonb, updated_at=now() where key='session_enforced';`)
  const anon=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false}})
  const r=await anon.rpc('get_auth_flags')
  if(r.error || r.data?.otp_required!==true || r.data?.session_enforced!==false) throw Error('Final flag verification failed')
  const s=`${new Date().toISOString()} staging get_auth_flags(): ${JSON.stringify(r.data)}\n`
  writeFileSync('docs/review/batch11b/evidence/final-flags.txt',s);console.log(s)
} else throw Error('Unknown mode')
