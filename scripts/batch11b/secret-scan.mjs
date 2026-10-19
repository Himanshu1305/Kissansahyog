// Scan only the reviewed batch diff and new text evidence. Print locations/rules, never matched values.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const paths = ['functions/api/otp/send.js','functions/api/otp/verify.js','src/lib/auth/authService.js','src/lib/errors.js','src/lib/i18n/strings.js','src/screens/Login.jsx','tests/unit/otp-functions.test.mjs','e2e/otp-11a.spec.js','scripts/batch11a/functions-integration.mjs','docs/review/batch11a/SHIP.md']
const diff=execFileSync('git',['diff','HEAD','--unified=0','--',...paths],{encoding:'utf8',stdio:['ignore','pipe','ignore']})
const added=diff.split('\n').filter(l=>l.startsWith('+')&&!l.startsWith('+++')).join('\n')
const sources=[['reviewed added lines',added]]
for(const dir of ['docs/review/batch11b','scripts/batch11b']) {
  const walk=d=>{for(const n of readdirSync(d)){const p=join(d,n);if(statSync(p).isDirectory())walk(p);else if(/\.(md|txt|json|mjs)$/.test(p)&&!p.endsWith('secret-scan.txt'))sources.push([p,readFileSync(p,'utf8')])}}
  walk(dir)
}
const secrets=Object.entries(process.env).filter(([k,v])=>/KEY|TOKEN|SECRET|PASSWORD/.test(k)&&v&&v.length>12).map(([,v])=>v)
const findings=[]
for(const [p,t] of sources){
  if(secrets.some(s=>t.includes(s)))findings.push(p+': environment credential')
  for(const [rule,re] of [['JWT',/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],['provider URL',/https?:\/\/[^\s'"`]*2factor\.in\//i],['full mobile number',/(?<![\w-])[6-9]\d{9}(?![\w-])/]])if(re.test(t))findings.push(p+': '+rule)
}
const result=`Secret scan: ${sources.length} text sources, ${findings.length} findings\n${findings.join('\n')}`.trim()+'\n'
writeFileSync('docs/review/batch11b/evidence/secret-scan.txt',result)
console.log(result)
process.exitCode=findings.length?1:0
