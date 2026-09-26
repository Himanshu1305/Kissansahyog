import { readFileSync } from 'node:fs'
const token = process.env.SUPABASE_ACCESS_TOKEN, url = process.env.VITE_SUPABASE_URL
const ref = new URL(url).host.split('.')[0]
const API = `https://api.supabase.com/v1/projects/${ref}/database/query`
const sql = readFileSync(new URL('../supabase/migrations/0032_legal_agroforestry_availability_profile.sql', import.meta.url), 'utf8')
const res = await fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }) })
const text = await res.text()
if (!res.ok) { console.error(`FAILED HTTP ${res.status}: ${text}`); process.exit(1) }
console.log('0032 applied to live DB (idempotent). rows:', text ? JSON.parse(text).length ?? 0 : 0)
