import { useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { sheetModel } from '../../lib/install/sheetModel'
import { copyText, INSTALL_URL, INSTALL_QR_URL } from '../../lib/install/link'
import InstallIcon from './InstallIcons'

// Batch 17F - the written help for ONE environment class. Used inside the install sheet and,
// for every class, on the /install page. Steps are a real numbered list with an icon each.

export function StepList({ steps, label }) {
  const { t } = useLang()
  return (
    <ol aria-label={label} className="mt-3 list-none space-y-3 p-0" data-testid="install-steps">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[15px] font-extrabold text-white" style={{ background: 'var(--ks-green-dark)' }}>{i + 1}</span>
          <span className="shrink-0"><InstallIcon name={s.icon} /></span>
          <span className="min-w-0 flex-1 text-[17px] leading-snug" style={{ color: 'var(--ks-ink)' }}>{t(s.key)}</span>
        </li>
      ))}
    </ol>
  )
}

export function CopyLinkButton({ primary = false }) {
  const { t } = useLang()
  const [state, setState] = useState('idle') // idle | ok | failed
  async function onCopy() {
    setState((await copyText(INSTALL_URL)) ? 'ok' : 'failed')
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onCopy}
        data-testid="install-copy-link"
        className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl border-2 px-4 text-[17px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-green-dark)]"
        style={primary ? { background: 'var(--ks-green-dark)', borderColor: 'var(--ks-green-dark)', color: '#fff' } : { background: 'var(--ks-card)', borderColor: 'var(--ks-green-dark)', color: 'var(--ks-green-dark)' }}
      >
        {state === 'ok' ? t('inst_link_copied') : t('inst_copy_link')}
      </button>
      {/* aria-live: a screen reader hears that the copy worked. */}
      <p className="mt-1 text-center text-[14px]" style={{ color: 'var(--ks-ink-2)' }} role="status">
        {state === 'failed' ? `${t('inst_copy_failed')} ${INSTALL_URL}` : ''}
      </p>
    </div>
  )
}

export function InstallQr({ size = 200 }) {
  const { t } = useLang()
  return (
    <figure className="mt-3 flex flex-col items-center">
      <img
        src="/images/install-qr.svg"
        alt={t('inst_qr_alt')}
        width={size}
        height={size}
        data-testid="install-qr"
        className="rounded-lg bg-white"
        style={{ width: size, height: size, border: '1px solid var(--ks-border)' }}
      />
      <figcaption className="mt-1 break-all text-center text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{INSTALL_QR_URL.replace('https://', '')}</figcaption>
    </figure>
  )
}

const para = 'mt-2 text-[16px] leading-relaxed'
const muted = { color: 'var(--ks-ink-2)' }

export default function InstallHelp({ env, showTitle = true, titleTag: Title = 'h3', titleId }) {
  const { t } = useLang()
  const m = sheetModel(env)
  return (
    <div data-testid="install-help" data-kind={m.kind}>
      {showTitle && <Title id={titleId} className="text-[21px] font-extrabold leading-snug" style={{ color: 'var(--ks-ink)' }}>{t(m.titleKey)}</Title>}
      {m.bodyKey && <p className={para} style={muted}>{t(m.bodyKey)}</p>}

      {/* Open-in-another-browser cases: the copy button comes first, it is the main action. */}
      {(m.kind === 'ios-open-safari' || m.kind === 'in-app') && m.copy && <CopyLinkButton primary />}
      {m.thenKey && <p className={`${para} font-bold`} style={{ color: 'var(--ks-ink)' }}>{t(m.thenKey)}</p>}

      {m.qr && <InstallQr />}
      {m.pcKey && <p className={para} style={muted}>{t(m.pcKey)}</p>}

      {m.steps.length > 0 && <StepList steps={m.steps} label={t(m.titleKey)} />}

      {m.hintKey && <p className={para} style={muted}>{t(m.hintKey)}</p>}
      {m.tipKey && <p className={`${para} font-bold`} style={{ color: 'var(--ks-green-dark)' }}>{t(m.tipKey)}</p>}
      {m.orKey && <p className={para} style={muted}>{t(m.orKey)}</p>}
      {m.noteKey && <p className={`${para} font-bold`} style={{ color: 'var(--ks-orange-dark)' }}>{t(m.noteKey)}</p>}

      {m.copy && m.kind !== 'ios-open-safari' && m.kind !== 'in-app' && <CopyLinkButton />}
    </div>
  )
}
