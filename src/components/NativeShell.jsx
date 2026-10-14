// Batch 8A — mounted ONLY in the Capacitor (Android) app (see App.jsx). Two jobs:
//
//  1. Android back button: an open modal/sheet/menu closes first (useNativeBack); otherwise
//     back walks the router history; on the home page '/' it leaves the app. A page opened
//     with no history behind it goes to '/' rather than trapping the user.
//  2. Links: Capacitor already hands other sites, tel: and mailto: to the system (browser,
//     dialer, mail). What it cannot know is that https://kissansahyog.com/… IS this app —
//     those links are routed inside the app. A same-site link marked target="_blank" (the
//     Terms link next to a half-filled form) opens on the live site in the browser, so the
//     form the person is filling in is not lost.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PUBLIC_ORIGIN } from '../lib/native'
import { NATIVE_BACK_EVENT } from '../lib/useNativeBack'

const OWN_HOSTS = ['kissansahyog.com', 'www.kissansahyog.com']

export default function NativeShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pathRef = useRef(pathname)
  useEffect(() => { pathRef.current = pathname }, [pathname])

  useEffect(() => {
    let handle = null
    let gone = false
    import('@capacitor/app').then(({ App }) => {
      if (gone) return
      const added = App.addListener('backButton', ({ canGoBack }) => {
        const ev = new Event(NATIVE_BACK_EVENT, { cancelable: true })
        if (!window.dispatchEvent(ev)) return // something open consumed it
        if (pathRef.current === '/') { App.exitApp(); return }
        if (canGoBack) window.history.back()
        else navigate('/', { replace: true })
      })
      Promise.resolve(added).then((h) => { if (gone) h?.remove?.(); else handle = h })
    }).catch(() => { /* plugin missing: Android's default back behaviour applies */ })
    return () => { gone = true; handle?.remove?.() }
  }, [navigate])

  useEffect(() => {
    function onClick(e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target?.closest?.('a[href]')
      if (!a) return
      let url
      try { url = new URL(a.getAttribute('href'), window.location.href) } catch { return }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return
      const path = url.pathname + url.search + url.hash
      if (OWN_HOSTS.includes(url.hostname)) {
        e.preventDefault()
        navigate(path)
      } else if (url.origin === window.location.origin && a.getAttribute('target') === '_blank') {
        e.preventDefault()
        window.location.assign(PUBLIC_ORIGIN + path)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [navigate])

  return null
}
