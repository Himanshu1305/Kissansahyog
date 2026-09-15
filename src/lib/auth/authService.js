// ============================================================================
// AUTH SERVICE — PHASE 2 SWAP POINT
// ----------------------------------------------------------------------------
// This module is the SINGLE place that knows "how do we identify/verify a
// user". The rest of the app only imports the functions below; it never talks
// to the auth backend directly. To swap the MVP trust-based phone login for
// real Supabase Phone OTP later, change ONLY this file:
//
//   MVP (now):  signup()/login() call the app_signup / app_login RPCs and store
//               the returned profile in localStorage. No verification.
//   FUTURE:     PHONE auth still needs real OTP — replace signup()/login() with
//               supabase.auth.signInWithOtp({phone}) + verifyOtp(). (Phase 3 added
//               real EMAIL auth below via Supabase Auth; phone remains trust-based.)
//
// EMAIL auth (Phase 3): signupEmail()/loginEmail() use Supabase Auth on a
// dedicated session-bearing client (supabaseAuth). The returned profile is stored
// in the same localStorage session so getCurrentUser() and every screen keep
// working unchanged. Both phone and email flows live in THIS module by design.
// ============================================================================

import { supabase, supabaseAuth } from '../supabaseClient'
import { AppError, toAppError } from '../errors'

const SESSION_KEY = 'ks_session_v1'

// ---- client-side validation (mirrors server RPC checks; fails fast) ----
export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}
export function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(normalizePhone(phone))
}
export function isValidPincode(pincode) {
  return /^[0-9]{6}$/.test(String(pincode || '').trim())
}
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}
export const MIN_PASSWORD = 8

// ---- session persistence (localStorage; the "custom session" per MVP spec) ----
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function storeSession(profile) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
  } catch {
    /* ignore */
  }
  return profile
}
export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  // Also end any Supabase Auth session (email users); harmless for phone users.
  supabaseAuth.auth.signOut().catch(() => {})
}

// ---- signup ----
export async function signup({ full_name, phone, village_town, pincode, language, disclaimer_accepted }) {
  if (!full_name || !full_name.trim()) throw new AppError('name_required')
  if (!isValidPhone(phone)) throw new AppError('invalid_phone')
  if (!isValidPincode(pincode)) throw new AppError('invalid_pincode')
  if (!disclaimer_accepted) throw new AppError('disclaimer_not_accepted')

  const { data, error } = await supabase.rpc('app_signup', {
    p_full_name: full_name.trim(),
    p_phone: normalizePhone(phone),
    p_village_town: village_town ?? null,
    p_pincode: String(pincode).trim(),
    p_language: language || 'hi',
    p_disclaimer_accepted: true,
  })
  if (error) throw toAppError(error)
  return storeSession(data)
}

// ---- login (trust-based: phone match, no verification) ----
export async function login(phone) {
  if (!isValidPhone(phone)) throw new AppError('invalid_phone')
  const { data, error } = await supabase.rpc('app_login', { p_phone: normalizePhone(phone) })
  if (error) throw toAppError(error)
  return storeSession(data)
}

// Update the locally cached profile (e.g. after a language change) without a
// re-login. Keeps localStorage the source of truth for the current session.
export function updateStoredUser(patch) {
  const current = getCurrentUser()
  if (!current) return null
  return storeSession({ ...current, ...patch })
}

// ---- EMAIL auth (Phase 3, via Supabase Auth on the supabaseAuth client) ----

// Map a Supabase Auth error to one of our stable codes.
function mapAuthError(error) {
  const m = String(error?.message || '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) return new AppError('email_exists')
  if (m.includes('invalid login') || m.includes('invalid credentials')) return new AppError('wrong_password')
  if (m.includes('password')) return new AppError('password_too_short')
  if (m.includes('email')) return new AppError('invalid_email')
  return new AppError('unknown')
}

export async function signupEmail({ full_name, email, password, village_town, pincode, language, disclaimer_accepted }) {
  if (!full_name || !full_name.trim()) throw new AppError('name_required')
  if (!isValidEmail(email)) throw new AppError('invalid_email')
  if (!password || String(password).length < MIN_PASSWORD) throw new AppError('password_too_short')
  if (!isValidPincode(pincode)) throw new AppError('invalid_pincode')
  if (!disclaimer_accepted) throw new AppError('disclaimer_not_accepted')

  const { data, error } = await supabaseAuth.auth.signUp({
    email: String(email).trim(),
    password: String(password),
  })
  if (error) throw mapAuthError(error)
  // Email confirmation is disabled (autoconfirm) so a session should exist; if a
  // provider returns none, establish one before the SECURITY DEFINER RPC call.
  if (!data.session) {
    const { error: signInErr } = await supabaseAuth.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password),
    })
    if (signInErr) throw mapAuthError(signInErr)
  }

  const { data: profile, error: rpcErr } = await supabaseAuth.rpc('app_signup_email', {
    p_full_name: full_name.trim(),
    p_village_town: village_town ?? null,
    p_pincode: String(pincode).trim(),
    p_language: language || 'hi',
  })
  if (rpcErr) throw toAppError(rpcErr)
  return storeSession(profile)
}

export async function loginEmail(email, password) {
  if (!isValidEmail(email)) throw new AppError('invalid_email')
  if (!password) throw new AppError('wrong_password')
  const { error } = await supabaseAuth.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  })
  if (error) throw mapAuthError(error)
  const { data: profile, error: rpcErr } = await supabaseAuth.rpc('app_login_email')
  if (rpcErr) throw toAppError(rpcErr)
  return storeSession(profile)
}

// Change password for an email-registered user: re-verify the current password,
// then update. (Supabase updateUser does not itself check the current password.)
export async function changePassword({ email, currentPassword, newPassword }) {
  if (!newPassword || String(newPassword).length < MIN_PASSWORD) throw new AppError('password_too_short')
  const { error: reauthErr } = await supabaseAuth.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(currentPassword),
  })
  if (reauthErr) throw new AppError('wrong_password')
  const { error } = await supabaseAuth.auth.updateUser({ password: String(newPassword) })
  if (error) throw mapAuthError(error)
  return true
}

// Delete the acting profile (cascades their listings) and end any auth session.
export async function deleteAccount(actorId) {
  const { error } = await supabase.rpc('delete_account', { p_actor_id: actorId })
  if (error) throw toAppError(error)
  logout()
  return true
}
