// Batch 19 - Node-side registry of all Pashupalan content (tests + review-doc script only).
// The app does NOT import this file: each route lazy-loads only its own module.
import hub from './hub.js'
import desi from './desi-gay-anudan.js'
import kamdhenu from './kamdhenu-yojana.js'
import gaushala from './gaushala-anudan.js'
import kcc from './pashu-kisan-credit-card.js'
import kendriya from './kendriya-yojanayen.js'
import nasle from './desi-nasle.js'

export const DETAIL_PAGES = [desi, kamdhenu, gaushala, kcc, kendriya, nasle]
export const ALL_PAGES = [hub, ...DETAIL_PAGES]
export const ALL_PATHS = ALL_PAGES.map((p) => p.path)
