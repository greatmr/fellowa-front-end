'use client'

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'

import { studioPageForPath } from '@/components/layout/studio-nav'
import { usePathname } from '@/i18n/navigation'

const noopSubscribe = () => () => {}

/**
 * Desktop header breadcrumb, "category / title" of the current studio page
 * (presentation Header `VIEW_TITLES` @ d843c3b). Like the nav's active state
 * it reads the pathname after hydration (see StudioNavLink). Not a heading:
 * each page keeps its own `h1`.
 */
export function StudioHeaderTitle() {
  const t = useTranslations('studio')
  const pathname = usePathname()
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  const page = hydrated ? studioPageForPath(pathname) : null

  if (!page) {
    return (
      <span className="hidden text-body font-semibold text-muted-foreground lg:block">
        {t('label')}
      </span>
    )
  }

  return (
    <p className="hidden min-w-0 items-center gap-2.5 lg:flex">
      <span className="truncate text-label font-medium text-muted-foreground">
        {t(`pages.${page}.category`)}
      </span>
      <span className="text-ink-300 dark:text-ink-600" aria-hidden>
        /
      </span>
      <span className="truncate text-body-lg font-bold text-foreground">
        {t(`pages.${page}.title`)}
      </span>
    </p>
  )
}
