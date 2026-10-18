// Batch 10D — homepage live hero personas (plain data, like the 10C demos).
// Text values: 'string_key' → t(key) (strings.js) · { raw: '…' } → as-is · [..] → joined.
// `at` / `end` are ticks of the one timer (cycle = HERO_TIMING.cycleTicks). Every screen
// starts with the "उदाहरण" tag; every name, number and price inside the phone is an example
// (the same sample values the 10C guide uses) and none of them ever ticks or changes.
//
// Only the persona list and persona 1's screen live here (they are in the first paint).
// Screens 2–5 are in screens.js, which loads with the lazy live engine.

export const PERSONAS = [
  { id: 'rent', tab: 'home_live_tab_rent', cap: 'home_live_cap_rent' },
  { id: 'sell', tab: 'home_live_tab_sell', cap: 'home_live_cap_sell' },
  { id: 'mandi', tab: 'home_live_tab_mandi', cap: 'home_live_cap_mandi' },
  { id: 'weather', tab: 'home_live_tab_weather', cap: 'home_live_cap_weather' },
  { id: 'schemes', tab: 'home_live_tab_schemes', cap: 'home_live_cap_schemes' },
]

// "किराये पर यंत्र चाहिए": search typed, tag chips, two example listings, a pulsing call button.
// Labels are the app's own: Browse title, the 10C sample place names, "कॉल करें".
export const RENT_SCREEN = {
  id: 'rent',
  nodes: [
    { k: 'h', text: 'browse_title' },
    { k: 'inp', type: 'guide_s_tractor', at: 8, end: 36, search: true },
    { k: 'chips', at: 44, step: 4, items: ['guide_s_tractor', 'guide_s_district'] },
    { k: 'lc', at: 62, title: 'home_live_rent_l1', sub: 'home_live_rent_l1_sub' },
    { k: 'lc', at: 78, title: 'guide_s_crane', sub: 'home_live_rent_l2_sub', tone: 'b' },
    { k: 'btn', at: 104, text: [{ raw: '📞 ' }, 'contact_call'], pulse: true },
  ],
}
