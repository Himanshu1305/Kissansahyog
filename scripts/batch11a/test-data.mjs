#!/usr/bin/env node
// 11A: COUNT staging test rows — this batch's ('KSTEST 11A%' profiles and rows tied to them, test-number OTP rows)
// versus earlier batches' KSTEST rows (only counted, never touched). Read-only.
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch11a/test-data.mjs
import { runSql } from '../lib/mgmt-sql.mjs'
if (!(process.env.VITE_SUPABASE_URL || '').includes('wzxtqbqlahyahsnoqqva')) { console.error('not staging'); process.exit(1) }
const r = (await runSql(`select
  (select count(*) from public.profiles where full_name like 'KSTEST 11A%') profiles_11a,
  (select count(*) from public.listings l join public.profiles p on p.id = l.user_id where p.full_name like 'KSTEST 11A%') listings_11a,
  (select count(*) from public.app_sessions) sessions_all,
  (select count(*) from public.app_sessions s join public.profiles p on p.id = s.user_id where p.full_name like 'KSTEST%' or p.email like 'kstest-%') sessions_test_users,
  (select count(*) from public.otp_tickets) tickets_all,
  (select count(*) from public.otp_tickets where phone like '90000%' or phone like '91111%') tickets_test_numbers,
  (select count(*) from public.otp_requests) otp_requests_all,
  (select count(*) from public.otp_requests where twofactor_session like 'KSTEST%' or twofactor_session like 'MOCK%') otp_requests_test,
  (select count(*) from public.profiles where full_name like 'KSTEST%' and full_name not like 'KSTEST 11A%') profiles_kstest_earlier`))[0]
console.log(JSON.stringify(r))
