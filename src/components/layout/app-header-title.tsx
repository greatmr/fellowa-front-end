'use client'

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'

import { panelPageForPath } from '@/components/layout/app-nav'
import { usePathname } from '@/i18n/navigation'

const noopSubscribe = () => () => {}

/**
 * Desktop header breadcrumb, "category / title" of the current panel page
 * (presentation Header `VIEW_TITLES` @ d843c3b). Like the nav's active state
 * it reads the pathname after hydration (see NavLink). Not a heading:
 * each page keeps its own `h1`.
 */
export function AppHeaderTitle() {
  const t = useTranslations('panel')
  const pathname = usePathname()
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  const page = hydrated ? panelPageForPath(pathname) : null

  if (!page) {
    return (
      <span className="hidden text-body font-semibold text-muted-foreground lg:block">
        {t('label')}
      </span>
    )
  }

  // The dashboard has no category (FE-SHELL-05: it was "Studio").
  const categoryKey = `pages.${page}.category`
  const category = t.has(categoryKey) ? t(categoryKey) : null

  return (
    <p className="hidden min-w-0 items-center gap-2.5 lg:flex">
      {category ? (
        <>
          <span className="truncate text-label font-medium text-muted-foreground">
            {category}
          </span>
          <span className="text-ink-300 dark:text-ink-600" aria-hidden>
            /
          </span>
        </>
      ) : null}
      <span className="truncate text-body-lg font-bold text-foreground">
        {t(`pages.${page}.title`)}
      </span>
    </p>
  )
}
