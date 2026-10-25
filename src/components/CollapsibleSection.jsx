// Batch 10F — one reusable collapsible section: native <details>/<summary>, so the basic toggle
// needs no JavaScript, works offline and is prerender-safe.
//   - The section heading (<h2>) sits inside the <summary>; a round chevron follows the heading text
//     inline and turns when the section is open. The whole summary row is the tap target (≥ 44 px).
//   - Prerender / server HTML / first client render: ALWAYS open, every word in the HTML (SEO, no-JS).
//   - After hydration, on phones (< 768 px), a section that is not `primary` starts collapsed — but
//     only when it is still below the fold, so nothing the visitor can see moves (no layout shift).
//     From 768 px everything starts open. `primary` sections (the first three of a page and its main
//     data table) always start open. Defaults per section: docs/review/batch10f/evidence/collapsible-defaults.md.
//   - The visitor's own open/closed choice is remembered per page + section in localStorage
//     (try/catch: the page works without storage) and wins over the default.
//   - A #hash pointing at the section or inside it opens it and scrolls to the target.
//   - Printing opens every section for the print, then restores it.
// Collapsed content stays in the DOM (a closed <details> keeps its children). No height animation.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'

const KEY = 'ks_sections_v1'
const PHONE = '(max-width: 767px)'

function readChoice(page, id) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    const v = all[`${page}:${id}`]
    return v === 1 ? true : v === 0 ? false : null
  } catch { return null }
}
function saveChoice(page, id, open) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    all[`${page}:${id}`] = open ? 1 : 0
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* storage unavailable: the choice lasts until the page is left */ }
}

/** The default open state after hydration (pure; unit-tested via the e2e spec). */
export function defaultOpen({ primary, stored, isPhone, belowFold, closedByDefault = false }) {
  if (stored != null) return stored
  // Closed at every width (e.g. the trend table, Batch 10F 3B) — unless it is on screen already.
  if (closedByDefault) return !belowFold
  if (primary || !isPhone) return true
  return !belowFold
}

export function Chevron() {
  return (
    <span className="ks-cs-chev" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  )
}

/**
 * page      — page key for the remembered choice ('home', 'msp', 'mausam')
 * id        — section key, also the element id (so /msp#trend opens and scrolls to it)
 * title     — the heading content (text + any inline extras such as an ⓘ tip)
 * primary   — always starts open
 * after     — optional content shown in the summary row after the heading (e.g. a date badge)
 * action    — optional link/button shown at the right of the summary row, outside the summary
 *             (never nested inside it), visible when collapsed too
 * as        — heading level ('h2' default; 'h3' for a sub-section such as the trend table)
 * closedByDefault — starts closed at every width (after hydration, when not on screen)
 * h2Class / h2Style — heading look (defaults to the page section heading)
 * className / style — the <details> box (cards keep their own border/background)
 */
export default function CollapsibleSection({ page, id, title, primary = false, closedByDefault = false, as: Heading = 'h2', after, action, h2Class = 'text-[22px] font-bold leading-tight md:text-[24px]', h2Style, className = '', style, testId, children }) {
  const { t } = useLang()
  const ref = useRef(null)
  const [open, setOpen] = useState(true)
  const openRef = useRef(true)
  openRef.current = open

  // Default (after hydration only; never during the prerender snapshot), then a #hash target.
  useEffect(() => {
    if (window.__KS_PRERENDER) return undefined
    const el = ref.current
    if (!el) return undefined
    let isPhone = false
    try { isPhone = window.matchMedia(PHONE).matches } catch { /* old browser: treat as wide */ }
    const r = el.getBoundingClientRect()
    // Not laid out (inside another closed section) counts as off screen.
    const belowFold = r.top >= window.innerHeight || (r.width === 0 && r.height === 0)
    const next = defaultOpen({ primary, stored: readChoice(page, id), isPhone, belowFold, closedByDefault })
    if (!next) setOpen(false)

    const fromHash = () => {
      let h = ''
      try { h = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
      if (!h) return
      const target = document.getElementById(h)
      if (!target || !(target === el || el.contains(target))) return
      setOpen(true)
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }))
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [page, id, primary, closedByDefault])

  // Print / save as PDF: everything open for the print (set on the element too, so it is open
  // before React re-renders), then back. Never saved as the visitor's choice.
  const printing = useRef(false)
  useEffect(() => {
    let before = null
    const onBefore = () => {
      printing.current = true
      before = openRef.current
      if (ref.current) ref.current.open = true
      setOpen(true)
    }
    const onAfter = () => {
      if (before != null) setOpen(before)
      before = null
      setTimeout(() => { printing.current = false }, 0)
    }
    window.addEventListener('beforeprint', onBefore)
    window.addEventListener('afterprint', onAfter)
    return () => {
      window.removeEventListener('beforeprint', onBefore)
      window.removeEventListener('afterprint', onAfter)
    }
  }, [])

  // The browser flips `open` itself on a click / Enter / Space on the summary. A toggle whose new
  // state differs from ours came from the visitor (ours always go through state first): remember it.
  const onToggle = useCallback((e) => {
    const now = e.currentTarget.open
    if (now === openRef.current) return
    if (!printing.current) saveChoice(page, id, now)
    setOpen(now)
  }, [page, id])

  return (
    <div className={`ks-cs-wrap${action ? ' ks-cs-has-action' : ''}`}>
      <details ref={ref} id={id} open={open} onToggle={onToggle} className={`ks-cs ${className}`} style={style} data-testid={testId} data-section={id}>
        <summary className="ks-cs-sum" aria-expanded={open}>
          <Heading className={`ks-cs-h ${h2Class}`} style={{ color: 'var(--ks-ink)', ...h2Style }}>
            {title}
            <Chevron />
          </Heading>
          {after}
          <span className="sr-only">{t(open ? 'section_collapse' : 'section_expand')}</span>
        </summary>
        <div className="ks-cs-body">{children}</div>
      </details>
      {action && <div className="ks-cs-action">{action}</div>}
    </div>
  )
}
