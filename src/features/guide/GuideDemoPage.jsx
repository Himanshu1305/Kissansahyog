// /guide/:id — one demo on its own page. Unknown id → the app's NotFound screen.
import { Link, useParams } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../../components/layout'
import NotFound from '../../screens/NotFound'
import { isGuideId } from './config.js'
import DemoPlayer from './DemoPlayer.jsx'
import TourExplorer from './TourExplorer.jsx'
import './guide.css'

export default function GuideDemoPage() {
  const { id } = useParams()
  const { t } = useLang()
  if (!isGuideId(id)) return <NotFound />
  return (
    <PageShell width="wide">
      <Seo title={t(`guide_${id}_seo_title`)} description={t(`guide_${id}_seo_desc`)} path={`/guide/${id}`} />
      <div className="ksg-page" data-testid="guide-demo-page" data-demo={id}>
        <Link to="/guide" className="ksg-back" data-testid="guide-back">← {t('guide_all_demos')}</Link>
        <h1 className="ksg-vt">{t(`guide_${id}_h1`)}</h1>
        <p className="ksg-vs">{t(`guide_${id}_sub`)}</p>
        {id === 'tour' ? <TourExplorer /> : <DemoPlayer demoId={id} />}
      </div>
    </PageShell>
  )
}
