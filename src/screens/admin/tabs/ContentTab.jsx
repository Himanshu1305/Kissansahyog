import { PanelBox } from '../Section'
import { ExpertsPanel, ArticlesPanel, ResourcesPanel, YojanaPanel, SafaltaPanel, SawaalPanel, PageFaqsPanel } from './ContentPanels'
import AnnouncementsPanel from './AnnouncementsPanel'

export default function ContentTab({ actorId, t, lang }) {
  return (
    <>
      <PanelBox k="announcements"><AnnouncementsPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="experts"><ExpertsPanel actorId={actorId} t={t} /></PanelBox>
      <PanelBox k="articles"><ArticlesPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="resources"><ResourcesPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="yojana"><YojanaPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="safalta"><SafaltaPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="sawaal"><SawaalPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
      <PanelBox k="pagefaqs"><PageFaqsPanel actorId={actorId} t={t} /></PanelBox>
    </>
  )
}
