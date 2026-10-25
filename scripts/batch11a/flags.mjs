#!/usr/bin/env node
// 11A: read (and optionally reset to FALSE) the two auth flags on STAGING through the real get_auth_flags().
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch11a/flags.mjs [--reset-off]
// Prints only the flag values. Never sets a flag to TRUE.
import { createClient } from '@supabase/supabase-js'
import { runSql } from '../lib/mgmt-sql.mjs'
const url = process.env.VITE_SUPABASE_URL || ''
if (!url.includes('wzxtqbqlahyahsnoqqva')) { console.error('not staging'); process.exit(1) }
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const read = async () => { const r = await anon.rpc('get_auth_flags'); if (r.error) throw new Error(r.error.message); return r.data }
let f = await read()
console.log(`${new Date().toISOString()} staging get_auth_flags(): otp_required=${f.otp_required} session_enforced=${f.session_enforced}`)
if (process.argv.includes('--reset-off') && (f.otp_required !== false || f.session_enforced !== false)) {
  await runSql(`update public.site_settings set value = 'false'::jsonb, updated_at = now() where key in ('otp_required','session_enforced');`)
  f = await read()
  console.log(`${new Date().toISOString()} after reset: otp_required=${f.otp_required} session_enforced=${f.session_enforced}`)
}
const ok = f.otp_required === false && f.session_enforced === false
console.log(ok ? 'BOTH FLAGS FALSE' : 'FLAG(S) NOT FALSE')
process.exitCode = ok ? 0 : 2
