import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { useLang } from '../lib/i18n/LanguageProvider'
import { fetchColdStorageByDistrict } from '../lib/coldStorage/coldStorageApi'
import ColdStorageFinder from '../components/coldStorage/ColdStorageFinder'

// /cold-storage/:district — one district's directory with the SAME finder (search
// + distance sort + cards), district preselected, plus ItemList + LocalBusiness
// JSON-LD for local SEO.
export default function ColdStorageDistrict() {
  const { district: slug } = useParams()
  const { t } = useLang()
  const [loading, setLoading] = useState(true)
  const [districtName, setDistrictName] = useState(null)
  const [rows, setRows] = useState([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const { districtName: dn, rows: rs } = await fetchColdStorageByDistrict(slug)
        if (!alive) return
        setDistrictName(dn)
        setRows(rs)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [slug])

  const heading = districtName || slug
  const isSagar = slug === 'sagar' || districtName === 'Sagar'

  const jsonLd = useMemo(() => {
    const itemListLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name })),
    }
    const localBusinessLd = rows.map((r) => {
      const obj = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: r.name }
      const address = r.address || r.city
      if (address) obj.address = address
      if (r.phone) obj.telephone = r.phone
      if (r.district) obj.areaServed = r.district
      return obj
    })
    return [itemListLd, ...localBusinessLd]
  }, [rows])

  return (
    <PageShell
      width="wide"
      crumbs={[{ label: t('cs_hub_nav'), to: '/cold-storage' }, { label: districtName || slug }]}
      ready={!loading}
    >
      <Seo
        title={`${districtName || slug} ${t('cs_hub_nav')}`.slice(0, 60)}
        description={`${districtName || slug}: ${rows.length} ${t('cs_entries_count')}. ${t('cs_district_intro')}`.slice(0, 155)}
        path={`/cold-storage/${slug}`}
        type="article"
        jsonLd={jsonLd}
      />

      <h1 className="text-3xl font-bold text-stone-900">{heading} {t('cs_hub_nav')}</h1>
      <p className="mt-2 text-stone-700">{t('cs_district_intro')}</p>

      {isSagar && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{t('cs_sagar_note')}</p>
      )}

      <div className="mt-5">
        <ColdStorageFinder entries={rows} lockedDistrict={heading} />
      </div>
    </PageShell>
  )
}
