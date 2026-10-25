// Reusable internal-navigation tile inventory. Components choose the relevant
// subset by showOn; every static route below is defined in App.jsx.
export const PROMO_TILES = [
  { id: 'how-posting-works', type: 'how', titleKey: 'promo_how_title', bodyKey: 'promo_how_steps', showOn: ['post'] },
  { id: 'sawaal-random', type: 'sawaal', route: '/sawaal', titleKey: 'promo_sawaal_title', showOn: ['post'] },
  { id: 'nearest-kvk', type: 'kvk', route: '/resources', titleKey: 'promo_kvk_title', showOn: ['post'] },
  { id: 'mandi', type: 'link', route: '/msp', titleKey: 'promo_mandi_title', showOn: ['post'] },
  { id: 'weather', type: 'link', route: '/mausam', titleKey: 'promo_weather_title', showOn: ['post'] },
  { id: 'schemes', type: 'link', route: '/yojana', titleKey: 'promo_schemes_title', showOn: ['post'] },
  { id: 'mela', type: 'mela', route: '/kisan-mela', titleKey: 'promo_mela_title', showOn: ['post'] },
  { id: 'whatsapp', type: 'whatsapp', route: '/join?src=promo_bento', showOn: ['post'] },
]
