-- Kisan Sahyog — ensure both admin accounts have is_admin = true.
--
-- Paste into the Supabase dashboard SQL Editor (the Management API access token in
-- .env is expired, so `npm run db query` can't run this from the CLI). Idempotent.
--
-- Accounts: himanshu1305@gmail.com (founder) and admin@kissansahyog.com.

-- 1) Verify current state.
select email, phone, is_admin
from public.profiles
where email in ('himanshu1305@gmail.com', 'admin@kissansahyog.com');

-- 2) Grant is_admin to any existing profile row for these emails.
update public.profiles
set is_admin = true
where email in ('himanshu1305@gmail.com', 'admin@kissansahyog.com');

-- 3) admin@kissansahyog.com may have an auth.users row but no profile row yet.
--    Create it (linked by auth_uid) only if the auth user exists. Idempotent via
--    the unique(email) conflict target.
insert into public.profiles (
  full_name, email, auth_uid, auth_provider,
  preferred_language, disclaimer_accepted_at,
  is_admin, pincode, village_town
)
select
  'Kisan Sahyog Admin',
  'admin@kissansahyog.com',
  id,            -- auth.users.id for this email
  'email',
  'hi',
  now(),
  true,
  '470117',
  'Khurai'
from auth.users
where email = 'admin@kissansahyog.com'
on conflict (email) do update set is_admin = true;

-- 4) Re-verify.
select email, phone, is_admin
from public.profiles
where email in ('himanshu1305@gmail.com', 'admin@kissansahyog.com');
