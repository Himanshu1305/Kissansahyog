import { PanelBox } from '../Section'
import KvkPanel from './KvkPanel'

// Batch 29 - the "KVK questions" tab: one panel.
export default function KvkTab({ actorId, t, lang }) {
  return (
    <PanelBox k="kvk"><KvkPanel actorId={actorId} t={t} lang={lang} /></PanelBox>
  )
}
