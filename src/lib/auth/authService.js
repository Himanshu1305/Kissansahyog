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
import { apiUrl } from '../apiBase'
import { getSessionToken, setSessionToken, SESSION_HEADER } from './sessionToken'

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
// token: undefined = keep the stored session token (profile refresh); a string or null = replace it.
function storeSession(profile, token) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
  } catch {
    /* ignore */
  }
  if (token !== undefined) setSessionToken(token)
  return profile
}
// Local sign-out only (profile + token gone; nothing sent).
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  setSessionToken(null)
}
export function logout() {
  // Batch 11A: revoke the session token on the server (best effort). The header is set on this call
  // because the stored token is cleared at once below.
  const token = getSessionToken()
  if (token) supabase.rpc('app_logout_session').setHeader(SESSION_HEADER, token).then(() => {}, () => {})
  clearSession()
  // Also end any Supabase Auth session (email users); harmless for phone users.
  supabaseAuth.auth.signOut().catch(() => {})
}

// ---- Batch 11A: which sign-in rules are on (database flags, migration 0066) ----------------------------
// GET /api/otp/config (cached 60 s there); if the function is unreachable the database is asked directly;
// if that fails too: "off" (today's behaviour — the server still refuses an old path when OTP is required,
// and startPhoneLogin / startPhoneRegister then retry with OTP).
let flagsCache = null
export async function getAuthFlags({ fresh = false } = {}) {
  if (!fresh && flagsCache && Date.now() - flagsCache.at < 60000) return flagsCache.value
  let value = null
  try {
    const res = await fetch(apiUrl('/api/otp/config'), { signal: AbortSignal.timeout(4000) })
    const j = res.ok ? await res.json() : null
    if (j && typeof j.otp_required === 'boolean') value = j
  } catch { /* fall through */ }
  if (!value) {
    try {
      const { data, error } = await supabase.rpc('get_auth_flags')
      if (!error && data && typeof data.otp_required === 'boolean') value = data
    } catch { /* fall through */ }
  }
  value = { otp_required: value?.otp_required === true, session_enforced: value?.session_enforced === true }
  flagsCache = { at: Date.now(), value }
  return value
}

// Our own error codes from the OTP functions → AppError (provider details never reach the app).
const OTP_CODES = ['invalid_phone', 'phone_exists', 'otp_cooldown', 'otp_too_many', 'otp_wrong', 'otp_expired', 'otp_code_format']
async function otpPost(path, body) {
  let res
  try {
    res = await fetch(apiUrl(path), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) })
  } catch {
    throw new AppError('otp_service_busy')
  }
  let j = null
  try { j = await res.json() } catch { /* not JSON */ }
  if (res.ok && j && j.ok) return j
  const err = new AppError(OTP_CODES.includes(j?.error) ? j.error : 'otp_service_busy')
  if (j?.retryAfter) err.retryAfter = j.retryAfter
  if (j?.attemptsLeft != null) err.attemptsLeft = j.attemptsLeft
  throw err
}
// Sends a code. The challenge the code screen keeps: { id, phone, purpose, resendAfter, payload? }.
async function sendOtp(phone, purpose, payload) {
  const j = await otpPost('/api/otp/send', { phone: normalizePhone(phone), purpose })
  return { id: j.challenge, phone: normalizePhone(phone), purpose, resendAfter: j.resendAfter || 30, payload }
}
export function resendOtp(challenge) {
  return sendOtp(challenge.phone, challenge.purpose, challenge.payload)
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
  storeSession(data, null)
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
// Batch 11A: the static switch became a runtime decision (getAuthFlags().otp_required). The export stays
// for older imports; it is no longer read.
export const PHONE_OTP_ENABLED = false

async function oldPhoneLogin(phone) {
  const { data, error } = await supabase.rpc('app_login', { p_phone: normalizePhone(phone) })
  if (error) throw toAppError(error)
  // The server answers "no profile" (not an error) for an unknown number AND for a number
  // that may not sign in this way, so both look exactly the same here.
  if (!data || !data.id) throw new AppError('not_found')
  return { step: 'done', profile: storeSession(data, null) }
}

export async function startPhoneLogin(phone) {
  if (!isValidPhone(phone)) throw new AppError('invalid_phone')
  if (!(await getAuthFlags()).otp_required) {
    try {
      return await oldPhoneLogin(phone)
    } catch (err) {
      // The flag was switched on after our last look: go the OTP way.
      if (err.code !== 'otp_required') throw err
      await getAuthFlags({ fresh: true })
    }
  }
  return { step: 'otp', phone: normalizePhone(phone), challenge: await sendOtp(phone, 'login') }
}

// Checks the code, then signs in (purpose 'login') or creates the account (purpose 'register').
export async function verifyPhoneOtp(challenge, code) {
  const c = String(code || '').replace(/\D/g, '')
  if (!/^[0-9]{6}$/.test(c)) throw new AppError('otp_code_format')
  const { ticket } = await otpPost('/api/otp/verify', { challenge: challenge.id, code: c, phone: challenge.phone })
  if (challenge.purpose === 'register') {
    const p = challenge.payload
    const { data, error } = await supabase.rpc('app_register_phone_otp', { ...registerPhoneArgs(p), p_ticket: ticket })
    if (error) throw toAppError(error)
    if (!data?.profile?.id) throw new AppError('unknown')
    supabaseAuth.auth.signOut().catch(() => {})
    storeSession(data.profile, data.session_token || null)
    return { step: 'done', profile: storeSession(await applyKisan(data.profile, p.kisan)) }
  }
  const { data, error } = await supabase.rpc('app_login_otp', { p_phone: challenge.phone, p_ticket: ticket })
  if (error) throw toAppError(error)
  if (!data?.profile?.id) throw new AppError('not_found')
  return { step: 'done', profile: storeSession(data.profile, data.session_token || null) }
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
  storeSession(profile, await issueEmailSession())
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
  storeSession(profile, await issueEmailSession())
  return storeSession(await applyKisan(profile, kisan))
}

// Batch 10E Phase 3A — sign-up with name + mobile only (no email, no password). The profile is
// created by app_register_phone (migration 0064: email null, auth_provider 'phone') and the
// returned profile becomes the local session exactly as a mobile login's app_login profile does
// (storeSession). Same parameters as register() minus email/password. Trust-based until OTP.
function checkRegisterPhone({ full_name, phone, place, disclaimer_accepted }) {
  if (!full_name || !full_name.trim()) throw new AppError('name_required')
  if (!isValidPhone(phone)) throw new AppError('invalid_phone')
  if (!place || !place.label) throw new AppError('place_required')
  if (!disclaimer_accepted) throw new AppError('disclaimer_not_accepted')
}
function registerPhoneArgs({ full_name, phone, place, language, show_details }) {
  return {
    p_full_name: full_name.trim(),
    p_phone: normalizePhone(phone),
    p_village_town: place.label,
    p_latitude: place.lat ?? null,
    p_longitude: place.lng ?? null,
    p_language: language || 'hi',
    p_disclaimer_accepted: true,
    p_show_details: show_details !== false,
  }
}
export async function registerPhone(payload) {
  checkRegisterPhone(payload)
  const { data: profile, error } = await supabase.rpc('app_register_phone', registerPhoneArgs(payload))
  if (error) throw toAppError(error)
  if (!profile || !profile.id) throw new AppError('unknown')
  // A leftover email session (another account on this device) must not stay signed in to
  // Supabase Auth underneath the new phone-only session.
  supabaseAuth.auth.signOut().catch(() => {})
  storeSession(profile, null)
  return storeSession(await applyKisan(profile, payload.kisan))
}

// Batch 11A — sign-up with name + mobile: today's registerPhone when OTP is off ({ step: 'done', profile }),
// otherwise a code is sent first ({ step: 'otp', challenge }) and verifyPhoneOtp creates the account.
export async function startPhoneRegister(payload) {
  checkRegisterPhone(payload)
  if (!(await getAuthFlags()).otp_required) {
    try {
      return { step: 'done', profile: await registerPhone(payload) }
    } catch (err) {
      if (err.code !== 'otp_required') throw err
      await getAuthFlags({ fresh: true })
    }
  }
  return { step: 'otp', challenge: await sendOtp(payload.phone, 'register', payload) }
}

// Batch 11A — a session token for an e-mail user (signed in to Supabase Auth). Best effort: before
// migration 0066 the function does not exist and the session simply has no token (nothing is enforced).
async function issueEmailSession() {
  try {
    const { data, error } = await supabaseAuth.rpc('app_issue_session')
    return !error && data?.session_token ? data.session_token : null
  } catch {
    return null
  }
}

// Batch 11A — start-up check while enforcement is on. False = this device's session can no longer act
// (no token or a revoked / expired one, and no e-mail sign-in to get a new one from).
export async function checkSession(profile) {
  if (!profile?.id) return true
  const flags = await getAuthFlags()
  if (!(flags.otp_required && flags.session_enforced)) return true
  if (getSessionToken()) {
    const { data, error } = await supabase.rpc('app_session_valid', { p_actor_id: profile.id })
    if (error) return true // cannot tell (offline): stay signed in; the server still checks every action
    if (data === true) return true
  }
  const token = await issueEmailSession()
  if (token) { setSessionToken(token); return true }
  return false
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
  return storeSession(profile, await issueEmailSession())
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
