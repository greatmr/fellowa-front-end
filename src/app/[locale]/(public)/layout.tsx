import { setRequestLocale } from 'next-intl/server'

import { DefaultLayout } from '@/components/layout/default-layout'

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <DefaultLayout>{children}</DefaultLayout>
}
