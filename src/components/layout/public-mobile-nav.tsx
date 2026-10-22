'use client'

import { useTranslations } from 'next-intl'

import { ThemeSwitch } from '@/components/common/theme-switch'
import { NavigationDrawer } from '@/components/layout/navigation-drawer'
import { Link, usePathname } from '@/i18n/navigation'

export function PublicMobileNav() {
  const t = useTranslations('publicLayout')
  const tCommon = useTranslations('common')
  const pathname = usePathname()

  return (
    <NavigationDrawer
      key={pathname}
      title={t('mainNav')}
      openLabel={t('openMenu')}
      closeLabel={tCommon('close')}
      desktopQuery="(min-width: 48rem)"
      triggerClassName="md:hidden"
    >
      <div className="flex h-full flex-col gap-8 px-5 py-6 pt-16">
        <nav
          aria-label={t('mainNav')}
          className="flex flex-col gap-2 text-body font-semibold"
        >
          <Link
            href="/"
            className="rounded-md px-3 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('home')}
          </Link>
          <Link
            href="/#why"
            className="rounded-md px-3 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('why')}
          </Link>
          <Link
            href="/#features"
            className="rounded-md px-3 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('features')}
          </Link>
          <Link
            href="/studio"
            className="rounded-md px-3 py-3 text-link hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            {t('studio')}
          </Link>
        </nav>
        <ThemeSwitch className="mt-auto" />
      </div>
    </NavigationDrawer>
  )
}
