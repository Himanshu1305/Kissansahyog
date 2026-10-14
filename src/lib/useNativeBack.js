import { useEffect } from 'react'
import { isNative } from './native'

// Android back button (app only): while `active`, the next back press calls `onBack`
// instead of leaving the page — used by modals, sheets and the mobile menu so back closes
// them first. NativeShell dispatches the cancelable 'ks-native-back' event. No-op on the web.
export const NATIVE_BACK_EVENT = 'ks-native-back'

export function useNativeBack(active, onBack) {
  useEffect(() => {
    if (!active || !isNative()) return
    const handler = (e) => {
      if (e.defaultPrevented) return
      e.preventDefault()
      onBack()
    }
    window.addEventListener(NATIVE_BACK_EVENT, handler)
    return () => window.removeEventListener(NATIVE_BACK_EVENT, handler)
  }, [active, onBack])
}
