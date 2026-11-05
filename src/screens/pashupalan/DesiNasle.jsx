// Batch 19 route screen: this page's text is imported here, so it ships in this route's own chunk.
import page from '../../content/pashupalan/desi-nasle.js'
import { PashuDetail } from './PashuView'

export default function DesiNasle() {
  return <PashuDetail page={page} />
}
