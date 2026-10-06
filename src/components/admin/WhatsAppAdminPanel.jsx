import { useEffect, useRef, useState } from 'react'
import { fetchMandiPrices } from '../../lib/mandi/mandiApi'
import { fetchWeatherCell } from '../../lib/weather/weatherApiV2'
import { weatherInfo } from '../../lib/weather/weatherApi'
import { DEFAULT_COORDS } from '../../lib/location/locationStore'
import { fetchSiteSetting } from '../../lib/pages/pagesApi'
import { adminSetSiteSetting, getWhatsappOptins } from '../../lib/admin/adminApi'
import { downloadQrPng } from '../WhatsAppQR'

// Phase 13 — Admin "आज की पोस्ट" builder + WhatsApp channel settings + opt-in export.
// Draws a 1080×1350 card (canvas) from today's Sagar mandi + weather, writes a
// Hindi caption, and lets the admin set the channel URL / export opted-in users.
export default function WhatsAppAdminPanel({ actorId, t }) {
  const canvasRef = useRef(null)
  const [mandi, setMandi] = useState({ rows: [], day: 'none', date: null })
  const [weather, setWeather] = useState(null)
  const [caption, setCaption] = useState('')
  const [reel, setReel] = useState('')
  const [channelUrl, setChannelUrl] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    fetchMandiPrices().then(setMandi).catch(() => {})
    fetchWeatherCell(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude).then(setWeather).catch(() => {})
    fetchSiteSetting('whatsapp_channel_url').then((v) => setChannelUrl(typeof v === 'string' ? v : '')).catch(() => {})
  }, [])

  const today = weather?.daily?.[0]
  const wxLine = today ? `${weatherInfo(today.weathercode).hi || ''} · ${Math.round(today.temp_max ?? today.tmax ?? 0)}°/${Math.round(today.temp_min ?? today.tmin ?? 0)}° · वर्षा ${Math.round(today.precip_mm ?? 0)}mm` : ''

  // Redraw the card whenever data changes.
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    const W = 1080, H = 1350
    ctx.fillStyle = '#f7f3ea'; ctx.fillRect(0, 0, W, H)
    // header
    ctx.fillStyle = '#14532d'; ctx.fillRect(0, 0, W, 190)
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px sans-serif'; ctx.fillText('🌾 किसान सहयोग', 50, 110)
    ctx.font = '36px sans-serif'; ctx.fillText('आज के सागर मंडी भाव + मौसम', 50, 165)
    // date
    ctx.fillStyle = '#44403c'; ctx.font = '34px sans-serif'
    ctx.fillText(mandi.date ? `दिनांक: ${mandi.date}` : 'भाव जल्द', 50, 260)
    // mandi rows
    ctx.font = 'bold 44px sans-serif'
    let y = 340
    const rows = (mandi.rows || []).slice(0, 10)
    for (const r of rows) {
      ctx.fillStyle = '#1c1917'
      ctx.fillText(`${r.commodity_hi || r.commodity_en || ''}`, 60, y)
      ctx.fillStyle = '#14532d'
      ctx.fillText(`₹${r.modal_price}/क्विंटल`, 620, y)
      y += 70
      if (y > 1120) break
    }
    // weather line
    ctx.fillStyle = '#1e3a8a'; ctx.font = 'bold 40px sans-serif'
    if (wxLine) ctx.fillText(`मौसम: ${wxLine}`, 60, Math.min(y + 30, 1200))
    // footer
    ctx.fillStyle = '#14532d'; ctx.fillRect(0, H - 90, W, 90)
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif'; ctx.fillText('kissansahyog.com', 50, H - 30)
  }, [mandi, wxLine])

  // Build the Hindi caption from current data.
  useEffect(() => {
    const lines = (mandi.rows || []).slice(0, 6).map((r) => `• ${r.commodity_hi || r.commodity_en}: ₹${r.modal_price}/क्विंटल`)
    const cap = [
      `🌾 आज के सागर मंडी भाव${mandi.date ? ` (${mandi.date})` : ''}:`,
      ...lines,
      wxLine ? `\n🌦️ मौसम: ${wxLine}` : '',
      `\nरोज़ाना भाव + मौसम के लिए हमारे WhatsApp चैनल से जुड़ें: {{WHATSAPP_CHANNEL_LINK}}`,
      `और जानकारी: kissansahyog.com`,
      reel ? `\n🎬 ${reel}` : '',
      `\n#किसानसहयोग #सागरमंडी #मंडीभाव`,
    ].filter(Boolean).join('\n')
    setCaption(cap)
  }, [mandi, wxLine, reel])

  const downloadImage = () => {
    const c = canvasRef.current
    if (!c) return
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png'); a.download = `kissansahyog-aaj-ki-post.png`; a.click()
  }
  const copyCaption = () => { navigator.clipboard?.writeText(caption).catch(() => {}) }

  const saveChannel = async () => {
    setSavedMsg('')
    try { await adminSetSiteSetting(actorId, 'whatsapp_channel_url', channelUrl.trim()); setSavedMsg('✓') } catch { setSavedMsg('✗') }
  }
  const exportOptins = async () => {
    try {
      const data = await getWhatsappOptins(actorId)
      const header = 'full_name,phone,village_town,pincode,preferred_mandi,main_crops,opted_in_at'
      const body = (data || []).map((r) => [r.full_name, r.phone, r.village_town, r.pincode, r.preferred_mandi, r.main_crops, r.whatsapp_opt_in_at].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'whatsapp-optins.csv'; a.click()
    } catch { /* ignore */ }
  }

  return (
    <section className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-bold text-stone-900">🟢 {t('admin_wa_tab')} — {t('admin_today_post')}</h2>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="shrink-0">
          <canvas ref={canvasRef} width={1080} height={1350} className="h-auto w-48 rounded-lg border border-stone-300" />
        </div>
        <div className="flex-1 space-y-2">
          <label className="block text-sm font-semibold text-stone-700">{t('admin_today_reel')}
            <input value={reel} onChange={(e) => setReel(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" placeholder="https://..." />
          </label>
          <textarea value={caption} readOnly rows={8} className="w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadImage} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white">{t('admin_today_download')}</button>
            <button onClick={copyCaption} className="rounded-lg bg-stone-700 px-3 py-2 text-sm font-bold text-white">{t('admin_today_copy')}</button>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-stone-200 pt-4">
        <label className="block text-sm font-semibold text-stone-700">{t('admin_wa_channel')}
          <div className="mt-1 flex flex-wrap gap-2">
            <input value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} className="min-w-[240px] flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" placeholder="https://chat.whatsapp.com/..." />
            <button onClick={saveChannel} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white">{t('admin_wa_save')} {savedMsg}</button>
          </div>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={exportOptins} className="rounded-lg bg-stone-700 px-3 py-2 text-sm font-bold text-white">{t('admin_wa_export')}</button>
          <button onClick={() => channelUrl.trim() && downloadQrPng(channelUrl.trim())} disabled={!channelUrl.trim()} className="rounded-lg bg-stone-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">{t('admin_wa_qr')}</button>
        </div>
      </div>
    </section>
  )
}
