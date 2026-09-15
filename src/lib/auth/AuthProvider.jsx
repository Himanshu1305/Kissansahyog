import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import * as authService from './authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser())

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

  const loginEmail = useCallback(async (email, password) => {
    const profile = await authService.loginEmail(email, password)
    setUser(profile)
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

  const value = useMemo(
    () => ({ user, isLoggedIn: !!user, signup, login, signupEmail, loginEmail, logout, patchUser, updateProfile, deleteAccount }),
    [user, signup, login, signupEmail, loginEmail, logout, patchUser, updateProfile, deleteAccount],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
