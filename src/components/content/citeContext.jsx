import { createContext, useContext } from 'react'
import { sources } from '../../content/sources.js'

// Per-page citation numbering. A page pre-computes the ordered, de-duplicated
// list of cited source ids (document order of first appearance) and provides a
// id -> number map. <Cite/> reads the number; <SourcesList/> renders them in
// order. Deterministic, so it survives prerender/hydration identically.
const CiteContext = createContext({ numberOf: () => null, orderedIds: [] })

// Pick the hi/en variant of a value that may be a plain string or {hi,en}.
export function pick(val, lang) {
  if (val == null) return ''
  if (typeof val === 'string') return val
  return val[lang] ?? val.hi ?? ''
}

// Walk a block tree and return the ordered unique list of cited source ids.
export function collectCiteIds(blocks = []) {
  const seen = new Set()
  const out = []
  const add = (ids) => {
    for (const id of ids || []) {
      if (!seen.has(id)) { seen.add(id); out.push(id) }
    }
  }
  const walk = (b) => {
    if (!b || typeof b !== 'object') return
    add(b.cites)
    if (Array.isArray(b.items)) b.items.forEach(walk)
    if (Array.isArray(b.rows)) b.rows.forEach((r) => (Array.isArray(r) ? r.forEach(walk) : walk(r)))
    if (Array.isArray(b.inputs)) b.inputs.forEach(walk)
    if (Array.isArray(b.faqs)) b.faqs.forEach(walk)
    if (b.q) walk(b.q)
    if (b.a) walk(b.a)
  }
  blocks.forEach(walk)
  return out
}

export function CiteProvider({ orderedIds = [], children }) {
  const numberOf = (id) => {
    const i = orderedIds.indexOf(id)
    return i === -1 ? null : i + 1
  }
  return <CiteContext.Provider value={{ numberOf, orderedIds }}>{children}</CiteContext.Provider>
}

export function useCite() {
  return useContext(CiteContext)
}

export { sources }
