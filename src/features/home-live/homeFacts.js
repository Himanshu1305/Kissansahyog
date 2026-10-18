// Batch 10D C — the homepage facts row. Every number is COUNTED from a data file in this repo
// (imported at build time and bundled), never typed in and never read from the database
// (staging and production databases differ). Sources and values: DECISIONS.md 21.
//   cats      ENABLED_CATEGORIES.length  src/lib/listings/registry.jsx  — the category tabs of /browse
//   crops     CROPS.length               src/content/crops.js           — the crop chooser of /msp (mandi prices)
//   districts DIVISION_DISTRICTS.length  src/lib/location/places.js     — the district picker of "your place"
//   demos     GUIDE_ORDER.length         src/features/guide/config.js   — the demo cards of /guide
// Labels: strings.js home_facts_*.
import { ENABLED_CATEGORIES } from '../../lib/listings/registry'
import { CROPS } from '../../content/crops'
import { DIVISION_DISTRICTS } from '../../lib/location/places'
import { GUIDE_ORDER } from '../guide/config.js'

export const HOME_FACTS = [
  { id: 'cats', n: ENABLED_CATEGORIES.length, label: 'home_facts_cats' },
  { id: 'crops', n: CROPS.length, label: 'home_facts_crops' },
  { id: 'districts', n: new Set(DIVISION_DISTRICTS.map((d) => d.en)).size, label: 'home_facts_districts' },
  { id: 'demos', n: GUIDE_ORDER.length, label: 'home_facts_demos' },
]
