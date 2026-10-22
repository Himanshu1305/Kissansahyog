import { PanelBox } from '../Section'
import { UsersPanel, FarmerProfilesPanel, VendorReportPanel, SubscriptionsPanel, SearchMissesPanel, WhatsAppAdminPanel } from './PeoplePanels'
import UserStatusPanel from './UserStatusPanel'

export default function PeopleTab({ actorId, t, lang }) {
  return (
    <>
      <PanelBox k="userstatus"><UserStatusPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="users"><UsersPanel actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="farmers"><FarmerProfilesPanel actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="vendors"><VendorReportPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="whatsapp"><WhatsAppAdminPanel actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="subscriptions"><SubscriptionsPanel actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="searchmisses"><SearchMissesPanel actorId={actorId} t={t} /></PanelBox>
    </>
  )
}
