import type { ReactNode } from 'react'
import { SearchIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Logo } from '@/components/layout/logo'
import { PublicSearch } from '@/components/layout/public-search'
import { Link } from '@/i18n/navigation'

const navLinkClass =
  'rounded-sm text-body font-semibold whitespace-nowrap text-foreground/75 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'

/**
 * Sticky glass header (presentation `LandingView` `.fw-nav-outer` @ d843c3b,
 * FE-LAND-03): a light gradient over a strong blur, above every page layer
 * and below the creator page's own fixed header (z-40). Section links and the
 * search field from `lg` (the design hides them under 960px); below it a
 * search shortcut and the actions only. No menu drawer, as in the design: the
 * same links sit in the footer. «کریتورها» is kept (owner, 2026-11-22).
 */
export function PublicHeader({
  authNavigation,
}: {
  authNavigation?: ReactNode
}) {
  const t = useTranslations('publicLayout')

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-linear-to-b from-card/72 to-brand-100/58 shadow-nav backdrop-blur-xl backdrop-saturate-150 dark:border-border dark:from-background/85 dark:to-brand-900/40 dark:shadow-none">
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
            className="flex size-10 shrink-0 items-center justify-center rounded-md border border-foreground/12 bg-card/72 text-foreground/75 backdrop-blur-md transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
          >
            <SearchIcon className="size-4.5" aria-hidden />
          </Link>
          {authNavigation}
        </div>
      </div>
    </header>
  )
}
