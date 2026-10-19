import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import * as authService from './authService'
import { NOT_AUTH_EVENT } from './sessionToken'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser())
  // Batch 11A: true after the server refused this device's session (not_authenticated) — the user was signed
  // out locally; SessionWatch (App.jsx) sends them to the login screen, which says why.
  const [sessionEnded, setSessionEnded] = useState(false)
  const endSession = useCallback(() => {
    if (!authService.getCurrentUser()) return
    authService.clearSession()
    setUser(null)
    setSessionEnded(true)
  }, [])
  useEffect(() => {
    window.addEventListener(NOT_AUTH_EVENT, endSession)
    return () => window.removeEventListener(NOT_AUTH_EVENT, endSession)
  }, [endSession])
  // Start-up: while enforcement is on, a device without a valid token is signed out (e-mail users get a new
  // token silently). Nothing is asked for a visitor who is not signed in.
  useEffect(() => {
    const u = authService.getCurrentUser()
    if (!u) return
    authService.checkSession(u).then((ok) => { if (!ok) endSession() }, () => {})
  }, [endSession])

  const signup = useCallback(async (payload) => {
    const profile = await authService.signup(payload)
    setUser(profile)
    return profile
  }, [])

  const login = useCallback(async (phone) => {
    const profile = await authService.login(phone)
    setUser(profile)
    return profile
  }, [])

  const signupEmail = useCallback(async (payload) => {
    const profile = await authService.signupEmail(payload)
    setUser(profile)
    return profile
  }, [])

  const register = useCallback(async (payload) => {
    const profile = await authService.register(payload)
    setUser(profile)
    return profile
  }, [])

  // Batch 10E Phase 3A — name + mobile sign-up (no email); signs in like a mobile login.
  const registerPhone = useCallback(async (payload) => {
    const profile = await authService.registerPhone(payload)
    setUser(profile)
    return profile
  }, [])

  // Mobile sign-in. Returns { step: 'done', profile } today; { step: 'otp', … } once OTP exists.
  const startPhoneLogin = useCallback(async (phone) => {
    const res = await authService.startPhoneLogin(phone)
    if (res.step === 'done') { setUser(res.profile); setSessionEnded(false) }
    return res
  }, [])
  const verifyPhoneOtp = useCallback(async (challenge, code) => {
    const res = await authService.verifyPhoneOtp(challenge, code)
    if (res.step === 'done') { setUser(res.profile); setSessionEnded(false) }
    return res
  }, [])
  // Batch 11A: sign-up by mobile — { step: 'done', profile } (OTP off) or { step: 'otp', challenge }.
  const startPhoneRegister = useCallback(async (payload) => {
    const res = await authService.startPhoneRegister(payload)
    if (res.step === 'done') setUser(res.profile)
    return res
  }, [])
  const resendOtp = useCallback((challenge) => authService.resendOtp(challenge), [])

  const loginEmail = useCallback(async (email, password) => {
    const profile = await authService.loginEmail(email, password)
    setUser(profile)
    setSessionEnded(false)
    return profile
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!user?.id) return
    await authService.deleteAccount(user.id)
    setUser(null)
  }, [user])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  // Patch the cached profile (e.g. preferred_language) in memory + storage.
  const patchUser = useCallback((patch) => {
    const next = authService.updateStoredUser(patch)
    if (next) setUser(next)
    return next
  }, [])

  const updateProfile = useCallback(async (patch) => {
    if (!user?.id) throw new Error('not logged in')
    const next = await authService.updateProfile(user.id, patch)
    setUser(next)
    return next
  }, [user])

  const updateKisanProfile = useCallback(async (patch) => {
    if (!user?.id) throw new Error('not logged in')
    const next = await authService.updateKisanProfile(user.id, patch)
    setUser(next)
    return next
  }, [user])

  const acceptListingConsents = useCallback(async (items) => {
    if (!user?.id) throw new Error('not logged in')
    const next = await authService.acceptListingConsents(user.id, items)
    setUser(next)
    return next
  }, [user])

  const value = useMemo(
    () => ({ user, isLoggedIn: !!user, sessionEnded, signup, login, signupEmail, loginEmail, register, registerPhone, startPhoneRegister, startPhoneLogin, verifyPhoneOtp, resendOtp, logout, patchUser, updateProfile, updateKisanProfile, acceptListingConsents, deleteAccount }),
    [user, sessionEnded, signup, login, signupEmail, loginEmail, register, registerPhone, startPhoneRegister, startPhoneLogin, verifyPhoneOtp, resendOtp, logout, patchUser, updateProfile, updateKisanProfile, acceptListingConsents, deleteAccount],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
