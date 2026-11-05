// /install - "किसान सहयोग ऐप इंस्टॉल करें" (Batch 17F). Public, static copy, no data fetch.
// Shows the steps for the visitor's own phone / browser FIRST, then the other kinds in plain
// sections, then the QR + copy-link for opening the page on a phone, then the FAQ.
import { Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell, Seo } from '../components/layout'
import useInstall from '../components/install/useInstall'
import InstallHelp, { InstallQr, CopyLinkButton } from '../components/install/InstallHelp'
import { ShareInstallButton } from '../components/install/InstallQrBlock'
import { installStore } from '../lib/install/installStore'
import { installFaq, buildInstallJsonLd } from '../lib/install/faq'
import { INSTALL_URL } from '../lib/install/link'

const card = { background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)' }
const h2 = 'text-[22px] font-extrabold leading-snug md:text-[26px]'

// Which section of the page a detected environment belongs to.
const GROUP_OF = {
  'android-chrome-can-prompt': 'android',
  'android-chrome-no-prompt': 'android',
  'android-other-browser': 'other',
  'ios-safari': 'ios',
  'ios-other-browser': 'ios',
  'in-app-browser': 'inapp',
  'desktop-chrome-edge': 'pc',
  'desktop-other': 'pc',
}
const SECTIONS = [
  { group: 'android', titleKey: 'inst_sec_android', env: 'android-chrome-no-prompt' },
  { group: 'other', titleKey: 'inst_sec_other', env: 'android-other-browser' },
  { group: 'ios', titleKey: 'inst_sec_ios', env: 'ios-safari' },
  { group: 'inapp', titleKey: 'inst_sec_inapp', env: 'in-app-browser' },
  { group: 'pc', titleKey: 'inst_sec_pc', env: 'desktop-chrome-edge' },
]

export default function Install() {
  const { t, lang } = useLang()
  const snap = useInstall()
  const mine = GROUP_OF[snap.env] // undefined for installed / unsupported
  const faq = installFaq(lang)

  return (
    <PageShell width="content" crumbs={[{ label: t('inst_nav') }]}>
      <Seo title={t('inst_page_title')} description={t('inst_page_desc')} path="/install" jsonLd={buildInstallJsonLd(lang)} />

      <header className="p-4 md:p-6" style={{ ...card, background: 'var(--ks-bg-soft)' }}>
        <h1 className="text-[28px] font-extrabold leading-tight md:text-[36px]" style={{ color: 'var(--ks-ink)' }}>{t('inst_page_h1')}</h1>
        <p className="mt-2 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('inst_page_lead')}</p>
      </header>

      {/* 1 - the visitor's own phone / browser, first */}
      <section data-testid="install-mine" aria-labelledby="inst-mine-h" className="mt-6 p-4 md:p-5" style={{ ...card, borderColor: 'var(--ks-green)', borderWidth: 2 }}>
        <h2 id="inst-mine-h" className={h2} style={{ color: 'var(--ks-ink)' }}>{t('inst_page_yours')}</h2>
        {snap.installed || snap.standalone ? (
          <p className="mt-3 text-[18px] font-bold" style={{ color: 'var(--ks-green-dark)' }}>{t('inst_page_installed')}</p>
        ) : (
          <>
            {snap.canPrompt && (
              <button
                type="button"
                onClick={() => installStore.promptInstall()}
                data-testid="install-page-native"
                className="mt-3 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl px-4 text-[18px] font-extrabold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-green-dark)] md:max-w-sm"
                style={{ background: 'var(--ks-green-dark)' }}
              >
                {t('inst_native_btn')}
              </button>
            )}
            <div className="mt-3"><InstallHelp env={snap.env} showTitle={false} /></div>
          </>
        )}
      </section>

      {/* 2 - open this page on a phone: QR + link */}
      <section data-testid="install-phone" aria-labelledby="inst-phone-h" className="mt-6 p-4 md:p-5" style={card}>
        <h2 id="inst-phone-h" className={h2} style={{ color: 'var(--ks-ink)' }}>{t('inst_page_phone_h')}</h2>
        <p className="mt-2 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('inst_page_phone_body')}</p>
        <InstallQr size={220} />
        <p className="mt-3 text-[16px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('inst_page_link_label')} <span className="break-all font-semibold" style={{ color: 'var(--ks-green-dark)' }}>{INSTALL_URL.replace('https://', '')}</span></p>
        <div className="mt-2 grid gap-2 md:max-w-md">
          <CopyLinkButton />
          <ShareInstallButton />
        </div>
      </section>

      {/* 3 - every other kind of phone and browser, in plain sections */}
      <h2 className={`mt-8 ${h2}`} style={{ color: 'var(--ks-ink)' }}>{t('inst_page_others')}</h2>
      {SECTIONS.filter((s) => s.group !== mine).map((s) => (
        <section key={s.group} data-testid={`install-sec-${s.group}`} aria-labelledby={`inst-${s.group}-h`} className="mt-4 p-4 md:p-5" style={card}>
          <h3 id={`inst-${s.group}-h`} className="text-[20px] font-extrabold leading-snug" style={{ color: 'var(--ks-ink)' }}>{t(s.titleKey)}</h3>
          <InstallHelp env={s.env} showTitle={false} />
        </section>
      ))}
      <p className="mt-4 p-3 text-[16px] leading-relaxed" data-testid="install-icon-note" style={{ background: 'var(--ks-saffron-tint)', borderLeft: '6px solid var(--ks-saffron)', borderRadius: 'var(--ks-radius)', color: 'var(--ks-ink-2)' }}>{t('inst_icon_note')}</p>

      {/* 4 - FAQ: exactly what the FAQPage JSON-LD says */}
      <section aria-labelledby="inst-faq-h" className="mt-8">
        <h2 id="inst-faq-h" className={h2} style={{ color: 'var(--ks-ink)' }}>{t('inst_faq_title')}</h2>
        <dl className="mt-3 space-y-3" data-testid="install-faq">
          {faq.map((f, i) => (
            <div key={i} className="p-4" style={card}>
              <dt className="text-[17px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{f.q}</dt>
              <dd className="mt-1 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6"><Link to="/how-to-use" className="inline-flex min-h-[48px] items-center font-bold underline" style={{ color: 'var(--ks-green-dark)' }}>{t('nav_how_to_use')} →</Link></p>
      </section>
    </PageShell>
  )
}
