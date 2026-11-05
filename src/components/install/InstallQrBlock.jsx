import { useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { isNative } from '../../lib/native'
import { shareInstallLink, INSTALL_URL } from '../../lib/install/link'
import useInstall, { startInstall } from './useInstall'
import { InstallQr, CopyLinkButton } from './InstallHelp'

// Batch 17F - "share the install link" button: the phone's share sheet, else copy the link.
export function ShareInstallButton({ testid = 'install-share-link' }) {
  const { t } = useLang()
  const [state, setState] = useState('idle')
  async function onShare() {
    const r = await shareInstallLink({ title: t('app_name'), text: t('inst_share_text'), url: INSTALL_URL })
    setState(r)
  }
  return (
    <div>
      <button
        type="button"
        onClick={onShare}
        data-testid={testid}
        className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl border-2 px-4 text-[17px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-green-dark)]"
        style={{ background: 'var(--ks-card)', borderColor: 'var(--ks-green-dark)', color: 'var(--ks-green-dark)' }}
      >
        {state === 'copied' ? t('inst_link_copied') : t('inst_share_link')}
      </button>
      <p className="mt-1 text-center text-[14px]" style={{ color: 'var(--ks-ink-2)' }} role="status">
        {state === 'failed' ? `${t('inst_copy_failed')} ${INSTALL_URL}` : ''}
      </p>
    </div>
  )
}

// Batch 17F - the homepage block for someone whose own Install button fails.
//  - 768 px and wider: the QR (a phone camera can scan it) and a Copy-link button.
//  - phones: the Install button and a "share this install link" button (you cannot scan your own screen).
// Hidden in the installed app and in the Android app.
export default function InstallQrBlock() {
  const { t } = useLang()
  const snap = useInstall()
  if (isNative() || snap.standalone || snap.installed) return null
  const canInstallHere = snap.env !== 'unsupported' && !snap.env.startsWith('desktop')

  return (
    <section data-testid="home-install-block" aria-labelledby="home-install-h" className="ks-section-inner" style={{ paddingTop: 10 }}>
      <div className="rounded-xl border-2 p-3 md:flex md:items-center md:gap-6 md:p-5" style={{ background: 'var(--ks-green-tint)', borderColor: 'var(--ks-green)' }}>
        {/* >= 768 px: QR */}
        <div className="hidden md:block" data-testid="home-install-qr-wrap">
          <InstallQr size={168} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="home-install-h" className="text-[19px] font-extrabold leading-snug" style={{ color: 'var(--ks-green-dark)' }}>{t('inst_block_title')}</h2>
          <p className="mt-1 hidden text-[16px] leading-snug md:block" style={{ color: 'var(--ks-ink-2)' }}>{t('inst_block_body_pc')}</p>
          <p className="mt-1 text-[15px] leading-snug md:hidden" style={{ color: 'var(--ks-ink-2)' }}>{t('inst_block_body_phone')}</p>
          {/* phones */}
          <div className="mt-3 flex flex-col gap-2 md:hidden">
            {canInstallHere && (
              <button
                type="button"
                onClick={() => startInstall(snap)}
                data-testid="home-install-btn"
                className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl px-4 text-[18px] font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-green-dark)]"
                style={{ background: 'var(--ks-green-dark)' }}
              >
                {t('inst_block_install')}
              </button>
            )}
            <ShareInstallButton testid="home-install-share" />
          </div>
          {/* >= 768 px */}
          <div className="mt-2 hidden max-w-sm md:block"><CopyLinkButton /></div>
        </div>
      </div>
    </section>
  )
}
