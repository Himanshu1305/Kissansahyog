import { PanelBox } from '../Section'
import { ListingsPanel, ReportsPanel, CarbonSuggestionsPanel, MelaPanel, MelaCandidatesPanel, MelaMergesPanel } from './ModerationPanels'

export default function ModerationTab({ actorId, t, lang }) {
  return (
    <>
      <PanelBox k="listings"><ListingsPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="reports"><ReportsPanel actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="carbon"><CarbonSuggestionsPanel actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="mela"><MelaPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="melacand"><MelaCandidatesPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="melamerges"><MelaMergesPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
    </>
  )
}
