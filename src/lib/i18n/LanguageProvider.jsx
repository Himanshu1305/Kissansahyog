import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { strings } from './strings'

const STORAGE_KEY = 'ks_lang_v1'
const DEFAULT_LANG = 'hi' // Hindi default per spec.

const LanguageContext = createContext(null)

function readInitialLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'hi' || v === 'en' ? v : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang)

  const setLang = useCallback((next) => {
    if (next !== 'hi' && next !== 'en') return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore storage errors (private mode etc.) */
    }
  }, [])

  // t(key) -> string in current language. Warns (dev) on missing keys so the
  // Phase 7 audit can catch gaps.
  const t = useCallback(
    (key) => {
      const entry = strings[key]
      if (!entry) {
        if (import.meta.env.DEV) console.warn(`[i18n] missing string key: ${key}`)
        return key
      }
      return entry[lang] ?? entry.hi ?? key
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
