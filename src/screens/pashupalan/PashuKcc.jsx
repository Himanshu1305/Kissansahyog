// Batch 19 route screen: this page's text is imported here, so it ships in this route's own chunk.
import page from '../../content/pashupalan/pashu-kisan-credit-card.js'
import { PashuDetail } from './PashuView'

export default function PashuKcc() {
  return <PashuDetail page={page} />
}
