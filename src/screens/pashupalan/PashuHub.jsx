// Batch 19 route screen: the hub text is imported here, so it ships in this route's own chunk.
import page from '../../content/pashupalan/hub.js'
import { PashuHub as PashuHubView } from './PashuHubView'

export default function PashuHub() {
  return <PashuHubView page={page} />
}
