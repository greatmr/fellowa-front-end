import { setRequestLocale } from 'next-intl/server'

import { StudioPage } from '@/components/layout/studio-page'
import { StudioPlaceholder } from '@/components/layout/studio-placeholder'

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <StudioPage width="wide">
      <StudioPlaceholder page="payouts" />
    </StudioPage>
  )
}
