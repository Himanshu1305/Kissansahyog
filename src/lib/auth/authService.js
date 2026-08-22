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
//   Phase 2:    replace signup()/login() with supabase.auth.signInWithOtp({phone})
//               + verifyOtp(), map auth.uid() -> profiles row, and back RLS with
//               auth.uid() instead of the actor-id RPC argument. getCurrentUser()
//               becomes supabase.auth.getUser(). The public function signatures
//               below should stay the same so no screens need to change.
// ============================================================================

import { supabase } from '../supabaseClient'
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
