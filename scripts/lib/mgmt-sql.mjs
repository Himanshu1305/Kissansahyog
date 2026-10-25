// Batch 11A — run SQL on the project in VITE_SUPABASE_URL through the Supabase Management API
// (SUPABASE_ACCESS_TOKEN). Same call as scripts/db.mjs, importable. Refuses the production project.
const PROD_REF = 'eltmcznjcqiahqhjvpjg'
const STAGING_REF = 'wzxtqbqlahyahsnoqqva'

export function stagingRef() {
  const url = process.env.VITE_SUPABASE_URL || ''
  if (url.includes(PROD_REF) || !url.includes(STAGING_REF)) {
    console.error('mgmt-sql: VITE_SUPABASE_URL is not the staging project — refusing')
    process.exit(2)
  }
  return STAGING_REF
}

export async function runSql(sql) {
  const ref = stagingRef()
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN missing (start with --env-file=.env)')
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status}): ${text.slice(0, 600)}`)
  return text ? JSON.parse(text) : null
}
