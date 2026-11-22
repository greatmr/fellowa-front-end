import { setRequestLocale } from 'next-intl/server'

import { PageContainer } from '@/components/layout/page-container'
import { PagePlaceholder } from '@/components/layout/page-placeholder'

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <PageContainer width="wide">
      <PagePlaceholder page="audience" />
    </PageContainer>
  )
}
