import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { voteCarbonPoll, getCarbonPollResults, hasVotedCarbonPoll } from '../lib/carbon/carbonApi'

// One-vote-per-device poll. Shows options first; after voting (or if already
// voted) shows the result bars. No hardcoded Hindi — all via t().
export default function CarbonPoll() {
  const { t } = useLang()
  const [voted, setVoted] = useState(hasVotedCarbonPoll())
  const [results, setResults] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (voted) load() }, [voted])
  async function load() { try { setResults(await getCarbonPollResults()) } catch { /* ignore */ } }

  async function vote(choice) {
    setErr(null); setBusy(true)
    try { await voteCarbonPoll(choice); setVoted(true) }
    catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
    finally { setBusy(false) }
  }

  const options = [['yes', 'carbon_poll_yes'], ['no', 'carbon_poll_no'], ['unsure', 'carbon_poll_unsure']]
  const total = results ? (results.yes + results.no + results.unsure) || 0 : 0
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)

  return (
    <section className="my-6 rounded-2xl border border-green-200 bg-green-50/60 p-4">
      <h2 className="mb-3 text-lg font-bold text-stone-900">{t('carbon_poll_q')}</h2>
      {err && <p className="mb-2 rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      {!voted ? (
        <div className="flex flex-wrap gap-2">
          {options.map(([val, key]) => (
            <button key={val} type="button" disabled={busy} onClick={() => vote(val)}
              className="rounded-lg border-2 border-green-700 px-4 py-2 font-bold text-green-800 hover:bg-green-100 disabled:opacity-60">
              {t(key)}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm font-semibold text-green-800">{t('carbon_poll_thanks')}</p>
          <div className="space-y-2">
            {options.map(([val, key]) => (
              <div key={val}>
                <div className="flex justify-between text-sm font-semibold text-stone-700">
                  <span>{t(key)}</span><span>{pct(results?.[val] || 0)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                  <div className="h-full rounded-full bg-green-600" style={{ width: `${pct(results?.[val] || 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">{total} {t('carbon_poll_total')}</p>
        </div>
      )}
    </section>
  )
}
