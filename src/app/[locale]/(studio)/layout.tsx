import { setRequestLocale } from 'next-intl/server'

import { AppLayout } from '@/components/layout/app-layout'

/**
 * Creator studio frame (FE-SHELL-01; presentation Sidebar/Header @fdb5f6c).
 * Desktop: a 264px rail on the start side. Below `lg`: a top bar whose menu
 * opens the same sidebar in a drawer. No session or data is read here.
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

  return <AppLayout>{children}</AppLayout>
}
