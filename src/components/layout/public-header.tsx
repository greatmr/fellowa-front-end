import type { ReactNode } from 'react'
import { SearchIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Logo } from '@/components/layout/logo'
import { PublicMobileNav } from '@/components/layout/public-mobile-nav'
import { PublicSearch } from '@/components/layout/public-search'
import { Link } from '@/i18n/navigation'

const navLinkClass =
  'rounded-sm text-body font-semibold whitespace-nowrap text-foreground/75 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

/**
 * Sticky glass header (presentation `LandingView` `.fw-nav-outer` @ 798f660):
 * a light gradient over a strong blur. Section links and the search field from
 * `lg`; below it a search shortcut and the menu drawer.
 */
export function PublicHeader({
  authNavigation,
}: {
  authNavigation?: ReactNode
}) {
  const t = useTranslations('publicLayout')

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-linear-to-b from-card/70 to-brand-100/60 shadow-nav backdrop-blur-xl backdrop-saturate-150 dark:border-border dark:from-background/85 dark:to-brand-900/40 dark:shadow-none">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:px-8 lg:gap-5.5">
        <Link
          href="/"
          aria-label={t('home')}
          className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Logo variant="public" />
        </Link>
        <nav
          aria-label={t('mainNav')}
          className="hidden shrink-0 items-center gap-6 lg:flex"
        >
          <Link href="/#why" className={navLinkClass}>
            {t('why')}
          </Link>
          <Link href="/#features" className={navLinkClass}>
            {t('features')}
          </Link>
          <Link href="/creators" className={navLinkClass}>
            {t('creators')}
          </Link>
        </nav>
        <div className="ms-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <PublicSearch className="hidden lg:block" />
          <Link
            href="/creators"
            aria-label={t('searchLabel')}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-input bg-card/55 text-foreground/75 backdrop-blur-md hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
          >
            <SearchIcon className="size-4.5" aria-hidden />
          </Link>
          {authNavigation}
          <PublicMobileNav />
        </div>
      </div>
    </header>
  )
}
