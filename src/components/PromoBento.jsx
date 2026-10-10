import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { PROMO_TILES } from '../content/promoTiles'
import { fetchKbSawaal, sawaalQuestion } from '../lib/community/communityApi'
import { fetchResources, resAddress, resName } from '../lib/resources/resourcesApi'
import { fetchUpcomingMelas } from '../lib/mela/melaApi'
import WhatsAppJoin from './WhatsAppJoin'

// Stable for the lifetime of this JavaScript visit; deliberately not persisted.
const visitSeed = Math.random()
const rotate = (items) => [...items].sort((a, b) => ((a.id.charCodeAt(0) * 17 + visitSeed * 1000) % 31) - ((b.id.charCodeAt(0) * 17 + visitSeed * 1000) % 31))
let sawaalCache = null
let sawaalRequest = null
function loadSawaalOnce() {
  if (sawaalCache) return Promise.resolve(sawaalCache)
  if (!sawaalRequest) sawaalRequest = fetchKbSawaal().then((rows) => { sawaalCache = rows; return rows })
  return sawaalRequest
}

export default function PromoBento({ page = 'post', limit = 6, className = '' }) {
  const { t, lang } = useLang(); const { user } = useAuth()
  const [sawaal, setSawaal] = useState([]); const [kvks, setKvks] = useState([]); const [melas, setMelas] = useState([])
  useEffect(() => { let alive = true
    loadSawaalOnce().then((rows) => alive && setSawaal(rows)).catch(() => {})
    fetchResources().then((rows) => alive && setKvks(rows.filter((row) => /krishi vigyan|kvk|कृषि विज्ञान/i.test(`${row.name_en || ''} ${row.name_hi || ''}`)))).catch(() => {})
    fetchUpcomingMelas(1).then((rows) => alive && setMelas(rows)).catch(() => {})
    return () => { alive = false }
  }, [])
  const tiles = useMemo(() => rotate(PROMO_TILES.filter((tile) => !tile.showOn || tile.showOn.includes(page))).slice(0, limit), [page, limit])
  const kvk = useMemo(() => {
    const place = `${user?.village_town || ''} ${user?.pincode || ''}`.toLowerCase()
    return kvks.find((row) => `${row.area || ''} ${row.district || ''}`.toLowerCase().includes(place)) || kvks.find((row) => /sagar/i.test(`${row.area || ''} ${row.district || ''}`)) || kvks[0]
  }, [kvks, user])
  const questions = useMemo(() => rotate(sawaal).slice(0, 2), [sawaal])
  return <aside className={`grid grid-cols-2 gap-2 ${className}`} aria-label={t('post_listing')}>
    {tiles.map((tile) => <Tile key={tile.id} tile={tile} t={t} lang={lang} kvk={kvk} questions={questions} mela={melas[0]} />)}
  </aside>
}

function Card({ children, className = '' }) { return <div className={`min-h-[116px] rounded-2xl border border-stone-200 bg-white p-3 shadow-sm ${className}`}>{children}</div> }
function Tile({ tile, t, lang, kvk, questions, mela }) {
  if (tile.type === 'how') return <Card className="col-span-2"><h2 className="font-bold text-stone-900">{t(tile.titleKey)}</h2><p className="mt-2 text-sm leading-relaxed text-stone-700">{t(tile.bodyKey)}</p></Card>
  if (tile.type === 'sawaal') return <Card className="col-span-2"><h2 className="mb-2 font-bold text-stone-900">{t(tile.titleKey)}</h2>{questions.length ? <div className="space-y-2">{questions.map((row) => <Link key={row.slug} to={`/sawaal/${row.slug}`} aria-label={sawaalQuestion(row, lang)} className="block text-sm font-semibold text-green-800 underline">{sawaalQuestion(row, lang)}</Link>)}</div> : <Link to={tile.route} aria-label={t(tile.titleKey)} className="text-sm font-semibold text-green-800 underline">{t(tile.titleKey)} →</Link>}</Card>
  if (tile.type === 'kvk') return <Link to={tile.route} aria-label={t(tile.titleKey)}><Card><h2 className="font-bold text-stone-900">{t(tile.titleKey)}</h2>{kvk && <><p className="mt-1 text-sm font-semibold text-green-800">{resName(kvk, lang)}</p><p className="text-xs text-stone-600">{resAddress(kvk, lang) || kvk.phone_primary || ''}</p></>}<p className="mt-2 text-sm text-green-800">→</p></Card></Link>
  if (tile.type === 'mela') return <Link to={tile.route} aria-label={t(tile.titleKey)}><Card><h2 className="font-bold text-stone-900">{t(tile.titleKey)}</h2><p className="mt-2 text-sm text-stone-700">{mela ? (lang === 'hi' ? mela.name_hi : mela.name_en) : t(tile.titleKey)}</p></Card></Link>
  if (tile.type === 'whatsapp') return <Card><WhatsAppJoin variant="link" src="promo_bento" /></Card>
  return <Link to={tile.route} aria-label={t(tile.titleKey)}><Card><h2 className="font-bold text-stone-900">{t(tile.titleKey)}</h2><p className="mt-2 text-sm text-green-800">→</p></Card></Link>
}
