import { PanelBox } from '../Section'
import { SecuritySwitchesPanel, SmsUsagePanel, ActionLogPanel, RolesPanel } from './SecurityPanels'

export default function SecurityTab({ actorId, t, lang }) {
  return (
    <>
      <PanelBox k="security"><SecuritySwitchesPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="smsusage"><SmsUsagePanel actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="actionlog"><ActionLogPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="roles"><RolesPanel actorId={actorId} t={t} /></PanelBox>
    </>
  )
}
