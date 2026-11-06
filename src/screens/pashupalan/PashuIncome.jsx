// Batch 19-B route screen: the income page text is imported here, so it ships in this route's own chunk.
import page from '../../content/pashupalan/pashupalan-se-kamai.js'
import { PashuDetail } from './PashuView'

export default function PashuIncome() {
  return <PashuDetail page={page} />
}
