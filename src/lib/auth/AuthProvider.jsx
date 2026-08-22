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

  const value = useMemo(
    () => ({ user, isLoggedIn: !!user, signup, login, logout, patchUser }),
    [user, signup, login, logout, patchUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
