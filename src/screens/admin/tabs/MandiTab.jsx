import { PanelBox } from '../Section'
import { MspPanel, InputPricesPanel, ProcurementPanel } from './MandiPanels'

export default function MandiTab({ actorId, t, lang }) {
  return (
    <>
      <PanelBox k="msp"><MspPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="inputprices"><InputPricesPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="procurement"><ProcurementPanel actorId={actorId} t={t} /></PanelBox>
    </>
  )
}
