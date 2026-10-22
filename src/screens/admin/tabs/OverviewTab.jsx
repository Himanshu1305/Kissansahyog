import { PanelBox } from '../Section'
import { StatsBar, AvailabilityPanel, DataHealthPanel } from './OverviewPanels'

export default function OverviewTab({ actorId, t, lang }) {
  return (
    <>
      <PanelBox k="stats"><StatsBar actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="availability"><AvailabilityPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="datahealth"><DataHealthPanel actorId={actorId} t={t} /></PanelBox>
    </>
  )
}
