// Staging-only smoke check: verify a generated test number is absent BEFORE calling login.
// This path must reserve a decoy row, return 409 and never contact the SMS provider.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { randomInt } from 'node:crypto'
import { runSql, stagingRef } from '../lib/mgmt-sql.mjs'
stagingRef()
const svc=createClient(process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
let phone
for(let i=0;i<10;i++){
  const candidate='91111'+String(randomInt(100000)).padStart(5,'0')
  const r=await svc.from('profiles').select('id',{count:'exact',head:true}).eq('phone',candidate)
  if(r.error)throw Error('Could not establish that smoke-test number is unregistered')
  if(r.count===0){phone=candidate;break}
}
if(!phone)throw Error('No unused test number found')
const startedAt=(await runSql('select now() started_at'))[0].started_at
const lines=[]
try{
  const r=await fetch('https://staging.kissansahyog.com/api/otp/send',{method:'POST',headers:{origin:'https://staging.kissansahyog.com','content-type':'application/json'},body:JSON.stringify({phone,purpose:'login'})})
  const j=await r.json()
  if(r.status!==409 || j.error!=='phone_not_registered')throw Error(`Staging smoke returned unexpected HTTP ${r.status}`)
  const rows=await runSql(`select send_state, twofactor_session is null no_provider_session from public.otp_requests where phone_hash=public.ks_peppered_hash('phone:${phone}') and created_at >= '${startedAt}'`)
  if(rows.length!==1 || rows[0].send_state!=='decoy' || !rows[0].no_provider_session)throw Error('Staging smoke did not reserve the expected unsent request')
  lines.push('PASS: confirmed absent test number -> HTTP 409 phone_not_registered; reserved row unsent, no provider session')
  const html=await (await fetch('https://staging.kissansahyog.com/?batch11b='+Date.now())).text()
  const main=(readFileSync('dist/index.html','utf8').match(/\/assets\/index-[\w-]+\.js/)||[])[0]
  if(!main || !html.includes(main))throw Error('Staging is not serving the final main chunk')
  lines.push('PASS: staging serves the final build main chunk '+main)
}finally{
  await runSql(`delete from public.otp_requests where phone_hash=public.ks_peppered_hash('phone:${phone}') and created_at >= '${startedAt}'`)
  lines.push('Only the live smoke test request was removed; no profile was created')
  writeFileSync('docs/review/batch11b/evidence/live-check.txt',lines.join('\n')+'\n')
  console.log(lines.join('\n'))
}
