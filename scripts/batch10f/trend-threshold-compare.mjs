import { readFileSync } from 'node:fs'
const ROOT='C:/Users/usdvi/projects/Kissansahyog/'
const { windowStart } = await import('file:///'+ROOT+'src/lib/mandi/mspWindow.js')
const s = JSON.parse(readFileSync(ROOT+'docs/review/batch10f/evidence/staging-mandi-90d.json'))
const med=(a)=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:Math.round((s[m-1]+s[m])/2)}
const today=new Date('2026-10-19T06:00:00Z')
function run(crop,d,mode,thr){
  const from=windowStart(d,today); const w=s.rows.filter(r=>r[0]===crop&&r[2]>=from)
  const by={}; for(const [,m,dt,p] of w)(by[dt]||={})[m]=p
  const dates=Object.keys(by).sort(); const cnt={}; for(const dt of dates) for(const m in by[dt]) cnt[m]=(cnt[m]||0)+1
  const basket=Object.keys(cnt).filter(m=>cnt[m]>=0.6*dates.length)
  const useAll = mode==='old' || basket.length<3
  let prev=null, err=0, steps=0, pts=0, worst=0
  for(const dt of dates){ const rep=(useAll?Object.keys(by[dt]):basket.filter(m=>m in by[dt])); if(!useAll && rep.length<Math.ceil(thr*basket.length)) continue
   const v=med(rep.map(m=>by[dt][m])); pts++
   if(prev){ const pair=Object.keys(by[dt]).filter(m=>m in by[prev.dt]); if(pair.length){ const ch=med(pair.map(m=>by[dt][m]-by[prev.dt][m])); const e=Math.abs((v-prev.v)-ch); err+=e; steps++; worst=Math.max(worst,e)}}
   prev={dt,v}}
  return `${String(pts).padStart(2)}pts err ${(err/Math.max(1,steps)).toFixed(0).padStart(4)} worst ${String(worst).padStart(4)}`+(useAll&&mode!=='old'?' FEW':'')
}
for (const crop of [...new Set(s.rows.map(r=>r[0]))]) for (const d of [30,90]) {
  const nm=new Set(s.rows.filter(r=>r[0]===crop).map(r=>r[1])).size
  console.log(`${crop.padEnd(18)} ${String(d).padStart(2)}d mandis ${String(nm).padStart(2)} | old ${run(crop,d,'old')} | b.50 ${run(crop,d,'b',.5)} | b.67 ${run(crop,d,'b',2/3)} | b.75 ${run(crop,d,'b',.75)}`)
}
