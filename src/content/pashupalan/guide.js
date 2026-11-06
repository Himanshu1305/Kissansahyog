// Batch 19 - the "which scheme is for me" decision guide: pure data + pure function (no backend).
export const GUIDE = [
  { id: 'few', label: { hi: 'मैं 1 से 5 देसी गाय पालता/पालती हूँ', en: 'I keep 1 to 5 desi cows' }, primary: 'desi-gay-anudan', also: ['desi-nasle', 'pashu-kisan-credit-card'],
    why: { hi: 'देसी गाय पर मासिक मदद की योजना बन रही है; कर्ज़ चाहिए तो KCC देखें।', en: 'A monthly assistance for desi cows is being prepared; for a loan see the KCC.' } },
  { id: 'dairy', label: { hi: 'मैं 25 या उससे ज़्यादा पशुओं की डेयरी शुरू करना चाहता/चाहती हूँ', en: 'I want to start a dairy of 25 or more animals' }, primary: 'kamdhenu-yojana', also: ['pashu-kisan-credit-card', 'kendriya-yojanayen'],
    why: { hi: 'डेयरी यूनिट के लिए लोन और सब्सिडी कामधेनु योजना के पोर्टल पर बताई गई है।', en: 'The loan and subsidy for a dairy unit are described on the Kamdhenu scheme portal.' } },
  { id: 'gaushala', label: { hi: 'मैं गौशाला चलाता/चलाती हूँ', en: 'I run a gaushala' }, primary: 'gaushala-anudan', also: ['kendriya-yojanayen'],
    why: { hi: 'गौशाला अनुदान और आत्मनिर्भर गौशाला नीति 2025 का पेज।', en: 'The page on the gaushala grant and the Self-Reliant Gaushala Policy 2025.' } },
  { id: 'money', label: { hi: 'मुझे चारे और दवा के लिए पैसे चाहिए', en: 'I need money for feed and medicines' }, primary: 'pashu-kisan-credit-card', also: ['kamdhenu-yojana'],
    why: { hi: 'पशुपालन के लिए किसान क्रेडिट कार्ड बैंक से कर्ज़ का रास्ता है।', en: 'The Kisan Credit Card for animal husbandry is a way to take a bank loan.' } },
  { id: 'breed', label: { hi: 'मैं अपनी गाय की नस्ल जानना चाहता/चाहती हूँ', en: 'I want to know my cow’s breed' }, primary: 'desi-nasle', also: ['desi-gay-anudan'],
    why: { hi: 'देसी नस्लों और उनके इलाकों की सूची, और नस्ल पूछने का तरीका।', en: 'The list of desi breeds and their areas, and how to get the breed confirmed.' } },
]

// Pure decision-guide logic (no backend): returns the primary page and the "also see" pages.
export function pickGuide(id) {
  const g = GUIDE.find((x) => x.id === id)
  if (!g) return null
  return { id: g.id, primary: g.primary, also: g.also, why: g.why }
}
