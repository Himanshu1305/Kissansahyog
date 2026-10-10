import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import VoiceSearchButton from './VoiceSearchButton'

// Phase 10 — NavBar search. Desktop: inline input + mic. Mobile: a 🔍 button that
// opens a full-screen overlay with a large input + mic. Both submit to /search?q=.
// No hardcoded Devanagari — all copy via t().
export default function SearchBar({ variant = 'nav' }) {
  const { t } = useLang()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const go = (text) => {
    const query = String(text ?? q).trim()
    if (!query) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }
  const onSubmit = (e) => { e.preventDefault(); go() }

  if (variant === 'hero') {
    return (
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-[var(--ks-border-strong)] bg-white p-2 shadow-sm">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home_search_placeholder')} aria-label={t('home_search_placeholder')} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none" />
        <VoiceSearchButton onTranscript={(txt) => { setQ(txt); go(txt) }} className="shrink-0" />
        <button type="submit" className="rounded-xl bg-[var(--ks-primary)] px-5 py-3 font-bold text-white">{t('search_open')}</button>
      </form>
    )
  }

  return (
    <>
      {/* Desktop: inline search */}
      <form onSubmit={onSubmit} className="hidden md:flex items-center gap-1 rounded-full border border-stone-300 bg-white px-2 py-1">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search_placeholder')}
          aria-label={t('search_placeholder')}
          className="w-36 bg-transparent px-2 text-sm outline-none lg:w-44"
        />
        <VoiceSearchButton onTranscript={(txt) => setQ(txt)} />
        <button
          type="submit"
          aria-label={t('search_open')}
          className="rounded-full p-1 text-green-700 hover:bg-green-50"
        >
          🔍
        </button>
      </form>

      {/* Mobile: icon button opens overlay */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('search_open')}
        className="md:hidden rounded-full p-2 text-green-700 hover:bg-green-50"
      >
        🔍
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
          <div className="flex items-center gap-2 border-b border-stone-200 p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('search_open')}
              className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
            >
              ✕
            </button>
            <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2">
              <input
                type="search"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('search_placeholder')}
                aria-label={t('search_placeholder')}
                className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-base outline-none focus:border-green-500"
              />
              <VoiceSearchButton onTranscript={(txt) => setQ(txt)} />
              <button
                type="submit"
                aria-label={t('search_open')}
                className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white"
              >
                🔍
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
