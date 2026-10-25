// Batch 9B — STAGING-ONLY SQL helper (Management API, same method as scripts/db.mjs, which must
// not be imported: it runs its CLI on import). Refuses anything that is not the staging project.
const STAGING_REF = 'wzxtqbqlahyahsnoqqva'
const PROD_REF = 'eltmcznjcqiahqhjvpjg'
const token = process.env.SUPABASE_ACCESS_TOKEN
const url = process.env.VITE_SUPABASE_URL || ''
const ref = url ? new URL(url).host.split('.')[0] : ''
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN missing (start with --env-file=.env)')
if (ref === PROD_REF || ref !== STAGING_REF) throw new Error('REFUSED: VITE_SUPABASE_URL is not the staging project')

export async function stagingSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${STAGING_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status}): ${text}`)
  return text ? JSON.parse(text) : null
}
