import { setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { AuthLayout } from '@/features/auth/components/auth-layout'

export default async function AuthenticationLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <AuthLayout>{children}</AuthLayout>
}
