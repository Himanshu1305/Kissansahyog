import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { getWhatsAppChannelUrl, logJoinClick } from '../lib/whatsapp/whatsappApi'

// /join?src=<page> — logs the source for attribution (join_clicks) then redirects
// to the WhatsApp channel. If no channel is set, go home.
export default function Join() {
  const { t } = useLang()
  const [params] = useSearchParams()
  const src = params.get('src') || 'direct'

  useEffect(() => {
    let done = false
    ;(async () => {
      await logJoinClick(src)
      const url = await getWhatsAppChannelUrl()
      if (done) return
      window.location.replace(url || '/')
    })()
    return () => { done = true }
  }, [src])

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6 text-center">
      <p className="text-lg font-semibold text-stone-700">{t('wa_joining')}</p>
    </div>
  )
}
