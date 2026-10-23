import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { DefaultLayout } from '@/components/layout/default-layout'
import { AuthNavigation } from '@/features/auth/components/auth-navigation'

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <DefaultLayout
      authNavigation={
        <Suspense fallback={null}>
          <AuthNavigation />
        </Suspense>
      }
    >
      {children}
    </DefaultLayout>
  )
}
