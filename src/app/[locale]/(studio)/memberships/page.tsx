import { setRequestLocale } from 'next-intl/server'

import { StudioPlaceholder } from '@/components/layout/studio-placeholder'

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <StudioPlaceholder page="payments" />
}
