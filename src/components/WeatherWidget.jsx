import { useLang } from '../lib/i18n/LanguageProvider'
import { weatherInfo, wdayKey } from '../lib/weather/weatherApi'

const tempC = (t) => (t == null ? '—' : `${Math.round(Number(t))}°`)

// Weather card. `data` = a weather_cache row (or null = unavailable, undefined =
// loading). `compact` renders the small homepage card; otherwise the full 5-day
// forecast (used on /info). Bilingual via t(); condition/day labels from i18n.
export default function WeatherWidget({ data, loading = false, compact = false, onForecast, location }) {
  const { t } = useLang()
  const place = location || t('weather_near_you')

  if (loading) {
    return <div className="h-full min-h-[72px] animate-pulse rounded-xl border border-stone-200 bg-stone-100" />
  }
  if (!data) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-500">
        🌡️ {t('weather_unavailable')}
      </div>
    )
  }

  const cur = weatherInfo(data.current_weathercode)
  const forecast = Array.isArray(data.forecast) ? data.forecast : []

  if (compact) {
    return (
      <button type="button" onClick={onForecast} className="flex h-full w-full flex-col rounded-xl border border-sky-200 bg-sky-50 p-3 text-left active:bg-sky-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{cur.icon}</span>
          <span className="text-2xl font-extrabold text-stone-900">{tempC(data.current_temp)}</span>
          <span className="text-sm text-stone-600">{t(cur.key)}</span>
        </div>
        <div className="mt-0.5 text-xs text-stone-500">📍 {place}</div>
        <span className="mt-auto pt-2 text-xs font-bold text-sky-700">{t('weather_5day')} →</span>
      </button>
    )
  }

  // Full forecast (horizontal-scroll on mobile — days never stack).
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-3xl" aria-hidden="true">{cur.icon}</span>
        <span className="text-3xl font-extrabold text-stone-900">{tempC(data.current_temp)}</span>
        <div className="text-sm text-stone-600">
          <div>{t(cur.key)}</div>
          {data.current_humidity != null && <div>{t('weather_humidity')}: {Math.round(data.current_humidity)}%</div>}
        </div>
        <span className="ml-auto text-xs text-stone-500">📍 {place}</span>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {forecast.map((d, i) => {
          const info = weatherInfo(d.weathercode)
          return (
            <div key={i} className="w-[92px] shrink-0 rounded-xl border border-stone-200 bg-white p-2 text-center">
              <div className="text-xs font-bold text-stone-700">{t(wdayKey(d.date))}</div>
              <div className="my-1 text-2xl" aria-hidden="true">{info.icon}</div>
              <div className="text-sm font-bold text-stone-900">{tempC(d.temp_max)}<span className="text-stone-400"> / {tempC(d.temp_min)}</span></div>
              {d.precipitation_probability_max > 0 && (
                <div className="mt-0.5 text-[11px] font-semibold text-sky-700">🌧️ {Math.round(d.precipitation_probability_max)}%</div>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-stone-400">{t('weather_source')}</p>
    </div>
  )
}
