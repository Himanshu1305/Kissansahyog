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
    const profile = raw ? JSON.parse(raw) : null
    // A stored value without an id is not a session (an older copy of the app could save the
    // empty "no profile" answer of a failed mobile sign-in).
    return profile && profile.id ? profile : null
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

// Phase 5 — optional किसान-profile fields. Applied AFTER account creation so signup is
// never blocked by them. Returns the updated profile, or the input profile if nothing to set.
function hasKisan(k) {
  return k && (k.land_acres != null && k.land_acres !== '' || (k.main_crops && k.main_crops.trim()) || k.interest_lease || k.interest_equipment || k.whatsapp_opt_in || (k.preferred_mandi && k.preferred_mandi.trim()))
}
async function applyKisan(profile, kisan) {
  if (!profile?.id || !hasKisan(kisan)) return profile
  try {
    const { data, error } = await supabase.rpc('update_kisan_profile', {
      p_actor_id: profile.id,
      p_land_acres: kisan.land_acres === '' || kisan.land_acres == null ? null : Number(kisan.land_acres),
      p_main_crops: kisan.main_crops ?? null,
      p_interest_lease: !!kisan.interest_lease,
      p_interest_equipment: !!kisan.interest_equipment,
      p_whatsapp_opt_in: !!kisan.whatsapp_opt_in,
      p_preferred_mandi: kisan.preferred_mandi ?? null,
    })
    if (error) return profile // non-blocking — account already created
    return data || profile
  } catch {
    return profile
  }
}

// ---- signup ----
export async function signup({ full_name, phone, village_town, pincode, language, disclaimer_accepted, kisan }) {
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
  return storeSession(await applyKisan(data, kisan))
}

// Edit only the किसान-profile fields (optional; no pincode dependency) + refresh the session.
export async function updateKisanProfile(actorId, { land_acres, main_crops, interest_lease, interest_equipment, whatsapp_opt_in, preferred_mandi }) {
  const { data, error } = await supabase.rpc('update_kisan_profile', {
    p_actor_id: actorId,
    p_land_acres: land_acres === '' || land_acres == null ? null : Number(land_acres),
    p_main_crops: main_crops ?? null,
    p_interest_lease: !!interest_lease,
    p_interest_equipment: !!interest_equipment,
    p_whatsapp_opt_in: whatsapp_opt_in == null ? null : !!whatsapp_opt_in,
    p_preferred_mandi: preferred_mandi ?? null,
  })
  if (error) throw toAppError(error)
  return storeSession(data)
}

// ---- MOBILE login --------------------------------------------------------------------
// OTP PLUG-IN POINT (Batch 7L-2). The sign-in screen only ever calls these two functions:
//
//   startPhoneLogin(phone)  → { step: 'done', profile }            today: the number alone signs in
//                           → { step: 'otp', phone, challenge }    later: an OTP was sent
//   verifyPhoneOtp(challenge, code) → { step: 'done', profile }    later: check the code
//
// To add OTP, change ONLY these two functions (send the code in startPhoneLogin and return
// step 'otp'; verify it in verifyPhoneOtp). The screen already renders a code box when it is
// handed step 'otp', so it needs no redesign.
export const PHONE_OTP_ENABLED = false

export async function startPhoneLogin(phone) {
  if (!isValidPhone(phone)) throw new AppError('invalid_phone')
  const { data, error } = await supabase.rpc('app_login', { p_phone: normalizePhone(phone) })
  if (error) throw toAppError(error)
  // The server answers "no profile" (not an error) for an unknown number AND for a number
  // that may not sign in this way, so both look exactly the same here.
  if (!data || !data.id) throw new AppError('not_found')
  return { step: 'done', profile: storeSession(data) }
}

export async function verifyPhoneOtp() {
  // Not reachable while PHONE_OTP_ENABLED is false.
  throw new AppError('unknown')
}

// Kept for callers that only want the profile (same behaviour as before 7L-2).
export async function login(phone) {
  const res = await startPhoneLogin(phone)
  return res.profile
}

// Update the locally cached profile (e.g. after a language change) without a
// re-login. Keeps localStorage the source of truth for the current session.
export function updateStoredUser(patch) {
  const current = getCurrentUser()
  if (!current) return null
  return storeSession({ ...current, ...patch })
}

// Edit the acting profile (name/village/pincode→coords/language) via RPC and
// refresh the cached session.
export async function updateProfile(actorId, { full_name, village_town, pincode, language }) {
  if (!full_name || !full_name.trim()) throw new AppError('name_required')
  if (!isValidPincode(pincode)) throw new AppError('invalid_pincode')
  const { data, error } = await supabase.rpc('update_profile', {
    p_actor_id: actorId,
    p_full_name: full_name.trim(),
    p_village_town: village_town ?? null,
    p_pincode: String(pincode).trim(),
    p_language: language || null,
  })
  if (error) throw toAppError(error)
  return storeSession(data)
}

// Listing consent is stored through an owner-scoped SECURITY DEFINER RPC. The
// legacy disclaimer timestamp is updated there too, so older app builds remain
// able to post after a user completes the new checklist.
export async function acceptListingConsents(actorId, items) {
  const { data, error } = await supabase.rpc('accept_listing_consents', {
    p_actor_id: actorId,
    p_items: items,
  })
  if (error) throw toAppError(error)
  return storeSession(data)
}

// ---- EMAIL auth (Phase 3, via Supabase Auth on the supabaseAuth client) ----

// Map a Supabase Auth error to one of our stable codes.
function mapAuthError(error) {
  const m = String(error?.message || '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) return new AppError('email_exists')
  if (m.includes('invalid login') || m.includes('invalid credentials')) return new AppError('wrong_password')
  if (m.includes('rate limit') || m.includes('too many')) return new AppError('too_many_attempts')
  if (m.includes('password')) return new AppError('password_too_short')
  if (m.includes('email')) return new AppError('invalid_email')
  return new AppError('unknown')
}

export async function signupEmail({ full_name, email, password, village_town, pincode, language, disclaimer_accepted, kisan }) {
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
  return storeSession(await applyKisan(profile, kisan))
}

// Batch 7L-2 — the ONE registration. The password lives in Supabase Auth (it is never sent
// to our own tables); the profile is created by the app_register RPC for that signed-in user.
// place = { label, lat, lng } of the TOWN chosen from the places list (not a device position).
export async function register({ full_name, email, password, phone, place, language, disclaimer_accepted, show_details, kisan }) {
  if (!full_name || !full_name.trim()) throw new AppError('name_required')
  if (!isValidEmail(email)) throw new AppError('invalid_email')
  if (!password || String(password).length < MIN_PASSWORD) throw new AppError('password_too_short')
  if (!isValidPhone(phone)) throw new AppError('invalid_phone')
  if (!place || !place.label) throw new AppError('place_required')
  if (!disclaimer_accepted) throw new AppError('disclaimer_not_accepted')

  const creds = { email: String(email).trim(), password: String(password) }
  const { data, error } = await supabaseAuth.auth.signUp(creds)
  let needSignIn = !error && !data.session
  if (error) {
    const mapped = mapAuthError(error)
    if (mapped.code !== 'email_exists') throw mapped
    // The email is already in Supabase Auth. If an earlier attempt stopped half-way (for
    // example the mobile number was already used) the same password finishes it; otherwise
    // this is somebody's account and we say so.
    needSignIn = true
  }
  if (needSignIn) {
    const { error: signInErr } = await supabaseAuth.auth.signInWithPassword(creds)
    if (signInErr) throw new AppError('email_exists')
    const existing = await supabaseAuth.rpc('app_login_email')
    if (!existing.error && existing.data?.id) {
      supabaseAuth.auth.signOut().catch(() => {})
      throw new AppError('email_exists')
    }
  }

  const { data: profile, error: rpcErr } = await supabaseAuth.rpc('app_register', {
    p_full_name: full_name.trim(),
    p_phone: normalizePhone(phone),
    p_village_town: place.label,
    p_latitude: place.lat ?? null,
    p_longitude: place.lng ?? null,
    p_language: language || 'hi',
    p_disclaimer_accepted: true,
    p_show_details: show_details !== false,
  })
  if (rpcErr) throw toAppError(rpcErr)
  return storeSession(await applyKisan(profile, kisan))
}

// Throttle hooks around the password check (see migration 0059). Best-effort: if the guard
// function is not there yet (migration not applied) sign-in simply proceeds as before.
async function emailGuard(email, failed) {
  const { error } = await supabase.rpc('app_login_email_guard', { p_email: String(email).trim().toLowerCase(), p_failed: !!failed })
  if (error && /too_many_attempts/.test(String(error.message || ''))) throw new AppError('too_many_attempts')
}

export async function loginEmail(email, password) {
  if (!isValidEmail(email)) throw new AppError('invalid_email')
  if (!password) throw new AppError('wrong_password')
  await emailGuard(email, false)
  const { error } = await supabaseAuth.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  })
  if (error) {
    const mapped = mapAuthError(error)
    if (mapped.code === 'wrong_password') await emailGuard(email, true).catch(() => {})
    throw mapped
  }
  const { data: profile, error: rpcErr } = await supabaseAuth.rpc('app_login_email')
  if (rpcErr || !profile || !profile.id) {
    supabaseAuth.auth.signOut().catch(() => {})
    const mappedRpc = rpcErr ? toAppError(rpcErr) : new AppError('not_found')
    // Signed in to Supabase Auth but no profile: a registration that was never finished.
    throw mappedRpc.code === 'not_found' ? new AppError('registration_incomplete') : mappedRpc
  }
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
