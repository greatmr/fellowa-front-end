import type { ReactNode } from 'react'
import { BellIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ThemeSwitch } from '@/components/common/theme-switch'
import { Logo } from '@/components/layout/logo'
import { SkipLink } from '@/components/layout/skip-link'
import { StudioDesktopRail } from '@/components/layout/studio-desktop-rail'
import { StudioHeaderTitle } from '@/components/layout/studio-header-title'
import { StudioMobileNav } from '@/components/layout/studio-mobile-nav'
import { StudioSidebar } from '@/components/layout/studio-sidebar'
import { Link } from '@/i18n/navigation'

/**
 * Creator frame (presentation `App.tsx` shell, Sidebar and Header @ d843c3b).
 * `account` is the signed-in account row for the sidebar; protected product
 * data is authorized by its owning feature. The notification dot stays
 * absent until there is notification data. Like the prototype's `<main>`,
 * it sets no width or side gutter: each page does, through `StudioPage`.
 */
export function AppLayout({
  children,
  account,
}: {
  children: ReactNode
  account?: ReactNode
}) {
  const t = useTranslations('studio')

  return (
    <div className="flex min-h-full flex-1">
      <SkipLink />
      <StudioDesktopRail>
        <StudioSidebar account={account} />
      </StudioDesktopRail>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card/90 px-3 backdrop-blur sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <StudioMobileNav>
              <StudioSidebar account={account} />
            </StudioMobileNav>
            <Link
              href="/studio"
              className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 lg:hidden"
            >
              <Logo />
            </Link>
            <StudioHeaderTitle />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitch compact />
            <Link
              href="/notifications"
              aria-label={t('notificationsLink')}
              title={t('nav.notifications')}
              className="flex size-9 items-center justify-center rounded-md text-ink-600 transition-[color,background-color,transform] outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 dark:text-ink-300"
            >
              <BellIcon className="size-4.5" strokeWidth={1.8} aria-hidden />
            </Link>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full min-w-0 flex-1 py-6 outline-none lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
