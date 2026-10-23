import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { Suspense } from 'react'

import { AppLayout } from '@/components/layout/app-layout'
import { AuthNavigation } from '@/features/auth/components/auth-navigation'
import { SessionGate } from '@/features/auth/components/session-gate'
import { routing } from '@/i18n/routing'

/**
 * Creator studio frame (FE-SHELL-01; presentation Sidebar/Header @fdb5f6c).
 * Desktop: a 264px rail on the start side. Below `lg`: a top bar whose menu
 * opens the same sidebar in a drawer. Session validation streams at request time.
 */
export default async function StudioLayout({
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
        <AppLayout authNavigation={<AuthNavigation studio />}>
          {children}
        </AppLayout>
      </SessionGate>
    </Suspense>
  )
}
