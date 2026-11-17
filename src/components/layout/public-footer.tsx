import { useTranslations } from 'next-intl'

import { ThemeSwitch } from '@/components/common/theme-switch'
import { Logo } from '@/components/layout/logo'
import { Link } from '@/i18n/navigation'

const footerLinkClass =
  'block w-fit rounded-sm text-label text-foreground/55 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

/**
 * The public footer (presentation `LandingView` `.fw-footer` @ 798f660). It is
 * dark in both themes by design, so it scopes the `dark` class: every semantic
 * token inside resolves to its dark value, the theme switch included.
 * The prototype's guide and legal columns, social links and bottom links point
 * nowhere (no such pages or accounts exist) and are not ported.
 */
export function PublicFooter() {
  const t = useTranslations('publicLayout')

  return (
    <footer className="dark bg-ink-900 text-foreground">
      <div className="mx-auto max-w-public px-4 pt-16 pb-8 sm:px-6">
        <div className="flex flex-col gap-7 border-b border-foreground/10 pb-11 md:flex-row md:items-start md:gap-9">
          <div className="md:flex-3">
            <Link
              href="/"
              aria-label={t('home')}
              className="mb-4 inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Logo variant="public" />
            </Link>
            <p className="max-w-62.5 text-body-sm leading-7 text-foreground/55">
              {t('tagline')}
            </p>
          </div>
          <nav aria-labelledby="public-footer-product" className="md:flex-2">
            <p
              id="public-footer-product"
              className="mb-4 text-body font-bold text-foreground/90"
            >
              {t('product')}
            </p>
            <ul className="space-y-2.75">
              <li>
                <Link href="/#why" className={footerLinkClass}>
                  {t('why')}
                </Link>
              </li>
              <li>
                <Link href="/#features" className={footerLinkClass}>
                  {t('features')}
                </Link>
              </li>
              <li>
                <Link href="/auth" className={footerLinkClass}>
                  {t('startCreator')}
                </Link>
              </li>
              <li>
                <Link href="/creators" className={footerLinkClass}>
                  {t('discoverCreators')}
                </Link>
              </li>
            </ul>
          </nav>
          <ThemeSwitch className="w-full max-w-64 md:flex-2" />
        </div>
        <p className="pt-6 text-label text-foreground/55">{t('copyright')}</p>
      </div>
    </footer>
  )
}
