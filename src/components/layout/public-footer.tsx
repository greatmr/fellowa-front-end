import { useTranslations } from 'next-intl'

import { ThemeSwitch } from '@/components/common/theme-switch'
import { Logo } from '@/components/layout/logo'
import { Link } from '@/i18n/navigation'

export function PublicFooter() {
  const t = useTranslations('publicLayout')

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-public flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Link
            href="/"
            aria-label={t('home')}
            className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Logo />
          </Link>
          <p className="text-body leading-7 text-muted-foreground">
            {t('tagline')}
          </p>
          <p className="text-label text-muted-foreground">{t('copyright')}</p>
        </div>
        <nav
          aria-label={t('footerNav')}
          className="flex flex-wrap gap-5 text-body font-semibold"
        >
          <Link
            href="/#why"
            className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('why')}
          </Link>
          <Link
            href="/#features"
            className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('features')}
          </Link>
          <Link
            href="/studio"
            className="rounded-sm text-link focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('studio')}
          </Link>
        </nav>
        <ThemeSwitch className="w-full max-w-64 shrink-0" />
      </div>
    </footer>
  )
}
