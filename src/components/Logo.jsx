import { useLang } from '../lib/i18n/LanguageProvider'

// The one brand mark, used everywhere the logo appears (header, mobile menu,
// footer, welcome, about). Files come from `npm run icons` (public/brand/).
//   <Logo />                 header size: ~36px high at 320px wide → 48px on desktop
//   <Logo size="lg" />       footer / page size
//   <Logo decorative />      when the site name is written right next to it
const WIDTHS = [48, 96, 192, 512]
const srcSet = (ext) => WIDTHS.map((w) => `/brand/logo-${w}.${ext} ${w}w`).join(', ')

// Rendered height per size. The source artwork is 1280x1189, so width ≈ height × 1.08.
const HEIGHT = {
  header: 'clamp(36px, calc(28px + 2.4vw), 48px)',
  lg: 'clamp(56px, calc(44px + 3vw), 72px)',
  xl: 'clamp(96px, calc(72px + 8vw), 144px)',
}
const SIZES = { header: '52px', lg: '78px', xl: '156px' }

export default function Logo({ size = 'header', decorative = false, className = '' }) {
  const { t } = useLang()
  return (
    <picture className={`block shrink-0 ${className}`} data-testid="brand-logo">
      <source type="image/webp" srcSet={srcSet('webp')} sizes={SIZES[size]} />
      <img
        src="/brand/logo-96.png"
        srcSet={srcSet('png')}
        sizes={SIZES[size]}
        width={1280}
        height={1189}
        alt={decorative ? '' : t('app_name')}
        decoding="async"
        className="block w-auto max-w-none rounded-md"
        style={{ height: HEIGHT[size] }}
      />
    </picture>
  )
}
