// Battery / data care for looping motion (rule F.11): a loop runs only while the page is
// visible AND the element is on screen. Returns false otherwise, so callers pause.
import { useEffect, useState } from 'react'

export function useLoopActive(ref) {
  const [visible, setVisible] = useState(() => {
    try { return document.visibilityState !== 'hidden' } catch { return true }
  })
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1]
      if (e) setInView(e.isIntersecting)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])

  return visible && inView
}
