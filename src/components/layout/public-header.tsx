import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { Logo } from '@/components/layout/logo'
import { PublicMobileNav } from '@/components/layout/public-mobile-nav'
import { Link } from '@/i18n/navigation'

export function PublicHeader({
  authNavigation,
}: {
  authNavigation?: ReactNode
}) {
  const t = useTranslations('publicLayout')

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-public items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t('home')}
          className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <nav
          aria-label={t('mainNav')}
          className="hidden items-center gap-6 md:flex"
        >
          <Link
            href="/#why"
            className="rounded-sm text-body font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('why')}
          </Link>
          <Link
            href="/#features"
            className="rounded-sm text-body font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('features')}
          </Link>
          <Link
            href="/creators"
            className="rounded-sm text-body font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('creators')}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {authNavigation}
          <PublicMobileNav />
        </div>
      </div>
    </header>
  )
}
