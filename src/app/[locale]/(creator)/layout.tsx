import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { Suspense } from 'react'

import { AppLayout } from '@/components/layout/app-layout'
import { SessionGate } from '@/features/auth/components/session-gate'
import { SidebarAccount } from '@/features/auth/components/sidebar-account'
import { getSession } from '@/features/auth/server/session'
import { publicPageAddress } from '@/features/dashboard'
import { routing } from '@/i18n/routing'

/**
 * Creator frame (FE-SHELL-01; presentation Sidebar/Header @d843c3b).
 * Desktop: a 264px rail on the start side. Below `lg`: a top bar whose menu
 * opens the same sidebar in a drawer. `template.tsx` animates each page in. Session validation streams at request time.
 */
export default async function CreatorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  if (!hasLocale(routing.locales, locale)) notFound()
  const t = await getTranslations('common')

  return (
    <Suspense
      fallback={
        <main
          id="main-content"
          tabIndex={-1}
          role="status"
          className="mx-auto flex min-h-dvh items-center px-6"
        >
          {t('loading')}
        </main>
      }
    >
      <SessionGate locale={locale}>
        <CreatorFrame>{children}</CreatorFrame>
      </SessionGate>
    </Suspense>
  )
}

/**
 * The frame with the signed-in creator's own public page for "View my page";
 * the one place that decides that link, for the sidebar and the account menu.
 * `getSession` is request-cached: the gate above has already read it, so this
 * adds no request.
 */
async function CreatorFrame({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  // Without an address (no alias yet) there is no public page to open: the
  // backend answers 404, so the item is left out until the address is chosen.
  const ownPageHref =
    session && session.user.alias !== null
      ? publicPageAddress(undefined, session.user.id).path
      : undefined

  return (
    <AppLayout
      account={<SidebarAccount ownPageHref={ownPageHref} />}
      ownPageHref={ownPageHref}
    >
      {children}
    </AppLayout>
  )
}
