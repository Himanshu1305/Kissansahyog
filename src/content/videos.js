// Phase 3d — three real, public Hindi farming videos. IDs verified via YouTube
// oembed (public). Thumbnails are self-hosted (public/images/home/video-N.jpg,
// downloaded by scripts/fetch-images.mjs). Cards link out to youtube.com/watch
// (opens the YouTube app on phones); no iframes.
export const VIDEOS = [
  {
    youtubeId: '2fOVTX4mDZ8',
    thumb: '/images/home/video-1.jpg',
    title_hi: 'सोयाबीन में पीले मोज़ेक रोग का प्रबंधन',
    title_en: 'Managing yellow mosaic disease in soybean',
    source: 'ICAR — National Soybean Research Institute, Indore',
    duration: '3:07',
  },
  {
    youtubeId: 'KI-K1O59mDo',
    thumb: '/images/home/video-2.jpg',
    title_hi: 'गेहूं की खेती कैसे करें — बुवाई का सही समय व बीज दर',
    title_en: 'How to grow wheat — right sowing time & seed rate',
    source: 'Annadata · News18',
    duration: '7:22',
  },
  {
    youtubeId: 'O0PMu9lfboY',
    thumb: '/images/home/video-3.jpg',
    title_hi: 'किसान ड्रोन से छिड़काव — पूरी जानकारी',
    title_en: 'Spraying with a farm drone — full guide',
    source: 'Hindi · किसान ड्रोन',
    duration: '22:07',
  },
]

export const videoTitle = (v, lang) => (lang === 'hi' ? v.title_hi : v.title_en)
export const videoWatchUrl = (v) => `https://www.youtube.com/watch?v=${v.youtubeId}`
