// Batch 10D — screens 2–5 of the homepage live hero (loaded with the lazy live engine).
// Format: see personas.js. Example values are the 10C guide's samples (TourExplorer.jsx:
// PRICES, WEEK; demos/find.js: ₹600 / hour) and are only ever shown inside the phone.
import { RENT_SCREEN } from './personas.js'

const raw = (s) => ({ raw: s })

// "अपना सामान बेचना है": name and price typed, photo, the post form's "जमा करें", confirmation.
const SELL_SCREEN = {
  id: 'sell',
  nodes: [
    { k: 'h', text: 'tab_post' },
    { k: 'inp', type: 'home_live_sell_name', at: 8, end: 34 },
    { k: 'inp', type: 'home_live_sell_price', at: 40, end: 64 },
    { k: 'photo', at: 72, text: [raw('📷 '), 'home_live_sell_photo'] },
    { k: 'btn', at: 92, text: 'submit' },
    { k: 'done', at: 124, text: 'home_live_sell_done' },
  ],
}

// "मंडी भाव देखना है": example price bars grow once (they never tick).
const MANDI_SCREEN = {
  id: 'mandi',
  nodes: [
    { k: 'h', text: 'mandi_title' },
    { k: 'sub', text: 'home_live_mandi_unit' },
    { k: 'bars', at: 10, step: 16, rows: [
      ['crop_gehun', raw('₹2,450'), 0.45],
      ['crop_soyabean', raw('₹4,600'), 0.84],
      ['crop_chana', raw('₹5,500'), 1],
    ] },
    { k: 'note', at: 80, text: 'guide_tour_mandi_note' },
  ],
}

// "मौसम देखना है": example 7-day strip with a turning sun. [°C, weather code] as in 10C.
const WEATHER_SCREEN = {
  id: 'weather',
  nodes: [
    { k: 'h', text: ['weather_title', raw(' · '), 'guide_s_district'] },
    { k: 'big', at: 6, temp: 28, code: 0 },
    { k: 'week', at: 18, step: 9, days: [[28, 0], [29, 0], [27, 2], [25, 61], [26, 3], [28, 0], [29, 0]] },
    { k: 'note', at: 96, text: 'mausam_7day' },
  ],
}

// "सरकारी योजना जाननी है": real schemes slide in (PM-KISAN, crop insurance, Kisan Credit Card).
const SCHEMES_SCREEN = {
  id: 'schemes',
  nodes: [
    { k: 'h', text: 'nav_schemes' },
    { k: 'card', at: 10, title: 'guide_tour_y1', sub: 'guide_tour_y1_d', slide: true },
    { k: 'card', at: 38, title: 'guide_tour_y2', sub: 'guide_tour_y2_d', slide: true },
    { k: 'card', at: 66, title: 'guide_tour_y3', sub: 'guide_tour_y3_d', slide: true },
    { k: 'note', at: 100, text: 'guide_tour_schemes_note' },
  ],
}

export const SCREENS = [RENT_SCREEN, SELL_SCREEN, MANDI_SCREEN, WEATHER_SCREEN, SCHEMES_SCREEN]
