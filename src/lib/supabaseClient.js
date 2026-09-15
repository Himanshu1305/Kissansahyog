import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loud in dev; never silently point at an undefined backend.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  )
}

// This app uses a custom, trust-based phone-only auth (see src/lib/auth/authService.js),
// NOT Supabase Auth. So we disable session persistence / URL detection here — the anon
// client is used purely as an RLS-scoped data client. All writes rely on RLS policies
// that permit anon-role reads of active listings and lookups.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

// Phase 3: a SECOND client used ONLY for email+password auth (Supabase Auth).
// It persists the user's session so email-auth RPCs (app_signup_email /
// app_login_email) and password changes can identify the user via auth.uid().
// Regular data reads/writes keep using the anon `supabase` client above, so no
// request ever switches to the `authenticated` role and existing anon RLS is
// untouched. A distinct storageKey avoids clashing with the anon client.
export const supabaseAuth = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'ks_sb_auth',
  },
})
