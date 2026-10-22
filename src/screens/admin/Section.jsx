import { createContext, useContext } from 'react'
import CollapsibleSection from '../../components/CollapsibleSection'

// Batch 14A - the panel box. Every admin panel renders <Section title=...>; this one adds the collapse arrow
// (the shared 10F/13A collapsible, remembered per panel) without touching the panels. The shell tells it which
// panel it is inside through PanelContext so the panel search can scroll to it by id.
export const PanelContext = createContext(null)

export default function Section({ title, children, right }) {
  const key = useContext(PanelContext)
  return (
    <CollapsibleSection
      page="admin" id={key ? `adm-${key}` : `adm-${String(title).length}`} primary
      title={title} action={right}
      className="mb-8 rounded-2xl border-2 border-stone-200 bg-white p-4"
      h2Class="text-lg font-bold text-stone-800"
    >
      {children}
    </CollapsibleSection>
  )
}

// Tells the Section inside which panel it is (for its id), and gives the panel a stable hook for tests.
export function PanelBox({ k, children }) {
  return <PanelContext.Provider value={k}><div data-panel={k}>{children}</div></PanelContext.Provider>
}
